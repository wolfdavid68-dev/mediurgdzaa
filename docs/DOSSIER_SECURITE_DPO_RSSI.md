# Dossier sécurité MediURG pour validation DPO / RSSI / DSI

Document de travail à transmettre pour avis institutionnel. Il décrit l'état actuel de MediURG,
les données traitées, les mesures de sécurité déjà appliquées, les risques résiduels et les
décisions à valider avant un usage institutionnel formel.

## Synthèse

MediURG est une PWA offline-first destinée à l'aide pharmacologique en médecine d'urgence
(SAUV / SMUR / SAU / REA). L'application contient principalement du contenu clinique statique
en français, utilisable hors ligne après installation.

La base technique a été durcie :

- accès Supabase `public.profiles` restreint aux utilisateurs authentifiés via RLS ;
- absence de lecture anonyme sur `profiles` vérifiée en production le 26 mai 2026 ;
- headers de sécurité ajoutés côté Vercel ;
- API ECG protégée par proxy serveur, validation MIME/taille, `Cache-Control: no-store` et
  limitation simple de débit ;
- secrets non suivis par Git ;
- audit npm ajouté en CI ;
- runbook sécurité créé.

Conclusion opérationnelle : base technique saine pour poursuivre, mais validation DPO/RSSI/DSI
requise avant qualification institutionnelle.

## Périmètre fonctionnel

### Inclus

- Consultation de fiches médicaments d'urgence.
- Protocoles, incompatibilités, kits de préparation, échelles cliniques.
- Favoris, historique et notes personnelles stockés localement.
- Authentification optionnelle via Supabase.
- Module ECG d'aide à la lecture, non diagnostique, avec anonymisation côté client puis appel
  serveur optionnel.

### Exclu

- Dossier patient informatisé.
- Prescription officielle.
- Stockage serveur de données patient.
- Dispositif médical de diagnostic autonome.
- Traçabilité exhaustive des actes cliniques.

## Architecture

### Frontend

- Vite + React + TypeScript.
- PWA offline-first avec service worker généré par `vite-plugin-pwa`.
- Déploiement Vercel.
- Données cliniques statiques embarquées dans le bundle.

### Backend

- Supabase pour authentification et table `profiles`.
- API Vercel `/api/analyze-ecg` pour proxy ECG vers fournisseurs IA.
- Aucune clé IA exposée dans le bundle client.

### Stockage local

Stockage navigateur via `localStorage`, `sessionStorage`, cache PWA et session Supabase.

## Données traitées

| Donnée                        | Localisation              | Finalité                      | Sensibilité              | Commentaire                                             |
| ----------------------------- | ------------------------- | ----------------------------- | ------------------------ | ------------------------------------------------------- |
| Fiches médicaments/protocoles | Bundle PWA                | Référence clinique            | contenu professionnel    | Pas de donnée patient                                   |
| Thème/taille police           | Navigateur                | Préférence utilisateur        | faible                   | Local uniquement                                        |
| Favoris/historique            | Navigateur                | Ergonomie                     | faible à modérée         | Local uniquement                                        |
| Notes médicament              | Navigateur                | Personnalisation              | potentiellement sensible | Avertissement ajouté : pas de donnée patient nominative |
| Poids patient                 | Navigateur                | Calcul ponctuel               | donnée clinique isolée   | Expiration courte environ 3 h                           |
| Checklists kit                | Navigateur                | Préparation opérationnelle    | potentiellement clinique | Expiration courte environ 3 h                           |
| Profil agent                  | Supabase + cache local    | Authentification/autorisation | donnée personnelle agent | Matricule, email, nom, fonction, service                |
| Session Supabase              | Navigateur                | Maintien de session           | secret utilisateur       | Jeton local Supabase                                    |
| Image ECG                     | Client puis API Vercel/IA | Aide non diagnostique         | potentiellement patient  | Anonymisation locale à vérifier par l'utilisateur       |

## Données patient

MediURG ne doit pas stocker de donnée patient nominative.

Mesures déjà présentes :

- rappel UI dans l'export/import des notes : ne pas saisir nom, IPP, date de naissance ou donnée
  patient nominative ;
- poids patient avec expiration courte ;
- checklists kit avec expiration courte ;
- module ECG affichant un rappel d'anonymisation et de validation médicale obligatoire.

Point à valider : l'usage du module ECG avec des fournisseurs IA externes doit être explicitement
autorisé par le DPO/RSSI, même avec anonymisation locale, car une image peut conserver des éléments
identifiants si la photo est mal cadrée ou si l'anonymisation automatique ne masque pas tout.

## Hébergeurs et sous-traitants

### Vercel

- Hébergement frontend et fonctions serverless.
- Sert la PWA et l'API ECG.
- À valider : cadre contractuel, localisation, clauses de sous-traitance, transferts hors UE.

### Supabase

- Authentification et base `profiles`.
- Recommandation : projet localisé en UE, idéalement Frankfurt `eu-central-1`.
- À valider : DPA, région effective, sauvegardes, rétention, journalisation.

### Fournisseurs IA ECG

- Google Gemini et/ou Mistral via API serveur.
- Clés stockées côté Vercel, jamais côté navigateur.
- À valider : autorisation institutionnelle, DPA, politique de conservation des données, région de
  traitement, conformité avec données de santé.

## Mesures de sécurité en place

### Application web

- CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS,
  `frame-ancestors 'none'`.
- Assets statiques versionnés et cache contrôlé.
- Service worker Workbox avec stratégie de mise à jour explicite.
- Pas de `dangerouslySetInnerHTML` identifié dans le scan local.

### API ECG

- Méthode `POST` uniquement.
- `Cache-Control: no-store`.
- MIME acceptés : JPEG, PNG, WebP.
- Taille maximale : 2 Mo après compression.
- Rate limit best-effort : 8 requêtes/min/IP.
- Proxy serveur : clés Gemini/Mistral non exposées au client.

### Dépendances et CI

- `npm audit --audit-level=moderate` ajouté en CI.
- Vulnérabilité `ws` corrigée via lockfile.
- Vérifications utilisées : typecheck, lint, knip, tests, build.

### Supabase

État vérifié en production le 26 mai 2026 pour `public.profiles` :

- RLS active.
- Policies finales : `self_read`, `admin_read_all`, `admin_update_all`, `admin_delete`.
- Aucune policy `anon` ou `public`.
- `anon` n'a pas le privilège `SELECT`.
- `authenticated` conserve `SELECT`, `UPDATE`, `DELETE`.
- Privilèges inutiles retirés : `INSERT`, `TRUNCATE`, `TRIGGER`, `REFERENCES`.

## Décision offline-first

MediURG est conçu pour rester disponible sans réseau.

Décision technique actuelle :

- première connexion/appairage en ligne requis si l'auth est activée ;
- après appairage, un profil caché local permet l'accès hors ligne ;
- une suspension serveur peut ne s'appliquer qu'à la reconnexion ;
- les mutations serveur restent protégées par Supabase/RLS.

Risque résiduel assumé : accès local prolongé sur appareil déjà appairé si l'utilisateur perd son
habilitation pendant une période hors réseau.

Décision à valider par DSI/RSSI : durée acceptable du fallback offline et procédure de retrait en
cas de départ d'un agent ou de perte d'appareil.

## Risques résiduels

| Risque                                      | Niveau proposé | Mesures existantes                   | Décision attendue                       |
| ------------------------------------------- | -------------- | ------------------------------------ | --------------------------------------- |
| Saisie de donnée patient dans notes locales | moyen          | avertissement UI, local uniquement   | valider consigne utilisateur            |
| Image ECG non parfaitement anonymisée       | élevé          | masquage local + avertissement       | valider ou désactiver le module         |
| Accès offline après retrait d'habilitation  | moyen          | réconciliation à la reconnexion      | valider compromis urgentiste            |
| Perte/vol d'appareil appairé                | moyen          | logout possible, stockage navigateur | définir procédure institutionnelle      |
| Dépendance Vercel/Supabase/IA               | moyen          | secrets protégés, RLS, headers       | valider sous-traitants                  |
| Erreur de contenu clinique                  | élevé          | versioning, PWA update prompt        | définir procédure de correction urgente |

## Points à valider

- Responsable de traitement et base légale RGPD.
- DPO/RSSI : autorisation d'usage de Vercel et Supabase.
- DPO/RSSI : autorisation ou suspension du module ECG IA.
- Politique de conservation des comptes agents.
- Procédure de retrait d'accès et perte d'appareil.
- Mention légale finale : directeur de publication, DPO confirmé, contact institutionnel.
- Confirmation qu'aucune donnée patient nominative ne doit être saisie dans les notes.
- Fréquence d'audit Supabase/RLS.

## Checklist avant validation institutionnelle

- [ ] DPO valide la notice d'information et la base légale.
- [ ] RSSI valide l'architecture et les sous-traitants.
- [ ] DSI valide l'hébergement et le modèle offline.
- [ ] Le module ECG IA est validé ou désactivé.
- [ ] Les variables d'environnement prod sont contrôlées.
- [ ] Les advisors Supabase sécurité/performance sont lancés et traités.
- [ ] Un test hors ligne complet est effectué sur appareil réel.
- [ ] Une procédure de correction urgente du contenu clinique est documentée.
- [ ] Une procédure de retrait d'accès agent est documentée.
- [ ] Les mentions légales sont complétées et validées.

## Commandes de vérification

```bash
npm audit --audit-level=moderate
npm run typecheck
npm run lint
npm run knip
npm test
npm run build
```

## Références internes

- [`AUTH_SETUP.md`](./AUTH_SETUP.md)
- [`SECURITY_RUNBOOK.md`](./SECURITY_RUNBOOK.md)
- [`DEPLOY_PWA.md`](../DEPLOY_PWA.md)
- [`QUICK_START_PWA.md`](../QUICK_START_PWA.md)
