/* ============================================================
   ScoreCoach — App : évaluation mobile-first + tableau de bord
   Logique pure exposée sur globalThis.SC_APP (testable Node),
   rendu DOM isolé dans des fonctions render* (navigateur).
   Stockage : localStorage, zéro backend.
   ============================================================ */
(function () {
  "use strict";

  /* ================= LOGIQUE PURE (testable) ================= */

  function loadSessions() {
    return globalThis.SC_STORE.load();
  }
  function saveSessions(list) {
    return globalThis.SC_STORE.save(list);
  }

  /* Construit une session à partir des champs du formulaire.
     form = { client, date, templateId, criteria:[{id,score,comment}], globalComment } */
  function buildSession(form) {
    var tpl = globalThis.SC_UTILS.getTemplate(form.templateId);
    var criteria = tpl.criteria.map(function (tc) {
      var found = { score: 0, comment: "" };
      (form.criteria || []).forEach(function (c) {
        if (c.id === tc.id) {
          found.score = Math.min(5, Math.max(0, Number(c.score) || 0));
          found.comment = (c.comment || "").trim();
        }
      });
      return { id: tc.id, score: found.score, comment: found.comment };
    });
    return {
      id: globalThis.SC_UTILS.uid(),
      client: (form.client || "").trim() || "Client sans nom",
      date: form.date || new Date().toISOString().slice(0, 10),
      templateId: tpl.id,
      criteria: criteria,
      globalComment: (form.globalComment || "").trim()
    };
  }

  function addSession(form) {
    var list = loadSessions();
    var session = buildSession(form);
    list.push(session);
    saveSessions(list);
    return session;
  }

  function deleteSession(id) {
    var list = loadSessions().filter(function (s) { return s.id !== id; });
    saveSessions(list);
    return list;
  }

  function getSession(id) {
    var list = loadSessions();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* Liste des clients triés par dernière séance */
  function clientList(sessions) {
    var map = {};
    sessions.forEach(function (s) {
      if (!map[s.client]) map[s.client] = { client: s.client, last: s.date, count: 0, ids: [] };
      map[s.client].count++;
      map[s.client].ids.push(s.id);
      if (s.date > map[s.client].last) map[s.client].last = s.date;
    });
    var out = [];
    Object.keys(map).forEach(function (k) { out.push(map[k]); });
    out.sort(function (a, b) { return a.last < b.last ? 1 : (a.last > b.last ? -1 : 0); });
    return out;
  }

  /* Sessions d'un client, triées par date croissante (chronologie) */
  function sessionsOf(sessions, client) {
    return sessions
      .filter(function (s) { return s.client === client; })
      .sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
  }

  /* Séries chronologiques pour le graphique : [{date, pct, total, max}] */
  function evolutionSeries(sessions, client) {
    return sessionsOf(sessions, client).map(function (s) {
      var t = globalThis.SC_UTILS.computeTotals(s);
      return { date: s.date, pct: t.pct, total: t.total, max: t.max, id: s.id };
    });
  }

  /* Tendance : +x pts entre première et dernière séance (ou "—") */
  function trendOf(series) {
    if (series.length < 2) return null;
    return series[series.length - 1].pct - series[0].pct;
  }

  /* Stats globales du dashboard */
  function dashboardStats(sessions) {
    var clients = clientList(sessions);
    var all = sessions.map(function (s) {
      return { pct: globalThis.SC_UTILS.computeTotals(s).pct, date: s.date, templateId: s.templateId };
    });
    var avg = 0, last = null, best = null;
    if (all.length) {
      avg = Math.round(all.reduce(function (a, s) { return a + s.pct; }, 0) / all.length);
      all.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
      last = all[0];
      best = all.reduce(function (a, s) { return s.pct > a.pct ? s : a; }, all[0]);
    }
    return {
      sessionCount: sessions.length,
      clientCount: clients.length,
      avgPct: avg,
      lastDate: last ? last.date : null,
      lastPct: last ? last.pct : null,
      bestPct: best ? best.pct : null
    };
  }

  /* SVG sparkline (courbe d'évolution) — pur, renvoie une chaîne */
  function buildChartSVG(series, w, h) {
    w = w || 600; h = h || 220;
    var pad = 30;
    if (!series.length) {
      return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aucune séance">' +
        '<text x="' + (w / 2) + '" y="' + (h / 2) + '" text-anchor="middle" font-size="14" fill="#8a9490">Aucune séance enregistrée</text></svg>';
    }
    var minX = pad, maxX = w - pad, minY = h - pad, maxY = pad + 20;
    var xs = series.map(function (_, i) { return series.length === 1 ? (w / 2) : minX + (i * (maxX - minX)) / (series.length - 1); });
    var lo = Math.min.apply(null, series.map(function (s) { return s.pct; })) - 5;
    var hi = Math.max.apply(null, series.map(function (s) { return s.pct; })) + 5;
    lo = Math.max(0, Math.floor(lo / 10) * 10);
    hi = Math.min(100, Math.ceil(hi / 10) * 10);
    if (hi - lo < 10) hi = lo + 10;
    var ys = series.map(function (s) { return minY - ((s.pct - lo) / (hi - lo)) * (minY - maxY); });
    var pts = xs.map(function (x, i) { return x.toFixed(1) + "," + ys[i].toFixed(1); }).join(" ");
    var grid = "";
    for (var g = lo; g <= hi; g += 10) {
      var gy = minY - ((g - lo) / (hi - lo)) * (minY - maxY);
      grid += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (w - pad) + '" y2="' + gy + '" stroke="#e6ebe7" stroke-width="1"/>' +
        '<text x="4" y="' + (gy + 4) + '" font-size="11" fill="#9aa49f">' + g + '%</text>';
    }
    var dots = series.map(function (s, i) {
      return '<circle cx="' + xs[i].toFixed(1) + '" cy="' + ys[i].toFixed(1) + '" r="5" fill="#0d9488" stroke="#fff" stroke-width="2">' +
        '<title>' + s.date + ' — ' + s.pct + '% (' + s.total + ' pts)</title></circle>';
    }).join("");
    var labels = series.map(function (s, i) {
      return '<text x="' + xs[i].toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" font-size="10.5" fill="#8a9490">' + s.date.slice(5) + '</text>';
    }).join("");
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Évolution des scores">' +
      grid +
      '<polyline points="' + pts + '" fill="none" stroke="#0d9488" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + labels + '</svg>';
  }

  /* Rend le HTML du rapport (utilisé pour l'aperçu + impression) */
  function renderReportHTML(session, tpl) {
    var U = globalThis.SC_UTILS;
    var t = U.computeTotals(session);
    var dateFr = (session.date || "").split("-").reverse().join("/");
    var rows = session.criteria.map(function (c) {
      var crit = null;
      tpl.criteria.forEach(function (tc) { if (tc.id === c.id) crit = tc; });
      return '<tr><td><b>' + (crit ? crit.label : c.id) + '</b>' +
        (crit && crit.hint ? '<br><span style="color:#777;font-size:11px">' + crit.hint + '</span>' : '') +
        '</td><td style="text-align:center">' + (c.score > 0 ? c.score + '/5' : '—') + '</td>' +
        '<td>' + (c.comment ? c.comment : '') + '</td></tr>';
    }).join("");
    return '<div class="report-doc">' +
      '<h1>ScoreCoach — Compte-rendu d\'évaluation</h1>' +
      '<div class="meta">Client : <b>' + session.client + '</b> · Date : ' + dateFr + ' · Grille : ' + tpl.name + '</div>' +
      '<table><tr><th>Critère</th><th style="width:70px">Note</th><th>Commentaire</th></tr>' + rows + '</table>' +
      '<div class="tot">Total : ' + t.total + '/' + t.max + ' (' + t.pct + ' %) — moyenne ' + t.average + '/5</div>' +
      (session.globalComment ? '<div class="meta" style="margin-top:10px">Commentaire global : ' + session.globalComment + '</div>' : '') +
      '</div>';
  }

  globalThis.SC_APP = {
    loadSessions: loadSessions,
    saveSessions: saveSessions,
    buildSession: buildSession,
    addSession: addSession,
    deleteSession: deleteSession,
    getSession: getSession,
    clientList: clientList,
    sessionsOf: sessionsOf,
    evolutionSeries: evolutionSeries,
    trendOf: trendOf,
    dashboardStats: dashboardStats,
    buildChartSVG: buildChartSVG,
    renderReportHTML: renderReportHTML
  };

  /* ================= RENDU DOM (navigateur) ================= */
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var state = {
    templateId: "coach",
    scores: {},      /* criterionId -> score */
    comments: {},    /* criterionId -> comment */
    editingId: null,
    currentClient: null
  };

  function renderTplPicker() {
    var wrap = $("#tpl-pick");
    if (!wrap) return;
    wrap.innerHTML = Object.keys(globalThis.SC_TEMPLATES).map(function (id) {
      var t = globalThis.SC_TEMPLATES[id];
      return '<div class="tpl-card' + (state.templateId === id ? " on" : "") + '" data-tpl="' + id + '" role="button" tabindex="0">' +
        '<div class="ico">' + t.icon + '</div><div class="nm">' + t.name + '</div><div class="ds">' + t.desc + '</div></div>';
    }).join("");
    wrap.querySelectorAll(".tpl-card").forEach(function (el) {
      var pick = function () {
        state.templateId = el.getAttribute("data-tpl");
        state.scores = {}; state.comments = {};
        renderTplPicker(); renderCriteria(); renderSummary();
      };
      el.addEventListener("click", pick);
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    });
  }

  function renderCriteria() {
    var wrap = $("#criteria-list");
    if (!wrap) return;
    var tpl = globalThis.SC_UTILS.getTemplate(state.templateId);
    var scale = globalThis.SC_SCALE;
    wrap.innerHTML = tpl.criteria.map(function (c) {
      var score = state.scores[c.id] || 0;
      var btns = scale.map(function (s) {
        var on = score === s.v ? " on" + (s.v >= 4 ? " good" : "") : "";
        return '<button type="button" class="rate-btn' + on + '" data-cid="' + c.id + '" data-v="' + s.v + '" aria-label="' + s.label + ' ' + s.v + '/5">' + s.v + '</button>';
      }).join("");
      return '<div class="crit" data-cid="' + c.id + '">' +
        '<div class="top"><div><div class="lbl">' + esc(c.label) + '</div><div class="hint">' + esc(c.hint) + '</div></div>' +
        '<div class="score" data-score>' + (score ? score + "/5" : "—") + '</div></div>' +
        '<div class="rate">' + btns + '</div>' +
        '<textarea data-comment placeholder="Commentaire (optionnel)…" rows="2">' + esc(state.comments[c.id] || "") + '</textarea>' +
        '</div>';
    }).join("");
    wrap.querySelectorAll(".rate-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var cid = b.getAttribute("data-cid");
        var v = Number(b.getAttribute("data-v"));
        state.scores[cid] = state.scores[cid] === v ? 0 : v; /* re-tap = annule */
        renderCriteria(); renderSummary();
      });
    });
    wrap.querySelectorAll("textarea").forEach(function (ta) {
      ta.addEventListener("input", function () {
        state.comments[ta.closest(".crit").getAttribute("data-cid")] = ta.value;
      });
    });
  }

  function renderSummary() {
    var tpl = globalThis.SC_UTILS.getTemplate(state.templateId);
    var criteria = tpl.criteria.map(function (c) {
      return { id: c.id, score: state.scores[c.id] || 0, comment: state.comments[c.id] || "" };
    });
    var t = globalThis.SC_UTILS.computeTotals({ templateId: state.templateId, criteria: criteria });
    var el = $("#summary");
    if (!el) return;
    el.querySelector("[data-big]").textContent = t.total + "/" + t.max;
    el.querySelector("[data-sub]").textContent = t.pct + " % — " + t.filled + "/" + t.count + " critères notés";
    var fill = el.querySelector("[data-fill]");
    if (fill) fill.style.width = t.pct + "%";
    var miniFilled = el.querySelector("[data-mini-filled]");
    if (miniFilled) miniFilled.textContent = t.filled + "/" + t.count;
    var miniAvg = el.querySelector("[data-mini-avg]");
    if (miniAvg) miniAvg.textContent = t.average + "/5";
  }

  function currentForm() {
    var client = $("#f-client") ? $("#f-client").value : "";
    var date = $("#f-date") ? $("#f-date").value : "";
    var globalComment = $("#f-global") ? $("#f-global").value : "";
    var tpl = globalThis.SC_UTILS.getTemplate(state.templateId);
    var criteria = tpl.criteria.map(function (c) {
      return { id: c.id, score: state.scores[c.id] || 0, comment: state.comments[c.id] || "" };
    });
    return { client: client, date: date, templateId: state.templateId, criteria: criteria, globalComment: globalComment };
  }

  function saveCurrent() {
    var form = currentForm();
    if (!form.criteria.some(function (c) { return c.score > 0; })) {
      alert("Notez au moins un critère avant d'enregistrer.");
      return null;
    }
    var session = globalThis.SC_APP.addSession(form);
    return session;
  }

  /* ---- dashboard ---- */
  function renderDashboard(selectClient) {
    var sessions = globalThis.SC_APP.loadSessions();
    var stats = globalThis.SC_APP.dashboardStats(sessions);
    var setVal = function (sel, v) { var el = $(sel); if (el) el.textContent = v; };
    setVal("#st-sessions", stats.sessionCount);
    setVal("#st-clients", stats.clientCount);
    setVal("#st-avg", stats.avgPct ? stats.avgPct + " %" : "—");
    setVal("#st-last", stats.lastDate ? stats.lastDate : "—");

    var clients = globalThis.SC_APP.clientList(sessions);
    var chips = $("#client-pick");
    if (chips) {
      if (!clients.length) {
        chips.innerHTML = '<div class="empty" style="width:100%;color:var(--muted);font-size:14.5px;text-align:center;padding:10px">Aucun client pour l\'instant — enregistrez votre première évaluation.</div>';
      } else {
        if (!selectClient) selectClient = clients[0].client;
        state.currentClient = selectClient;
        chips.innerHTML = clients.map(function (c) {
          return '<button type="button" class="client-chip' + (c.client === selectClient ? " on" : "") + '" data-client="' + esc(c.client) + '">' +
            esc(c.client) + ' <span style="opacity:.6">(' + c.count + ')</span></button>';
        }).join("");
        chips.querySelectorAll(".client-chip").forEach(function (el) {
          el.addEventListener("click", function () { renderDashboard(el.getAttribute("data-client")); });
        });
      }
    }

    var chart = $("#chart");
    if (chart) {
      var series = state.currentClient ? globalThis.SC_APP.evolutionSeries(sessions, state.currentClient) : [];
      var trend = globalThis.SC_APP.trendOf(series);
      var trendEl = $("#trend");
      if (trendEl) {
        if (trend === null) { trendEl.textContent = "—"; trendEl.className = "trend flat"; }
        else if (trend > 0) { trendEl.textContent = "▲ +" + trend + " pts"; trendEl.className = "trend up"; }
        else if (trend < 0) { trendEl.textContent = "▼ " + trend + " pts"; trendEl.className = "trend down"; }
        else { trendEl.textContent = "= stable"; trendEl.className = "trend flat"; }
      }
      var chartClient = $("#chart-client");
      if (chartClient) chartClient.textContent = state.currentClient || "";
      chart.innerHTML = globalThis.SC_APP.buildChartSVG(series, 640, 240);
    }

    var tbl = $("#sessions-tbl");
    if (tbl) {
      var rows = state.currentClient ? globalThis.SC_APP.sessionsOf(sessions, state.currentClient) : [];
      tbl.innerHTML = rows.length ? rows.map(function (s) {
        var t = globalThis.SC_UTILS.computeTotals(s);
        var tpl = globalThis.SC_UTILS.getTemplate(s.templateId);
        var dateFr = s.date.split("-").reverse().join("/");
        return '<tr><td>' + dateFr + '</td><td>' + tpl.icon + ' ' + tpl.name + '</td>' +
          '<td><span class="pct" style="color:' + (t.pct >= 70 ? "var(--ok)" : t.pct >= 45 ? "var(--accent)" : "var(--warm)") + '">' + t.pct + ' %</span> (' + t.total + '/' + t.max + ')</td>' +
          '<td class="actions"><a href="#" data-view="' + s.id + '">Voir</a><a href="#" data-pdf="' + s.id + '">PDF</a><a href="#" data-edit="' + s.id + '">Modifier</a><a href="#" class="del" data-del="' + s.id + '">Suppr.</a></td></tr>';
      }).join("") : '<tr><td colspan="4" style="text-align:center;color:var(--muted)">Aucune séance pour ce client.</td></tr>';
      tbl.querySelectorAll("[data-view]").forEach(function (a) {
        a.addEventListener("click", function (e) { e.preventDefault(); showSessionModal(a.getAttribute("data-view")); });
      });
      tbl.querySelectorAll("[data-pdf]").forEach(function (a) {
        a.addEventListener("click", function (e) { e.preventDefault(); exportPdf(a.getAttribute("data-pdf")); });
      });
      tbl.querySelectorAll("[data-edit]").forEach(function (a) {
        a.addEventListener("click", function (e) { e.preventDefault(); editSession(a.getAttribute("data-edit")); });
      });
      tbl.querySelectorAll("[data-del]").forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          if (confirm("Supprimer cette séance ?")) {
            globalThis.SC_APP.deleteSession(a.getAttribute("data-del"));
            renderDashboard(state.currentClient);
          }
        });
      });
    }
  }

  function showSessionModal(id) {
    var s = globalThis.SC_APP.getSession(id);
    if (!s) return;
    var tpl = globalThis.SC_UTILS.getTemplate(s.templateId);
    var modal = $("#modal");
    if (!modal) return;
    var t = globalThis.SC_UTILS.computeTotals(s);
    var dateFr = s.date.split("-").reverse().join("/");
    var rows = s.criteria.map(function (c) {
      var crit = null;
      tpl.criteria.forEach(function (tc) { if (tc.id === c.id) crit = tc; });
      return '<tr><td>' + (crit ? crit.label : c.id) + '</td><td style="text-align:center;font-weight:700">' + (c.score > 0 ? c.score + '/5' : '—') + '</td><td>' + esc(c.comment || "") + '</td></tr>';
    }).join("");
    modal.innerHTML =
      '<div class="modal-backdrop" data-close></div><div class="modal-card">' +
      '<button type="button" class="modal-x" data-close aria-label="Fermer">✕</button>' +
      '<h3>' + esc(s.client) + ' — ' + dateFr + '</h3>' +
      '<p class="muted" style="font-size:14px;margin:4px 0 14px">' + tpl.icon + ' ' + tpl.name + ' · Score ' + t.total + '/' + t.max + ' (' + t.pct + ' %)</p>' +
      '<table class="tbl"><tr><th>Critère</th><th style="width:70px">Note</th><th>Commentaire</th></tr>' + rows + '</table>' +
      (s.globalComment ? '<p style="font-size:14px;margin-top:10px"><b>Commentaire global :</b> ' + esc(s.globalComment) + '</p>' : '') +
      '<div style="display:flex;gap:10px;margin-top:18px">' +
      '<button type="button" class="btn accent sm" data-pdf="' + s.id + '">Exporter PDF</button>' +
      '<button type="button" class="btn ghost sm" data-close>Fermer</button></div></div>';
    modal.style.display = "flex";
    modal.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", function () { modal.style.display = "none"; });
    });
    var pdfBtn = modal.querySelector("[data-pdf]");
    if (pdfBtn) pdfBtn.addEventListener("click", function () { exportPdf(s.id); });
  }

  function editSession(id) {
    var s = globalThis.SC_APP.getSession(id);
    if (!s) return;
    state.templateId = s.templateId;
    state.scores = {}; state.comments = {};
    s.criteria.forEach(function (c) {
      state.scores[c.id] = c.score;
      state.comments[c.id] = c.comment || "";
    });
    var clientEl = $("#f-client"), dateEl = $("#f-date"), globalEl = $("#f-global");
    if (clientEl) clientEl.value = s.client;
    if (dateEl) dateEl.value = s.date;
    if (globalEl) globalEl.value = s.globalComment || "";
    state.editingId = s.id;
    switchView("eval");
    renderTplPicker(); renderCriteria(); renderSummary();
    var saveBtn = $("#btn-save");
    if (saveBtn) saveBtn.textContent = "Mettre à jour la séance";
    var delTmp = $("#tmp-edit");
    if (delTmp) { /* suppression de l'ancienne au save */ }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exportPdf(id) {
    var s = globalThis.SC_APP.getSession(id);
    if (!s) return;
    var tpl = globalThis.SC_UTILS.getTemplate(s.templateId);
    globalThis.SC_PDF.downloadPdf(s, tpl);
  }

  function switchView(name) {
    document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("on"); });
    document.querySelectorAll(".app-tab").forEach(function (t) { t.classList.remove("on"); });
    var v = $("#view-" + name), tab = $("#tab-" + name);
    if (v) v.classList.add("on");
    if (tab) tab.classList.add("on");
    if (name === "dash") renderDashboard(null);
  }

  function initApp() {
    var tplPicker = $("#tpl-pick");
    if (!tplPicker) return;
    var today = new Date().toISOString().slice(0, 10);
    var dateEl = $("#f-date");
    if (dateEl && !dateEl.value) dateEl.value = today;

    renderTplPicker(); renderCriteria(); renderSummary();

    var saveBtn = $("#btn-save");
    if (saveBtn) saveBtn.addEventListener("click", function () {
      var session = saveCurrent();
      if (session) {
        if (state.editingId) {
          /* remplace la version éditée */
          var list = globalThis.SC_APP.loadSessions().filter(function (s) { return s.id !== state.editingId; });
          session.id = state.editingId;
          list.push(session);
          globalThis.SC_APP.saveSessions(list);
          state.editingId = null;
        }
        var ok = $("#save-ok");
        if (ok) { ok.style.display = "block"; setTimeout(function () { ok.style.display = "none"; }, 3500); }
        if (saveBtn) saveBtn.textContent = "Enregistrer la séance";
      }
    });

    var pdfBtn = $("#btn-pdf");
    if (pdfBtn) pdfBtn.addEventListener("click", function () {
      var session = saveCurrent();
      if (session) {
        var tpl = globalThis.SC_UTILS.getTemplate(session.templateId);
        globalThis.SC_PDF.downloadPdf(session, tpl);
      }
    });

    var printBtn = $("#btn-print");
    if (printBtn) printBtn.addEventListener("click", function () {
      var session = saveCurrent();
      if (!session) return;
      var tpl = globalThis.SC_UTILS.getTemplate(session.templateId);
      var area = $("#print-area");
      if (area) {
        area.innerHTML = globalThis.SC_APP.renderReportHTML(session, tpl);
        window.print();
      }
    });

    document.querySelectorAll(".app-tab").forEach(function (t) {
      t.addEventListener("click", function () { switchView(t.getAttribute("data-view")); });
    });

    if (document.querySelector("#view-dash")) renderDashboard(null);
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initApp);
    globalThis.SC_APP_DOM = { switchView: switchView, state: state, initApp: initApp };
  }
})();
