/* ============================================================
   ScoreCoach — Tests Node des pages & promesses marketing.
   Vérifie : sections requises, meta/SEO, schema.org, liens
   internes valides, et que chaque promesse de vente est
   réellement implémentée dans le code (leçon n°4).
   Usage : node assets/js/test-landing.js
   ============================================================ */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
let passed = 0, failed = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log("  ✗ " + label); }
}
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function count(hay, needle) { return hay.split(needle).length - 1; }

console.log("== ScoreCoach — tests pages ==");

/* ---------- 1. Landing index.html ---------- */
console.log("\n[1] Landing (index.html)");
const idx = read("index.html");
ok(idx.includes("<title>"), "title présent");
ok(idx.includes('name="description"'), "meta description présente");
ok(idx.includes('"@type": "SoftwareApplication"'), "schema.org SoftwareApplication");
ok(idx.includes('"@type": "FAQPage"'), "schema.org FAQPage");
ok(idx.includes("id=\"demo\""), "section démo");
ok(idx.includes('id="demo-template"'), "sélecteur de grille démo");
ok(idx.includes('id="demo-criteria"'), "critères démo");
ok(idx.includes('id="demo-total"'), "total démo");
ok(count(idx, 'class="plan') >= 3, "3 cartes tarifs");
ok(idx.includes("19 €"), "prix Découverte 19 €");
ok(idx.includes("27 €"), "prix Pro lancement 27 €");
ok(idx.includes("55 €"), "prix Clinique lancement 55 €");
ok(idx.includes("<s>39 €</s>"), "prix barré Pro (promesse implémentée)");
ok(idx.includes("<s>79 €</s>"), "prix barré Clinique");
ok(idx.includes("id=\"faq\""), "section FAQ");
ok(count(idx, "<details") >= 5, "au moins 5 questions FAQ");
ok(count(idx, "tst-card") >= 3, "3 témoignages");
ok(idx.includes("Témoignages illustratifs"), "témoignages marqués fictifs (clarté)");
ok(idx.includes('id="cta-form"'), "CTA email présent");
ok(idx.includes('data-countdown="2026-08-31T23:59:59"'), "compte à rebours dans le HTML");
ok(idx.includes("Annulation en 1 clic") || idx.includes("annulation en 1 clic"), "promesse annulation 1 clic");
ok(idx.includes("14 jours") || idx.includes("14 jours"), "promesse essai 14 jours");

/* les promesses doivent être implémentées dans main.js */
const main = read("assets/js/main.js");
ok(main.includes("initCountdown"), "countdown implémenté dans main.js");
ok(main.includes("cd-days") && main.includes("cd-hours") && main.includes("cd-mins"), "tick countdown implémenté");
ok(main.includes("initCtaForm") && main.includes("scorecoach_leads"), "capture email implémentée");
ok(main.includes("initCopyButtons") && main.includes("navigator.clipboard"), "boutons copier implémentés");
ok(main.includes("globalThis.SC_TEMPLATES"), "démo alimentée par les vraies grilles");

/* ---------- 2. App ---------- */
console.log("\n[2] Application (app.html)");
const app = read("app.html");
ok(app.includes('id="tpl-pick"'), "sélecteur de templates");
ok(app.includes('id="criteria-list"'), "liste des critères");
ok(app.includes('id="f-client"') && app.includes('id="f-date"'), "champs client + date");
ok(app.includes('id="summary"') && app.includes("btn-save"), "résumé + bouton enregistrer");
ok(app.includes("btn-pdf"), "bouton export PDF");
ok(app.includes('id="view-dash"'), "vue dashboard");
ok(app.includes('id="sessions-tbl"'), "tableau historique");
ok(app.includes('id="client-pick"'), "sélection client");
ok(app.includes("assets/js/templates.js") && app.includes("assets/js/pdf.js") && app.includes("assets/js/app.js"), "scripts chargés");
ok(app.includes("localStorage"), "stockage local mentionné");
const appJs = read("assets/js/app.js");
ok(appJs.includes("globalThis.SC_APP"), "logique app exposée");
ok(read("assets/js/templates.js").includes("scorecoach_sessions_v1"), "clé localStorage unique (dans templates.js)");
ok(appJs.includes("buildChartSVG"), "courbe d'évolution implémentée");

/* ---------- 3. Templates ---------- */
console.log("\n[3] Données métier");
const tplJs = read("assets/js/templates.js");
ok(tplJs.includes("coach") && tplJs.includes("kine") && tplJs.includes("fitness"), "3 métiers dans templates.js");
ok(tplJs.includes("À travailler") && tplJs.includes("Excellent"), "échelle 1-5 avec libellés");

/* ---------- 4. Tarifs ---------- */
console.log("\n[4] Tarifs & paiement (tarifs.html)");
const tar = read("tarifs.html");
ok(tar.includes("19 €") && tar.includes("27 €") && tar.includes("55 €"), "3 prix cohérents");
ok(tar.includes("Stripe"), "Stripe mentionné");
ok(tar.includes("MODE DÉMO") || tar.includes("Mode démo"), "mode démo clairement annoncé");
ok(tar.includes("Annulation en 1 clic") || tar.includes("annulation en 1 clic"), "annulation 1 clic annoncée");
ok(tar.includes('id="sub-form"') && tar.includes('id="confirmation"'), "formulaire + confirmation");
ok(tar.includes('id="btn-cancel"'), "bouton résilier présent");
const tarifsJs = read("assets/js/tarifs.js");
ok(tarifsJs.includes("cancelSub"), "résiliation implémentée dans tarifs.js");
ok(tarifsJs.includes("priceOf") && tarifsJs.includes("0.8"), "calcul mensuel/annuel implémenté");
ok(tarifsJs.includes("scorecoach_sub"), "abonnement persisté en localStorage");

/* ---------- 5. Formation ---------- */
console.log("\n[5] Formation IA");
ok(exists("formation.html") && exists("module-1.html") && exists("module-2.html") && exists("module-3.html"), "hub + 3 modules présents");
for (const m of ["module-1.html", "module-2.html", "module-3.html"]) {
  const page = read(m);
  ok(page.includes("prompt-block") && page.includes("copy-btn"), m + " : prompt + bouton copier");
  ok(page.includes("RÈGLES") || page.includes("Règles"), m + " : prompt système structuré");
}
ok(exists("templates-agents/01-compte-rendu-seance.md"), "template agent 1 (.md)");
ok(exists("templates-agents/02-relance-client.md"), "template agent 2 (.md)");
ok(exists("templates-agents/03-facturation.md"), "template agent 3 (.md)");

/* ---------- 6. Blog SEO ---------- */
console.log("\n[6] Blog SEO");
const b1 = read("blog/grille-evaluation-coach-sportif.html");
ok(b1.includes("grille évaluation coach sportif") || b1.includes("Grille d'évaluation coach sportif"), "mot-clé cible 1 dans la page");
ok(b1.includes('"@type": "Article"'), "schema.org Article (article 1)");
ok(b1.includes('name="description"'), "meta description (article 1)");
const b2 = read("blog/suivi-client-kine.html");
ok(b2.includes("suivi client kiné") || b2.includes("Suivi client kiné"), "mot-clé cible 2 dans la page");
ok(b2.includes('"@type": "Article"'), "schema.org Article (article 2)");
ok(b2.includes('name="description"'), "meta description (article 2)");

/* ---------- 7. Emails ---------- */
console.log("\n[7] Séquence de lancement");
const emails = read("lancement/sequence-5-emails.md");
ok(count(emails, "## Email") === 5, "5 emails complets");
ok(emails.includes("J-5") && emails.includes("J-2") && emails.includes("J0") && emails.includes("J+3") && emails.includes("J+7"), "jalons J-5 → J+7");
ok(emails.includes("Objet") && emails.includes("Préheader"), "objet + préheader par email");
ok(emails.includes("désinscription") || emails.includes("RGPD"), "mention RGPD/désinscription");

/* ---------- 8. README ---------- */
console.log("\n[8] README & business model");
const readme = read("README.md");
for (const kw of ["Business model", "Marge", "27 €", "groupes Facebook", "artenariats cliniques", "Stripe", "Plan de lancement", "Déploiement", "localStorage"]) {
  ok(readme.includes(kw), "README contient « " + kw + " »");
}

/* ---------- 9. Liens internes valides ---------- */
console.log("\n[9] Liens internes");
const htmlFiles = ["index.html", "app.html", "tarifs.html", "formation.html", "module-1.html", "module-2.html", "module-3.html",
  "blog/grille-evaluation-coach-sportif.html", "blog/suivi-client-kine.html"];
let badLinks = 0;
for (const f of htmlFiles) {
  const content = read(f);
  const refs = content.match(/(?:href|src)="([^"#][^"]*)"/g) || [];
  for (const r of refs) {
    const target = r.replace(/(?:href|src)="/, "").replace(/"$/, "");
    if (/^(https?:|mailto:|tel:)/.test(target)) continue;
    if (target.startsWith("#")) continue;
    /* résolution relative au dossier du fichier qui contient le lien */
    const resolved = path.resolve(path.dirname(path.join(ROOT, f)), target);
    if (!fs.existsSync(resolved)) { badLinks++; console.log("  ✗ " + f + " → lien cassé : " + target); }
  }
}
ok(badLinks === 0, "tous les liens internes résolvent (" + (badLinks === 0 ? "aucun cassé" : badLinks + " cassés") + ")");

/* ---------- bilan ---------- */
console.log("\n==============================");
console.log("Résultat : " + passed + " assertions OK, " + failed + " échec(s)");
if (failed) {
  console.log("Échecs :");
  failures.forEach((f) => console.log("  - " + f));
  process.exit(1);
}
console.log("Tous les tests passent ✓");
