# Auth Supabase — Setup

Ce guide explique comment configurer le backend Supabase pour activer la
feature d'authentification (`AUTH_ENABLED = true` dans
[`src/lib/featureFlags.ts`](../src/lib/featureFlags.ts)).

Tant que l'auth n'est pas activée, l'app continue de fonctionner sans
login (mode actuel par défaut). **Ne pas flip le flag tant que les étapes
ci-dessous ne sont pas faites en prod.**

## 1. Créer le projet Supabase

1. Aller sur https://supabase.com → « Start your project » → créer un
   nouveau projet (région **Frankfurt eu-central-1** recommandée pour la
   latence depuis l'Alsace).
2. Mot de passe DB : générer un mot de passe fort, le stocker dans 1Password.
3. Plan « Free » suffit pour démarrer (500 MB DB + 50k MAU).

## 2. Exécuter le SQL d'init

Dans le SQL Editor de Supabase, copier-coller [`docs/auth-schema.sql`](./auth-schema.sql)
et exécuter. Cela crée :

- Table `profiles` (matricule, email, prenom, nom, fonction, service, status, role, …)
- Vue publique `matricule_lookup` (résolution matricule → email pour le login)
- Trigger `on_auth_user_created` : copie `raw_user_meta_data` de `auth.users` vers `profiles` au signup
- Fonction `public.is_admin()` : utilisée dans les RLS pour les contrôles admin
- Policies RLS : un user voit son profile, un admin voit tout
- Contrainte unique sur `matricule` (un matricule = un compte)

## 3. Promouvoir le 1er admin

Après avoir créé ton compte via l'app (en mode preview avec `?auth=preview`),
tu auras un profile en `status='pending'`. Pour t'auto-promouvoir :

```sql
update public.profiles
set status = 'active', role = 'admin', approved_at = now()
where email = 'wolfdavid68@gmail.com';
```

À partir de là, tu peux te login et utiliser la console admin pour
approuver les autres demandes (aucune intervention SQL future nécessaire).

## 4. Variables d'environnement

Récupérer les valeurs dans Supabase → Project Settings → API.

**Local (`.env.local`, gitignored)** :

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...   # clé "anon public"
```

⚠️ **Ne JAMAIS** mettre la `service_role` côté client — elle bypass RLS.

**Vercel (Project Settings → Environment Variables)** :
Ajouter les deux mêmes variables, scope « Production », « Preview », « Development ».

## 5. Activer la feature

Quand tout fonctionne en preview (`?auth=preview` sur localhost) :

1. Modifier [`src/lib/featureFlags.ts`](../src/lib/featureFlags.ts) :
   `const AUTH_ENABLED = true;`
2. Commit + push → Vercel redéploie.
3. Bumper la version dans [`src/data/changelog.js`](../src/data/changelog.js)
   avec une entrée feat décrivant l'activation.

## 6. Politique de confidentialité

L'activation introduit une dépendance externe (Supabase) qui collecte
des données personnelles (email pro, matricule, fonction, service).
Penser à :

- Mettre à jour la mention légale / politique de confidentialité de
  l'app pour informer les utilisateurs (RGPD).
- Vérifier l'accord du DPO du GHRMSA.
- Configurer la rétention des données dans Supabase
  (Settings → Database → Auto-delete inactive users).

## Tests

Une fois Supabase configuré, tester en local avec
`http://localhost:5173/?auth=preview` :

- [ ] Signup avec un matricule de test (ex: `M999999`, email
  `test@ghrmsa.fr`) → demande créée en `pending`
- [ ] Connexion impossible tant que `pending` → écran « En attente »
- [ ] Promotion via SQL → connexion OK
- [ ] Console admin visible (FAB ⚙ en bas-gauche pour role=admin)
- [ ] Approve / reject / ban / unban depuis la console
- [ ] Logout → retour à l'écran login

## Rollback

Pour désactiver l'auth en cas de problème en prod :

1. Modifier `featureFlags.ts` → `AUTH_ENABLED = false`.
2. Commit + push → l'app revient au mode anonyme immédiatement.
3. Les données utilisateurs en localStorage (notes, favoris) sont
   préservées (le storage anonyme n'a jamais été supprimé pendant
   l'auth — cf. `src/lib/userStorage.ts`).

## Architecture

```
src/
├── lib/
│   ├── featureFlags.ts       ← AUTH_ENABLED + override ?auth=preview
│   ├── supabase.ts           ← Singleton client
│   ├── auth.ts               ← signup / login / logout / fetchProfile / actions admin
│   └── userStorage.ts        ← localStorage préfixé par userId + migration
└── components/
    └── auth/
        ├── AuthGate.tsx      ← Wrapper qui décide quoi rendre
        ├── LoginScreen.tsx   ← Matricule + password
        ├── RegisterScreen.tsx← 2 étapes + confirmation
        ├── StatusScreens.tsx ← Pending / Banned
        ├── AdminDashboard.tsx← Console admin (3 onglets)
        └── MatriculeInput.tsx← Champ partagé (préfixe M figé)
```
