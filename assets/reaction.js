/*
 * Shared reaction-test logic — used by BOTH generate.js (Node, server render)
 * and tool.js (browser, runs the game) so the server-rendered stage and the
 * client behaviour agree. UMD-ish: module.exports under Node, window.RK in the
 * browser.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RK = factory();
})(typeof self !== "undefined" ? self : this, function () {

  // Per-kind metadata: the copy shown in the idle stage + the stat labels.
  const KINDS = {
    reaction: {
      label: "Reaction time",
      idle: "Click to start",
      sub: "Wait for green, then click as fast as you can.",
      lastLabel: "Your time",
      bestLabel: "Best",
      lowerIsBetter: true,
    },
    clickspeed: {
      label: "Click speed",
      idle: "Click to start",
      sub: "Click anywhere in this box as fast as you can until time runs out.",
      lastLabel: "Clicks",
      bestLabel: "Best",
      lowerIsBetter: false,
    },
    aim: {
      label: "Aim",
      idle: "Click to start",
      sub: "Targets pop up one at a time — click each as fast as you can.",
      lastLabel: "Avg / target",
      bestLabel: "Best avg",
      lowerIsBetter: true,
    },
    spacebar: {
      label: "Spacebar",
      idle: "Click to start, then tap Space",
      sub: "Tap the spacebar as many times as you can.",
      lastLabel: "Presses",
      bestLabel: "Best",
      lowerIsBetter: false,
    },
  };

  // Reaction-time verdict from milliseconds.
  function reactionRating(ms) {
    if (ms < 200) return "Superhuman";
    if (ms < 250) return "Excellent";
    if (ms < 300) return "Great";
    if (ms < 350) return "Good";
    if (ms < 450) return "Average";
    if (ms < 600) return "Slow";
    return "Keep practicing";
  }

  // clicks-per-second, rounded to 2 decimals as a number.
  function cps(count, seconds) {
    if (!seconds) return 0;
    return Math.round((count / seconds) * 100) / 100;
  }

  // Server-render the interactive stage (also the no-JS fallback: it shows the
  // instructions and a disabled-looking prompt). tool.js drives the same DOM.
  function renderArea(page) {
    const kind = page.kind;
    const k = KINDS[kind];
    const dur = page.durationSec || 0;
    const targets = page.targets || 0;
    const durSel = (kind === "clickspeed" || (kind === "spacebar" && dur > 0))
      ? `<div class="dur"><label for="dur-${page.slug}">Window</label>
         <select id="dur-${page.slug}" data-duration-sel>
           ${[1, 2, 5, 10, 30].map(s => `<option value="${s}"${s === dur ? " selected" : ""}>${s} second${s === 1 ? "" : "s"}</option>`).join("")}
         </select></div>`
      : "";
    return `<div class="tool no-print" data-kind="${kind}" data-slug="${page.slug}" data-duration="${dur}" data-targets="${targets}">
  <div class="stage" data-stage tabindex="0" role="button" aria-label="${k.label} play area">
    <div class="stage-inner">
      <div class="stage-msg" data-msg>${k.idle}</div>
      <div class="stage-sub" data-sub>${k.sub}</div>
    </div>
  </div>
  <div class="stagebar">
    <button type="button" class="go-btn" data-action="start">Start</button>
    ${durSel}
    <div class="scoreline">
      <span>${k.lastLabel}: <b data-last>—</b></span>
      <span>${k.bestLabel}: <b data-best>—</b></span>
    </div>
    <button type="button" class="reset-btn" data-action="clearbest">Clear best</button>
  </div>
</div>`;
  }

  return { KINDS, reactionRating, cps, renderArea };
});
