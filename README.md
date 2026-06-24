# valentynkit.com

Personal site and blog for Valentyn Kit. This is the canonical home for long-form
writing in the content pipeline: essays are authored here as markdown, deployed to
Vercel, and syndicated outward (Dev.to, Hashnode, X, LinkedIn, the newsletter) with
canonical links pointing back here.

Built with Astro (blog starter). The design and the wider pipeline live in the
PersonalOS repo: `docs/specs/2026-06-24-content-pipeline-stage-9-design.md`.

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
- `src/pages/` routes (index, about, rss.xml)
- `src/components/Subscribe.astro` Buttondown signup (confirm `BUTTONDOWN_USERNAME`)
- `astro.config.mjs` site URL (canonical) and integrations
- `src/consts.ts` site title and description

## Deploy

Vercel, on push. Custom domain `valentynkit.com`.
