/* ============================================================
   ScoreCoach — Tests Node de la logique applicative.
   Stub localStorage minimal ; scripts chargés via require
   (ils exposent tout sur globalThis). Leçon appliquée : les
   fonctions exposées via globalThis, pas const local.
   Usage : node assets/js/test-app.js
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");

/* ---------- stub localStorage ---------- */
const mem = {};
global.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; }
};

/* ---------- chargement des scripts ---------- */
const base = path.join(__dirname, "..", "..");
function load(rel) { eval(fs.readFileSync(path.join(base, rel), "utf8")); }
load("assets/js/templates.js");
load("assets/js/pdf.js");
load("assets/js/app.js");
load("assets/js/tarifs.js");

/* ---------- mini-harness ---------- */
let passed = 0, failed = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log("  ✗ " + label); }
}
function eq(a, b, label) { ok(a === b, label + " (attendu " + JSON.stringify(b) + ", reçu " + JSON.stringify(a) + ")"); }

const T = globalThis.SC_TEMPLATES;
const U = globalThis.SC_UTILS;
const APP = globalThis.SC_APP;
const PDF = globalThis.SC_PDF;
const TAR = globalThis.SC_TARIFS;

console.log("== ScoreCoach — tests app ==");

/* ---------- 1. Intégrité des grilles ---------- */
console.log("\n[1] Grilles métier");
const ids = Object.keys(T);
eq(ids.length, 3, "3 templates");
ok(["coach", "kine", "fitness"].every((i) => T[i]), "templates coach/kine/fitness présents");
for (const id of ids) {
  const t = T[id];
  ok(t.criteria.length >= 5, t.id + " : au moins 5 critères");
  ok(t.criteria.every((c) => c.id && c.label && c.hint), t.id + " : critères complets");
  const uniq = new Set(t.criteria.map((c) => c.id)).size === t.criteria.length;
  ok(uniq, t.id + " : ids de critères uniques");
}
eq(globalThis.SC_SCALE.length, 5, "échelle 1-5 complète");

/* ---------- 2. Calculs ---------- */
console.log("\n[2] Calculs de score");
const sess = {
  templateId: "coach",
  criteria: [
    { id: "technique", score: 4, comment: "" },
    { id: "placement", score: 3, comment: "" },
    { id: "effort", score: 5, comment: "" },
    { id: "consignes", score: 4, comment: "" },
    { id: "recup", score: 0, comment: "" },
    { id: "securite", score: 4, comment: "" },
    { id: "progres", score: 5, comment: "" }
  ]
};
const t = U.computeTotals(sess);
eq(t.total, 25, "total = 25");
eq(t.max, 35, "max = 35 (7 critères × 5)");
eq(t.pct, 71, "pct = 71 %");
eq(t.filled, 6, "6 critères notés");
eq(t.average, 4.2, "moyenne = 4.2");
eq(U.scoreLabel(1), "À travailler", "libellé note 1");
eq(U.scoreLabel(5), "Excellent", "libellé note 5");

/* ---------- 3. Construction & normalisation ---------- */
console.log("\n[3] buildSession");
const built = APP.buildSession({
  client: "  Julie Martin  ",
  date: "2026-08-08",
  templateId: "kine",
  criteria: [{ id: "douleur", score: 9, comment: "  ok  " }, { id: "amplitude", score: 2, comment: "" }],
  globalComment: "  "
});
eq(built.client, "Julie Martin", "client trimé");
eq(built.templateId, "kine", "template conservé");
eq(built.criteria.length, T.kine.criteria.length, "tous les critères du template présents");
eq(built.criteria[0].score, 5, "score plafonné à 5");
eq(built.criteria[0].comment, "ok", "commentaire trimé");
eq(built.criteria[1].score, 2, "score normal conservé");
ok(built.id && built.id.indexOf("sc_") === 0, "id généré");

/* ---------- 4. Stockage ---------- */
console.log("\n[4] Stockage localStorage");
APP.addSession({ client: "Alice", date: "2026-08-01", templateId: "coach",
  criteria: T.coach.criteria.map((c, i) => ({ id: c.id, score: (i % 5) + 1, comment: "" })) });
APP.addSession({ client: "Alice", date: "2026-08-08", templateId: "coach",
  criteria: T.coach.criteria.map((c, i) => ({ id: c.id, score: ((i + 1) % 5) + 1, comment: "" })) });
APP.addSession({ client: "Bob", date: "2026-08-05", templateId: "fitness",
  criteria: T.fitness.criteria.map((c) => ({ id: c.id, score: 3, comment: "" })) });
let sessions = APP.loadSessions();
eq(sessions.length, 3, "3 sessions enregistrées");

const clients = APP.clientList(sessions);
eq(clients.length, 2, "2 clients");
eq(clients[0].client, "Alice", "Alice en tête (dernière séance 08/08)");
eq(clients[0].count, 2, "Alice a 2 séances");

const aliceSeries = APP.evolutionSeries(sessions, "Alice");
eq(aliceSeries.length, 2, "série Alice = 2 points");
ok(aliceSeries[0].date < aliceSeries[1].date, "série triée chronologiquement");
eq(aliceSeries[0].pct, 51, "pct séance 1 Alice (18/35)");
eq(aliceSeries[1].pct, 57, "pct séance 2 Alice (20/35)");
eq(APP.trendOf(aliceSeries), 6, "tendance Alice = +6 pts");

const bobSeries = APP.evolutionSeries(sessions, "Bob");
eq(APP.trendOf(bobSeries), null, "tendance Bob = null (< 2 séances)");

/* ---------- 5. Stats & dashboard ---------- */
console.log("\n[5] Dashboard");
const stats = APP.dashboardStats(sessions);
eq(stats.sessionCount, 3, "3 séances");
eq(stats.clientCount, 2, "2 clients");
eq(stats.avgPct, 56, "moyenne globale 56 %");
eq(stats.lastDate, "2026-08-08", "dernière séance");
eq(stats.bestPct, 60, "meilleur score 60 % (Bob)");

const svg = APP.buildChartSVG(aliceSeries, 600, 220);
ok(svg.indexOf("<svg") === 0, "SVG généré");
ok(svg.indexOf("polyline") > -1, "SVG contient polyline");
ok(svg.indexOf("51") > -1 && svg.indexOf("57") > -1, "SVG contient les valeurs");
const emptySvg = APP.buildChartSVG([], 600, 220);
ok(emptySvg.indexOf("Aucune séance") > -1, "SVG vide géré");

/* ---------- 6. Suppression ---------- */
console.log("\n[6] Suppression");
const delId = sessions[0].id;
let after = APP.deleteSession(delId);
eq(after.length, 2, "session supprimée");
eq(APP.getSession(delId), null, "getSession renvoie null après suppression");

/* ---------- 7. Export PDF ---------- */
console.log("\n[7] Export PDF");
const pdfSess = APP.buildSession({
  client: "Julie Martin", date: "2026-08-08", templateId: "coach",
  criteria: [
    { id: "technique", score: 5, comment: "Squat propre, genoux stables" },
    { id: "placement", score: 4, comment: "" },
    { id: "effort", score: 5, comment: "" },
    { id: "consignes", score: 4, comment: "" },
    { id: "recup", score: 3, comment: "" },
    { id: "securite", score: 4, comment: "" },
    { id: "progres", score: 5, comment: "" }
  ],
  globalComment: "Très bonne séance, objectif : gainage"
});
const pdf = PDF.generateReport(pdfSess, T.coach);
ok(pdf.indexOf("%PDF-1.4") === 0, "PDF commence par %PDF-1.4");
ok(pdf.indexOf("%%EOF") === pdf.length - 5, "PDF finit par %%EOF");
ok(pdf.indexOf("Julie Martin") > -1, "PDF contient le nom du client");
ok(pdf.indexOf("30/35") > -1, "PDF contient le total (30/35)");
ok(pdf.indexOf("86") > -1, "PDF contient le pourcentage");
ok(pdf.indexOf("Squat propre, genoux stables") > -1, "PDF contient le commentaire");
ok(pdf.indexOf("Très bonne séance, objectif : gainage") > -1, "PDF contient le commentaire global");
/* validité structurelle de la xref */
const xrefMatch = pdf.match(/startxref\n(\d+)\n%%EOF$/);
ok(!!xrefMatch, "startxref présent");
const xrefPos = parseInt(xrefMatch[1], 10);
ok(pdf.indexOf("xref\n") === xrefPos, "offset xref exact");
/* accents WinAnsi */
eq(PDF._internal.toWin("é"), String.fromCharCode(233), "é → 0xE9");
eq(PDF._internal.toWin("œ"), String.fromCharCode(156), "œ → 0x9C");
/* multi-pages : 20 critères → 2 pages */
const bigTpl = { id: "big", name: "Grande grille", criteria: [] };
for (let i = 1; i <= 20; i++) bigTpl.criteria.push({ id: "c" + i, label: "Critère " + i, hint: "" });
const bigSess = { client: "Multi", date: "2026-08-08", templateId: "big",
  criteria: bigTpl.criteria.map((c) => ({ id: c.id, score: 4, comment: "" })), globalComment: "" };
const bigPdf = PDF.generateReport(bigSess, bigTpl);
ok((bigPdf.match(/\/Type \/Page /g) || []).length === 2, "PDF 2 pages pour 20 critères");
ok(bigPdf.indexOf("2/2") > -1, "pagination 2/2");

/* ---------- 8. Tarifs ---------- */
console.log("\n[8] Tarifs & simulation");
eq(TAR.priceOf("decouverte", false), 19, "Découverte 19 €");
eq(TAR.priceOf("pro", false), 27, "Pro lancement 27 € (−30 %)");
eq(TAR.priceOf("clinique", false), 55, "Clinique lancement 55 € (−30 %)");
eq(TAR.priceOf("pro", true), 22, "Pro annuel 22 €/mois (−20 %)");
eq(TAR.totalOf("pro", true), 264, "Pro annuel total 264 €/an");
const sub = TAR.saveSub({ plan: "pro", price: 27, status: "active" });
eq(TAR.loadSub().status, "active", "abonnement persisté");
TAR.cancelSub();
eq(TAR.loadSub(), null, "résiliation 1 clic fonctionnelle (démo)");

/* ---------- bilan ---------- */
console.log("\n==============================");
console.log("Résultat : " + passed + " assertions OK, " + failed + " échec(s)");
if (failed) {
  console.log("Échecs :");
  failures.forEach((f) => console.log("  - " + f));
  process.exit(1);
}
console.log("Tous les tests passent ✓");
