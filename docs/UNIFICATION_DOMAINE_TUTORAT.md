# Unification d'origine MediURG + Tutorat (supprimer la barre Custom Tab mobile)

## Pourquoi

Quand une PWA installée (Tutorat) ouvre une page sur **un autre domaine**
(MediURG), Android affiche une **barre d'adresse « Custom Tab »** en haut. C'est
une sécurité du navigateur. Le standard web prévu pour l'éviter (`scope_extensions`
+ `/.well-known/web-app-origin-association`) **n'est pas supporté sur Android**
(seulement ChromeOS / Chrome desktop) — cf. doc Chrome « Web App Scope
Extensions ». La **seule** façon de supprimer la barre sur mobile est de servir
les deux apps **sous la même origine** (même schéma + même host + même port).

## Architecture retenue

- **MediURG** = app racine, sert `/`.
- **Tutorat** = servi sous le sous-chemin **`/tutorat/`** du **même host** que
  MediURG, via un **rewrite/proxy Vercel** côté MediURG vers le déploiement
  Tutorat (`tutorat-sau-mulhouse.vercel.app`).
- La navigation MediURG ↔ Tutorat devient **same-origin** (`/` ↔ `/tutorat/`)
  → plus de changement d'origine → plus de barre Custom Tab, sur mobile comme
  desktop.

```
https://<host-mediurg>/            → MediURG (déploiement mediurgdzaa)
https://<host-mediurg>/tutorat/*   → proxy → tutorat-sau-mulhouse.vercel.app/tutorat/*
```

## Changements déjà appliqués (branche claude/banner-tutoring-mediurg-switch-2x7yvj)

### Repo `tutorat-sau-mulhouse` (passe sous /tutorat/)
- `vite.config.ts` : `base: '/tutorat/'` ; manifest `start_url`/`scope`/`id` =
  `/tutorat/` ; `workbox.navigateFallback = '/tutorat/index.html'` ;
  `navigateFallbackDenylist = [/^\/tutorat\/api\//]`.
- `src/App.tsx` : `createRouter({ basepath: '/tutorat', … })`.
- `src/hooks/useAuth.tsx` & `src/components/bilans/ocrWorkflowHelpers.ts` :
  les `fetch('/api/…')` deviennent `fetch(\`${import.meta.env.BASE_URL}api/…\`)`
  → `/tutorat/api/…` (sinon ils taperaient l'API de MediURG sur l'origine unifiée).
- `src/config/externalLinks.ts` : `buildMediurgUrl()` renvoie `'/?author=preview'`
  (navigation same-origin vers MediURG racine). `resolveMediurgUrl` est conservé
  (toujours testé) mais n'est plus utilisé par l'app.
- `index.html` : le script de récupération d'asset cible `/tutorat/assets/`.
- `vercel.json` : sert l'app sous `/tutorat/` (strip du préfixe pour les fichiers
  + fallback SPA), et redirige `/` → `/tutorat/`.

### Repo `mediurgdzaa` (racine + proxy)
- `vercel.json` : ajout d'un bloc `rewrites` proxifiant `/tutorat` et
  `/tutorat/*` vers `https://tutorat-sau-mulhouse.vercel.app/...`. Le bloc
  `headers` (CSP stricte) est **exclu de `/tutorat`** (`source` passé de
  `/(.*)` à `/((?!tutorat).*)`) pour ne pas casser Tutorat (polices Google,
  scripts inline, etc.).
- `vite.config.ts` : `workbox.navigateFallbackDenylist = [/^\/tutorat(\/|$)/]`
  pour que le service worker MediURG (scope `/`) **n'intercepte pas** les
  navigations `/tutorat/*`.
- `src/lib/tutorat.ts` : `TUTORAT_URL = '/tutorat/'` (au lieu de l'URL
  cross-origin).

## ⚠️ À FAIRE manuellement / À VALIDER (non automatisable ici)

Ces points dépendent du runtime Vercel et **doivent être testés sur des
preview deploys** avant tout merge en prod (login JWT + OCR en jeu) :

1. **Déploiement coordonné.** Le proxy MediURG pointe vers
   `tutorat-sau-mulhouse.vercel.app`. Tant que Tutorat **prod** n'est pas
   redéployé avec `base:/tutorat/`, le proxy renverra l'ancienne version.
   Ordre conseillé : déployer Tutorat (branche) → vérifier
   `https://tutorat-sau-mulhouse.vercel.app/tutorat/` → déployer MediURG →
   tester `/tutorat/` sur l'origine MediURG. Pour tester avant prod, on peut
   temporairement pointer le rewrite vers l'URL de **preview** Tutorat.
2. **Routage Vercel `/tutorat/*`** (le plus fragile) : vérifier que les assets
   (`/tutorat/assets/*`), le SW (`/tutorat/sw.js`), le manifest, les routes SPA
   (`/tutorat/ma-fiche`) et l'API (`/tutorat/api/verify-token`) répondent bien.
   Ajuster les `rewrites` si un cas 404.
3. **Login JWT** : tester le passage MediURG → `/tutorat/?token=…` (vérifier que
   `/tutorat/api/verify-token` est bien appelé et répond).
4. **Service workers** : deux SW sur la même origine (MediURG scope `/`, Tutorat
   scope `/tutorat/`). Vérifier qu'aucun ne « mange » les routes de l'autre
   (denylist en place). Tester offline.
5. **Cookies same-origin** : MediURG et Tutorat partagent désormais les cookies
   du host. Vérifier qu'il n'y a pas de collision de session.
6. **CSP** : `/tutorat` n'a plus de CSP (comme aujourd'hui sur le déploiement
   Tutorat autonome). On peut ensuite ajouter une CSP dédiée à `/tutorat`.
7. **Test e2e Tutorat** (`e2e/smoke.spec.ts`) : il charge `/` et asserte
   l'ancien fichier `web-app-origin-association`. À revoir après bascule (le
   `base` et la redirection `/`→`/tutorat/` changent le comportement ;
   `scope_extensions` / les fichiers `.well-known` sont désormais obsolètes mais
   laissés en place sans effet).

## Rollback

Tout est sur la branche `claude/banner-tutoring-mediurg-switch-2x7yvj` des deux
repos — rien n'est en prod tant qu'on ne merge/redéploie pas. Pour annuler :
ne pas merger, ou révert des commits de cette branche.
