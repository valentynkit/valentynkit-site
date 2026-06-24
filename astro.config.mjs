// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://valentynkit.com',
	integrations: [mdx(), sitemap()],
	markdown: {
		// Code blocks stay on the dark canvas in both color modes (brand decision).
		shikiConfig: { theme: 'github-dark', wrap: false },
	},
	fonts: [
		{
			// Serif is the only webfont the site loads; body prose only.
			// Source Serif 4: large x-height, sturdy on screen (EB Garamond read
			// too thin). Reading surface is light, where serif is legible.
			provider: fontProviders.google(),
			name: 'Source Serif 4',
			cssVariable: '--font-serif',
			weights: [400, 600, 700],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			fallbacks: ['Georgia', 'serif'],
		},
	],
});
