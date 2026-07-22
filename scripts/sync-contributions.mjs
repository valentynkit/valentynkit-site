// Fetch this author's pull requests to repos they don't own, group by repo,
// and write the small JSON the /open-source page renders. Runs at build time
// (see package.json `build`). A failure is non-fatal: the committed
// src/data/contributions.json is the last-known-good seed the build falls back
// to, so a GitHub blip never breaks a deploy.
//
// The REST search endpoint returns state open|closed only; a merged PR reports
// state:"closed" with pull_request.merged_at set, so merged is derived from
// merged_at, not state.

import { mkdirSync, writeFileSync } from 'node:fs';

const AUTHOR = 'valentynkit';
const EXCLUDE_OWNERS = ['valentynkit']; // own repos live in the ## Projects section
const KEEP_STATES = ['merged', 'open']; // states whose PRs get listed individually
const HIDE_REPOS = new Set([]); // force-hide "owner/repo" regardless of counts
const OUT = new URL('../src/data/contributions.json', import.meta.url);
const API = 'https://api.github.com/search/issues';

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

async function fetchAllPRs() {
	const headers = {
		Accept: 'application/vnd.github+json',
		'User-Agent': AUTHOR,
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
	const q = encodeURIComponent(`type:pr author:${AUTHOR}`);
	const perPage = 100;
	const items = [];
	// Search API caps at 1000 results (10 pages); the loop also stops once we
	// have them all. The cap is a runaway guard, not a real limit here.
	for (let page = 1; page <= 10; page++) {
		const res = await fetch(`${API}?q=${q}&per_page=${perPage}&page=${page}`, { headers });
		if (!res.ok) throw new Error(`GitHub API ${res.status} ${res.statusText}`);
		const data = await res.json();
		items.push(...data.items);
		if (items.length >= data.total_count || data.items.length < perPage) break;
	}
	return items;
}

function prState(item) {
	if (item.pull_request?.merged_at) return 'merged';
	return item.state === 'open' ? 'open' : 'closed';
}

function buildData(items) {
	const byRepo = new Map();
	for (const item of items) {
		const repo = item.repository_url.replace('https://api.github.com/repos/', '');
		if (EXCLUDE_OWNERS.includes(repo.split('/')[0]) || HIDE_REPOS.has(repo)) continue;
		if (!byRepo.has(repo)) byRepo.set(repo, []);
		byRepo.get(repo).push({
			number: item.number,
			title: item.title,
			url: item.html_url,
			state: prState(item),
			date: item.created_at.slice(0, 10),
		});
	}

	const repos = [];
	for (const [repo, prs] of byRepo) {
		const count = (s) => prs.filter((p) => p.state === s).length;
		const merged = count('merged');
		const open = count('open');
		if (merged + open === 0) continue; // only-closed repo = rejection noise
		repos.push({
			repo,
			repoUrl: `https://github.com/${repo}`,
			prsUrl: `https://github.com/${repo}/pulls?q=is%3Apr+author%3A${AUTHOR}`,
			merged,
			open,
			closed: count('closed'),
			prs: prs
				.filter((p) => KEEP_STATES.includes(p.state))
				.sort((a, b) => b.date.localeCompare(a.date)),
		});
	}

	repos.sort(
		(a, b) =>
			b.merged - a.merged ||
			b.open - a.open ||
			(b.prs[0]?.date ?? '').localeCompare(a.prs[0]?.date ?? ''),
	);

	return {
		totals: {
			merged: repos.reduce((n, r) => n + r.merged, 0),
			open: repos.reduce((n, r) => n + r.open, 0),
			repos: repos.length,
		},
		repos,
	};
}

// The filter is the only non-trivial logic; assert it before publishing.
function selfCheck({ repos }) {
	if (repos.length < 1) throw new Error('no repos survived the filter');
	for (const r of repos) {
		if (EXCLUDE_OWNERS.includes(r.repo.split('/')[0])) throw new Error(`own repo leaked: ${r.repo}`);
		if (r.merged + r.open === 0) throw new Error(`only-closed repo leaked: ${r.repo}`);
	}
	for (let i = 1; i < repos.length; i++) {
		if (repos[i].merged > repos[i - 1].merged) throw new Error('repos not sorted by merged desc');
	}
}

try {
	const data = buildData(await fetchAllPRs());
	selfCheck(data);
	mkdirSync(new URL('.', OUT), { recursive: true });
	writeFileSync(OUT, JSON.stringify(data, null, '\t') + '\n');
	console.log(
		`contributions: ${data.totals.merged} merged · ${data.totals.open} open across ${data.totals.repos} repos`,
	);
} catch (err) {
	// Non-fatal: keep the committed seed and let the build proceed.
	console.warn(`contributions sync skipped (keeping seed): ${err.message}`);
}
