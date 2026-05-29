# Procédure release MediURG

Checklist courte à suivre avant une mise en production. Objectif : éviter une
release qui casse l'offline, embarque un secret, oublie le changelog ou publie
des données cliniques incohérentes.

## 1. Préparer la version

- Vérifier que `APP_VERSION` et la première entrée `CHANGELOG` dans
  `src/data/changelog.js` sont alignées.
- Garder les textes d'interface, changelog et données cliniques en français.
- Si les données cliniques changent, lancer `npm run report:data:strict` et relire
  `docs/RAPPORT_DONNEES_CLINIQUES.md`. Le mode strict échoue si une alerte de cohérence
  structurelle est détectée.
- Pour ajouter un médicament, suivre [`AJOUTER_MEDICAMENT.md`](./AJOUTER_MEDICAMENT.md).
- Ne jamais renuméroter les IDs de médicaments existants.

## 2. Vérifications locales obligatoires

```bash
npm audit --audit-level=moderate
npm run verify
npm run verify:security
npm run build
npm run verify:bundle-budget
npm run verify:pwa-manifest
npm run verify:pwa-offline
npm run verify:pwa-offline:browser
npm run verify:offline-screenshots
npm run verify:a11y-keyboard
npm run verify:e2e-critical
npm run verify:perf-runtime
```

`npm run verify` couvre typecheck, lint, knip et tous les tests.
`npm run release:check` lance la chaîne complète ci-dessus dans l'ordre et
affiche un résumé final.
`verify:security` contrôle `vercel.json`, CSP, headers et variables `VITE_`
sensibles. `verify:bundle-budget` compare les chunks gzip au baseline. Les
scripts PWA vérifient le précache Workbox, les budgets de chunks, le scan
d'indices de secrets serveur et les routes cliniques hors-ligne dans Chromium.
`verify:pwa-manifest` contrôle le manifest, les icônes et raccourcis.
`verify:offline-screenshots` compare les captures générées à la baseline de
dimensions et tailles minimales dans `docs/OFFLINE_SCREENSHOT_BASELINE.json`.
`verify:a11y-keyboard` contrôle la navigation clavier réelle sur les vues
cliniques clés.
`verify:e2e-critical` simule un parcours métier hors-ligne : recherche
Adrénaline, calcul pondéral, Kit ACR, check-list ISR et Incompatibilités.
`verify:perf-runtime` mesure les temps de chargement/recherche des vues clés et
écrit `build/reports/runtime-performance.*`.

## 3. Contrôles offline

- Vérifier que `npm run verify:pwa-offline` indique tous les assets JS/CSS dans
  le précache.
- Vérifier que `npm run verify:pwa-offline:browser` passe sur Protocoles, Kits,
  URGENCE ACR, Médicaments et Login.
- Ouvrir les captures générées dans `build/offline-screenshots/` si la release
  touche ACR, Kits, Incompatibilités, Médicaments, Login ou les layouts
  mobile/tablette/desktop.
- Mettre à jour `docs/OFFLINE_SCREENSHOT_BASELINE.json` seulement après relecture
  visuelle des captures si une évolution de layout est volontaire.
- Ne pas introduire de `fetch` obligatoire sur les chemins cliniques offline :
  recherche, médicaments, protocoles, kits, incompatibilités, calculateurs.

## 4. Contrôles cybersécurité

- Vérifier qu'aucun secret serveur n'est préfixé `VITE_`.
- Vérifier que `WEB_PUSH_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, secrets IA,
  `DATABASE_URL` et `JWT_SECRET` restent uniquement côté serveur/Vercel.
- Vérifier que les notifications Web Push restent génériques : pas de nom,
  matricule, email, service, IPP ou donnée patient dans le payload.
- Vérifier que les captures et rapports générés ne contiennent aucune donnée
  patient, note réelle, matricule réel ou email réel.
- Si `vercel.json`, `index.html` ou la CSP changent, relire
  `docs/SECURITY_RUNBOOK.md`.

## 5. Contrôles Supabase si SQL/Auth change

- Relire `docs/AUTH_SETUP.md`.
- Relire les sections Supabase de `docs/SECURITY_RUNBOOK.md`.
- Vérifier RLS, policies, grants et fonctions `SECURITY DEFINER`.
- Tester un compte `pending`, un compte approuvé, un compte suspendu et la
  déconnexion.

## 6. Publication

Déploiement manuel utilisateur uniquement :

```bash
deployer.bat
```

Ne pas lancer `deployer.bat` depuis Codex : il commit, pousse sur `origin main`
et lance `vercel --prod` avec des interactions utilisateur.

## 7. Après publication

- Ouvrir l'app en ligne et vérifier le numéro de version.
- Installer ou ouvrir une PWA déjà installée, attendre le toast de mise à jour,
  cliquer sur « Mettre à jour », puis tester une fiche médicament hors-ligne.
- Vérifier au minimum : Médicaments, Protocoles, Kits, URGENCE ACR.
- Si la release touche auth/admin, tester Login, logout, console admin et
  notification Web Push avec données factices.
- Relire les artefacts CI utiles : rapport clinique, budget bundle et captures
  offline.

## Références

- `docs/SECURITY_RUNBOOK.md`
- `docs/DOSSIER_SECURITE_DPO_RSSI.md`
- `docs/OPTIMISATIONS_OFFLINE.md`
- `docs/AJOUTER_MEDICAMENT.md`
- `DEPLOY_PWA.md`
- `QUICK_START_PWA.md`
