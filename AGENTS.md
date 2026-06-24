## Design and brand (hold this line)

This is a deliberate credible-minimal site for a systems engineer. Read the
"Design and brand" section of `README.md` before changing anything visual, and
keep to it:

- One orange accent, light/dark tuned (`#f0883e` / `#bc4c00`). No second accent,
  no gradients, ever.
- Monospace is the brand layer (headings, nav, code, UI); `IBM Plex Sans` is body
  prose only. Prose measure stays ~70ch.
- Reading surface is dark only (GitHub-dark `#0d1117`); body text softened off-white.
  Body is a sans, not a serif (serif strokes die on dark). Do not reintroduce a
  light surface or a serif body, both were tried and reverted.
- Never add the generic tells: Inter as primary, hero illustrations, skill bars,
  GitHub stat/streak widgets, badge soup, "Hi I'm X" copy. Restraint is the brand.
- Brand tokens live in `src/styles/global.css` (CSS variables). The upstream
  source of truth is the owner's brand file; mirror changes, don't fork values.

Prose written here (essays, about, resume) must read as human-authored: no
AI-tell words (comprehensive, robust, seamless, leverage, delve), no em dashes,
no hype. Lead with the systems substance.

## SEO + GEO (hold this line)

The site is built for search + AI-answer-engine citation. Keep these invariants
(this is the self-contained checklist; the full reasoning lives in the owner's
notes):

- Stay statically rendered. AI crawlers do not run JS; never move key text, schema,
  or meta into client-rendered islands. Verify with `curl`, not the inspector.
- One canonical host (apex), self-referencing canonical on every page, single
  redirect hop, consistent trailing slash; `*.vercel.app` stays noindex.
- Keep the entity graph: `Person` (`@id` + `knowsAbout` + `sameAs` to
  GitHub/LinkedIn/X), `ProfilePage` on /about, per-post `BlogPosting` (author by
  `@id`, `datePublished` + `dateModified`). `sameAs` URLs identical and canonical.
- `robots.txt` allows search/citation bots and names the sitemap; sitemap carries
  real `lastmod`. Submit to Bing + Google; IndexNow on publish.
- Performance: LCP image eager + `fetchpriority="high"` (never lazy); webfont
  self-hosted + preloaded. Targets LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Per essay: real-name byline, answer-first lead, self-contained sections with
  question-style headings, statistics + quotations + cited sources, a comparison
  table where there is a tradeoff, concrete specifics, visible last-updated date.
- Skip the dead stuff: FAQ/HowTo schema, `WebSite` SearchAction, treating
  `llms.txt` as a citation booster.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
