/* ============================================================
   ScoreCoach — Tarifs : commande par email (EmailJS).
   Logique pure exposée (testable) + rendu DOM navigateur.
   Commande réelle via EmailJS : confirmation par email,
   paiement par virement ou message privé (aucun simulateur).
   ============================================================ */
(function () {
  "use strict";

  var EMAILJS = {
    serviceId: "service_cy1ytdb",
    templateId: "template_xpo58cv",
    publicKey: "8Pui4ZEqxW2jRVF7h"
  };
  function emailJsConfig() {
    var c = (window.CHATBOT_CONFIG && window.CHATBOT_CONFIG.emailjs) || {};
    return {
      serviceId: c.serviceId || EMAILJS.serviceId,
      templateId: c.templateId || EMAILJS.templateId,
      publicKey: c.publicKey || EMAILJS.publicKey
    };
  }
  function chargerEmailJS(callback) {
    if (window.emailjs) { callback(); return; }
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    s.onload = function () { try { emailjs.init({ publicKey: emailJsConfig().publicKey }); } catch (e) {} callback(); };
    s.onerror = function () { callback(); };
    document.head.appendChild(s);
  }

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
      var nom = $("#sub-nom") ? $("#sub-nom").value.trim() : "";
      var email = $("#sub-email") ? $("#sub-email").value.trim() : "";
      var errEl = $("#sub-err");
      if (errEl) { errEl.style.display = "none"; errEl.textContent = ""; }
      if (nom.length < 2) { if (errEl) { errEl.textContent = "Indiquez votre nom (2 caractères minimum)."; errEl.style.display = "block"; } return; }
      if (!email || email.indexOf("@") === -1) { if (errEl) { errEl.textContent = "Indiquez votre email de facturation."; errEl.style.display = "block"; } return; }

      var btn = form.querySelector("button[type=submit]");
      var price = globalThis.SC_TARIFS.priceOf(state.plan, state.annual);
      var total = globalThis.SC_TARIFS.totalOf(state.plan, state.annual);
      var p = globalThis.SC_TARIFS.PLANS[state.plan];
      var question = "Commande ScoreCoach : " + p.name + " (" + p.features + ") — " + price +
        " €/mois, facturation " + (state.annual ? "annuelle (" + total + " €/an)" : "mensuelle") +
        ". 14 jours d'essai gratuit inclus. Confirmation et coordonnées de paiement à envoyer.";
      if (btn) { btn.disabled = true; btn.textContent = "Envoi en cours…"; }

      chargerEmailJS(function () {
        if (!window.emailjs) {
          if (btn) { btn.disabled = false; btn.textContent = "Commander →"; }
          if (errEl) { errEl.textContent = "Le service d'envoi est momentanément indisponible. Réessayez dans quelques instants."; errEl.style.display = "block"; }
          return;
        }
        var cfg = emailJsConfig();
        emailjs.send(cfg.serviceId, cfg.templateId, { site: "ScoreCoach", name: nom, email: email, question: question })
          .then(function () {
            var sub = globalThis.SC_TARIFS.saveSub({
              plan: state.plan,
              planName: p.name,
              price: price,
              billing: state.annual ? "annual" : "monthly",
              email: email,
              status: "active",
              depuis: new Date().toISOString(),
              paiement: "commande-emailjs"
            });
            renderConfirmation(sub);
          }, function () {
            if (btn) { btn.disabled = false; btn.textContent = "Commander →"; }
            if (errEl) { errEl.textContent = "L'envoi a échoué. Vérifiez votre connexion puis réessayez, ou écrivez-nous à agentiadeploiement@gmail.com."; errEl.style.display = "block"; }
          });
      });
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
    setTxt("#cf-mail", sub.email || "email non renseigné");
  }


  /* ---------- Animation au scroll (reveal) ---------- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add("visible");
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) {
        if (entries[j].isIntersecting) {
          entries[j].target.classList.add("visible");
          io.unobserve(entries[j].target);
        }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    for (var k = 0; k < els.length; k++) io.observe(els[k]);
  }

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", initTarifs);
    document.addEventListener("DOMContentLoaded", initReveal);
  }
  globalThis.SC_TARIFS_DOM = { initTarifs: initTarifs, renderConfirmation: renderConfirmation };
})();
