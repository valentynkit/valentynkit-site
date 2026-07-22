---
title: "You don't understand a system until you've rebuilt it"
description: "Using a system teaches its interface and reading its source teaches its mechanics, but only rebuilding a worse version teaches the constraints, which is where understanding actually lives. Why reconstruction works, and how to build a toy that teaches you something instead of lying to you."
pubDate: 2026-07-22
---

"Build your own X to understand it" is advice so common it has stopped meaning anything. I repeated it for years without being able to say why it worked, which is the same as not understanding it. So I built the wrong things, learned less than I told myself I was learning, and kept the slogan anyway.

Then I rebuilt a TCP echo server seven times, and somewhere in the middle of it I finally understood a sentence I had read for six years and never once been able to derive. That is when the advice stopped being a slogan and turned into a method with rules.

The claim I actually believe now is narrower and stranger than the slogan. You don't understand a system until you've rebuilt a worse version of it. Not read about it, not even read its source. Rebuilt it, badly, with your own hands. And it matters which parts you get wrong.

## Three ways to know a thing

We lump three different things together under the word "understand," and they are not the same thing at all.

You can use a system. You learn its interface: the calls you make, the arguments they take, the shape of what comes back. This is real knowledge and most of the time it is all you need. I have used Postgres for years and could not tell you how its query planner picks a join order, and that has cost me almost nothing.

You can read its source. Now you have trace knowledge. You can follow what it does, step by step, and point at the line where each thing happens. This feels like the deep version, and it is deeper, but it has a specific gap: you can trace every decision without understanding why any of them had to be made that way. You are reading answers to questions you never asked. The code tells you what was chosen. It is quiet about what the alternatives cost.

You can rebuild it. Now you are the one being asked the questions. You hit the wall the original was shaped to avoid, at the moment it stops you, with no answer key. The decision stops being a line to read and becomes a problem you have to solve. That is the whole difference.

## The theory is the thing you can't inherit

In 1985 Peter Naur wrote a short paper called "Programming as Theory Building." His argument was that the real product of programming is not the code. It is a theory that lives in the programmer's head: the mapping between the code and the world it models, the reason behind each decision, the sense of which changes are safe and which ones quietly break something three files away. The code is a partial record of that theory. The documentation is a worse one.

The part that stuck with me is his claim that the theory cannot be reconstructed from the code and the docs alone. When the people who hold it leave, it dies, even though every line they wrote is still sitting right there. He called that program death. The text survives; the understanding does not.

If that is true, then reading the source can only ever give you the text. The theory is the thing you have to build yourself, and rebuilding is how you build it for a system you did not design. You cannot inherit it by reading. You have to make the decisions, hit the walls, and pay for the wrong guesses, because that is the process that produced the theory in the first place.

I found this out concretely. I have written before about [rebuilding a TCP server seven times](/blog/framework-knowledge-evaporates), from a blocking `accept` loop up through `select`, `poll`, `kqueue`, and `epoll`. Here is the kind of sentence I mean: a server that scales does not ask its connections "anything ready yet" in a loop, it sleeps until the kernel tells it one of them is. I had read that idea, in one form or another, for years. I understood it as English. I could not have derived why it mattered as much as it does.

Building it is what changed that. My blocking server [stalled for exactly 1.51 seconds](/blog/from-blocking-accept-to-epoll) when I held one idle client open and connected a second, because a thread parked in `read` on the first client never gets to the second. That stall is not a bug in my code. It is the reason non-blocking I/O exists. I met the problem instead of reading the solution. In the very next version I watched a pegged CPU core drop from 99% to nothing by changing which system call the loop slept in, and readiness notification stopped being a phrase I remembered and became something I could reconstruct from the shape of the problem. The theory had moved into my head, and it has not needed rereading since.

## The load-bearing constraint

Here is where most "build your own X" goes wrong, and where the slogan does real damage.

A toy only teaches you something if it keeps the one constraint that makes the real system hard. Skip that constraint and you have not built a smaller version of the thing. You have built a different, easier thing that happens to share its name.

The first six versions of my TCP server echoed raw bytes, and echoing raw bytes teaches you sockets. It teaches you almost nothing about TCP, because it dodges the property that makes TCP actually hard: the stream is not a sequence of messages. One `read` can hand you half a message, or three messages stuck together. The seventh version was the first that had to deal with that, with length-prefixed framing and with backpressure when a slow client's write buffer fills. Those two things are the entire difference between a toy and a server, and I only met them because I refused to let the toy skip them.

The same trap is everywhere. Rebuild a key-value store as a `HashMap` with no persistence and you have not built a database, you have built a `HashMap`: you skipped durability, which is the whole problem a database exists to solve, staying correct across a crash. The interesting part of an HTTP router is not serving static paths, it is matching and ranking patterns without walking every route, and a version that skips that has skipped the router.

So there is a test you can run before you start, and it takes one sentence. Name the single property the real system is famous for being hard at, and make sure your version is forced to solve it. For a database that is durability; for a network server it is framing and backpressure. Everything else you are allowed to fake, and you should, because faking the easy parts is what keeps the toy small enough to finish. Faking the hard part is what turns the exercise into a comforting waste of a weekend.

## This is not an argument for going lower

It would be easy to read all of this as "rewrite everything in C and learn how the metal works." That is not the claim, and the altitude is a distraction.

You can rebuild your web framework's router, your ORM's query builder, your test runner's assertion diffing, your bundler's module graph. None of that is low-level. All of it rebuilds a theory you are currently renting from a dependency. The method is about reconstruction, not about depth. I spent my time down at I/O and allocators because that is the layer whose ideas kept evaporating on me, not because virtue lives closer to the hardware.

And you should not rebuild everything, which is the honest limit. You do not have the time, and most systems you touch you only ever need at the interface. The signal that a particular system is worth the cost is specific and easy to feel: you keep memorizing the same thing about it and it keeps resetting. I relearned async three times across three languages before I admitted that the reset was the tell. When a piece of knowledge refuses to compound no matter how many times you acquire it, you have been learning the interface and calling it understanding, and that is exactly the case where rebuilding pays for itself.

I want to be honest about the ceiling too. A toy is a lie by construction, because leaving things out is the entire point, and I have certainly drawn conclusions from mine that a production system would embarrass. The defense is not to build a perfect toy, which is a contradiction. It is to know precisely which constraint you kept and which ones you faked, so you know exactly how far to trust what the toy told you. A rebuild teaches you the most about the one hard thing you forced it to confront, and comparatively little about everything you stubbed out, and keeping that boundary straight is most of the skill.

## Why it lasts

The theory you build by hand has a property that borrowed knowledge does not: you can regenerate it. Because you derived it once from the constraints, you can derive it again when it fades, instead of going back to the documentation to reload an interface you never really held. It survives a change of job, a change of language, a couple of years of not touching it, and not because you memorized it harder. It survives because you can reconstruct the argument any time you need it, from the same walls that produced it the first time.

So the next system I genuinely need to understand and keep, I am going to build the wrong version of it on purpose. I will keep the one hard part, fake everything else without guilt, and let my own machine say the sentence I have been reading for years. Right now that system is the memory allocator, because I have been reaching for `malloc` for six years and have started to resent not knowing what it actually trades away. The toy will be wrong in a dozen ways. It only has to be right about the one that counts.
