---
title: What Linux actually does when you read a file
description: I asked for one 4 KiB page and got four back. The same read one page over gave me one.
pubDate: 2026-08-07
---

I asked Linux for one 4 KiB page from the start of a cold file. Four pages came back.

I moved the same read one page further in, ran it again, and got one.

Same file, same syscall, same kernel. The only thing that changed was where I started
reading, and I spent twenty minutes assuming the tool I'd just written was miscounting.

It wasn't. A read that starts at byte zero is treated as a promise. There's a branch in
`mm/readahead.c` that reads, in full, `if (!index) goto initial_readahead;`. Offset zero
means the kernel takes you for a program that's about to stream the whole file, and it
fetches ahead immediately. Start anywhere else and you're assumed to be seeking randomly
until a pattern proves otherwise. Nothing in my call said a word about my intentions. It
inferred them from an offset.

I spent two weeks on this sort of thing recently. Not for work, and not toward anything
shippable. The short version of what I found is that a surprising amount of the machinery
under a running program isn't carrying out instructions at all. It's guessing.

**The bench**, because it changes how you should read every number here: an ext4 filesystem
on a loop device, inside an OrbStack Linux VM on an Apple Silicon Mac, kernel 7.0.14,
4 KiB pages, `read_ahead_kb` at 128. That's a container sharing the host's kernel, not bare
metal, and the host reclaims memory aggressively enough that a fully cached file can go cold
in fifteen seconds. Reads came from `dd`; the page-by-page counting came from a small C tool
I wrote that `mmap`s a file and asks `mincore()` which of its pages are resident.

## You're not addressing the disk, you're addressing the page cache

The model most of us carry is that `read()` goes and gets bytes off a device. It doesn't. It
copies bytes out of the page cache into your buffer, and the page cache is just RAM the
kernel uses to remember parts of files.

If what you want is already there, no device is involved. If it isn't, the kernel fills the
cache first and then copies. Either way the thing your program talks to is memory, and the
disk is somebody else's problem one layer down.

You can watch this from outside. Drop the caches, read one page, and count: four pages
resident. Read nothing at all and count again: zero. The file didn't change and neither did
the syscall.

## How much it fetches depends on what it thinks you're doing

Once the kernel does have to go to the device, it faces a question your call never answered:
how much should it bring back?

Fetching exactly what you asked for is the honest answer and usually the wrong one, because
the kernel is built on the assumption that a program reading one block will want the next.
So it speculates, and how far it speculates depends on how much evidence it has.

Reading sequentially from cold, one page at a time, the window opened up like this: four
pages, then twelve, twelve, twelve, thirty-one, thirty-one. Then it stopped.

The configured ceiling should be thirty-two, which is `read_ahead_kb` at 128 KiB over a
4 KiB page. I measured thirty-one, twice, and I haven't chased down the missing page. If you
know why, I'd like to hear it.

The part that genuinely surprised me is where the evidence lives. Each read was a separate
`dd` process with a fresh file descriptor and no history of its own, so per-descriptor state
can't explain a window that grows across independent invocations. It works because
`try_context_readahead()` looks *backwards through the page cache* for the traces a
sequential reader leaves behind. The cache is shared. Access patterns leak between processes
that know nothing about each other, and one program's reads change the shape of another's.

## Two doors to the same bytes, two different answers

`read()` isn't the only way in. You can `mmap` a file and touch the memory, and the same page
cache serves you through a different door.

The doors don't behave alike. One touch of a mapped page brought back thirty-two pages where
the equivalent `read()` brought four. And the window was *centred* on the page I touched
rather than starting there: I faulted page 100 and got pages 84 through 115.

That centring is the kernel admitting how little it has to work with. A `read()` carries a
length, so it knows how much you want and can reason about direction. A page fault carries
neither. Somebody touched one address, and spreading the guess symmetrically around it is
the best available bet when you don't know which way they're headed.

## Underneath, the layout is a bet too

Getting bytes into memory is one problem. Finding them in the first place is another, and
the filesystem has its own opinions about that.

I made a 4 MiB file on ext2 and the same file on ext4. `stat` reports both a logical size and
the number of 512-byte blocks actually allocated, and the gap between the two is where the
information hides.

On ext4 the gap was zero. Exactly 4 MiB of file, exactly 4 MiB of blocks.

On ext2 the file cost 4096 bytes more than its own contents.

That extra block is bookkeeping. An ext2 inode holds twelve direct block pointers and then
falls back to indirection: a block whose entire contents are pointers to other blocks, and
past that a block of pointers to blocks of pointers. My 4 MiB file needed one level of it.
ext4 stores extents instead, records saying "this file lives in these blocks, consecutively",
so a couple of small records covered the whole thing and the overhead rounded away.

One file tells you what one file cost. What it doesn't tell you is how the tax scales, and on
ext2 it scales in tiers, single then double then triple indirect, and that's the part I'd
want to measure before saying anything stronger.

## The counter you'd reach for can't see any of this

Here's the one that bothered me, because I'd been reasoning with a broken instrument without
knowing it.

I read 8 MiB off a cold file and checked the process's major-fault counter. My first
measurement said eighteen, which is a perfectly reasonable thing for a fault counter to say,
so I wrote it down.

Then I remembered that dropping the page cache doesn't only evict my file. It evicts the
Python interpreter's own pages, and those eighteen faults were Python loading itself back
into memory. Nothing to do with my read at all.

The honest way to ask is to sample the counter immediately before the read and immediately
after, inside one process. Done that way, the delta is zero.

Eight mebibytes of real I/O, and the counter never moved.

That isn't a bug. A major fault is what happens when the MMU finds nothing mapped at an
address *and the kernel has to go to storage to fill it*. That last clause is the whole
distinction: minor faults resolve in RAM, major faults touch the device. It's the `mmap`
path. An ordinary `read()` never goes near it, so `ru_majflt` is blind to it by construction.

So a flat major-fault graph tells you nothing about whether a service doing ordinary file
reads is I/O-bound. It looks the same whether every read hit warm cache or every one went
out to the device.

If you want the number that does move, `/proc/<pid>/io` has `read_bytes`, which counts what
actually came from storage, and `iostat -x 1` will show you the device side. Both were
sitting there the whole time I was squinting at the wrong graph.

## What I took from it

Every layer between a program and its data has traded some guarantee for speed on that
program's behalf, without asking. The trades are good ones. They're right almost all of the
time, and that's exactly the problem: you don't build any intuition for the shape of the
exception, because you never meet it.

The one that got me wasn't even a kernel behaviour. It was my own measurement returning
eighteen, looking completely reasonable, and being about something else entirely.

There's a practical version of this if you never open a kernel source file. When a
file-reading workload gets faster after somebody reorders how it walks its data, the win is
usually the kernel's prediction starting to land rather than anything about syscalls or
buffer sizes. Worth knowing which one you changed, if only so you can do it again on purpose.

It also explains something that confused me for years about async runtimes. `tokio::fs` is a
thread pool wearing an async interface, and the reason is upstream of tokio: readiness
polling is the wrong question to ask about a file. A socket can tell you "nothing yet, ask
me later". For a file the answer has historically been either "here it is" or a block, and
you can't select on that.

I say historically because it's less true than it used to be, and this is the part I've read
about rather than measured. Since 5.9 the kernel can arm a `wait_page_queue` callback and
retry a read from task work instead of blocking, and io_uring gives you a genuinely
asynchronous submission path. The thread pool under most runtimes is a compatibility
decision now, not a hard limit.

Writes are worse, and that's the next one.
