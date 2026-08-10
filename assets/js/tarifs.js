/* ============================================================
   ScoreCoach — Tarifs : simulation d'abonnement complète.
   Logique pure exposée (testable) + rendu DOM navigateur.
   Stripe = placeholder clair (mode démo), annulation 1 clic
   réellement implémentée en démo.
   ============================================================ */
(function () {
  "use strict";

  var PLANS = {
    decouverte: { name: "Découverte", monthly: 19, features: "1 grille au choix" },
    pro:        { name: "Pro", monthly: 39, features: "3 grilles + formation IA" },
    clinique:   { name: "Clinique", monthly: 79, features: "5 praticiens + grilles perso" }
  };
  var LAUNCH_DISCOUNT = 0.30; /* −30 % lancement sur Pro & Clinique */

  function priceOf(planId, annual) {
    var p = PLANS[planId] || PLANS.decouverte;
    var base = p.monthly;
    if (planId !== "decouverte") base = Math.round(base * (1 - LAUNCH_DISCOUNT));
    return annual ? Math.round(base * 0.8) : base; /* −20 % en annuel */
  }

  function totalOf(planId, annual) {
    return annual ? priceOf(planId, annual) * 12 : priceOf(planId, annual);
  }

  function saveSub(sub) {
    try { localStorage.setItem("scorecoach_sub", JSON.stringify(sub)); } catch (e) { /* quota */ }
    return sub;
  }
  function loadSub() {
    try { return JSON.parse(localStorage.getItem("scorecoach_sub") || "null"); } catch (e) { return null; }
  }
  function cancelSub() {
    try { localStorage.removeItem("scorecoach_sub"); } catch (e) { /* noop */ }
    return null;
  }

  globalThis.SC_TARIFS = {
    PLANS: PLANS,
    priceOf: priceOf,
    totalOf: totalOf,
    saveSub: saveSub,
    loadSub: loadSub,
    cancelSub: cancelSub
  };

  /* ---------- DOM ---------- */
  function $(sel) { return document.querySelector(sel); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var state = { plan: "pro", annual: false };

  function renderSummary() {
    var price = globalThis.SC_TARIFS.priceOf(state.plan, state.annual);
    var total = globalThis.SC_TARIFS.totalOf(state.plan, state.annual);
    var p = globalThis.SC_TARIFS.PLANS[state.plan];
    var setTxt = function (sel, txt) { var el = $(sel); if (el) el.textContent = txt; };
    setTxt("#chk-plan", p.name + " — " + p.features);
    setTxt("#chk-price", price + " €");
    setTxt("#chk-billing", state.annual ? "Annuel (facturé " + total + " €/an)" : "Mensuel, sans engagement");
    setTxt("#chk-total", price + " €" + (state.annual ? " /mois" : " /mois"));
    setTxt("#chk-first", state.annual ? "Première facture : " + total + " € (1 an)" : "Première facture : " + price + " €");
  }

  function renderPlanCards() {
    var wrap = $("#plan-pick");
    if (!wrap) return;
    wrap.innerHTML = Object.keys(globalThis.SC_TARIFS.PLANS).map(function (id) {
      var p = globalThis.SC_TARIFS.PLANS[id];
      var price = globalThis.SC_TARIFS.priceOf(id, false);
      var crossed = id !== "decouverte";
      return '<button type="button" class="tpl-card' + (state.plan === id ? " on" : "") + '" data-plan="' + id + '">' +
        '<div class="nm">' + p.name + '</div>' +
        '<div style="font-family:Space Grotesk;font-size:22px;font-weight:700;color:var(--accent);margin:4px 0">' +
        (crossed ? '<s style="font-size:15px;color:#b3ada1">' + p.monthly + ' €</s> ' : '') + price + ' €<small style="font-size:12px;color:var(--muted)">/mois</small></div>' +
        '<div class="ds">' + p.features + '</div></button>';
    }).join("");
    wrap.querySelectorAll("[data-plan]").forEach(function (b) {
      b.addEventListener("click", function () { state.plan = b.getAttribute("data-plan"); renderPlanCards(); renderSummary(); });
    });
  }

  function initTarifs() {
    var pick = $("#plan-pick");
    if (!pick) return;
    renderPlanCards(); renderSummary();

    document.querySelectorAll(".bill-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        state.annual = b.getAttribute("data-bill") === "annual";
        document.querySelectorAll(".bill-btn").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        renderSummary();
      });
    });

    var form = $("#sub-form");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $("#sub-email") ? $("#sub-email").value.trim() : "";
      var sub = {
        plan: state.plan,
        planName: globalThis.SC_TARIFS.PLANS[state.plan].name,
        price: globalThis.SC_TARIFS.priceOf(state.plan, state.annual),
        billing: state.annual ? "annual" : "monthly",
        email: email,
        status: "active",
        start: new Date().toISOString()
      };
      globalThis.SC_TARIFS.saveSub(sub);
      renderConfirmation(sub);
    });

    /* bouton résilier (démo) */
    var cancelBtn = $("#btn-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", function () {
      globalThis.SC_TARIFS.cancelSub();
      var c = $("#confirmation");
      if (c) { c.style.display = "none"; }
      var f = $("#checkout");
      if (f) f.style.display = "block";
      alert("Abonnement résilié (démo). C'est aussi simple que ça en vrai : 1 clic, sans email.");
    });

    /* affiche un abonnement actif si déjà souscrit */
    var existing = globalThis.SC_TARIFS.loadSub();
    if (existing && existing.status === "active") renderConfirmation(existing);
  }

  function renderConfirmation(sub) {
    var c = $("#confirmation"), f = $("#checkout");
    if (!c) return;
    if (f) f.style.display = "none";
    c.style.display = "block";
    var setTxt = function (sel, txt) { var el = $(sel); if (el) el.textContent = txt; };
    setTxt("#cf-plan", sub.planName);
    setTxt("#cf-price", sub.price + " €/mois" + (sub.billing === "annual" ? " (facturation annuelle)" : ""));
    setTxt("#cf-mail", sub.email || "email non renseigné (mode démo)");
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initTarifs);
  }
  globalThis.SC_TARIFS_DOM = { initTarifs: initTarifs, renderConfirmation: renderConfirmation };
})();
