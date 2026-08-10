# ScoreCoach — Micro-SaaS de digitalisation des grilles d'évaluation

> Vos grilles d'évaluation papier deviennent un suivi de progrès professionnel.
> Saisie mobile en 2 min · suivi visuel · compte-rendu PDF pro · micro-formation IA incluse.

**Statut** : MVP complet, zéro backend, fonctionne 100 % en local et prêt à déployer en statique.
**Dossier** : `~/Documents/livrables/scorecoach/`

---

## 1. Business model

### Cible
| Segment | Profil | Pain point | Willingness to pay |
|---|---|---|---|
| Coachs sportifs indépendants | 1-3 praticiens, 10-40 clients | Paperasse, pas de suivi objectif, image artisanale | Forte (39 €/mois = ~1 séance) |
| Kinésithérapeutes libéraux | Cabinets 1-5 praticiens | Comptes-rendus prescripteurs chronophages, suivi EVA/amplitude | Très forte (gain de temps clinique) |
| Petites cliniques / pôles performance | 2-10 praticiens | Harmoniser les évaluations, comparer les patients | Forte (budget équipement) |

### Problème
Grilles papier perdues ou illisibles, aucune comparaison entre séances, client qui ne voit pas ses progrès (et arrête), compte-rendu manuscrit qui décrédibilise, ~3 h/semaine de paperasse invisible.

### Solution
Saisie mobile-first (notes 1-5 + commentaires), 3 grilles métier prêtes (coach, kiné, fitness), courbe d'évolution par client, export PDF professionnel généré côté client, stockage local (localStorage) = **zéro backend, confidentialité maximale** (argument de vente : « vos données ne quittent jamais votre appareil »). Micro-formation IA intégrée (3 modules + templates d'agents) pour automatiser comptes-rendus, suivi et facturation.

### Prix & unité économique
| Formule | Prix mensuel | Prix lancement (−30 %) | Cible |
|---|---|---|---|
| Découverte | 19 € | 19 € | Test, 1 grille |
| **Pro** | **39 €** | **27 €** | **Coachs & kinés (formule phare)** |
| Clinique | 79 € | 55 € | Cabinets, 5 praticiens |

- **Marge** : ~100 %. Coût de production ≈ 0 (fichiers statiques). Coût d'hébergement : gratuit (GitHub Pages/Netlify) ou ~5 $/mois. Stripe : ~1,4 % + 0,25 €/transaction à connecter en prod.
- **Seuil de rentabilité solo** : 25 clients Pro = 675 €/mois (à 27 €) / 975 €/mois (à 39 €). 10 clients = 270-390 €/mois de revenu récurrent.
- **Levier** : la micro-formation IA est incluse dans Pro → différenciation, augmentation de la valeur perçue, rétention (un coach qui automatise sa paperasse reste abonné).

### Canaux d'acquisition
1. **Groupes Facebook coachs sportifs / kinés / fitness** (cible n°1) : démo vidéo de 60 s (saisie mobile → courbe → PDF), offre de lancement −30 %, posts « grille gratuite » qui renvoient au blog.
2. **Partenariats cliniques** : remise 20 % + accompagnement pour les cabinets qui équipent leurs praticiens ; l'argument « harmonisation des évaluations » est le déclencheur.
3. **SEO local** : 2 articles blog (grille évaluation coach sportif, suivi client kiné) + réponses sur les forums santé/sport.
4. **Bouche-à-oreille prescripteurs** : le PDF pro envoyé aux médecins prescripteurs fait la pub tout seul.

### KPIs de lancement (2 semaines)
- 200 leads captés (email) · 50 essais gratuits · 15-20 abonnés Pro/Clinique à 27/55 €
- Taux de conversion essai → payant : ≥ 30 % (produit sans onboarding)
- Churn mensuel cible : < 5 % (annulation 1 clic = confiance = rétention)

---

## 2. Ce que contient le livrable

```
scorecoach/
├── index.html                  Landing page : hero, problème, bénéfices, démo interactive,
│                               tarifs (3 formules + compte à rebours), témoignages, FAQ,
│                               CTA email (leads → localStorage), schema.org (SoftwareApplication + FAQ)
├── app.html                    MVP : formulaire d'évaluation mobile-first (notes 1-5,
│                               commentaires), 3 templates sélectionnables, résumé live,
│                               tableau de bord (stats, courbe SVG, historique, actions),
│                               export PDF + impression, modal de détail
├── tarifs.html                 Abonnement : 3 formules, toggle mensuel/annuel (−20 %),
│                               simulation de checkout (placeholder Stripe, mode démo),
│                               confirmation + résiliation 1 clic réellement implémentée
├── formation.html              Hub micro-formation IA (3 modules, ~1 h)
├── module-1.html               Comptes-rendus automatisés + prompt système copiable
├── module-2.html               Suivi clients intelligent + prompt système copiable
├── module-3.html               Facturation & impayés + prompt système copiable
├── blog/
│   ├── grille-evaluation-coach-sportif.html   SEO « grille évaluation coach sportif » + Article schema.org
│   └── suivi-client-kine.html                 SEO « suivi client kiné » + Article schema.org
├── lancement/sequence-5-emails.md             Séquence complète J-5 → J+7 (5 emails)
├── templates-agents/                          Prompts système en markdown (copie directe)
│   ├── 01-compte-rendu-seance.md
│   ├── 02-relance-client.md
│   └── 03-facturation.md
└── assets/
    ├── css/style.css           Design system complet (landing + app + tarifs + formation + blog)
    └── js/
        ├── templates.js        Données métier : 3 grilles (critères, échelle 1-5) + stockage localStorage
        ├── pdf.js              Générateur PDF minimal écrit à la main (zéro dépendance)
        ├── app.js              Logique app (pure, testable) + rendu DOM
        ├── main.js             Landing : démo interactive, countdown, capture email, boutons copier
        ├── tarifs.js           Simulation abonnement (calculs purs + DOM)
        ├── test-app.js         Tests Node (logique + PDF + stockage)
        └── test-landing.js     Tests Node (pages + promesses marketing implémentées)
```

**Fonctionnalités clés du MVP**
- 3 grilles métier sélectionnables (coach sportif, kiné, fitness), 7 critères chacune, échelle 1-5 avec libellés.
- Saisie mobile-first : gros boutons de note, re-tap pour annuler, commentaires par critère + commentaire global.
- Résumé en direct (total, %, moyenne, barre de progression).
- Tableau de bord : stats globales, sélection client, courbe d'évolution SVG, tendance (▲/▼/stable), historique complet avec actions Voir / PDF / Modifier / Supprimer.
- Export PDF : vrai fichier .pdf généré côté client (aucune librairie), téléchargement direct.
- Stockage : localStorage (`scorecoach_sessions_v1`) — zéro backend, zéro compte.
- Formation IA : 3 modules + prompts système prêts à copier + fichiers .md.
- Paiement : simulation complète + résiliation 1 clic (démo) + placeholder Stripe documenté.

---

## 3. Vérification (preuves de fonctionnement)

```bash
cd ~/Documents/livrables/scorecoach
python3 -m http.server 8080        # sert le site
# Tests Node (logique métier + génération PDF + promesses marketing) :
node assets/js/test-app.js
node assets/js/test-landing.js
```

Résultats attendus des tests : 30+ assertions vertes (intégrité des grilles, calculs de score, stockage, courbe SVG, PDF valide contenant le client et le total, présence de toutes les sections de vente, countdown/CTA/copie implémentés).

---

## 4. Plan de lancement — 2 semaines

| Jour | Action |
|---|---|
| **J1-2** | Déployer (cf. §5), connecter Stripe (ou garder la simulation), créer compte Brevo, importer la liste de pré-lancement (leads captés par la landing), préparer la démo vidéo 60 s |
| **J3** | Poster dans 5 groupes Facebook coachs/kinés (démo + lien blog), lancer la séquence d'emails (Email 1 J-5) |
| **J4-5** | Email 2 (early access −30 %), 2 posts/réponses utiles par jour dans les groupes (apporter de la valeur, pas de spam) |
| **J6-7** | **J0 : lancement** — Email 3, post de lancement, répondre à TOUTES les questions dans l'heure (conversion = réactivité) |
| **J8-10** | Email 4 (preuves + cas d'usage), 1er contact avec 5 cliniques locales (partenariat, démo 15 min) |
| **J11-14** | Email 5 (dernière chance −30 %), relance des essais non convertis avec offre, mesure des KPIs, ajustement du prix si besoin |
| **Après** | Publication des 2 articles blog (SEO), cycle mensuel : 2 posts/semaine + 1 email/mois, bouche-à-oreille prescripteurs |

**Promesses marketing — vérifiées dans le code** : compte à rebours de l'offre (implémenté), prix barrés (implémentés), annulation 1 clic (implémentée en démo), essai gratuit sans CB (pas de carte demandée), PDF pro (généré), démo interactive (alimentée par les vraies grilles).

---

## 5. Déploiement

Le site est 100 % statique — n'importe quel hébergeur statique fonctionne :

### Option A — Netlify Drop (2 minutes, recommandé pour démarrer)
1. Glisser le dossier `scorecoach/` sur https://app.netlify.com/drop
2. Domaine : `scorecoach.netlify.app` puis domaine perso (~12 €/an)
3. HTTPS automatique, redirections, zéro config.

### Option B — GitHub Pages
```bash
cd ~/Documents/livrables/scorecoach
git init && git add . && git commit -m "ScoreCoach MVP"
# créer le repo sur GitHub puis :
git remote add origin https://github.com/<user>/scorecoach.git
git push -u origin main
# Settings → Pages → branch main → https://<user>.github.io/scorecoach/
```

### Option C — Vercel / Cloudflare Pages
Import du dossier via l'UI (ou `npx vercel`), même résultat.

### Mise en production du paiement (Stripe)
1. Créer un compte Stripe, récupérer la clé publique.
2. Remplacer la simulation de `tarifs.html`/`tarifs.js` par Stripe Checkout (lien `https://buy.stripe.com/...` par formule, ou Payment Links — aucune modif de code nécessaire).
3. Ajouter le webhook d'abonnement pour débloquer l'accès complet (aujourd'hui tout est débloqué : mode démo).
4. Mention légale : mentions obligatoires (éditeur, CGV, données) en pied de page.

### Roadmap post-MVP
1. Compte utilisateur + synchronisation multi-appareils (backend léger : Supabase/Firebase).
2. Grilles personnalisées (critères libres) — promis sur la formule Clinique.
3. Export CSV, rappels de séance par email, logo personnalisé sur le PDF.
4. Version mobile PWA (installation sur l'écran d'accueil).

---

## 6. Tests

```bash
node assets/js/test-app.js      # logique app : grilles, scores, stockage, courbe, PDF
node assets/js/test-landing.js  # pages : sections, meta, schema.org, promesses implémentées
```

Les tests tournent sous Node avec un stub localStorage/DOM minimal — aucun navigateur requis, exécutables dans la CI.

---
*Généré par l'Ingénieur Business Builder — équipe d'El mouskito, orchestré par Hermes. Août 2026.*
