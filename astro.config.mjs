// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://valentynkit.com',
	// Keep the subscribe-flow landing pages (Buttondown redirects) out of the sitemap.
	integrations: [mdx(), sitemap({ filter: (page) => !/\/(confirm|welcome)\/?$/.test(page) })],
	markdown: {
		// Code blocks stay on the dark canvas in both color modes (brand decision).
		shikiConfig: { theme: 'github-dark', wrap: false },
	},
	fonts: [
		{
			// Body is the only webfont the site loads. IBM Plex Sans: engineering
			// pedigree, reads cleanly on the dark surface (serif died on dark).
			// The brand layer (wordmark, headings, nav, code) is the system mono
			// stack, no font load.
			provider: fontProviders.google(),
			name: 'IBM Plex Sans',
			cssVariable: '--font-sans',
			weights: [400, 600, 700],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			fallbacks: ['system-ui', 'sans-serif'],
		},
	],
});
