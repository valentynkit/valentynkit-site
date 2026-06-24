// Content slop gate. Runs in `npm run build` (local + Vercel), so a deploy fails
// if published prose carries the unambiguous AI tells. Scope is the essays in
// src/content; page copy is hand-written once and reviewed by hand.
//
// HARD = blocks the build (em dash + tells that are never good technical writing).
// WARN = printed for review but does not block (words often legit in systems prose).
// ponytail: line-based regex, no code-fence exclusion. If an em dash ever shows up
// legitimately inside a code block, add a fence-skip here.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const CONTENT_DIR = 'src/content';

const HARD = [
  { re: /—/, msg: 'em dash (—): use a hyphen or restructure' },
  { re: /\bdelve\b/i, msg: '"delve"' },
  { re: /\btapestry\b/i, msg: '"tapestry"' },
  { re: /in the ever-evolving/i, msg: '"in the ever-evolving ..."' },
  { re: /stands as a testament|a testament to/i, msg: '"... testament ..."' },
  { re: /it'?s worth noting/i, msg: '"it\'s worth noting"' },
  { re: /in today'?s (fast-paced|digital|ever)/i, msg: '"in today\'s fast-paced/digital ..."' },
  { re: /not just .{1,40}, (it'?s|but)\b/i, msg: '"not just X, it\'s/but Y" construction' },
];

const WARN = ['robust', 'seamless', 'comprehensive', 'leverage', 'pivotal', 'crucial',
  'meticulous', 'underscore', 'showcase', 'realm', 'landscape', 'elevate', 'boasts',
  'vibrant', 'groundbreaking', 'transformative', 'cutting-edge', 'foster', 'bolster'];
const WARN_RE = new RegExp('\\b(' + WARN.join('|') + ')\\b', 'gi');

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (['.md', '.mdx'].includes(extname(p))) out.push(p);
  }
  return out;
}

let files = [];
try { files = walk(CONTENT_DIR); } catch { /* no content dir yet */ }

let failures = 0, warnings = 0;
for (const file of files) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    for (const { re, msg } of HARD) {
      if (re.test(line)) { console.error(`✗ ${file}:${i + 1}  ${msg}`); failures++; }
    }
    const seen = new Set();
    let m;
    WARN_RE.lastIndex = 0;
    while ((m = WARN_RE.exec(line)) !== null) {
      const w = m[1].toLowerCase();
      if (!seen.has(w)) { console.warn(`⚠ ${file}:${i + 1}  "${m[1]}" (review)`); warnings++; seen.add(w); }
    }
  });
}

if (failures) {
  console.error(`\nlint-content: ${failures} blocking issue(s). Fix before publishing.`);
  process.exit(1);
}
console.log(`lint-content: ${files.length} file(s) clean${warnings ? `, ${warnings} warning(s) to review` : ''}.`);
