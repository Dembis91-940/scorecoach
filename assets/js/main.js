/* ============================================================
   ScoreCoach — Landing : démo interactive, compte à rebours,
   capture email. Chaque promesse de la page est implémentée ici.
   ============================================================ */
(function () {
  "use strict";

  function $(sel) { return document.querySelector(sel); }

  /* ---------- 1. DÉMO INTERACTIVE (vraies données) ---------- */
  var demo = { scores: {} };

  function demoCriteria(tplId, n) {
    var tpl = globalThis.SC_TEMPLATES[tplId] || globalThis.SC_TEMPLATES.coach;
    return tpl.criteria.slice(0, n || 5);
  }

  function renderDemo() {
    var wrap = $("#demo-criteria");
    var sel = $("#demo-template");
    if (!wrap || !sel) return;
    var tpl = globalThis.SC_TEMPLATES[sel.value] || globalThis.SC_TEMPLATES.coach;
    var crits = tpl.criteria.slice(0, 4);
    wrap.innerHTML = crits.map(function (c) {
      var s = demo.scores[c.id] || 0;
      var stars = "";
      for (var i = 1; i <= 5; i++) {
        var cls = "star-btn";
        if (s >= i) cls += i <= 2 ? " on" : (i === 3 ? " on" : (i === 4 ? " on warm" : " on strong"));
        stars += '<button type="button" class="' + cls + '" data-cid="' + c.id + '" data-v="' + i + '" aria-label="' + i + '/5">' + i + '</button>';
      }
      return '<div class="demo-crit"><div class="row"><div><div class="lbl">' + c.label + '</div><div class="hint">' + c.hint + '</div></div>' +
        '<div class="stars">' + stars + '</div></div></div>';
    }).join("");

    wrap.querySelectorAll(".star-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var cid = b.getAttribute("data-cid");
        var v = Number(b.getAttribute("data-v"));
        demo.scores[cid] = demo.scores[cid] === v ? 0 : v;
        renderDemo(); /* re-render stars */
        updateDemoScore();
      });
    });
  }

  function updateDemoScore() {
    var sel = $("#demo-template");
    var totalEl = $("#demo-total"), pctEl = $("#demo-pct"), lineEl = $("#demo-line");
    if (!sel || !totalEl) return;
    var tpl = globalThis.SC_TEMPLATES[sel.value] || globalThis.SC_TEMPLATES.coach;
    var criteria = tpl.criteria.map(function (c) { return { id: c.id, score: demo.scores[c.id] || 0 }; });
    var t = globalThis.SC_UTILS.computeTotals({ templateId: tpl.id, criteria: criteria });
    totalEl.textContent = t.total + "/" + t.max;
    if (pctEl) pctEl.textContent = t.pct + " %";
    if (lineEl) {
      /* petite courbe d'évolution simulée à partir de la progression de la séance */
      var pct = t.pct;
      var pts = "0,75 80," + (78 - pct * 0.35) + " 160," + (76 - pct * 0.5) + " 240," + (74 - pct * 0.65) + " 320," + (70 - pct * 0.8) + " 400," + (64 - pct);
      lineEl.setAttribute("points", pts);
    }
  }

  /* ---------- 2. COMPTE À REBOURS (offre de lancement) ---------- */
  function initCountdown() {
    var el = $("#countdown");
    var label = $("#cd-label");
    if (!el) return;
    var targetAttr = document.querySelector("[data-countdown]");
    if (!targetAttr) return;
    var target = new Date(targetAttr.getAttribute("data-countdown")).getTime();
    if (isNaN(target)) return;
    var shown = false;
    var tick = function () {
      var diff = target - Date.now();
      if (diff <= 0) {
        el.style.display = "none";
        if (label) label.textContent = "aujourd'hui — dernière chance";
        return;
      }
      if (!shown) { el.style.display = "inline-flex"; shown = true; }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      var set = function (id, v) { var x = document.getElementById(id); if (x) x.textContent = v; };
      set("cd-days", d); set("cd-hours", h); set("cd-mins", m);
      set("cd-secs", s);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 3. CAPTURE EMAIL (CTA final) ---------- */
  function initCtaForm() {
    var form = $("#cta-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("#cta-email").value.trim();
      if (!email) return;
      try {
        var list = JSON.parse(localStorage.getItem("scorecoach_leads") || "[]");
        list.push({ email: email, date: new Date().toISOString() });
        localStorage.setItem("scorecoach_leads", JSON.stringify(list));
      } catch (err) { /* quota */ }
      var ok = $("#cta-ok");
      if (ok) ok.classList.add("show");
      form.style.display = "none";
    });
  }

  /* ---------- 4. BOUTONS COPIER (formation) ---------- */
  function initCopyButtons() {
    document.querySelectorAll(".copy-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var block = btn.closest(".prompt-block");
        if (!block) return;
        var text = block.innerText.replace(/^Copier\s*$/, "").trim();
        var done = function () {
          btn.textContent = "✓ Copié !";
          btn.classList.add("done");
          setTimeout(function () { btn.textContent = "Copier"; btn.classList.remove("done"); }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
        } else { fallbackCopy(text); done(); }
      });
    });
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderDemo();
    var sel = $("#demo-template");
    if (sel) sel.addEventListener("change", function () { demo.scores = {}; renderDemo(); updateDemoScore(); });
    updateDemoScore();
    initCountdown();
    initCtaForm();
    initCopyButtons();
  });

  globalThis.SC_LANDING = { renderDemo: renderDemo, updateDemoScore: updateDemoScore, initCountdown: initCountdown, initCtaForm: initCtaForm };
})();
