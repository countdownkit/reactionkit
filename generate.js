/*
 * Static generator for the reaction/speed mini-test site.
 * Run: node generate.js   ->   writes everything into ./public
 *
 * Page families:
 *   /<test-slug>/   one interactive mini-test (reaction, click speed, aim, spacebar)
 *   /               homepage grid, grouped by test family
 *
 * The tool IS the page: each page server-renders the play area (SEO + a
 * meaningful no-JS view); assets/tool.js turns it into the live game. Timing
 * uses performance.now(); best scores persist in localStorage. Everything is
 * client-side and self-contained.
 */
const fs = require("fs");
const path = require("path");
const RK = require("./assets/reaction.js");

// ---- config -------------------------------------------------------------
const DOMAIN = process.env.DOMAIN || "https://reaction.elevatedprogress.com";
const BASE = process.env.BASE || "";
const SITE = "Reaction Test";
const OUT = path.join(__dirname, "public");
const ASSETS = path.join(__dirname, "assets");
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "tests.json"), "utf8"));

const TESTS = DATA.tests;
const GROUPS = DATA.groups;

// ---- html layout --------------------------------------------------------
function layout({ title, desc, urlPath, h1, body }) {
  const canonical = DOMAIN + BASE + urlPath;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="${BASE}/styles.css">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5580575158570188" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-TJY4TRRKD6"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-TJY4TRRKD6');</script>
</head>
<body>
<header class="site-head"><div class="wrap">
  <a class="brand" href="${BASE}/">⚡ ${SITE}</a>
  <nav class="nav"><a href="${BASE}/#reflexes">Reflexes</a><a href="${BASE}/#click">Click speed</a><a href="${BASE}/#aim">Aim</a></nav>
</div></header>
<main class="wrap">
  <div class="crumbs"><a href="${BASE}/">Home</a> ›&nbsp;${h1}</div>
  <h1>${h1}</h1>
  ${body}
</main>
<footer class="site-foot"><div class="wrap">
  <a href="${BASE}/">Home</a><a href="${BASE}/#reflexes">Reflex tests</a><a href="${BASE}/#click">Click speed tests</a>
  <span>· ${SITE} — free online reaction and speed tests. No downloads, no signups: press start and play. Part of <a href="https://elevatedprogress.com/">Elevated Progress</a>. · <a href="https://elevatedprogress.com/about/">About</a> · <a href="https://elevatedprogress.com/contact/">Contact</a> · <a href="https://elevatedprogress.com/privacy/">Privacy Policy</a></span>
</div></footer>
<script src="${BASE}/reaction.js"></script>
<script src="${BASE}/tool.js" defer></script>
</body>
</html>`;
}
function grid(links) {
  return `<div class="grid">` + links.map(l =>
    `<a href="${BASE}${l.href}">${l.emoji ? `<span class="chip-emoji">${l.emoji}</span>` : ""}${l.label}</a>`).join("") + `</div>`;
}

// ---- write helpers ------------------------------------------------------
const urls = [];
function writePage(urlPath, html) {
  const dir = path.join(OUT, urlPath.replace(/^\/+|\/+$/g, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
  urls.push(urlPath);
}

const testLink = t => ({ href: `/${t.slug}/`, emoji: GROUP_EMOJI[t.group], label: t.nav });
const GROUP_EMOJI = { reflexes: "⚡", click: "🖱️", aim: "🎯" };

// ---- page builder -------------------------------------------------------
function testPage(t) {
  const groupLabel = (GROUPS.find(g => g.id === t.group) || {}).label || "";
  const siblings = TESTS.filter(o => o.group === t.group && o.slug !== t.slug).map(testLink);
  const others = TESTS.filter(o => o.group !== t.group).slice(0, 4).map(testLink);
  const related = siblings.concat(others);
  const body = `<p class="lead">${firstSentence(t.blurb)}</p>
  ${RK.renderArea(t)}
  <div class="ad-slot">Advertisement</div>
  <div class="prose">
    <p>${t.blurb}</p>
    <p>${t.tip}</p>
    <p><b>How it works:</b> everything runs in your browser — timing uses a high-resolution clock (<code>performance.now()</code>) and your best score is saved on this device only. Nothing is uploaded, and there's nothing to install.</p>
  </div>
  <h2>More ${groupLabel.toLowerCase()}</h2>
  ${grid(related)}
  <div class="ad-slot">Advertisement</div>`;
  writePage(`/${t.slug}/`, layout({
    title: `${t.title} — Free Online, No Signup`,
    desc: t.desc,
    urlPath: `/${t.slug}/`,
    h1: t.title,
    body,
  }));
}

function firstSentence(s) {
  const i = s.indexOf(". ");
  return i === -1 ? s : s.slice(0, i + 1);
}

// ---- build --------------------------------------------------------------
fs.mkdirSync(OUT, { recursive: true });
for (const entry of fs.readdirSync(OUT)) {
  if (entry === ".git" || entry === "CNAME") continue;
  fs.rmSync(path.join(OUT, entry), { recursive: true, force: true });
}
for (const f of fs.readdirSync(ASSETS)) fs.copyFileSync(path.join(ASSETS, f), path.join(OUT, f));

// individual test pages
for (const t of TESTS) testPage(t);

// -- homepage --
{
  const title = `Reaction Test — Free Online Reaction, Click Speed & Aim Tests`;
  const desc = `Free online reflex and speed tests: reaction time, click speed (CPS), spacebar speed and an aim trainer. Press start and play — no downloads, no signup, best scores saved on your device.`;
  const sections = GROUPS.map(g => {
    const links = TESTS.filter(t => t.group === g.id).map(testLink);
    return `<h2 id="${g.id}">${g.label}</h2>\n  ${grid(links)}`;
  }).join("\n  ");
  const body = `<p class="lead">Quick, honest reflex and speed tests you can play in the browser. Pick one, press start, and see your number — reaction time in milliseconds, clicks per second, or aim accuracy. Every test saves your best score on your device; nothing is uploaded and there's nothing to install.</p>
  ${sections}
  <div class="ad-slot">Advertisement</div>
  <div class="prose"><p>These are real, self-contained mini-tests, not videos or quizzes: the play area you see on each page is the tool. Timing uses your browser's high-resolution clock, so a reaction-time or clicks-per-second result is measured, not guessed. Take a few goes — reflexes are streaky — and try to beat the best score stored on your device.</p></div>`;
  writePage(`/`, layout({ title, desc, urlPath: `/`, h1: `Reaction & Speed Tests`, body }));
}

// -- sitemap + robots + meta files --
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${DOMAIN}${BASE}${u}</loc></url>`).join("\n")}
</urlset>`;
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}${BASE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");
fs.writeFileSync(path.join(OUT, "CNAME"), "reaction.elevatedprogress.com\n");
fs.writeFileSync(path.join(OUT, "ads.txt"), "google.com, pub-5580575158570188, DIRECT, f08c47fec0942fa0\n");

console.log(`Generated ${urls.length} pages into ./public`);
