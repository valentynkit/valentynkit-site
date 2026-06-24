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
			// Serif is the only webfont the site loads; used for body prose only.
			provider: fontProviders.google(),
			name: 'EB Garamond',
			cssVariable: '--font-serif',
			weights: [400, 500, 600, 700],
			styles: ['normal', 'italic'],
			subsets: ['latin'],
			fallbacks: ['Georgia', 'serif'],
		},
	],
});
