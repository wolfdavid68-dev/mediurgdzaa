# Plan — Relais de sessions multi-appareils & déconnexion à distance

> **Instructions destinées à un agent IA (Claude, Codex, etc.) chargé de l'implémentation.**
> Lire ce document en entier avant de commencer. Implémenter **un chantier à la
> fois**, dans l'ordre (1 → 2 → 3), avec `npm run verify` vert entre chaque
> chantier. Ne pas commencer le chantier suivant sans validation de l'utilisateur.

## Contexte

MediURG est une PWA offline-first (voir `CLAUDE.md`). L'utilisateur (médecin
urgentiste) veut :

1. **Un bouton « Déconnecter mes autres appareils »** — il se connecte sur des
   postes partagés du service ; en partant, il veut révoquer toutes les
   sessions sauf celle de l'appareil courant (son téléphone en général).
2. **Plusieurs dossiers ACR simultanés** — deux arrêts cardiaques en même temps
   au SAUV est un scénario réel. Aujourd'hui une seule session ACR peut exister
   (clé unique `mediurg-acr-session-v1`).
3. **Un relais téléphone → ordinateur** — commencer un dossier ACR (ou une
   check-list de kit) sur téléphone pendant l'intervention, puis le finir /
   l'imprimer sur un poste fixe. Ce n'est PAS une synchro temps réel : c'est un
   passage de relais opportuniste via Supabase.

### Contraintes transverses (non négociables)

- **Français partout** : UI, commentaires, commits, données.
- **Offline-first** : aucune action clinique ne doit être bloquée par le
  réseau. Toute poussée serveur est opportuniste (file d'attente + flush au
  retour en ligne). Le `localStorage` reste la source de vérité locale.
- **Aucune donnée nominative côté serveur** : le dossier ACR est anonyme par
  conception (`coerceAcrSession` dans `src/lib/acrSession.ts` ne garde que
  âge/sexe et scrube le reste). Toujours passer le payload par
  `coerceAcrSession` **avant** de le pousser vers Supabase.
- **Aucun secret côté client** : seules les variables `VITE_` existantes.
  La table de sync est protégée par RLS, pas par une clé.
- **Pas de lazy-load sur les chemins cliniques** (cf. mémoire projet : un
  chunk non préchargé = crash hors-ligne). La couche de sync doit être en
  import statique ou dégradable silencieusement.
- **React Compiler actif** : pas de `useMemo`/`useCallback` réflexes dans le
  nouveau code ; ne pas retirer ceux existants.
- **IDs et clés localStorage existants intouchables** (pas de renumérotation,
  pas de renommage de clés sans migration).
- Toute logique calculatoire/métier en fonctions pures dans `src/lib/` avec
  tests Vitest (projets node pour la logique pure, happy-dom pour les
  composants — voir `vite.config.ts`).
- Si l'auth, la CSP, `vercel.json` ou le SQL changent : relire
  `docs/AUTH_SETUP.md` et `docs/SECURITY_RUNBOOK.md` et les mettre à jour.

---

## Chantier 1 — Bouton « Déconnecter mes autres appareils »

**Effort : léger. Aucune migration SQL.**

### API

Supabase le supporte nativement :

```ts
await supabase.auth.signOut({ scope: "others" });
```

`others` révoque tous les refresh tokens de l'utilisateur **sauf** celui de la
session courante. Deux limites à documenter dans le code et l'UI :

- Les access tokens (JWT) déjà émis restent valides jusqu'à expiration
  (1 h par défaut) — la déconnexion des autres postes est donc effective
  « dans l'heure », pas instantanée. Recommander à l'utilisateur (dans
  `docs/AUTH_SETUP.md`) d'abaisser la durée de vie du JWT à 10–15 min dans le
  dashboard Supabase.
- Un appareil hors-ligne ne sera éjecté qu'à son retour en ligne (inhérent à
  l'offline-first).

### Implémentation

1. **`src/lib/auth.ts`** — ajouter à côté de `logout()` (ligne ~292) :

   ```ts
   export const logoutOtherDevices = async (): Promise<AuthResult> => { ... }
   ```

   - Contrairement à `logout()` (scope `local`, jamais d'appel réseau), cette
     fonction **exige** le réseau : si `navigator.onLine === false` ou si
     l'appel échoue, retourner `{ ok: false, error: "Connexion requise pour
     déconnecter les autres appareils" }`. Ne jamais throw.
   - Ne PAS purger le cache profil local (`clearCachedProfile`) : la session
     courante reste active.

2. **`src/components/AppHeader.tsx`** — dans le menu existant (le bouton
   « Se déconnecter » est vers la ligne 215), ajouter une entrée
   « Déconnecter mes autres appareils » :
   - visible seulement en mode authentifié et en ligne ;
   - confirmation avant action (réutiliser le pattern de confirmation existant
     dans l'app s'il y en a un, sinon un simple état à deux étapes « Confirmer ? ») ;
   - feedback de résultat (« Autres appareils déconnectés » / message d'erreur).

3. **Purge à la révocation détectée (protection des postes partagés)** — dans
   `AuthGate.tsx` / la gestion des events Supabase (`onAuthStateChange`) : quand
   une session est invalidée côté serveur (refresh token révoqué → event
   `SIGNED_OUT` non initié localement), purger le cache profil
   (`clearCachedProfile`) et rediriger vers l'écran de login. Vérifier ce que
   fait déjà `AuthGate` avant d'ajouter quoi que ce soit — il gère peut-être
   déjà ce cas.

4. **Tests** : test unitaire de `logoutOtherDevices` (mock du client Supabase,
   cas hors-ligne, cas erreur réseau) sur le modèle des tests auth existants.

---

## Chantier 2 — Multi-sessions ACR locales

**Effort : moyen. Aucune dépendance serveur — utile même sans le chantier 3.**

### État actuel

- Une seule session, blob JSON sous la clé unique `STORAGE_KEYS.acrSession`
  (`mediurg-acr-session-v1`), lue/écrite dans `src/components/AcrRecordView.tsx`
  (lecture ligne ~75 `readStoredRecord`, écritures lignes ~277 et ~296).
- Chaque session possède déjà un `id` unique (`acr-{timestamp}-{aléatoire}`,
  cf. `makeId` dans `src/lib/acrSession.ts`) — il n'est simplement pas exploité
  comme clé de stockage.
- `AcrRecordView` est rendu par `src/components/AcrTimer.tsx` (ligne ~349).

### Cible

1. **Nouveau module `src/lib/acrSessionStore.ts`** (fonctions pures + accès
   localStorage via `safeStorage`, testé sous node) :
   - clés : `mediurg-acr-session-v2-{sessionId}` + index
     `mediurg-acr-sessions-index` (tableau de résumés
     `{id, createdAt, updatedAt, pediatric, protocol, shocks, cycle}`) —
     ajouter ces conventions dans `src/lib/storageKeys.ts` ;
   - API : `listSessions()`, `readSession(id)`, `writeSession(session)`,
     `deleteSession(id)`, `purgeExpired()` (suppression des sessions dont
     `updatedAt` > 48 h — conserver la philosophie éphémère existante) ;
   - **migration v1 → v2** : au premier accès, si `mediurg-acr-session-v1`
     existe, l'importer comme une session v2 (via `coerceAcrSession`) puis
     supprimer la clé v1. Idempotent.

2. **Écran d'entrée du recueil ACR** (dans le flux `AcrTimer` →
   `AcrRecordView`) :
   - **« Nouvelle session »** : gros bouton principal, toujours en premier —
     le mode ACR est utilisé en situation de stress réel (cf. mémoire
     utilisateur : simple, intuitif, gros boutons). Le démarrage d'un nouveau
     dossier ne doit JAMAIS être ralenti par la liste.
   - En dessous, **« Sessions récentes »** (< 48 h) : une ligne par session,
     format « Adulte · ERC · débutée 14 h 32 · 3 chocs · cycle 5 ». Aucune
     donnée nominative à afficher (il n'y en a pas dans le modèle).
   - Reprendre une session = la charger dans `AcrRecordView` à la place du
     comportement actuel (lecture du blob unique).

3. **Refactor `AcrRecordView`** : remplacer les lectures/écritures directes de
   `STORAGE_KEYS.acrSession` par le store. Le composant reçoit l'`id` de la
   session active (prop ou état dans `AcrTimer`).

4. **Attention au chrono** : si une session reprise a un timer « en cours »
   (événement `start` sans `rosc`/fin), recalculer `elapsed` depuis l'heure
   murale des événements (`event.at`) plutôt que de reprendre la valeur figée —
   sinon le chrono repart en retard. Logique pure dans `acrSession.ts` ou le
   store, avec test.

5. **Tests** : store complet (CRUD, index, migration v1→v2, purge 48 h,
   recalcul du chrono).

---

## Chantier 3 — Relais Supabase (dossiers ACR + check-lists kits)

**Effort : le plus gros. Dépend des chantiers 1 (purge à la révocation) et 2
(multi-sessions).**

### Schéma SQL

Créer `docs/auth-sync-patch.sql` (les patchs SQL du projet vivent dans `docs/`,
appliqués manuellement dans le SQL Editor Supabase — suivre le style de
`docs/auth-schema.sql`) :

- **Une table générique** pour les deux types d'objets :

  ```sql
  create table if not exists public.sync_items (
    user_id    uuid not null references auth.users(id) on delete cascade,
    kind       text not null check (kind in ('acr-session', 'kit-check')),
    item_id    text not null,
    payload    jsonb not null,
    updated_at timestamptz not null default now(),
    primary key (user_id, kind, item_id)
  );
  ```

- **RLS owner-only** : select/insert/update/delete uniquement où
  `auth.uid() = user_id`. Aucun accès admin nécessaire.
- **Purge TTL sans pg_cron** : nettoyer à l'écriture — dans une fonction RPC
  `upsert_sync_item` (SECURITY INVOKER suffit avec la RLS), supprimer au
  passage les lignes expirées de l'utilisateur : 48 h pour `acr-session`,
  3 h pour `kit-check` (aligné sur l'expiration locale des check-lists,
  cf. `PrepKitCard.tsx`). Faire la même purge dans la RPC de lecture
  `list_sync_items(kind)`.
- Documenter la table dans `docs/AUTH_SETUP.md` et le caractère
  anonyme/éphémère dans `docs/SECURITY_RUNBOOK.md`.

### Couche client — `src/lib/deviceSync.ts`

- **File d'attente locale** (clé `mediurg-sync-queue`) : chaque écriture
  locale d'une session ACR (via le store du chantier 2) ou d'une check-list
  enfile `{kind, item_id, payload, updated_at}` ; un flush tente l'envoi
  (RPC `upsert_sync_item`) immédiatement puis sur l'event `online` et au
  lancement de l'app. Échec réseau = on garde en file, silencieusement.
  **Jamais de blocage UI, jamais de throw sur un chemin clinique.**
- **Scrub avant envoi** : pour `acr-session`, passer le payload par
  `coerceAcrSession` (garantie anonymat même si un vieux blob traîne).
- **Lecture** : fonction `pullSessions()` appelée à l'ouverture de l'écran
  « Sessions récentes » (chantier 2). Fusion serveur/local par
  `(kind, item_id)` : la version au `updated_at` le plus récent gagne
  (last-write-wins). Une session présente uniquement côté serveur apparaît
  dans la liste avec un badge « depuis un autre appareil » ; **la reprise
  écrase le local seulement après le choix explicite de l'utilisateur**
  (pas de fusion silencieuse).
- Mode anonyme (`AUTH_ENABLED=false` ou non connecté) : la couche sync est
  inerte, tout continue de fonctionner en local pur.

### Check-lists de kits

- `PrepKitCard.tsx` lit/écrit `storageKey.kitCheck(kit.id)` (lignes ~16 et
  ~56). ⚠️ **Vérifier d'abord une incohérence existante** : `PrepKitCard`
  utilise la clé anonyme `mediurg-kit-check-{kitId}` alors que
  `migrateAnonymousData` (dans `src/lib/userStorage.ts`) migre ces clés vers
  le préfixe utilisateur `mediurg-u{userId}-…`. Clarifier quelle convention
  s'applique en mode authentifié avant de brancher la sync, et corriger si
  besoin (probablement : passer `PrepKitCard` par `readUserItem`/`writeUserItem`).
- Brancher ensuite l'écriture sur la file de sync (`kind: 'kit-check'`,
  `item_id: kitId`, payload `{ts, items}`). À la lecture, si le serveur a une
  version plus récente **et non expirée** (3 h depuis `ts`), proposer de la
  reprendre. L'expiration 3 h reste calculée sur `ts`, quel que soit
  l'appareil.

### Tests

- `deviceSync` : file d'attente (enfilement, flush, échec réseau → rétention),
  fusion LWW, scrub du payload ACR, inertie en mode anonyme. Mock Supabase.
- Un test d'intégration du flux « session serveur plus récente → badge →
  reprise explicite » côté composant (happy-dom).

---

## Vérifications finales (à chaque chantier)

1. `npm run verify` (typecheck + lint + knip + asset refs + CSS mort + tests).
2. Vérifier le comportement **hors-ligne** : couper le réseau (DevTools) et
   confirmer que le mode ACR, les check-lists et la déconnexion locale
   fonctionnent toujours.
3. Pas de nouvelle entrée CSP nécessaire (le domaine Supabase est déjà
   autorisé pour l'auth) — mais si `vercel.json` est touché, relire
   `docs/SECURITY_RUNBOOK.md`.
4. Messages de commit en français, un commit par chantier minimum.
