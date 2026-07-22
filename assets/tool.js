/*
 * tool.js — runs every mini-test on the page. Each .tool element gets its own
 * game controller (stored on el.__rk and pushed to window.__rkGames) so the
 * behaviour is drivable/inspectable for tests. Timing uses performance.now().
 */
(function () {
  var RK = window.RK;
  var now = function () { return performance.now(); };

  function fmtMs(ms) { return Math.round(ms) + " ms"; }

  function makeGame(el) {
    var kind = el.dataset.kind;
    var slug = el.dataset.slug;
    var meta = RK.KINDS[kind];
    var stage = el.querySelector("[data-stage]");
    var msg = el.querySelector("[data-msg]");
    var sub = el.querySelector("[data-sub]");
    var lastEl = el.querySelector("[data-last]");
    var bestEl = el.querySelector("[data-best]");
    var startBtn = el.querySelector('[data-action="start"]');
    var clearBtn = el.querySelector('[data-action="clearbest"]');
    var durSel = el.querySelector("[data-duration-sel]");

    var state = "idle";
    var goTimer = null, endTimer = null;
    var goTime = 0, count = 0, targetsDone = 0, sumMs = 0, targetShownAt = 0;
    var targetEl = null;

    // ---- best score (localStorage) ------------------------------------
    function durationSec() {
      if (durSel) return parseInt(durSel.value, 10) || 0;
      return parseInt(el.dataset.duration, 10) || 0;
    }
    function bestKey() {
      var d = durationSec();
      return "rk:" + slug + (d ? ":" + d : "");
    }
    function getBest() {
      var v = null;
      try { v = localStorage.getItem(bestKey()); } catch (e) {}
      return v === null ? null : parseFloat(v);
    }
    function setBest(v) { try { localStorage.setItem(bestKey(), String(v)); } catch (e) {} }
    function betterThan(v, best) {
      if (best === null || isNaN(best)) return true;
      return meta.lowerIsBetter ? v < best : v > best;
    }
    function fmtScore(v) {
      if (v === null || isNaN(v)) return "—";
      if (kind === "reaction" || kind === "aim") return fmtMs(v);
      return String(v);
    }
    function renderBest() { bestEl.textContent = fmtScore(getBest()); }

    // ---- helpers ------------------------------------------------------
    function setStage(cls, message, subtext) {
      stage.className = "stage" + (cls ? " " + cls : "");
      if (message != null) msg.textContent = message;
      if (subtext != null) sub.textContent = subtext;
    }
    function clearTimers() {
      if (goTimer) { clearTimeout(goTimer); goTimer = null; }
      if (endTimer) { clearTimeout(endTimer); endTimer = null; }
    }
    function removeTarget() {
      if (targetEl && targetEl.parentNode) targetEl.parentNode.removeChild(targetEl);
      targetEl = null;
    }
    function recordResult(v, lastText) {
      lastEl.textContent = lastText;
      if (betterThan(v, getBest())) setBest(v);
      renderBest();
    }

    // ---- reaction-time ------------------------------------------------
    // exposed for tests: overrideWaitMs — skip the random wait when >= 0
    var overrideWaitMs = -1;
    function reactionStart() {
      if (typeof window.gtag === "function") window.gtag("event", "tool_use", { action: "start" });
      clearTimers();
      state = "waiting";
      setStage("is-waiting", "Wait for green…", "Don't click yet.");
      var wait = overrideWaitMs >= 0 ? overrideWaitMs : 1500 + Math.random() * 2500;
      goTimer = setTimeout(reactionGo, wait);
    }
    function reactionGo() {
      goTimer = null;
      state = "go";
      goTime = now();
      setStage("is-go", "CLICK!", "");
    }
    function reactionInput() {
      if (state === "idle" || state === "result" || state === "toosoon") { reactionStart(); return; }
      if (state === "waiting") {
        clearTimers();
        state = "toosoon";
        setStage("is-toosoon", "Too soon!", "You clicked before it turned green. Click to try again.");
        return;
      }
      if (state === "go") {
        var ms = now() - goTime;
        state = "result";
        el.__lastValue = ms;
        recordResult(ms, fmtMs(ms));
        setStage("is-result", fmtMs(ms) + " — " + RK.reactionRating(ms), "Click to try again.");
      }
    }

    // ---- click-speed --------------------------------------------------
    function clickStart() {
      if (typeof window.gtag === "function") window.gtag("event", "tool_use", { action: "start" });
      clearTimers();
      count = 0;
      state = "running";
      var d = durationSec();
      lastEl.textContent = "0";
      setStage("is-running", "0", "Keep clicking! " + d + "s");
      endTimer = setTimeout(clickEnd, d * 1000);
    }
    function clickTick() {
      count++;
      msg.textContent = String(count);
    }
    function clickEnd() {
      clearTimers();
      state = "result";
      var d = durationSec();
      var rate = RK.cps(count, d);
      el.__lastValue = count;
      el.__lastCps = rate;
      recordResult(count, String(count));
      setStage("is-result", count + " clicks", rate + " clicks/sec over " + d + "s. Click to try again.");
    }

    // ---- aim trainer --------------------------------------------------
    function aimStart() {
      if (typeof window.gtag === "function") window.gtag("event", "tool_use", { action: "start" });
      clearTimers();
      removeTarget();
      targetsDone = 0; sumMs = 0;
      state = "running";
      setStage("is-running", "", "Hit the targets!");
      msg.textContent = "";
      spawnTarget();
    }
    function spawnTarget() {
      removeTarget();
      var r = stage.getBoundingClientRect();
      var size = 46;
      var pad = 6;
      var maxX = Math.max(pad, r.width - size - pad);
      var maxY = Math.max(pad, r.height - size - pad);
      targetEl = document.createElement("button");
      targetEl.type = "button";
      targetEl.className = "target";
      targetEl.setAttribute("data-target", "");
      targetEl.style.left = (pad + Math.random() * (maxX - pad)) + "px";
      targetEl.style.top = (pad + Math.random() * (maxY - pad)) + "px";
      targetEl.addEventListener("click", function (ev) {
        ev.stopPropagation();
        hitTarget();
      });
      stage.appendChild(targetEl);
      targetShownAt = now();
    }
    function hitTarget() {
      if (state !== "running") return;
      sumMs += now() - targetShownAt;
      targetsDone++;
      var total = parseInt(el.dataset.targets, 10) || 10;
      if (targetsDone >= total) {
        removeTarget();
        var avg = sumMs / total;
        state = "result";
        el.__lastValue = avg;
        recordResult(avg, fmtMs(avg));
        setStage("is-result", fmtMs(avg) + " avg", targetsDone + " targets. Click to try again.");
      } else {
        spawnTarget();
      }
    }

    // ---- spacebar -----------------------------------------------------
    function spaceStart() {
      if (typeof window.gtag === "function") window.gtag("event", "tool_use", { action: "start" });
      clearTimers();
      count = 0;
      state = "running";
      lastEl.textContent = "0";
      var d = durationSec();
      if (d > 0) {
        setStage("is-running", "0", "Tap Space! " + d + "s");
        endTimer = setTimeout(spaceEnd, d * 1000);
      } else {
        setStage("is-running", "0", "Tap Space. Click Start to reset.");
      }
    }
    function spaceTick() {
      if (state !== "running") return;
      count++;
      msg.textContent = String(count);
      if (durationSec() === 0) { // untimed counter: live-track best
        el.__lastValue = count;
        lastEl.textContent = String(count);
        if (betterThan(count, getBest())) { setBest(count); renderBest(); }
      }
    }
    function spaceEnd() {
      clearTimers();
      state = "result";
      var d = durationSec();
      var rate = RK.cps(count, d);
      el.__lastValue = count;
      recordResult(count, String(count));
      setStage("is-result", count + " presses", rate + " / sec over " + d + "s. Click to try again.");
    }

    // ---- routing ------------------------------------------------------
    function primary() { // stage click / Start button
      switch (kind) {
        case "reaction": reactionInput(); break;
        case "clickspeed":
          if (state === "running") clickTick(); else clickStart();
          break;
        case "aim":
          if (state !== "running") aimStart();
          break;
        case "spacebar": spaceStart(); break;
      }
    }
    function onKey(ev) {
      if (kind !== "spacebar") return;
      if (ev.code === "Space" || ev.key === " " || ev.keyCode === 32) {
        ev.preventDefault();
        if (state === "running") spaceTick(); else spaceStart();
      }
    }

    stage.addEventListener("click", function () { primary(); });
    startBtn.addEventListener("click", function (e) { e.preventDefault(); primary(); });
    if (clearBtn) clearBtn.addEventListener("click", function (e) {
      e.preventDefault();
      try { localStorage.removeItem(bestKey()); } catch (err) {}
      renderBest();
    });
    if (durSel) durSel.addEventListener("change", function () { renderBest(); });
    document.addEventListener("keydown", onKey);

    renderBest();

    // ---- controller (also the test surface) ---------------------------
    var g = {
      el: el, kind: kind,
      get state() { return state; },
      durationSec: durationSec,
      start: primary,
      click: primary,
      pressSpace: function () { if (state === "running") spaceTick(); else spaceStart(); },
      // deterministic test hooks:
      testStart: function () { primary(); },
      testFireGo: function () { if (kind === "reaction" && state === "waiting") { clearTimers(); reactionGo(); } },
      testEnd: function () { if (kind === "clickspeed") clickEnd(); else if (kind === "spacebar") spaceEnd(); },
      setWaitOverride: function (ms) { overrideWaitMs = ms; },
      lastValue: function () { return el.__lastValue; },
      lastCps: function () { return el.__lastCps; },
      bestValue: getBest,
    };
    el.__rk = g;
    (window.__rkGames = window.__rkGames || []).push(g);
    return g;
  }

  function init() {
    var tools = document.querySelectorAll(".tool[data-kind]");
    for (var i = 0; i < tools.length; i++) makeGame(tools[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
