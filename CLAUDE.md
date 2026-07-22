# CLAUDE.md — reactionkit

Project instructions for Claude Code working in this repo. Inherits the ElevatedProgress
venture playbook from the parent folder's CLAUDE.md.

## What this is

A zero-dependency static-site generator for **free online reaction & speed mini-tests**
(reaction time, click speed / CPS, spacebar speed, aim trainer). `generate.js` reads
`data/tests.json` + `assets/` and writes one interactive page per test into `public/`.
Target: https://reaction.elevatedprogress.com/. These are high-volume, mass-generatable
query families ("reaction time test", "cps test", "5 second click test", "aim trainer") —
a general-consumer audience playing quick games, low ad-block.

## The product rule

**The tool IS the page.** Unlike the printable tools, this one is *interactive*: each page
server-renders the play area (SEO + a meaningful no-JS view of the instructions), and
`assets/tool.js` turns that same DOM into a live game. Everything is client-side and
self-contained — no network, no uploads. Timing uses `performance.now()`; best scores
persist in `localStorage`. Never add a backend or accounts.

Shared test metadata + the stage renderer live in `assets/reaction.js`, a UMD module
required by BOTH `generate.js` (server render) and `tool.js` (browser) so their output
agrees — same pattern as calendarkit's `cal.js`.

### Test kinds (in tool.js)

- `reaction` — idle → waiting (red) → go (green) → result; measures ms. Clicking during
  "waiting" is a **too-soon** miss. Lower is better.
- `clickspeed` — timed window; counts clicks; CPS = clicks / seconds. Higher is better.
  Window length is chosen per page (`durationSec`) and adjustable via the selector.
- `aim` — N targets (`targets`) pop up one at a time; reports avg ms/target. Lower better.
- `spacebar` — counts spacebar presses. `durationSec: 0` = untimed counter;
  `durationSec > 0` = timed window with presses/sec.

Each `.tool` element gets a controller on `el.__rk` (also pushed to `window.__rkGames`)
exposing deterministic test hooks (`testStart`, `testFireGo`, `testEnd`, `setWaitOverride`,
`lastValue`, `lastCps`) — keep these working; they're how the build is verified.

## Deploy — just push

`git push` to `main` is the deploy — GitHub Actions (`.github/workflows/deploy.yml`).

- **Never manually build and commit output.** `public/` is git-ignored build output.
- **Never hand-edit anything in `public/`.**
- Commit as the neutral identity:
  `git -c user.name="reactionkit" -c user.email="reactionkit@users.noreply.github.com" commit …`

## Local build / preview

```
node generate.js     # writes ./public
node server.js       # preview at http://localhost:5085
```

## Don't break these (generated, must keep serving)

- `ads.txt` + AdSense loader in `<head>` — publisher `ca-pub-5580575158570188`.
- GA4 `G-TJY4TRRKD6` (shared across all EP sites; hostname splits them).
- `sitemap.xml`, `robots.txt`, `.nojekyll`, `CNAME` (reaction.elevatedprogress.com).
- GSC verification file once the property is verified.

## Config knobs

`DOMAIN` and `BASE`, same semantics as the other tools. Production values in the workflow.
