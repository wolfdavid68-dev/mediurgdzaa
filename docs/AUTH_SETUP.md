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
- Fonction `matricule_to_email(text)` (résolution matricule → email pour le login, SECURITY DEFINER paramétrée — pas d'exposition de `profiles` aux anonymes)
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
- [ ] Console admin accessible par **appui long (~600 ms) sur le logo**
      (role=admin uniquement ; aucun bouton visible — accès discret)
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
│   ├── auth.ts               ← signup / login / logout / fetchProfile (+ kind) / actions admin
│   ├── profileCache.ts       ← Cache profil localStorage (fallback offline)
│   ├── useIsMobile.ts        ← Breakpoint desktop/mobile (côté court ≤ 600px)
│   └── userStorage.ts        ← localStorage préfixé par userId + migration
└── components/
    └── auth/
        ├── AuthGate.tsx      ← Wrapper + resolveProfile (tolérance offline)
        ├── authConstants.ts  ← FONCTIONS / SERVICES / BAN_REASONS
        ├── hooks/            ← useLoginForm / useRegisterForm / useAdminProfiles
        │                       useForgotPasswordForm / useResetPasswordForm
        ├── LoginScreen.tsx   ← Matricule + password (desktop)
        ├── RegisterScreen.tsx← 2 étapes + confirmation
        ├── StatusScreens.tsx ← Pending / Banned
        ├── AdminDashboard.tsx← Console admin (3 onglets, drawer a11y)
        ├── MatriculeInput.tsx← Champ partagé (préfixe M figé)
        └── mobile/           ← Design mobile dédié (tab bar, bottom sheet)
                                MobileLogin/Register/Admin/Forgot/Reset…
```

## Comportement hors-ligne (offline-first)

MediURG est un outil d'urgence : le contenu clinique doit rester
accessible **sans réseau**. L'auth ne doit jamais le verrouiller.

**Modèle « appairage en ligne une fois → usage offline illimité »**
(comme un contenu téléchargé) :

| Situation | Comportement |
|---|---|
| 1ʳᵉ connexion (appareil jamais appairé) | Réseau requis (seul moment incompressible) |
| App rouverte hors-réseau, appareil déjà appairé | ✅ session localStorage + **profil caché** → entre |
| `fetchProfile` échoue avec `kind:"network"` | → profil caché (offline dur, wifi sans route, timeout) |
| `fetchProfile` échoue `notfound`/`config`/en ligne | → écran login (légitime, ré-auth/config possible) |
| Session expirée + offline (refresh impossible) | → `getLastCachedProfile()` (appareil appairé → on garde l'accès) |
| Déconnexion explicite | `logout()` purge le cache → mur login au prochain lancement |

**Contrainte refresh-token à cadrer côté Supabase.** Le JWT expire
(~1 h) ; son refresh exige le réseau. Le **refresh token** a sa propre
durée de vie (Supabase → Auth → Sessions). Si un appareil reste
hors-ligne plus longtemps que cette durée, la session est invalidée :
le fallback `getLastCachedProfile()` prend alors le relais tant que le
profil caché existe. Pour un usage SMUR (jours offline), augmenter le
refresh-token TTL Supabase reste recommandé en complément.

**Risque accepté — falsification du cache.** Le profil en localStorage
(`mediurg-profile-cache-v1`) est éditable côté client : un utilisateur
averti peut forcer `role:"admin"` ou `status:"active"` pour *voir* la
console admin / l'app hors-ligne. Impact limité et assumé :

- toute **action serveur** (approuver, bannir…) passe par Supabase +
  **RLS** → échoue offline et est ré-vérifiée côté serveur en ligne ;
- à la reconnexion, `fetchProfile` **écrase** le cache avec la vérité
  serveur (réconciliation automatique) ;
- le contenu clinique est de toute façon la finalité de l'app.

Ne jamais faire confiance au profil caché pour autoriser une mutation —
uniquement pour décider quel écran afficher hors-ligne.
