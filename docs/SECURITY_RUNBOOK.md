# Runbook sécurité MediURG

Ce document complète [`AUTH_SETUP.md`](./AUTH_SETUP.md). Il sert de checklist courte avant
déploiement et de procédure d'audit périodique pour la PWA, Supabase et les données locales. Pour
un support de validation institutionnelle, voir aussi
[`DOSSIER_SECURITE_DPO_RSSI.md`](./DOSSIER_SECURITE_DPO_RSSI.md).

## Avant chaque mise en production

- Lancer `npm audit --audit-level=moderate`.
- Lancer `npm run typecheck`, `npm run lint`, `npm run knip`, `npm test`, puis `npm run build`.
- Lancer `npm run verify:pwa-offline` après le build : précache Workbox, budgets gzip par chunk,
  scan d'indices de secrets serveur dans les assets buildés.
- Lancer `npm run verify:pwa-offline:browser` pour valider les routes cliniques hors-ligne dans
  Chromium et régénérer les captures mobiles factices dans `build/offline-screenshots/`.
- Lancer `npm run report:data` si les données cliniques ont changé, puis relire
  `RAPPORT_DONNEES_CLINIQUES.md`.
- Vérifier que `vercel.json` contient toujours les headers globaux : CSP, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, HSTS et `frame-ancestors 'none'`.
- Si le script bootstrap inline de `index.html` change, recalculer le hash `sha256-...` dans la
  CSP (`script-src`) au même commit.
- Vérifier qu'aucune variable secrète n'est préfixée `VITE_`.
- Vérifier que les rapports et captures générés ne contiennent aucune donnée patient, note
  utilisateur réelle, matricule réel ou email réel.
- Vérifier les variables Web Push :
  - `VITE_WEB_PUSH_PUBLIC_KEY` seule côté client ;
  - `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` et `SUPABASE_SERVICE_ROLE_KEY` uniquement côté
    Vercel/serverless ;
  - aucune clé VAPID privée ou `service_role` dans le bundle.
- Vérifier qu'aucune clé API réelle n'est suivie par Git : `.env.local`, `.env`, `.mcp.json`,
  `.claude/` et `.codex/` doivent rester ignorés.
- Pour tout changement de service worker/PWA, faire un test de mise à jour : version déjà
  installée, nouvelle version en attente, clic sur « Mettre à jour », puis usage hors ligne.
- Pour tout changement Web Push, vérifier que la notification de demande d'accès reste générique :
  pas de nom, matricule, email, service, IPP ou donnée patient dans le payload.

## Audit Supabase prod

À faire après création du projet, après tout changement SQL, puis périodiquement.

### Dernière vérification MediURG

Vérifié en production le 26 mai 2026 via le SQL Editor Supabase.
Revue locale du code `main` le 28 mai 2026 après ajout des notifications PWA admin.

- `public.profiles` : RLS active (`rowsecurity = true`).
- `public.admin_audit_events` : RLS active (`rowsecurity = true`) si le journal admin a été
  déployé.
- `public.push_subscriptions` : RLS active (`rowsecurity = true`) si les notifications admin ont
  été déployées.
- Policies finales sur `public.profiles` : `self_read`, `admin_read_all`, `admin_update_all`,
  `admin_delete`.
- Aucune policy `anon` ou `public` sur `public.profiles`.
- Privilège direct `anon` sur `public.profiles` : `SELECT = false`.
- Privilèges `authenticated` conservés sur `public.profiles` : `SELECT = true`,
  `UPDATE = true`, `DELETE = true`.
- Privilèges inutiles retirés de `authenticated` sur `public.profiles` : `INSERT`, `TRUNCATE`,
  `TRIGGER`, `REFERENCES`.

### 1. Advisors

Depuis le connecteur Supabase ou le dashboard, lancer les advisors sécurité et performance.
Traiter en priorité :

- table exposée sans RLS ;
- policy trop large sur `anon` ;
- fonction `SECURITY DEFINER` sans `search_path` verrouillé ;
- vue exposée qui bypass RLS ;
- index manquant sur colonnes utilisées par les policies ou filtres admin.

### 2. Grants et RLS

Exécuter ces requêtes dans le SQL Editor Supabase.

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Attendu pour MediURG : `public.profiles` avec `rowsecurity = true`.
Si l'audit admin est déployé : `public.admin_audit_events` avec `rowsecurity = true`.
Si les notifications admin sont déployées : `public.push_subscriptions` avec `rowsecurity = true`.

```sql
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'profiles'
order by grantee, privilege_type;
```

Attendu : aucun accès direct `anon` à `profiles`. Le rôle `authenticated` peut avoir les droits
nécessaires, filtrés ensuite par RLS.
Pour `admin_audit_events` : aucun accès `anon` ; `authenticated` limité à `SELECT`/`INSERT`, filtré
par RLS admin.
Pour `push_subscriptions` : aucun accès `anon` ; `authenticated` limité à
`SELECT`/`INSERT`/`UPDATE`/`DELETE`, filtré par RLS pour que chaque admin ne voie que ses propres
endpoints.

```sql
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;
```

Attendu : lecture de son propre profil, lecture admin, update admin, delete admin. Pas de policy
de lecture anonyme.
Pour `admin_audit_events` : lecture admin et insertion admin uniquement, avec `actor_id =
auth.uid()`.
Pour `push_subscriptions` : lecture/suppression limitées à `user_id = auth.uid()` ; insertion et
mise à jour limitées aux admins actifs avec `user_id = auth.uid()`.

### 3. Fonctions privilégiées

```sql
select
  n.nspname as schema,
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('matricule_to_email', 'is_admin', 'handle_new_user')
order by p.proname;
```

Attendu : `security_definer = true` et `search_path=` présent dans `proconfig`.

```sql
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name in ('matricule_to_email', 'is_admin', 'handle_new_user')
order by routine_name, grantee;
```

Attendu : `matricule_to_email` exécutable par `anon` et `authenticated`, car le login résout le
matricule avant authentification. Pas de grant inutile sur `PUBLIC`.

### 4. Tests fonctionnels auth

- Signup test avec matricule factice et email autorisé.
- Vérifier que le profil arrive en `pending`.
- Vérifier qu'un compte `pending` ne peut pas entrer.
- Promouvoir un admin, puis approuver/rejeter/bannir depuis la console.
- Depuis un téléphone admin, activer puis désactiver les notifications PWA.
- Créer une demande d'accès test et vérifier qu'une notification générique arrive aux admins
  abonnés.
- Vérifier que `anon` ne peut pas lister `profiles`.
- Vérifier que l'utilisateur connecté ne peut pas lister les abonnements push d'un autre admin.
- Tester le mode hors ligne après une connexion réussie.
- Tester la déconnexion explicite : elle doit purger le profil caché local.

## Données locales

MediURG stocke volontairement certaines données sur l'appareil pour l'usage offline-first.

| Donnée             | Clé                                    | Durée                     | Sensibilité              | Règle                                           |
| ------------------ | -------------------------------------- | ------------------------- | ------------------------ | ----------------------------------------------- |
| Thème              | `mediurg-theme`                        | jusqu'au reset navigateur | faible                   | OK                                              |
| Taille de police   | `mediurg-bigfont`                      | jusqu'au reset navigateur | faible                   | OK                                              |
| Favoris/historique | `mediurg-favorites`, `mediurg-history` | jusqu'au reset navigateur | faible à modérée         | ne contient pas de patient                      |
| Notes médicament   | `mediurg-note-{drugId}`                | jusqu'au reset navigateur | potentiellement sensible | ne jamais saisir de données patient nominatives |
| Checklists kit     | `mediurg-kit-check-*`                  | expiration env. 3 h       | potentiellement clinique | ne pas saisir d'identité patient                |
| Poids patient      | `mediurg-patient-weight`               | expiration env. 3 h       | donnée de soin isolée    | expiration courte obligatoire                   |
| Profil auth caché  | `mediurg-profile-cache-v1`             | jusqu'au logout/reset     | donnée personnelle agent | sert uniquement au fallback offline             |
| Session Supabase   | `sb-*-auth-token`                      | selon config Supabase     | secret utilisateur       | logout purge localement                         |

Les captures offline générées par les tests utilisent uniquement un profil factice local. Ne pas
modifier ces scripts pour injecter un compte réel, une note utilisateur, un IPP ou une donnée
patient.

## Build client et secrets

Tout ce qui est livré dans `build/` est public et inspectable côté navigateur.

Interdit dans le build client :

- `SUPABASE_SERVICE_ROLE_KEY` ou tout équivalent `service_role` ;
- clé privée Web Push / VAPID ;
- `DATABASE_URL`, `JWT_SECRET`, clé privée PEM/OpenSSH ;
- clé API privée de fournisseur IA.

Accepté côté client : clés publiques explicitement prévues pour navigateur, par exemple clé
publishable/anon Supabase et clé publique Web Push. Ces clés publiques ne remplacent jamais les
policies RLS côté Supabase.

## Notifications Web Push admin

- Les abonnements push sont stockés dans `public.push_subscriptions` : endpoint, clés `p256dh` /
  `auth`, `user_agent`, `user_id`.
- Ces endpoints et clés sont des secrets techniques : pas de lecture anonyme, chaque admin ne voit
  que ses propres abonnements côté client.
- L'envoi serveur utilise la `service_role` uniquement dans `/api/notify-access-request`, jamais
  côté client.
- La route `/api/notify-access-request` exige la session Supabase du demandeur et vérifie via RLS
  que son propre profil est encore `pending`.
- Le payload envoyé au service Web Push est volontairement générique : « une nouvelle demande
  d'accès est en attente », sans identité agent, matricule, email, service ou donnée patient.
- Les endpoints expirés (`404` / `410`) sont purgés côté serveur.
- Les notifications nécessitent l'accord explicite du navigateur/appareil admin et peuvent être
  désactivées depuis la console admin.

## Décision offline/auth

Le modèle retenu reste : appairage en ligne une fois, puis usage offline possible même si le
réseau est absent longtemps. C'est un compromis explicite pour un outil d'urgence.

Conséquence assumée : un compte suspendu côté serveur peut conserver un accès local tant que
l'appareil ne s'est pas reconnecté. Les actions serveur restent protégées par Supabase et RLS ;
le cache local ne doit jamais autoriser une mutation.

## API ECG

- Les clés Gemini/Mistral restent côté Vercel, jamais en `VITE_`.
- L'endpoint `/api/analyze-ecg` doit refuser toute requête sans session Supabase active.
- Les images envoyées doivent être anonymisées côté client, puis contrôlées côté serveur.
- L'API doit refuser les formats non image, les images trop lourdes et les rafales de requêtes.
- Les réponses de l'API ECG doivent rester en `Cache-Control: no-store`.
- Ne jamais considérer l'analyse ECG comme diagnostique : l'UI doit garder la validation médicale
  obligatoire visible.
