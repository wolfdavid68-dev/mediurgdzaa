# Documentation MediURG

Point d'entrée rapide pour savoir quel document ouvrir selon le type de
modification. Les commandes et scripts effectifs restent ceux de `package.json`.

## Guides de contribution

- `../AGENTS.md` et `../CLAUDE.md` : architecture du dépôt, conventions de code,
  commandes principales et zones à risque pour les assistants de développement.
- `AJOUTER_MEDICAMENT.md` : ajout ou modification d'un médicament, PSE,
  préparation, protocoles, kits et incompatibilités.
- `OPTIMISATIONS_OFFLINE.md` : stratégie hors-ligne, découpage des chunks,
  précache Workbox et vérifications PWA.
- `ARCHITECTURE_CODE.md` : découpage des modules, conventions de nommage et
  garde-fou contre les fichiers monolithiques.
- `UNIFICATION_DOMAINE_TUTORAT.md` : fonctionnement du passage MediURG ↔ Tutorat
  sous `/tutorat/`.
- `RACCOURCIS_VOCAUX.md` : liens profonds (`?med=`, `?kit=`, `?poids=`,
  `?mode=acr`…) et configuration des raccourcis vocaux Siri / Assistant.
- `PLAN_RELAIS_SESSIONS.md` : plan d'implémentation (instructions agent IA) —
  déconnexion des autres appareils, multi-sessions ACR et relais
  téléphone ↔ ordinateur via Supabase.

## Auth, sécurité et exploitation

- `AUTH_SETUP.md` : configuration Supabase Auth, profils, statuts d'accès et
  variables d'environnement.
- `SECURITY_RUNBOOK.md` : checklist sécurité avant déploiement, audit Supabase,
  secrets, Web Push, MFA admin et API ECG.
- `DOSSIER_SECURITE_DPO_RSSI.md` : dossier de synthèse institutionnel pour DPO,
  RSSI ou revue interne.
- `PROCEDURE_RELEASE.md` : checklist complète de mise en production.
- `MOBILE_GITHUB_COMMIT_PROCEDURE.md` : procédure courte de commit depuis mobile.

## Rapports et baselines générés

- `RAPPORT_DONNEES_CLINIQUES.md` : rapport généré par `npm run report:data` ou
  contrôlé en strict avec `npm run report:data:strict`.
- `BUNDLE_BUDGET_BASELINE.json` : baseline des budgets de chunks utilisée par
  `npm run verify:bundle-budget`.
- `OFFLINE_SCREENSHOT_BASELINE.json` : baseline des captures hors-ligne utilisée
  par `npm run verify:offline-screenshots`.

## Déploiement PWA

- `../DEPLOY_PWA.md` : guide utilisateur de déploiement.
- `../QUICK_START_PWA.md` : démarrage rapide PWA.

Avant une publication, préférer `npm run release:check` ou la checklist de
`PROCEDURE_RELEASE.md` à une sélection manuelle de scripts.
