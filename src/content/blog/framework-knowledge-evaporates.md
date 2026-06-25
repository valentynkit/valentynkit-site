---
title: "Framework knowledge evaporates. Low-level knowledge compounds."
description: "I learned async three times before it clicked. Building a TCP echo server from blocking sockets up through kqueue and epoll in C, seven times, is what finally fixed it."
pubDate: 2026-06-25
---

I learned async three times before it stuck. C# Tasks. Go goroutines. Rust tokio. Each time I was shipping within a week. Each time, a year later at a different job, I was asking the same questions again.

I hadn't forgotten the API. I'd learned the interface, not the mechanism.

What changed it: I built a TCP echo server in C from blocking sockets up through a kqueue/epoll event loop, one I/O model at a time, with no libraries beyond libc. Seven phases, seven runnable programs, each motivated by a concrete ceiling the previous one hit.

By the end, I understood what problem each design decision in tokio was solving. Go's netpoller and Node's libuv looked like two spellings of the same idea. Async had a shape I could hold. And I haven't needed to rebuild that mental model since.

That's the trade I kept not making: framework knowledge gets you productive fast and resets every few years; low-level knowledge costs more upfront and compounds.

---

## How I got here

The fourth time I learned async I was three stacks in. C# Tasks, then Go goroutines, then Rust's tokio. Each time it took about a week to get up to speed, and each time I thought I understood it. Moving to the next job, the understanding had reset in ways I didn't expect: I could explain the primitives but only in the vocabulary of the most recent stack. Strip the framework's names away and I was less certain than six years should have made me.

Same thing with the other primitives I kept reaching for: idempotency, back-pressure, state machines. At each stop they showed up in different forms. I recognized them. I just didn't understand them in a way that would survive moving somewhere new.

At some point that stopped feeling like a normal learning curve.

---

## The seven-phase TCP server

There's a document from 2003 by Dan Kegel called "The C10K Problem." The question it poses: how do you serve ten thousand clients with one server? The answer turns out to be very careful, and not what you'd first try.

I built through it phase by phase.

Phase 01 is the obvious approach: `accept` in a loop, `read`/`write`, one client at a time. It works, and it blocks on every syscall, so one slow client holds the whole server. That's the ceiling.

Phase 02: make the sockets non-blocking. Now `read` returns `EAGAIN` instead of sleeping, so one thread can check multiple clients. But you're busy-polling every file descriptor in a loop, burning 100% CPU even when nothing is happening. The wrong direction.

Phase 03: `select`. Tell the kernel "wake me when something on this list is ready," and it does. One wait, one wakeup. This is the idea: readiness notification. The problem is `FD_SETSIZE`, which caps you at 1024 file descriptors on most platforms, and the kernel still scans the entire bitmap O(n) on every call.

Phase 04: `poll`. No bitmap cap, same O(n) cost. You still rebuild the descriptor list on every call.

Phase 05 (macOS/BSD) and Phase 06 (Linux): kqueue and epoll. Register interest once; the kernel tells you only what's ready. O(ready), not O(registered).

Phase 07: framing and backpressure. Length-prefixed messages, per-client write buffers that stop reading when the output side is full. Now you have the protocol problem, not just the I/O problem.

Seven phases, each one runnable, each one the answer to the ceiling the previous one hit. No dependencies beyond libc. The whole thing is at [github.com/valentynkit/building-tcp-servers-in-c](https://github.com/valentynkit/building-tcp-servers-in-c).

---

## What I was wrong about

I thought understanding non-blocking I/O was about knowing the right syscalls: `select`, then `poll`, then `epoll_create1` + `epoll_ctl` + `epoll_wait`. Get the signatures right, ship the server.

What I actually needed was causation: why did each model replace the previous one, what ceiling did it hit, what does the next one do differently? That's what transfers. The syscall names are spellings; the causation is the thing.

I'd read "epoll is more efficient than select" dozens of times before building this. I understood the sentence. I didn't understand it in a way that let me derive it. After running my phase 03 server into the `FD_SETSIZE` limit during a test, I understood it in a way that doesn't need reading again.

---

## What compounded

The model from those seven phases: a server that scales is a loop that asks the kernel "what's ready now," processes exactly those clients, and yields back. Everything else (Go goroutines backed by the netpoller, tokio tasks backed by mio backed by epoll, Node's event loop backed by libuv) is a scheduling layer on top of that kernel primitive.

When I read the mio source later, I recognized what it was doing. When I read about Go's netpoller, same. When I saw libuv's handle loop, same. Because I'd built the thing they're all built on, not because I studied each one until it made sense.

The same transfer shows up in production. We model every transaction as an explicit state machine: every state durable, every transition idempotent, so a crash or a chain reorg resumes from the last clean step instead of corrupting money-bearing state. I'd seen that same pattern in a message queue pipeline: the retry path where a downstream failure had to resume without reprocessing what already committed. Same primitive, different altitude. You recognize it from below, or you don't recognize it at all.

---

## What this is

I'm rebuilding the foundations from scratch: TCP servers, allocators, storage engines, event loops. To understand what the systems I depend on are actually doing, written in public as I go.

I'm not a kernel hacker. I'm a backend engineer who got tired of relearning the same ideas at every new framework, went down to find where they live, and is climbing back up. The bugs stay in. The dead ends stay in. The parts I'm still working out stay in.

Current position: TCP servers and simple allocators done. Next I want to understand what a memory allocator is actually trading off, because I've been reaching for `malloc` for six years and that's started to bother me.

Code is at [github.com/valentynkit](https://github.com/valentynkit). The TCP server is above; the allocator is next.
