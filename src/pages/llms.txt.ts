// llms.txt: a curated markdown index of the site for LLMs and humans pasting
// links into an assistant. No proven citation effect, kept as a near-zero-cost
// hedge that also produces a clean machine-readable map of the writing.
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
		'## Writing',
		...posts.map(
			(p) =>
				`- [${p.data.title}](${new URL(`/blog/${p.id}/`, site).href}): ${p.data.description}`,
		),
		'',
		'## Pages',
		`- [About](${new URL('/about/', site).href})`,
		`- [Projects](${new URL('/projects/', site).href})`,
		`- [Resume](${new URL('/resume/', site).href})`,
		'',
	];

	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
}
