---
title: "Rust's compile errors are other languages' production bugs"
description: "Four Rust compiler refusals, each traced to the silent bug it prevents in Python, JavaScript, or C: float sorting, string indexing, integer overflow, lazy iterators. Plus the one place Rust stays quiet."
pubDate: 2026-07-08
---

Rust refused to compile two lines of mine last week: a Vec of floats and a call to `.sort()`. Run the equivalent in Python with one NaN in the list and `sorted()` returns normally, having produced a list that is not sorted. Nothing crashes, nothing warns; the wrong answer comes back looking like a right one.

I've been writing Rust daily for a few weeks now, rebuilding a C Redis clone in it and keeping notes on every fight I lose to the compiler. A pattern keeps repeating: I hit a refusal, decide the compiler is being difficult, dig into the why, and find a bug I have almost certainly shipped in another language.

This piece walks through four of those refusals, with the receipts, then closes with the place Rust goes quiet instead. Everything below was run on rustc 1.95.0, Python 3.14.3, and Node 25.9.0 on 2026-07-08; the outputs are pasted, not paraphrased.

The refusals come in grades, and I'll be honest about which is which: three are hard compile errors, the fourth is a warning you learn to stop scrolling past.

## Floats have no total order

The two lines:

```rust
let mut v: Vec<f64> = vec![3.0, 1.0, 2.0];
v.sort();
```

```text
error[E0277]: the trait bound `f64: Ord` is not satisfied
```

`sort()` requires `Ord`, a total order: for any two values, exactly one of less-than, equal, greater-than holds. Sorting algorithms are built on that contract. A merge step trusts its comparisons; a partition trusts that every element lands on one side of the pivot. Integers can keep that promise. Floats carry one value that can't:

```rust
let nan = f64::NAN;
nan < 1.0    // false
nan > 1.0    // false
nan == nan   // false
```

Rust encodes "this comparison can fail" in the type: `partial_cmp` returns an `Option<Ordering>`, and for NaN it returns `None`. So `f64` gets `PartialOrd` and not `Ord`, and the sort refuses to build.

Here is the bug that refusal prevents. Python, same values, three input orders (Python 3.14.3):

```python
>>> nan = float("nan")
>>> sorted([3.0, 1.0, 2.0, nan])
[1.0, 2.0, 3.0, nan]
>>> sorted([nan, 3.0, 1.0, 2.0])
[1.0, nan, 2.0, 3.0]
>>> sorted([3.0, nan, 1.0, 2.0])
[3.0, nan, 1.0, 2.0]
```

The first result looks perfect. The second has nan in the middle and 3.0 after it. The third came back in its original, unsorted order. `sorted()` returned normally all three times.

The mechanism is the broken contract: Python's sort trusts its comparisons, every comparison against nan answers false, and the damage depends on where nan happens to sit in the input. A test suite without a NaN in an unlucky position passes forever. Production data eventually finds the unlucky position.

JavaScript behaves the same way once you hand `sort` the numeric comparator everyone writes. `(x, y) => x - y` returns NaN for NaN pairs, which makes the comparator inconsistent, and ECMAScript makes the resulting order implementation-defined. On Node 25.9.0, `[3, 1, 2, NaN]` comes out `[1, 2, 3, NaN]` and `[NaN, 3, 1, 2]` comes out `[NaN, 1, 2, 3]`: NaN stays wherever it started.

C is the bluntest of the three: `qsort` with a comparator that doesn't impose a total order is undefined behavior outright (C11 7.22.5).

The fix costs one comparator, and it's what the type system was asking for all along:

```rust
v.sort_by(|a, b| a.total_cmp(b));
```

`total_cmp` is IEEE 754's totalOrder predicate, a genuine total order over every float bit pattern:

```rust
let mut v = vec![1.0, f64::NAN, f64::NEG_INFINITY, -f64::NAN, f64::INFINITY, -0.0, 0.0];
v.sort_by(|a, b| a.total_cmp(b));
// [NaN, -inf, -0.0, 0.0, 1.0, inf, NaN]
```

Negative NaN first, positive NaN last, negative zero before positive zero. You don't need to memorize the order; you need it to exist. If NaN in your data is itself a bug, `v.retain(|x| !x.is_nan())` before sorting is the more honest fix. Either way, you decided.

## Strings have no [0]

```rust
let s = String::from("café");
let c = s[0];
```

```text
error[E0277]: the type `str` cannot be indexed by `{integer}`
```

Ask what `s[0]` should return and the refusal starts making sense. Rust strings are UTF-8 bytes; the é in "café" takes two of them, so the string is five bytes and four characters. "Element zero" has three defensible meanings: a byte, a codepoint, or the grapheme a reader would circle on paper. They agree on ASCII and diverge on everything else.

Other languages resolve the ambiguity by picking silently. JavaScript indexes UTF-16 code units, so `"🦀"[0]` is `"\ud83e"`, half a surrogate pair that renders as garbage (Node 25.9.0; the string's `.length` is 2 for one visible crab). C hands you a raw byte. Python gives you a whole character in O(1) and pays in memory: since PEP 393, each string is stored at the width of its widest codepoint.

Rust makes you spell out which one you meant: `s.as_bytes()[0]` for the byte (99), `s.chars().nth(0)` for the character, and range slicing like `&s[0..1]` for bytes with a boundary check; `&s[4..5]` panics with "byte index 4 is not a char boundary; it is inside 'é'" instead of handing you half a character.

The error message even suggests `.chars().nth()` and `.bytes().nth()`. rustc can see perfectly well what you're after; it wants the ambiguity resolved in your code rather than in its defaults.

## 255 + 1 has three answers

This one is a ladder, not a single error. When the overflow is provable at compile time, it refuses outright:

```rust
let x: u8 = 255;
let y = x + 1;
```

```text
error: this arithmetic operation will overflow
 = note: `#[deny(arithmetic_overflow)]` on by default
```

Make the value opaque at runtime (parse it from a string) and the same addition panics in a debug build, "attempt to add with overflow," and prints 0 in release. That release wrap is defined two's-complement behavior, written down in RFC 560, never undefined.

The C comparison matters here. Signed overflow in C isn't a wrap, it's undefined behavior (C11 6.5p5): the optimizer may assume it cannot happen and fold away the very check you wrote to catch it. Rust's split is a cost decision made honestly: checking every add costs a branch, so debug builds check everything and release builds wrap deterministically.

If wrap is wrong for your domain, set `overflow-checks = true` in the release profile, or name the semantics per call: `wrapping_add`, `checked_add`, `saturating_add`.

Eight bits genuinely cannot hold 256, so something has to give. Rust's stance is that the choice belongs in your code, and the debug panic is the reminder that you haven't written it down yet.

## The map that never ran

This one is a warning, not an error, and it still cost me an afternoon: a `println!` I'd tucked inside a `map` for debugging never fired. The program ran clean, printed everything after it, and exited zero.

```rust
let v = vec![1, 2, 3];
v.iter().map(|x| {
    println!("ran {x}");
    x * 2
});
println!("done");
// prints only: done
```

Rust iterator adapters are lazy. `map` doesn't run the closure; it builds a small struct that waits for a consumer, a `for` loop or `collect` or `sum`. Mine had no consumer, so the work never existed.

The answer had been sitting in my terminal the whole time: "unused `Map` that must be used: iterators are lazy and do nothing unless consumed." I'd scrolled past it the way JavaScript trained me to, because there `map` runs eagerly and hands back a whole new array per stage.

Rust's laziness is why a five-adapter chain compiles into one loop with no intermediate allocations. The price is that describing the work and doing the work are two separate moments, and this warning fires when your program only ever did the first.

## Where Rust goes quiet

I'd be selling you something if I stopped there, so here's the counterexample I hit the same week, in my Redis clone's append-only file.

`BufWriter` does flush its buffer on scope exit; `Drop` takes care of it. `Drop`, though, has no way to return a `Result`, so a failure in that final flush has nowhere to go and gets discarded. The standard library documents this openly and tells you to flush by hand first if you care. No compile error, no warning, nothing.

Even a successful `flush()` has only reached the kernel's page cache. Getting bytes onto the actual disk is `sync_all()`, fsync under the hood, and nothing calls it for you.

The type system polices what it can model, comparability and ownership above all. Durability policy, what your program is allowed to lose when the power dies, isn't in the types.

Rust erases most of the C discipline I needed for the same file (my own buffering, `?` on every write, close on scope exit) and leaves the two decisions that determine what a crash can take from you: when to flush, and when to sync. Those stay yours, unannounced.

## The shape of the trade

Every refusal above is one question in different clothing: what should happen on the case you didn't think you had? Python, JavaScript, and C settle it for you at runtime, each in its own accidental way. Rust asks before the program exists and won't move until you answer. The friction is real; it also lands at the exact moment the bug would otherwise have shipped.

Most of these came out of the Redis rebuild, and that project's durability layer, the append-only file where the quiet BufWriter almost bit me, is the next writeup.
