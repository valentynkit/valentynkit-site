# Library page + Layout refactor

Date: 2026-07-22
Repo: valentynkit-site (Astro, static, Vercel)
Status: built + verified, deploy gated on final entry annotation

## Phase 1 — Layout refactor (no visible change)

**Problem:** no `Layout.astro`; 9 files (8 pages + `BlogPost.astro`) hand-rolled
the identical `<!doctype>…<Header/><main id="main">…<Footer/>` shell.

**Change:**
- New `src/layouts/Layout.astro` owns the shell + BaseHead prop pass-through
  (`title`, `description`, `image`, `article`, `profile`, `noindex`).
- Migrated all 8 pages (404, about, confirm, welcome, experience, open-source,
  index, blog/index) to render through it.
- Rebased `BlogPost.astro` on `Layout` (Layout = base, BlogPost = base + article
  chrome). Side fix: BlogPost previously omitted `<!doctype html>`; now consistent.
- `global.css`: added a `.tag` mono-chip utility (used by /library); removed the
  dead `.sr-only` class.

**Deliberately NOT done** (would change rendered output / add cid churn, out of
scope for a zero-visible-change refactor): retrofitting `.lang`/`.stack`/`.dates`
onto `.tag`; folding `about`'s local `.links` into `.meta`; globalizing
open-source's `.manifest`. Left the PR pill/dot and experience's bullet layout
as-is per the audit.

**Verification:** built before/after; compared every page's visible text
(whitespace-stripped, `<style>`/`<script>` excluded) and non-asset link list.
All pages byte-identical in content; only the intended blog `<!doctype>` addition
plus non-visual Astro cid/hash mechanics differ.

## Phase 2 — Library page

Curated references (books/papers/articles/videos/talks) with a candid take and an
editorial tier, grouped by topic.

- **Data:** `src/data/library.ts` — hand-edited typed array. `Entry` = title,
  by?, medium, url, topic, tier, note?. `TOPICS` is an ordered const tuple;
  `TIER_LABEL` maps tier → display. Topic is typed to the tuple; a build-time
  guard in the page throws on an unknown topic (the TS union only fires under
  `astro check`, which the build doesn't run).
- **Page:** `src/pages/library.astro` — groups entries by `TOPICS` order, hides
  empty topics, sorts within a topic Essential → Worth it → Situational then by
  title. Each row: title→url, tier dot+label, author, medium `.tag`, optional
  note.
- **Tiers:** Essential = `--accent`, Worth it = `--fg-secondary`, Situational =
  `--fg-muted` (dot + label). No JS, no deps.
- **Nav:** `open source · experience · library · about`; also added to
  `llms.txt`.

**Voice constraint:** entries + notes are the author's (VOICE.md canon — no
AI-seeded voice). Seeded from `brain/learning/` sources actually studied (OSTEP,
DDIA, Lamport, Rust Book) plus author-supplied entries (Database Internals,
Grokking Algorithms) with the author's own one-line notes. Tiers on the four
brain-sourced entries are placeholders to confirm; their notes are left empty for
the author to write.

## Files

- **new:** `src/layouts/Layout.astro`, `src/data/library.ts`,
  `src/pages/library.astro`
- **edit (refactor):** `src/layouts/BlogPost.astro`, `src/styles/global.css`,
  `src/pages/{404,about,confirm,welcome,experience,open-source,index}.astro`,
  `src/pages/blog/index.astro`
- **edit (feature):** `src/components/Header.astro`, `src/pages/llms.txt.ts`
