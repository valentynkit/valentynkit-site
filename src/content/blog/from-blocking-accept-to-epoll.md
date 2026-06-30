---
title: "From one blocking accept() to epoll: a C TCP server up the I/O ladder, measured"
description: "Building a TCP echo server in C seven times, from blocking through select, poll, kqueue, and epoll, with the cost of each wall measured: a 1.5 second stall, a pegged core, the FD_SETSIZE ceiling, and O(ready) dispatch."
pubDate: 2026-06-30
---

I connected one client to a blocking TCP server and held the socket open without sending a single byte. Then I connected a second client and sent it a line of text. The second client sat there for 1.51 seconds with no reply. It got its echo back one millisecond after I closed the first connection.

That 1.51 seconds is the reason the other six versions of this server exist.

Last week I wrote up [why I rebuilt this server seven times](/blog/framework-knowledge-evaporates): framework knowledge resets every few years, the layer underneath it compounds. That piece stayed at the level of outcomes. This one goes the other way, down into the code and the numbers.

The claims that matter here are the kind you can read a hundred times without being able to derive them. "select is O(n)." "epoll only hands you the ready fds." I had read both for years. I wanted to make my own machine say them out loud.

The target the whole exercise is built around is Dan Kegel's old [C10K problem](http://www.kegel.com/c10k.html): how do you serve ten thousand clients at once on one server? Each of the seven versions hits a wall, and the wall is what names the next one.

The whole thing is one echo server written seven times, no libraries beyond libc, [on GitHub](https://github.com/valentynkit/building-tcp-servers-in-c). Every number below is from running it on macOS (Apple clang 21, darwin 25.4) on 2026-06-29. The binaries are built with AddressSanitizer and UBSan on, so read the absolute microseconds loosely. The structure is what holds.

## Phase 01: blocking, and the 1.5 second stall

The first server is the one everybody writes first. Accept a connection, talk to it, close it, accept the next.

```c
for (;;) {
    int client_fd = accept(server_fd, NULL, NULL);
    if (client_fd == -1) { perror("accept"); continue; }
    handle_client(client_fd);
    close(client_fd);
}
```

`handle_client` loops on `read` until the client hangs up. Both `accept` and `read` block: when there is nothing to do, the thread sleeps in the kernel. That is good for idle cost and fatal for everything else. While the server is parked in `read` waiting on client A, client B is sitting in the kernel's backlog queue, accepted by TCP but not yet by your code. The server never gets to it.

That is the stall I measured at the top. Client B waited 1.51 seconds, the exact length of time I held client A open, and was served the instant A closed. One idle connection freezes every other connection behind it. The file comment in the repo says it plainly: "Open two clients at once and watch the second one hang." I wanted the number, so I held the first one open on purpose.

The good news is the idle cost. With no clients connected, this server sits at 0.0% CPU. It is asleep in `accept`. Hold onto that, because the next version throws it away.

## Phase 02: non-blocking, and a pegged core

The obvious fix: stop blocking. Put every socket in `O_NONBLOCK` mode and the syscalls return immediately with `EAGAIN` instead of sleeping. Now one thread can walk all its clients, try each one, and skip the ones with nothing ready.

```c
for (;;) {
    accept_client(&s);
    for (int i = 0; i < s.count; i++) {
        if (handle_client(&s, i))
            i--; /* a client was swapped into i, re-check it */
    }
}
```

This works. No client can freeze the others anymore. It also has a problem you can hear with a fan. The loop never sleeps.

The two calls hide the busy-work: `accept_client` fires a non-blocking `accept`, and `handle_client` a non-blocking `read`. When every client is idle both return `EAGAIN`, the outer loop runs them again, and with nothing to do it spins as fast as the core allows, millions of `EAGAIN`s a second.

I measured the same idle server two ways. Blocking, phase 01, no clients: 0.0% CPU. Non-blocking, phase 02, no clients: 98 to 99% CPU. A whole core burned to accomplish nothing. That is not a tuning problem, it is the design. Polling means asking "anything yet?" forever, and the answer is almost always no.

(The `i--` in that loop is a small trap worth pointing at. When a client disconnects, the code swaps the last client into its slot to keep the array dense, then decrements `i` so the loop re-checks the slot the swap just refilled. Miss that and you skip a client every time one leaves.)

## Phase 03: select, and two scars from the 1980s

Phase 02 had the right shape and the wrong instruction. We do not want to ask "anything yet?" in a loop. We want to tell the kernel "wake me when one of these is ready" and go to sleep until it is. That instruction is `select`.

```c
/* select() overwrites the set, so hand it a fresh copy each loop. */
fd_set readfds = s.active_fds;
int ready = select(s.max_fd + 1, &readfds, NULL, NULL, NULL);
```

The idle core comes back instantly. The server sleeps in `select` until a client actually does something, exactly like phase 01 slept in `accept`, except now it is waiting on the whole set at once. This is the real idea in the whole ladder: readiness notification. One wait, one wakeup, for many connections.

`select` carries the idea wrapped in two pieces of 1980s baggage. The first is in that comment: `select` overwrites the set you give it with the subset that is ready, so you keep a master copy and hand it a throwaway duplicate every single loop. The second is harder:

```c
if (fd >= FD_SETSIZE) {
    fprintf(stderr, "fd %d >= FD_SETSIZE, rejecting\n", fd);
    close(fd);
    return;
}
```

The fd set is a fixed-size bitmask. On this machine `FD_SETSIZE` is 1024, which I confirmed by compiling a one-line program that prints it. A connection whose file descriptor lands at or above 1024 cannot be represented in the set at all, so the server has to refuse it.

On top of the cap, every wakeup scans the whole bitmap up to `max_fd`, so the cost is O(n) in the number of connections you are watching, whether one of them is active or a thousand.

That is the end of the road for C10K on `select`. The bitmask caps you at 1024, a tenth of the way to the goal, and the per-wakeup scan would tax you even if it did not.

## Phase 04: poll, one scar gone

`poll` is `select` with the bitmask swapped for an array of `struct pollfd`, one entry per connection. That removes the `FD_SETSIZE` cap: the array is as big as you make it.

It does not remove the other scar. The kernel still walks every entry on every call, and you still hand it the full list each time. Better ceiling, same complexity: O(n) per wakeup, still proportional to the connections you hold, not the ones doing anything.

To actually fix the cost, the kernel has to remember what you care about between calls.

## Phases 05 and 06: kqueue and epoll, register once

This is the jump. Instead of handing the kernel the entire list of connections on every wakeup, you register each connection once, and from then on the kernel hands *you* back only the ones that are ready.

```c
struct kevent events[MAX_EVENTS];
for (;;) {
    int n = kevent(kq, NULL, 0, events, MAX_EVENTS, NULL);
    for (int i = 0; i < n; i++) {
        int fd = (int)events[i].ident;
        if (fd == server_fd) accept_client(kq, server_fd);
        else                 handle_client(kq, fd);
    }
}
```

`kevent` returns `n`, the number of ready events, and you loop over exactly those. The repo comment is the clearest one-line statement of the payoff in the whole project: "with 10,000 idle connections and one active, kevent() hands you exactly that one." The work per wakeup is O(ready), not O(registered). The fd cap is gone too.

I measured the readiness behavior, not the throughput. Three clients connected at once, each sending a line, each got its echo back in 0.1 to 0.2 milliseconds, overlapping, not serialized. That is the property phase 01 could not have at any speed: progress on many connections inside one loop, with the loop asleep whenever nothing is happening.

`kqueue` is the BSD and macOS interface. Linux spells the identical idea with different syscalls, which is `epoll`. They are not two steps, they are one idea on two kernels, and the repo lays the mapping out side by side:

```text
kqueue()                     ->  epoll_create1()
EV_SET(... EVFILT_READ ...)  ->  struct epoll_event { .events=EPOLLIN }
kevent(... EV_ADD ...)       ->  epoll_ctl(EPOLL_CTL_ADD)
kevent(... EV_DELETE ...)    ->  epoll_ctl(EPOLL_CTL_DEL)
kevent(... &events ...)      ->  epoll_wait()
```

The epoll version does not compile on macOS, there is no `<sys/epoll.h>`, so I built and ran it in a Linux container (`gcc:14`) to confirm it is the same program. It is. The loop is byte-for-byte the kqueue loop with the five calls above renamed.

Once you have written one, you have written both. You have also written the thing every async runtime is sitting on. Go's netpoller, Node's libuv, tokio through mio: a loop that asks the kernel what is ready, handles exactly that, and goes back to sleep.

## Phase 07: the byte stream that isn't messages

The first six servers all echo raw bytes, which lets them dodge the problem that makes a real protocol hard: TCP is a stream, not a sequence of messages. One `read` can return half of what the client sent, or three messages glued together. If your server assumes one `read` equals one message, it works on localhost and falls apart the first time a packet boundary lands somewhere inconvenient.

Phase 07 puts a length prefix on every message and extracts whole frames out of a per-client buffer:

```c
while (c->len >= FRAME_HDR_SIZE) {
    uint32_t net_len;
    memcpy(&net_len, c->buf, FRAME_HDR_SIZE);
    uint32_t payload_len = ntohl(net_len);

    if (payload_len > MSG_MAX) { remove_client(s, fd); return; }
    if (c->len < FRAME_HDR_SIZE + payload_len)
        return;                 /* frame not fully arrived yet */

    size_t frame_size = FRAME_HDR_SIZE + payload_len;
    if (!queue_write(s, fd, c->buf, frame_size))
        return;                 /* write buffer full, resume after drain */

    memmove(c->buf, c->buf + frame_size, c->len - frame_size);
    c->len -= frame_size;
}
```

Two things in there are the difference between a toy and a server.

The `if (c->len < FRAME_HDR_SIZE + payload_len) return;` is framing: a partial message is not an error, it is just not here yet, so you keep the bytes and wait for the rest.

And `if (!queue_write(...)) return;` is backpressure: when a client reads slowly and its write buffer fills, the server stops pulling new frames off the read side instead of buffering without bound. A slow client throttles itself rather than growing the server's memory until it dies.

I did not eyeball this one. The repo has a Python client that hammers the framing rules, and it passes: a single message, three pipelined into one send, a 4000-byte payload, and an oversized one that the server correctly drops the connection over. That last test is the protocol defending itself, which is the part you only get once you stop pretending the stream is already messages.

## What I got wrong

I expected the headline jump to be `select` to `epoll`, the efficiency one, the thing the blog posts are about. It was not the one that reorganized my head.

The jump that did was phase 02 to phase 03, non-blocking to `select`. It is the move from "I ask the world, constantly, whether anything has happened" to "the kernel wakes me when something has." Those feel like the same architecture with a faster inner loop. They are not.

One pegs a core and scales by spending more CPU; the other sleeps and scales by spending less. Everything after phase 03, poll, kqueue, epoll, is the same idea getting cheaper. Phase 03 is where the idea arrives.

I had the syscalls filed under "non-blocking I/O" as one bucket for years. They are two different answers to two different questions, and I could not have told you that before I watched the CPU number drop from 99 to nothing by changing which call the loop sleeps in.

## What's next

The framing version is roughly where this stops being a toy and starts being a thing with opinions: a wire format, a memory bound, a client it is willing to hang up on. It is also where C runs out of story to tell.

The next interesting question is not another syscall, it is the abstraction tower built on top of this one. I rebuilt the same ladder in Rust, raw `unsafe` libc calls up through mio up through tokio, specifically to see what each layer buys and what it hides. That is the part C structurally cannot show you, and it is what I am writing up next.
