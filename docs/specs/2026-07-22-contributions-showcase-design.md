# Contributions showcase + IA restructure

Date: 2026-07-22
Repo: valentynkit-site (Astro, static, deployed on Vercel)
Status: designed, reviewed (self + design-skeptic), ready to plan

## Goal

Surface open-source contributions (PRs to repos Valentyn does not own) on the
site, folded by repo and prioritized by merged-PR count, refreshed on every
deploy. Restructure the nav so a technical visitor finds the three distinct
proof surfaces — employment, own projects, upstream contributions — without
ambiguity.

## Information architecture

Nav becomes: `writing (home) · open source · experience · about`.

| Route | Was | Responsibility |
|---|---|---|
| `/` | same | positioning hero + writing feed |
| `/open-source` | `/projects` | `## Projects` (own from-scratch builds) + `## Contributions` (upstream PRs) |
| `/experience` | `/resume` | employment history + skills (content unchanged) |
| `/about` | same | narrative + links |

`/work` and `/portfolio` rejected as labels: both collapse the three proof
surfaces into one vague bucket. "experience" = employment, unambiguously;
"contributions" (as a section, not "open source") = patches to others' code.

## Data pipeline — build-time prefetch

Runs as a prebuild step on every deploy (no cron, no scheduled job). Precedent:
`scripts/indexnow.mjs` already does build-time network work, non-fatally.

### Source — GitHub REST Search API (no `gh` on Vercel runners)
`GET https://api.github.com/search/issues?q=type:pr+author:valentynkit&per_page=100`

- Works **unauthenticated** (verified: returns all data; search unauth limit
  10 req/min — one call per build). If `GH_TOKEN`/`GITHUB_TOKEN` is set in the
  Vercel env, send it as `Authorization: Bearer` to lift the limit — optional,
  not required.
- **Pagination:** loop `page=1..` until collected count reaches `total_count`
  (or a page returns `< per_page`). Today `total_count` is 34 → one page. This
  guards the same silent-truncation footgun the deprecated `gh --limit` default
  (30) would have hit — do NOT ship a single hardcoded page.
- **Merged detection (critical):** the REST search endpoint returns
  `state: open|closed` **only** — a merged PR shows `state:"closed"` with
  `pull_request.merged_at` set. Derive state per item:
  ```
  merged_at != null            -> 'merged'
  else if state == 'open'      -> 'open'
  else                         -> 'closed'   (closed unmerged)
  ```
  (Verified against live data: a merged rust-lang PR reports
  `state:"closed", merged_at:"2026-07-15T…"`. Using `state` naively would
  mislabel all merged PRs as closed.)
- **Repo identity:** derive `owner/repo` from `item.repository_url`
  (`…/repos/OWNER/REPO`); `owner` = first segment.

### Script — `scripts/sync-contributions.mjs`
Node ESM (matches existing `scripts/*.mjs`). Config constants at top:

```js
const AUTHOR = 'valentynkit';
const EXCLUDE_OWNERS = ['valentynkit'];   // own repos live in ## Projects
const KEEP_STATES = ['merged', 'open'];   // individual PRs listed for these
const HIDE_REPOS = [];                     // force-hide a repo regardless of counts
const OUT = 'src/data/contributions.json';
```

Steps: fetch (all pages) → map each PR to derived state → drop PRs whose owner
is in `EXCLUDE_OWNERS` → group by `owner/repo` → per repo compute
`{merged, open, closed}` counts + keep the `KEEP_STATES` PRs (newest first) →
**drop repos with `merged + open === 0`** (only-closed = rejection noise; also
covers the retired turso PRs) and any in `HIDE_REPOS` → sort repos by `merged`
desc, then `open` desc, then most-recent PR date → write `OUT`.

**Failure handling (mirror indexnow's non-fatal pattern):** wrap the whole
thing; on any error (network, rate-limit, malformed, or the self-check below
failing), `console.warn` and **exit 0 without touching `OUT`** — the build
proceeds on the committed last-known-good seed. A GitHub blip must never break
a deploy.

**Self-check (the filter is the only non-trivial logic):** before writing,
assert the built list has ≥1 repo, no repo owner in `EXCLUDE_OWNERS`, every
listed repo has `merged + open > 0`, and repos are sorted `merged` desc. On
violation, warn + keep the seed (non-fatal, per above) rather than publish
garbage.

### Output schema — `src/data/contributions.json` (committed as seed)
```json
{
  "totals": { "merged": 15, "open": 8, "repos": 8 },
  "repos": [
    {
      "repo": "rust-lang/rust",
      "repoUrl": "https://github.com/rust-lang/rust",
      "prsUrl": "https://github.com/rust-lang/rust/pulls?q=is%3Apr+author%3Avalentynkit",
      "merged": 9, "open": 4, "closed": 1,
      "prs": [
        { "number": 159511, "title": "std: count all processor groups…",
          "url": "https://github.com/rust-lang/rust/pull/159511",
          "state": "open", "date": "2026-07-18" }
      ]
    }
  ]
}
```
No `generatedAt` field: it is rendered nowhere and would force a diff on every
run. `totals` + per-repo counts are precomputed so the template stays dumb.
The committed file is the **seed / last-known-good**; each build overwrites it
in Vercel's ephemeral FS on fetch success. Today: 15 merged · 8 open across 8
repos (rust, agave, zellij, sig, television, beets, mailpouch, rmpc;
turso/quartz/zellij-pane-picker dropped as only-closed).

### Build wiring — `package.json`
- Prepend to `build`:
  `lint:content && node scripts/sync-contributions.mjs && astro build && node scripts/indexnow.mjs`
- Also expose standalone for local reseed:
  `"sync:contributions": "node scripts/sync-contributions.mjs"`
  (run locally to refresh the committed seed, then commit.)

## Page — `src/pages/open-source.astro`

Replaces `projects.astro`. `<h1>Open source</h1>` + intro.

**`## Projects`** — the existing curated `projects` array + `.manifest` markup,
moved verbatim from `projects.astro`. Hand-written blurbs stay (they carry the
voice).

**`## Contributions`** — imports `src/data/contributions.json`.
- Aggregate line: `{totals.merged} merged · {totals.open} open across {totals.repos} repos`.
- `repos.map` → one `<details class="repo">` each, collapsed by default, sorted
  merged-desc (the prioritization, made literal by order):
  - **`<summary>`** = pure toggle (no nested link — avoids the disclosure-button
    double-activation): repo name (mono bold) + count pills
    `● {merged} merged · ● {open} open · ● {closed} closed` (a pill renders only
    when its count > 0).
  - **body**: first line = `{repo} on GitHub ↗` (→ `repoUrl`) and
    `my {merged+open+closed} PRs ↗` (→ `prsUrl`); then a `<ul>` of `prs` →
    `#{number} {title} · {date}`, title links to `pr.url`, leading state dot.
- **No bar chart.** On this power-law distribution (9,2,1,1,1,1,0,0 merged) a
  merged-length bar is redundant ink — one full bar + identical stubs +
  invisible 0-width bars for open-only repos. The sorted order encodes rank and
  the pill count encodes magnitude; that IS the visualization.

### Colors (GitHub-semantic, native to the GitHub-dark canvas) — add to `global.css :root`
```css
--pr-merged: #a371f7;  /* purple */
--pr-open:   #3fb950;  /* green  */
--pr-closed: #f85149;  /* red, rendered dimmed via opacity on the pill */
```
Dots/pills use these; everything else reuses existing tokens (`--accent`,
`--border`, `--fg-muted`, `--font-mono`). No chart library, no client JS.

### Empty-state guard
If `repos` is empty (fetch failed on a first-ever build with no seed yet),
render a one-line fallback ("Contributions load on the next build.") instead of
an empty `## Contributions`. Normal builds always have the committed seed.

## Rename — `src/pages/experience.astro`

Move `resume.astro` → `experience.astro`. Update `<BaseHead title>` to
"Experience". Content otherwise unchanged.

## Routing + link updates

- **Redirects → `vercel.json`** (real 301s; no Astro Vercel adapter installed,
  so `astro.config` `redirects` would only emit meta-refresh HTML). Add a
  `redirects` block: `/projects → /open-source`, `/resume → /experience`,
  `permanent: true`. Preserves SEO/GEO equity (both are in the GitHub bio +
  pinned READMEs + indexed).
- `Header.astro`: nav links → `/open-source` ("open source"), `/experience`
  ("experience"), `/about`.
- Fix internal string refs (grepped — this is the complete list):
  - `src/pages/404.astro:22` — `/projects` → `/open-source`
  - `src/pages/index.astro:36` — `/resume` → `/experience`
  - `src/pages/about.astro:48` — `/resume` → `/experience`
  - `src/pages/llms.txt.ts:33-34` — `## Pages` list → `/open-source/`
    ("side projects and open-source contributions") and `/experience/`.
- `llms-full.txt.ts`: no page refs (grepped) — no change.
- `Footer.astro`: github/x/rss only (grepped) — no change.
- Sitemap: routes auto-picked-up; redirect stubs handled by Vercel, not Astro
  routes, so no sitemap filter change needed.

## Non-goals (deferred)

- Per-repo editorial blurbs (a `notes` map keyed by repo). Hook is the JSON;
  add when there's something to say.
- Draft-PR marker (drafts show as `open`; fine for now).
- Calendar-live freshness / a Vercel Deploy Hook to refresh without deploying.
  Add only if per-deploy freshness proves too stale.
- Contribution timeline / heatmap. The sorted pill list is the viz.
- Co-authored PRs where a maintainer opened the PR (`--author`/`author:` catches
  opener only). Not his flow; not worth extra machinery.

## Files touched

- **new:** `scripts/sync-contributions.mjs`, `src/data/contributions.json` (seed),
  `src/pages/open-source.astro`, `src/pages/experience.astro`
- **edit:** `package.json` (build chain + script), `vercel.json` (redirects),
  `src/components/Header.astro`, `src/styles/global.css`, `src/pages/404.astro`,
  `src/pages/about.astro`, `src/pages/index.astro`, `src/pages/llms.txt.ts`
- **delete:** `src/pages/projects.astro`, `src/pages/resume.astro`
- **no Action / no `.github/workflows/`** (build-time prefetch replaces it)
