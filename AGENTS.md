## Design and brand (hold this line)

This is a deliberate credible-minimal site for a systems engineer. Read the
"Design and brand" section of `README.md` before changing anything visual, and
keep to it:

- One orange accent, light/dark tuned (`#f0883e` / `#bc4c00`). No second accent,
  no gradients, ever.
- Monospace is the brand layer (headings, nav, code, UI); `Source Serif 4` serif
  is body prose only. Prose measure stays ~68ch.
- Reading surface is light (serif-on-light is the readable standard). Code blocks
  stay on the dark GitHub canvas. The site is light only for now; don't reintroduce
  an auto dark mode that puts serif body on a dark background.
- Never add the generic tells: Inter as primary, hero illustrations, skill bars,
  GitHub stat/streak widgets, badge soup, "Hi I'm X" copy. Restraint is the brand.
- Brand tokens live in `src/styles/global.css` (CSS variables). The upstream
  source of truth is the owner's brand file; mirror changes, don't fork values.

Prose written here (essays, about, resume) must read as human-authored: no
AI-tell words (comprehensive, robust, seamless, leverage, delve), no em dashes,
no hype. Lead with the systems substance.

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
