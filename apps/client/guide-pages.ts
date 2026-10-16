import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import type { Plugin } from 'vite';

/**
 * Serves the player's guide and the combat rules as searchable pages next to
 * the game, built from the Markdown in docs/ so there is one source. In
 * development the pages are rendered on request; a build writes them into
 * dist, where the game host serves them like any other file.
 */

const DOCS = fileURLToPath(new URL('../../docs/', import.meta.url));

const PAGES: Record<string, { source: string; title: string; blurb: string }> = {
  'guide.html': {
    source: 'players-guide.md',
    title: 'Player’s guide',
    blurb: 'How to play, in the order you meet things. Type to search; Esc clears.',
  },
  'combat-rules.html': {
    source: 'combat-rules.md',
    title: 'Combat rules',
    blurb: 'The arithmetic behind a fight, with worked examples. Type to search; Esc clears.',
  },
};

/** Links between the documents, rewritten from the Markdown file names to the served pages, with readable link text. */
const LINKS: Record<string, { page: string; text: string }> = {
  'players-guide.md': { page: 'guide.html', text: 'the player’s guide' },
  'combat-rules.md': { page: 'combat-rules.html', text: 'the combat rules' },
};

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const marked = new Marked({
  gfm: true,
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth} id="${slug(text)}">${text}</h${depth}>\n`;
    },
  },
});

export function renderPage(name: string): string {
  const page = PAGES[name];
  if (!page) throw new Error(`No such page: ${name}`);
  let md = readFileSync(DOCS + page.source, 'utf8');
  for (const [from, to] of Object.entries(LINKS)) md = md.split(`[${from}](${from}`).join(`[${to.text}](${to.page}`).split(`](${from}`).join(`](${to.page}`);
  // The first heading is the page title; the header carries it instead.
  md = md.replace(/^# .*\n/, '');
  const body = marked.parse(md, { async: false }) as string;

  // Each second-level heading starts a section, so the search can show and hide whole topics.
  const parts = body.split(/(?=<h2 )/);
  const sections = parts.map((p) => `<section>${p}</section>`).join('\n');
  const toc = [...body.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)].map(([, id, text]) => `<li><a href="#${id}">${text}</a></li>`).join('');
  const others = Object.entries(PAGES)
    .filter(([n]) => n !== name)
    .map(([n, p]) => `<a href="${n}">${p.title}</a>`)
    .join(' · ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WW2Hex – ${escapeHtml(page.title)}</title>
<style>
:root {
  --bg: #f1eee4; --panel: #fbfaf6; --ink: #23211b; --muted: #6d675a; --line: #d9d3c3; --accent: #305b8a; --topbar: #2b2a25;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.55; color: var(--ink); background: var(--bg);
}
* { box-sizing: border-box; }
body { margin: 0; }
header { position: sticky; top: 0; z-index: 2; background: var(--topbar); color: #f3f0e6; padding: 10px 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; box-shadow: 0 2px 8px rgb(0 0 0 / 0.25); }
header .brand { font-weight: 700; font-size: 16px; white-space: nowrap; }
header .brand span { font-weight: 400; color: #c9c3b2; margin-left: 8px; }
header .others { color: #c9c3b2; font-size: 13px; }
header .others a { color: #f3f0e6; }
header form { display: flex; align-items: center; gap: 8px; margin-left: auto; flex: 1 1 260px; max-width: 460px; }
header input { flex: 1; min-width: 0; font: inherit; padding: 6px 10px; border: 1px solid #5a584f; border-radius: 6px; background: #f8f6ef; color: var(--ink); }
header input:focus { outline: 2px solid #b38f2e; outline-offset: 1px; }
header button { font: inherit; font-size: 13px; padding: 5px 10px; border: 1px solid #5a584f; border-radius: 6px; background: #3b3a33; color: #f3f0e6; cursor: pointer; }
header .count { font-size: 13px; color: #c9c3b2; white-space: nowrap; min-width: 9em; }
main { max-width: 860px; margin: 0 auto; padding: 18px 16px 60px; }
.blurb { color: var(--muted); margin: 0 0 14px; }
nav.toc { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 10px 16px; margin: 0 0 20px; columns: 2; column-gap: 24px; }
nav.toc ul { margin: 0; padding-left: 18px; }
nav.toc li { break-inside: avoid; }
section { scroll-margin-top: 70px; }
section[hidden] { display: none; }
h2 { font-size: 20px; margin: 30px 0 8px; padding-top: 10px; border-top: 1px solid var(--line); }
h3 { font-size: 16px; margin: 20px 0 6px; }
h2:target, h3:target { color: var(--accent); }
a { color: var(--accent); }
code { font-size: 0.92em; background: #e9e5d8; padding: 1px 3px; border-radius: 3px; }
blockquote { margin: 10px 0; padding: 6px 14px; border-left: 3px solid var(--line); background: var(--panel); }
table { border-collapse: collapse; width: 100%; margin: 10px 0 14px; font-size: 14px; }
th { text-align: left; font-weight: 600; color: var(--muted); border-bottom: 1px solid var(--line); padding: 4px 8px 4px 0; vertical-align: bottom; }
td { border-bottom: 1px dotted var(--line); padding: 5px 8px 5px 0; vertical-align: top; }
ul, ol { padding-left: 22px; }
li { margin: 3px 0; }
mark { background: #ffe066; color: inherit; padding: 0 1px; border-radius: 2px; }
.none { color: var(--muted); font-style: italic; margin: 30px 0; }
@media (max-width: 600px) { nav.toc { columns: 1; } header .count { min-width: 0; } }
@media print { header { position: static; } header form { display: none; } }
</style>
</head>
<body>
<header>
  <div class="brand">WW2Hex <span>${escapeHtml(page.title)}</span></div>
  <div class="others">Also: ${others}</div>
  <form role="search" onsubmit="return false">
    <input id="q" type="search" placeholder="Search this guide…" autocomplete="off" aria-label="Search">
    <span class="count" id="count" aria-live="polite"></span>
    <button type="button" id="clear">Clear</button>
  </form>
</header>
<main>
  <p class="blurb">${escapeHtml(page.blurb)}</p>
  <nav class="toc" id="toc"><ul>${toc}</ul></nav>
  <article id="doc">
${sections}
  </article>
  <p class="none" id="none" hidden>Nothing matches. Try a shorter word.</p>
</main>
<script>
(() => {
  const q = document.getElementById('q'), count = document.getElementById('count'), clear = document.getElementById('clear');
  const toc = document.getElementById('toc'), none = document.getElementById('none');
  const sections = [...document.querySelectorAll('#doc > section')].map((el) => ({ el, html: el.innerHTML, text: el.textContent.toLowerCase() }));
  let timer = 0;
  function highlight(root, needle) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let hits = 0;
    for (const node of nodes) {
      const text = node.nodeValue, lower = text.toLowerCase();
      let i = lower.indexOf(needle);
      if (i < 0) continue;
      const frag = document.createDocumentFragment();
      let last = 0;
      while (i >= 0) {
        frag.appendChild(document.createTextNode(text.slice(last, i)));
        const m = document.createElement('mark');
        m.textContent = text.slice(i, i + needle.length);
        frag.appendChild(m);
        hits++;
        last = i + needle.length;
        i = lower.indexOf(needle, last);
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    }
    return hits;
  }
  function search() {
    const needle = q.value.trim().toLowerCase();
    let hits = 0, shown = 0;
    for (const s of sections) {
      s.el.innerHTML = s.html;
      const match = needle.length > 0 && s.text.includes(needle);
      s.el.hidden = needle.length > 0 && !match;
      if (match) { shown++; hits += highlight(s.el, needle); }
    }
    toc.hidden = needle.length > 0;
    none.hidden = needle.length === 0 || shown > 0;
    count.textContent = needle.length === 0 ? '' : shown === 0 ? 'no matches' : hits + (hits === 1 ? ' match in ' : ' matches in ') + shown + (shown === 1 ? ' section' : ' sections');
    if (needle.length > 0) {
      const first = document.querySelector('#doc mark');
      if (first) first.scrollIntoView({ block: 'center' });
    }
  }
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(search, 120); });
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { q.value = ''; search(); } });
  clear.addEventListener('click', () => { q.value = ''; search(); q.focus(); });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && document.activeElement !== q) { e.preventDefault(); q.focus(); } });
  const initial = new URLSearchParams(location.search).get('q');
  if (initial) { q.value = initial; search(); }
})();
</script>
</body>
</html>
`;
}

export function guidePages(): Plugin {
  return {
    name: 'ww2hex-guide-pages',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? '').split('?')[0]!.replace(/^\//, '');
        if (!(name in PAGES)) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(renderPage(name));
      });
    },
    generateBundle() {
      for (const name of Object.keys(PAGES)) this.emitFile({ type: 'asset', fileName: name, source: renderPage(name) });
    },
  };
}
