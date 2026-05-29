# Auth Supabase — Setup

Ce guide explique comment configurer le backend Supabase pour activer la
feature d'authentification (`AUTH_ENABLED = true` dans
[`src/lib/featureFlags.ts`](../src/lib/featureFlags.ts)).
Pour l'audit périodique et la checklist sécurité avant déploiement, voir aussi
[`SECURITY_RUNBOOK.md`](./SECURITY_RUNBOOK.md).

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
- Table `push_subscriptions` : abonnements Web Push des admins, protégés par RLS
- Fonction `public.is_admin_mfa()` : admin actif + session MFA `aal2`
- Table `admin_audit_events` : journal des approbations, refus, suspensions et rétablissements
- RPC `admin_approve_profile`, `admin_reject_profile`, `admin_ban_profile`,
  `admin_unban_profile` : actions admin atomiques avec écriture du journal dans
  la même transaction
- Table `access_request_notifications` : déduplication durable des notifications
  de demande d'accès

Si le schéma existe déjà et que seule la protection MFA admin doit être ajoutée, utiliser le patch
ciblé [`docs/auth-admin-mfa-patch.sql`](./auth-admin-mfa-patch.sql) au lieu de relancer tout le
fichier `auth-schema.sql`.

Si le MFA et le journal existent déjà, appliquer ensuite
[`docs/auth-admin-atomic-audit-patch.sql`](./auth-admin-atomic-audit-patch.sql)
pour basculer les actions admin vers les RPC atomiques et activer la
déduplication durable des notifications.

## 3. Promouvoir le 1er admin

Après avoir créé ton compte via l'app,
tu auras un profile en `status='pending'`. Pour t'auto-promouvoir :

```sql
update public.profiles
set status = 'active', role = 'admin', approved_at = now()
where email = 'wolfdavid68@gmail.com';
```

À partir de là, tu peux te login et utiliser la console admin pour
approuver les autres demandes (aucune intervention SQL future nécessaire).

## 3 bis. MFA administrateur

Le MFA est imposé uniquement aux administrateurs lors de l'ouverture de la console admin. Les
utilisateurs non admin gardent le parcours habituel.

Premier accès admin :

1. Se connecter avec le matricule et le mot de passe.
2. Faire l'appui long sur le logo pour ouvrir la console admin.
3. Scanner le QR code MFA avec une application TOTP compatible.
4. Saisir le code à 6 chiffres.
5. La console admin s'ouvre après passage de la session Supabase en `aal2`.

La perte du second facteur doit être traitée par une procédure institutionnelle de récupération
admin, à valider avec DSI/RSSI.

## 3 ter. Journal admin

La console admin contient un onglet **Journal**. Il affiche les actions sensibles :

- approbation d'un compte ;
- refus d'une demande ;
- suspension ;
- rétablissement ;
- admin acteur, compte cible, date et motif éventuel.

Le journal est exportable en CSV pour revue DPO/RSSI/DSI.

Depuis le durcissement post-scan Codex Security, les validations/refus/suspensions
ne sont plus écrits en deux appels client séparés. Le client appelle une RPC
Supabase ; la modification du profil et l'insertion dans `admin_audit_events`
sont exécutées dans la même transaction. Les droits directs `UPDATE`/`DELETE`
sur `profiles` et `INSERT` sur `admin_audit_events` sont retirés du rôle
`authenticated`.

## 4. Variables d'environnement

Récupérer les valeurs dans Supabase → Project Settings → API.
La doc Supabase actuelle recommande les clés publiques `sb_publishable_*` côté navigateur ;
la clé `anon` legacy reste acceptée par l'app pour compatibilité.

**Local (`.env.local`, gitignored)** :

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# fallback legacy accepté si le projet n'a pas encore de publishable key :
# VITE_SUPABASE_ANON_KEY=eyJ...
```

⚠️ **Ne JAMAIS** mettre la `service_role` ou une clé secrète côté client — elle bypass RLS.

**Vercel (Project Settings → Environment Variables)** :
Ajouter les deux mêmes variables, scope « Production », « Preview », « Development ».

### Notifications téléphone PWA des demandes d'accès

Pour recevoir un pop-up natif sur téléphone quand une inscription passe en
`status='pending'`, sans service externe de messagerie :

1. Générer une paire VAPID une seule fois :

```bash
node -e "import('web-push').then(w=>console.log(w.default.generateVAPIDKeys()))"
```

2. Ajouter ces variables dans Vercel :

```
VITE_WEB_PUSH_PUBLIC_KEY=<publicKey VAPID>
WEB_PUSH_PRIVATE_KEY=<privateKey VAPID>
WEB_PUSH_SUBJECT=mailto:<email-contact-admin>
SUPABASE_SERVICE_ROLE_KEY=<clé service_role Supabase>
APP_PUBLIC_URL=https://<domaine-mediurg>
```

La clé publique `VITE_WEB_PUSH_PUBLIC_KEY` est normale côté navigateur : elle
sert à créer l'abonnement push. La clé privée VAPID et la `service_role`
restent côté serveur Vercel uniquement. La route `/api/notify-access-request`
valide via la session Supabase du demandeur que son propre profil existe bien
en `status='pending'`, puis lit côté serveur les abonnements des admins actifs.
La notification envoyée est générique : pas de nom, matricule, service, email
ni donnée patient dans le push.

La déduplication des notifications est stockée dans
`public.access_request_notifications` avec une fenêtre de 6 h. Elle ne dépend
plus seulement de la mémoire de l'instance Vercel.

3. Dans la console admin MediURG, cliquer sur **Activer notifications** sur
   chaque téléphone admin qui doit recevoir les pop-ups.

## 5. Activer la feature

Quand tout fonctionne sur localhost :

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
`http://localhost:5173/` :

- [ ] Signup avec un matricule de test (ex: `M999999`, email
      `test@ghrmsa.fr`) → demande créée en `pending`
- [ ] Connexion impossible tant que `pending` → écran « En attente »
- [ ] Promotion via SQL → connexion OK
- [ ] Console admin accessible par **appui long (~600 ms) sur le logo**
      (role=admin uniquement ; aucun bouton visible — accès discret)
- [ ] Premier accès admin → écran MFA, scan QR code, code TOTP à 6 chiffres
- [ ] Console admin → onglet Journal visible après MFA et export CSV possible
- [ ] Console admin → **Activer notifications** sur le téléphone admin
- [ ] Nouvelle demande créée depuis un autre compte → pop-up générique reçu
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
│   ├── featureFlags.ts       ← AUTH_ENABLED + preview interne ?author=preview
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

MediURG n'utilise pas de router : la protection de routes est centralisée par
`AuthGate` autour de `<App />` dans `src/index.tsx`. Tant qu'aucun profil actif
n'est résolu, aucune page clinique n'est rendue ; quand le profil est actif,
`App.tsx` applique ensuite les droits métier (`full`, `medicaments`, `tutorat`).

## Comportement hors-ligne (offline-first)

MediURG est un outil d'urgence : le contenu clinique doit rester
accessible **sans réseau**. L'auth ne doit jamais le verrouiller.

**Modèle « appairage en ligne une fois → usage offline illimité »**
(comme un contenu téléchargé) :

| Situation                                          | Comportement                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| 1ʳᵉ connexion (appareil jamais appairé)            | Réseau requis (seul moment incompressible)                       |
| App rouverte hors-réseau, appareil déjà appairé    | ✅ session localStorage + **profil caché** → entre               |
| `fetchProfile` échoue avec `kind:"network"`        | → profil caché (offline dur, wifi sans route, timeout)           |
| `fetchProfile` échoue `notfound`/`config`/en ligne | → écran login (légitime, ré-auth/config possible)                |
| Session expirée + offline (refresh impossible)     | → `getLastCachedProfile()` (appareil appairé → on garde l'accès) |
| Déconnexion explicite                              | `logout()` purge le cache → mur login au prochain lancement      |

**Contrainte refresh-token à cadrer côté Supabase.** Le JWT expire
(~1 h) ; son refresh exige le réseau. Le **refresh token** a sa propre
durée de vie (Supabase → Auth → Sessions). Si un appareil reste
hors-ligne plus longtemps que cette durée, la session est invalidée :
le fallback `getLastCachedProfile()` prend alors le relais tant que le
profil caché existe. Pour un usage SMUR (jours offline), augmenter le
refresh-token TTL Supabase reste recommandé en complément.

**Risque accepté — falsification du cache.** Le profil en localStorage
(`mediurg-profile-cache-v1`) est éditable côté client : un utilisateur
averti peut forcer `role:"admin"` ou `status:"active"` pour _voir_ la
console admin / l'app hors-ligne. Impact limité et assumé :

- toute **action serveur** (approuver, bannir…) passe par Supabase +
  **RLS** → échoue offline et est ré-vérifiée côté serveur en ligne ;
- à la reconnexion, `fetchProfile` **écrase** le cache avec la vérité
  serveur (réconciliation automatique) ;
- le contenu clinique est de toute façon la finalité de l'app.

Ne jamais faire confiance au profil caché pour autoriser une mutation —
uniquement pour décider quel écran afficher hors-ligne.
