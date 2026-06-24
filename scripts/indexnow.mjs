// Submit built URLs to IndexNow (Bing, Yandex) after a production build, so
// Bing-fed surfaces (Bing, Copilot, ChatGPT search) re-index fast. Non-fatal:
// it never fails the build. Runs only on Vercel production; skips local/preview.
import { readdir, readFile } from 'node:fs/promises';

async function run() {
	if (process.env.VERCEL_ENV !== 'production') {
		console.log('indexnow: not a production build, skipping');
		return;
	}

	const publicDir = new URL('../public/', import.meta.url);
	const files = await readdir(publicDir);
	const keyFile = files.find((f) => /^[a-f0-9]{8,}\.txt$/.test(f));
	if (!keyFile) {
		console.log('indexnow: no key file in public/, skipping');
		return;
	}
	const key = keyFile.replace(/\.txt$/, '');

	const distDir = new URL('../dist/', import.meta.url);
	const distFiles = await readdir(distDir);
	const sitemaps = distFiles.filter((f) => /^sitemap.*\.xml$/.test(f));
	const urls = new Set();
	for (const sm of sitemaps) {
		const xml = await readFile(new URL(sm, distDir), 'utf8');
		for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
			const u = m[1].trim();
			if (!u.endsWith('.xml')) urls.add(u); // skip child-sitemap entries
		}
	}
	const urlList = [...urls];
	if (urlList.length === 0) {
		console.log('indexnow: no URLs found in sitemap, skipping');
		return;
	}

	const host = new URL(urlList[0]).host;
	const body = { host, key, keyLocation: `https://${host}/${keyFile}`, urlList };
	const res = await fetch('https://api.indexnow.org/indexnow', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
		body: JSON.stringify(body),
	});
	console.log(`indexnow: submitted ${urlList.length} url(s) -> ${res.status}`);
}

run().catch((e) => console.warn('indexnow: skipped on error:', e.message));
