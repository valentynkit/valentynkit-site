// llms-full.txt - every essay concatenated as markdown, so an LLM can ingest the
// full corpus in one fetch without crawling/parsing HTML. Companion to llms.txt.
import { getCollection } from 'astro:content';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';

export async function GET() {
	const posts = (await getCollection('blog')).sort(
		(a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
	);

	const header = `# ${SITE_TITLE}\n\n> ${SITE_DESCRIPTION}\n`;
	const body = posts
		.map((p) => {
			const date = p.data.pubDate.toISOString().slice(0, 10);
			return `# ${p.data.title}\n\n${date} - ${p.data.description}\n\n${p.body ?? ''}`;
		})
		.join('\n\n---\n\n');

	return new Response(`${header}\n---\n\n${body}\n`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
}
