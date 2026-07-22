// llms.txt - curated markdown map of the site for LLMs and humans pasting links
// into an assistant. Follows the llmstxt.org shape (H1, summary blockquote, prose,
// H2 link sections, an Optional section). No proven citation effect; a cheap,
// well-formed hedge that also yields a clean machine-readable index.
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET(context) {
	const site = context.site;
	const posts = (await getCollection('blog')).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);

	const lines = [
		`# ${SITE_TITLE}`,
		'',
		`> ${SITE_DESCRIPTION}`,
		'',
		'Distributed-systems and platform engineer. I lead the Rust core of a',
		'self-custody wallet that moves money for 200,000 people, and on nights and',
		'weekends I rebuild the layer underneath from scratch (a database, a TCP',
		'server, a Solana indexer) to learn how the real ones work. The writing is',
		'first-principles and no-hype: one level below and one level above.',
		'',
		'## Writing',
		...posts.map(
			(p) =>
				`- [${p.data.title}](${new URL(`/blog/${p.id}/`, site).href}): ${p.data.description}`,
		),
		'',
		'## Pages',
		`- [About](${new URL('/about/', site).href}): who I am, the work, and where I am headed.`,
		`- [Open source](${new URL('/open-source/', site).href}): side projects in C and Rust built from scratch, and merged contributions to rust-lang, Solana/agave, and other upstreams.`,
		`- [Experience](${new URL('/experience/', site).href}): work history and skills.`,
		'',
		'## Optional',
		`- [Full text of all essays](${new URL('/llms-full.txt', site).href}): every post concatenated as markdown.`,
		`- [RSS feed](${new URL('/rss.xml', site).href})`,
		'',
	];

	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
}
