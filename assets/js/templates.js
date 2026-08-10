/* ============================================================
   ScoreCoach — Templates de grilles d'évaluation par métier
   Données pures, exposées sur globalThis (utilisé par l'app,
   la démo de la landing et les tests Node).
   Note : 1 = À travailler · 2 = En progression · 3 = Correct
          4 = Bon · 5 = Excellent
   ============================================================ */
(function () {
  "use strict";

  var SCALE = [
    { v: 1, label: "À travailler" },
    { v: 2, label: "En progression" },
    { v: 3, label: "Correct" },
    { v: 4, label: "Bon" },
    { v: 5, label: "Excellent" }
  ];

  var TEMPLATES = {
    coach: {
      id: "coach",
      name: "Coach sportif",
      icon: "🏋️",
      desc: "Évaluation de séance : technique, effort, posture.",
      criteria: [
        { id: "technique", label: "Technique d'exécution", hint: "Qualité du geste, précision des mouvements" },
        { id: "placement", label: "Placement & posture", hint: "Alignement, gainage, positions de départ" },
        { id: "effort", label: "Intensité & effort", hint: "Engagement, charge, volume de travail" },
        { id: "consignes", label: "Compréhension des consignes", hint: "Application des directives, autonomie" },
        { id: "recup", label: "Récupération", hint: "Temps de repos respectés, hydratation" },
        { id: "securite", label: "Sécurité du mouvement", hint: "Pas de geste à risque, matériel maîtrisé" },
        { id: "progres", label: "Progression vs séance précédente", hint: "Amélioration observable de la performance" }
      ]
    },
    kine: {
      id: "kine",
      name: "Kinésithérapeute",
      icon: "🦴",
      desc: "Bilan & suivi de rééducation : mobilité, douleur, force.",
      criteria: [
        { id: "douleur", label: "Douleur (EVA)", hint: "Échelle visuelle analogique, au repos et à l'effort" },
        { id: "amplitude", label: "Amplitude articulaire", hint: "Mobilité passive et active comparée" },
        { id: "force", label: "Force musculaire", hint: "Cotation 0-5 ou résistance à l'effort" },
        { id: "mobilite", label: "Mobilité fonctionnelle", hint: "Gestes du quotidien : marche, montée, préhension" },
        { id: "protocole", label: "Respect du protocole", hint: "Adhésion aux exercices prescrits" },
        { id: "stabilite", label: "Stabilité & équilibre", hint: "Appuis, proprioception, contrôle postural" },
        { id: "evolution", label: "Évolution clinique", hint: "Tendance vs bilan précédent" }
      ]
    },
    fitness: {
      id: "fitness",
      name: "Fitness / Coaching santé",
      icon: "💪",
      desc: "Suivi global : performance, hygiène de vie, motivation.",
      criteria: [
        { id: "execution", label: "Exécution technique", hint: "Mouvements propres, amplitude complète" },
        { id: "endurance", label: "Endurance", hint: "Capacité cardio-respiratoire à l'effort" },
        { id: "force", label: "Force", hint: "Charges soulevées, répétitions maîtrisées" },
        { id: "mobilite", label: "Mobilité", hint: "Souplesse, amplitude, absence de raideur" },
        { id: "adherence", label: "Adhérence au programme", hint: "Assiduité, exercices faits entre les séances" },
        { id: "hygiene", label: "Hygiène de vie", hint: "Sommeil, nutrition, hydratation" },
        { id: "motivation", label: "Motivation & régularité", hint: "État d'esprit, ponctualité, implication" }
      ]
    }
  };

  /* ---------- helpers métier (purs, testables) ---------- */

  function getTemplate(id) {
    return TEMPLATES[id] || TEMPLATES.coach;
  }

  function maxScore(tpl) {
    return tpl.criteria.length * 5;
  }

  /* session = { id, date, client, templateId, criteria:[{id,score,comment}], globalComment } */
  function computeTotals(session) {
    var tpl = getTemplate(session.templateId);
    var total = 0, filled = 0;
    session.criteria.forEach(function (c) {
      var s = Number(c.score) || 0;
      total += s;
      if (s > 0) filled++;
    });
    var max = maxScore(tpl);
    return {
      total: total,
      max: max,
      pct: max > 0 ? Math.round((total / max) * 100) : 0,
      filled: filled,
      count: tpl.criteria.length,
      average: filled > 0 ? Math.round((total / filled) * 10) / 10 : 0
    };
  }

  function scoreLabel(v) {
    for (var i = 0; i < SCALE.length; i++) {
      if (SCALE[i].v === Number(v)) return SCALE[i].label;
    }
    return "";
  }

  function uid() {
    return "sc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- stockage localStorage (zérobackend) ---------- */
  var KEY = "scorecoach_sessions_v1";
  var store = {
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        return [];
      }
    },
    save: function (list) {
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* quota */ }
      return list;
    }
  };

  globalThis.SC_TEMPLATES = TEMPLATES;
  globalThis.SC_SCALE = SCALE;
  globalThis.SC_UTILS = {
    getTemplate: getTemplate,
    maxScore: maxScore,
    computeTotals: computeTotals,
    scoreLabel: scoreLabel,
    uid: uid
  };
  globalThis.SC_STORE = store;
})();
