# valentynkit.com

Personal site and blog for Valentyn Kit. Essays are authored here as markdown and
deployed to Vercel. Long-form pieces are the canonical source; they are syndicated
to other platforms with canonical links pointing back here.

Built with Astro.

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
