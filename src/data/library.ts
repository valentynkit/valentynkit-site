// Curated references — books, papers, articles, talks that shaped how I think.
// Hand-edited: append an entry, set its topic (must match a TOPICS value) and
// tier, write the note in my own words. Type-checked, so a bad medium/tier/topic
// fails the build.

export type Medium = 'book' | 'paper' | 'article' | 'video' | 'talk' | 'course';
export type Tier = 'essential' | 'worth-it' | 'situational';

export type Entry = {
	title: string;
	by?: string; // author / creator / channel
	medium: Medium;
	url: string;
	topic: (typeof TOPICS)[number];
	tier?: Tier; // omit for an entry you want listed without a rating
	note?: string; // my take — why it's worth it (or not). Optional until written.
};

// Ordered; the page renders topics in this order and hides empty ones.
export const TOPICS = [
	'Systems & OS',
	'Distributed systems',
	'Rust',
	'Solana',
	'Algorithms & foundations',
	'Craft & career',
] as const;

export const TIER_LABEL: Record<Tier, string> = {
	essential: 'Essential',
	'worth-it': 'Worth it',
	situational: 'Situational',
};

export const library: Entry[] = [
	{
		title: 'Operating Systems: Three Easy Pieces',
		by: 'Remzi & Andrea Arpaci-Dusseau',
		medium: 'book',
		url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
		topic: 'Systems & OS',
		tier: 'essential',
	},
	{
		title: 'Virtual Memory: Page Tables, TLBs, and Linux Internals',
		by: 'Abhinav Upadhyay',
		medium: 'article',
		url: 'https://blog.codingconfessions.com/p/virtual-memory',
		topic: 'Systems & OS',
		tier: 'essential',
	},
	{
		title: 'The C10K problem',
		by: 'Dan Kegel',
		medium: 'article',
		url: 'https://www.cs.kent.edu/~ruttan/sysprog/lectures/select/c10k.html',
		topic: 'Systems & OS',
		tier: 'situational',
	},
	{
		title: 'Designing Data-Intensive Applications',
		by: 'Martin Kleppmann',
		medium: 'book',
		url: 'https://dataintensive.net/',
		topic: 'Distributed systems',
		tier: 'essential',
	},
	{
		title: 'Time, Clocks, and the Ordering of Events in a Distributed System',
		by: 'Leslie Lamport',
		medium: 'paper',
		url: 'https://lamport.azurewebsites.net/pubs/time-clocks.pdf',
		topic: 'Distributed systems',
		tier: 'essential',
	},
	{
		title: 'MapReduce: Simplified Data Processing on Large Clusters',
		by: 'Jeffrey Dean & Sanjay Ghemawat',
		medium: 'paper',
		url: 'https://research.google.com/archive/mapreduce-osdi04.pdf',
		topic: 'Distributed systems',
		tier: 'worth-it',
		note: 'A great starting point for reasoning about fault tolerance and distributed state.',
	},
	{
		title: 'The Google File System',
		by: 'Ghemawat, Gobioff & Leung',
		medium: 'paper',
		url: 'https://research.google.com/archive/gfs-sosp2003.pdf',
		topic: 'Distributed systems',
		tier: 'worth-it',
		note: 'Also good — and works great in combo with MapReduce.',
	},
	{
		title: 'MIT 6.824: Distributed Systems (Spring 2020)',
		by: 'MIT 6.824',
		medium: 'video',
		url: 'https://www.youtube.com/playlist?list=PLrw6a1wE39_tb2fErI4-WkMbsvGQk9_UB',
		topic: 'Distributed systems',
		tier: 'situational',
		note: 'Time-consuming, but worth it at 1.5x+ for deeper dives on distributed systems.',
	},
	{
		title: 'Database Internals',
		by: 'Alex Petrov',
		medium: 'book',
		url: 'https://www.databass.dev/',
		topic: 'Distributed systems',
		tier: 'situational',
		note: 'Like it — but a bit too dry and academic.',
	},
	{
		title: 'The Rust Programming Language',
		by: 'Steve Klabnik & Carol Nichols',
		medium: 'book',
		url: 'https://doc.rust-lang.org/book/',
		topic: 'Rust',
		tier: 'situational',
	},
	{
		title: 'Grokking Algorithms',
		by: 'Aditya Bhargava',
		medium: 'book',
		url: 'https://www.manning.com/books/grokking-algorithms',
		topic: 'Algorithms & foundations',
		note: 'Pretty basic and a bit shallow — did not love it.',
	},
];
