# valentynkit.com

Personal site and blog for Valentyn Kit. Essays are authored here as markdown and
deployed to Vercel. Long-form pieces are the canonical source; they are syndicated
to other platforms with canonical links pointing back here.

Built with Astro. Writing-first, fast, no client JS beyond privacy-friendly
analytics.

## Commands

Run from the repo root:

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at localhost:4321 |
| `npm run build` | Build to ./dist/ |
| `npm run preview` | Preview the build |

## Structure

- `src/content/blog/` essays (markdown), the source of truth
- `src/pages/` routes: `index` (feed-first home), `blog/` (writing index + posts),
  `about`, `projects` (links out to GitHub), `resume`, `rss.xml`
- `src/layouts/BlogPost.astro` post layout (serif prose at the measure)
- `src/components/` `BaseHead` (meta + canonical + OG + JSON-LD), `Header`,
  `Footer`, `Subscribe` (Buttondown signup), `FormattedDate`
- `src/styles/global.css` brand tokens (CSS variables) and base styles
- `astro.config.mjs` canonical site URL, fonts, Shiki, sitemap
- `src/consts.ts` site title and description
- `src/assets/og-default.svg` source for the default social image

## Design and brand

The visual brand is deliberate and minimal, matched to the GitHub house style
(wordmark and social banners). Hold this line; do not drift toward generic
template aesthetics.

- **Color (GitHub-dark palette, one orange accent, light/dark tuned):** canvas
  `#0d1117`/`#ffffff`, text `#e6edf3`/`#1f2328`, accent `#f0883e` (dark) /
  `#bc4c00` (light). One accent hue only. No second accent, no gradient ever.
- **Type:** monospace is the brand layer (wordmark, headings, nav, UI, code) via
  the system stack `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas`
  (zero font load). `IBM Plex Sans` is the body prose, the only webfont loaded, at
  18px / 1.7 line-height. Prose measure is `70ch`.
- **Reading surface:** dark only (GitHub-dark `#0d1117`). Body text is softened
  off-white `#c9d1d9` (not pure white, to avoid glare); headings `#f0f6fc`. Body
  is a sans, not a serif, because serif strokes read too thin on dark. No light
  mode (it was tried and rejected).
- **Code blocks:** Shiki `github-dark` on a raised dark panel `#161b22`.
- **Feed:** writing lists are changelog-style (a monospace date column with
  hairline rules), the "systems log" motif. One restrained page-load reveal
  (reduced-motion respected).
- **Accessibility:** skip-to-content link, visible focus rings, an `h1` per page,
  and prev / next / back links on posts.

Avoid: Inter as the primary face, gradients, hero illustrations, skill bars,
GitHub stat/streak cards, badge soup, "Hi I'm X" copy. Restraint is the point.

## SEO

Canonical host is the apex `valentynkit.com` (www 308-redirects). Every page emits
a self-referencing canonical, Open Graph and Twitter cards, and JSON-LD
(`Person` + `WebSite` site-wide; `BlogPosting` + `BreadcrumbList` per post). A
sitemap and full RSS feed are generated at build. Syndicated copies elsewhere set
their canonical back here; publish here first, let it index, then syndicate.

## Deploy

Vercel, on push to `main`. Custom domain `valentynkit.com` (apex canonical).
Vercel Analytics and Speed Insights are enabled.
