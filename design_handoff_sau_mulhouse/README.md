# Handoff — SAU Mulhouse · Authentification & Console Admin

## Overview

Plateforme d'authentification pour le **Service d'Accueil des Urgences (SAU) de Mulhouse** (Groupe Hospitalier de la Région Mulhouse Sud-Alsace, hôpital Émile-Muller). Trois fonctionnalités principales :

1. **Connexion** par matricule professionnel (format `M` + 6 chiffres, ex. `M402100`) + mot de passe.
2. **Création de compte** en 2 étapes (identité pro → mot de passe) avec demande envoyée à l'administrateur pour validation.
3. **Console d'administration** pour gérer les accès : approuver/refuser les demandes, voir les personnels actifs, suspendre des comptes avec motif, rétablir un accès suspendu.

Deux variantes de fidélité visuelle complète sont fournies : **desktop** (split-screen 1180 px) et **mobile** (iOS, 402 × 874 px avec tab bar et bottom sheets).

## About the Design Files

Les fichiers de ce bundle sont des **références de design**, créés en HTML/React/Babel inline, qui montrent l'apparence et le comportement attendus. **Ce ne sont pas du code de production à copier-coller.**

La tâche est de **recréer ces designs dans l'environnement applicatif cible** (l'app Vercel existante à l'URL `https://project-pi-sage-36.vercel.app/` — vraisemblablement un projet Next.js ou Vite), en utilisant ses patterns, librairies, conventions de routing, gestion d'état et système de design existants.

Si l'app cible n'a pas encore d'environnement front-end fixé, recommandation : **Next.js 14+ (App Router) + Tailwind CSS + shadcn/ui** ou **Vite + React + Tailwind**. Pour la gestion d'auth côté serveur : Auth.js (NextAuth), Supabase Auth ou Clerk.

## Fidelity

**Hi-fi.** Les maquettes contiennent les couleurs finales, la typographie définitive, le spacing, les animations, et les états interactifs (hover, focus, loading, error). À reproduire pixel-près en utilisant les composants équivalents du framework cible.

## Screens / Views

### 1. Login (desktop + mobile)

**Purpose** — Le personnel saisit son matricule et son mot de passe. Format strict : `M` + 6 chiffres.

**Layout desktop** — Split 1.05fr / 1fr dans une "shell" centrée, max-width 1180px, padding 32px sur l'écran.
- Panneau gauche : logo (64 px), eyebrow "SAU · Émile-Muller", titre en 3 lignes (typo travaillée, voir Design Tokens), corps de texte, liste de meta-info en bas (statut système, nb personnels actifs, etc.), footer (version + n° poste).
- Panneau droit : carte d'auth avec eyebrow rouge, titre "Bienvenue.", sous-titre, champs Matricule + Mot de passe, ligne "Maintenir la session" + lien "Mot de passe oublié", bouton primaire rouge plein, séparateur "ou", bouton secondaire "Créer un compte", footer "Accès admin →".

**Layout mobile** — Empilé vertical, padding 20 px latéral. Logo 42 px en haut (avec safe-area 70 px depuis le top pour le notch/dynamic island), hero text (h1 36 px), formulaire, deux boutons full-width 50 px de haut, footer centré.

**Champ matricule (composant clé)** — Préfixe `M` figé à gauche (chip rouge translucide, font-family monospace, fond `oklch(0.6 0.2 25 / 0.08)`, séparateur 1 px à droite). Input numérique qui n'accepte que 6 chiffres max ; toute saisie non-numérique est strippée à l'événement onChange. Placeholder `402100`.

**Validation** — Regex `/^M\d{6}$/`. Si invalide → message d'erreur en banner rouge sous le formulaire + shake animation 0.35s sur la card.

**États** — idle, loading (spinner inline + "Vérification…", 650 ms de delay simulé), error banner. Le matricule peut renvoyer 4 états selon les seed data :
- Membre actif → navigue vers vue membre.
- Banned → "Compte suspendu. Contactez l'administrateur du service."
- Pending (encore en demande) → "Demande en attente de validation par l'administrateur."
- Inconnu → "Matricule inconnu ou mot de passe incorrect."

**Accès admin** — En desktop, lien discret en footer de la card. En mobile, lien en bas de l'écran. (En prod : un rôle admin sur le compte, pas un accès séparé.)

### 2. Register / Création de compte

**Purpose** — Un nouvel agent demande l'ouverture d'un compte. Sa demande passe en file d'attente côté admin.

**Flow** — 2 étapes + écran de confirmation :
- **Étape 1 (Vos informations)** : matricule (préfixe M figé), prénom, nom, email pro (validation suffixe `@ghrmsa.fr` requise), fonction (select : "Médecin urgentiste", "Interne", "Infirmier", "Aide-soignant", "Ambulancier SMUR", "Cadre"), service (select : "SAU", "SMUR", "UHCD", "Réanimation", "Régulation 15").
- **Étape 2 (Mot de passe)** : mot de passe (min 8 chars) + indicateur de force (5 barres, score sur 5 critères : longueur ≥8, majuscule, chiffre, caractère spécial, longueur ≥12), confirmation, checkbox "J'accepte la charte d'usage du SI hospitalier".
- **Étape 3 (Confirmation)** : icône check verte, titre "Demande transmise", récap (matricule / fonction / service / délai < 24 h ouvrées), bouton "Retour à la connexion".

**Mobile** — Header navigation : flèche back (revient à l'étape précédente ou à l'écran login), titre centré "Inscription · 1/2", barre de progression rouge sous le header.

### 3. Admin Console (desktop)

**Layout** — 3 zones :
- **Top bar** (hauteur ~54 px) : logo 28→36 px à gauche + crumbs ("Console d'administration / Demandes"), recherche centrale (kbd-style avec ⌘K), avatar admin + nom + rôle + bouton logout.
- **Sidebar gauche** (248 px) : nav en 2 sections :
  - "Gestion des accès" — Demandes (badge nombre), Personnels actifs (badge), Comptes suspendus (badge).
  - "Journal" — Activité du service, Sécurité & sessions (items muted/désactivés pour cette V1).
  - KPI card en bas : 3 colonnes (actifs / en attente / suspendus).
- **Main** : titre du panel, sous-titre descriptif, pill de comptage à droite, table des résultats.
- **Drawer droit** (380 px, animation slideIn) qui apparaît au clic sur une ligne.

**Table** — Grid 6 colonnes : Personne (avatar + nom + email), Matricule (chip mono), Fonction, Service (pill), Méta (selon l'onglet : "il y a X" / dernière activité avec dot vert / motif de ban), Action (boutons contextuels).

**Onglet Demandes** : actions par ligne = Refuser (ghost) + Approuver (primary sm). Approuver déplace l'item dans la liste membres avec status "active". Refuser le supprime.

**Onglet Personnels** : action = Suspendre (soft danger). Ouvre le drawer avec un sous-formulaire "Motif de suspension" (select : Partage d'identifiants, Départ du service, Comportement inapproprié, Demande RH, Autre) puis bouton de confirmation rouge.

**Onglet Suspendus** : action = Rétablir (soft). Repasse le compte en status "active".

**Drawer détail** — Avatar grand, prénom + nom, matricule + rôle, table de méta (email, service, dates), section "Activité récente" (3 events pour les membres actifs), bloc d'actions en bas (contextual selon l'onglet), section de confirmation rouge pour la suspension.

**Toast** — Apparition en bas-centre 3.2 s sur chaque action réussie (approuver / refuser / suspendre / rétablir).

### 4. Admin Console (mobile)

**Layout** — Stack vertical :
- **Header** : logo 42 px en haut + bouton close (logout). Titre "Demandes / Personnels / Suspendus" en h1 30 px. Sous-titre. Barre de recherche.
- **Liste** de cartes empilées (12 px gap, 8 px padding) : chaque carte = avatar + corps 3 lignes (nom + matricule chip / fonction · service / méta + email tronqué) + pill "À valider" ou rien + chevron dots.
- **Tab bar** flottante en bas : 3 onglets icons + label + badge sur Demandes, glassmorphism, safe-area bottom 26 px.
- **Bottom sheet** : slide-up depuis le bas avec scrim au tap, grip handle, eyebrow contextuel, identité, table de méta, actions.

### 5. Member view (post-login)

Carte de bienvenue centrée, glass, logo 68 px, eyebrow vert "Authentification réussie", titre "Bienvenue au SAU.", confirmation matricule, mini-card avec 3 lignes (Service, Garde en cours, Patients en attente), bouton "Se déconnecter". Placeholder — en prod c'est la vraie app qui se charge ici.

## Interactions & Behavior

- **Navigation** — Single-page state machine (`view = login | register | admin | member`). En prod : router Next.js avec `/login`, `/register`, `/admin`, `/dashboard`.
- **Form validation** — Inline, dès la soumission. Pas de validation pendant la frappe (sauf le matricule qui filtre le format en live).
- **Loading state** — `setTimeout` 600-650 ms pour simuler une requête. En prod : remplacer par appel API réel.
- **Animations** :
  - Shake sur erreur de login : `animation: shake 0.35s` (translateX ±6 px alternés).
  - Pop in sur les success marks : `cubic-bezier(0.34, 1.56, 0.64, 1)` 0.4 s.
  - Slide-in drawer/sheet : `cubic-bezier(0.2, 0.8, 0.2, 1)` 0.25-0.3 s.
  - Toast `translateY(8px) → 0` + fade-in 0.3 s.
  - Spinner : rotate 360° infinite, 0.8 s linear.
- **Touch targets mobile** — Tous ≥ 44 px ; inputs ont `font-size: 16px` pour empêcher le zoom iOS.
- **Tweaks panel (desktop)** — Activable via le toggle "Tweaks" du host. Permet d'ajuster : taille des logos (×0.6–2.2), séparateur on/off, couleur d'accent (5 rouges), fond (warm/cool/neutral), effet verre on/off, raccourcis de navigation. À retirer ou remplacer par les vrais réglages produit en prod.

## State Management

Modèle minimal côté mocks (à remplacer par API/DB) :

```ts
type Member = {
  id: number;
  matricule: string;        // "M402100"
  nom: string;
  prenom: string;
  role: string;             // libellé fonction
  service: string;          // "SAU" | "SMUR" | "UHCD" | "Réanimation" | "Régulation 15"
  email: string;            // "x.y@ghrmsa.fr"
  status: "active" | "banned";
  since: string;            // ISO date ou label
  lastSeen?: string;
  banReason?: string;
};

type Request = {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  role: string;
  service: string;
  email: string;
  submitted: string;        // label "il y a X"
};
```

**Actions backend à implémenter** :
- `POST /auth/login` — { matricule, password } → { token, user, role }
- `POST /auth/register` — payload form → { requestId } (202 Accepted)
- `GET /admin/requests`, `GET /admin/members`, `GET /admin/banned`
- `POST /admin/requests/:id/approve`, `POST /admin/requests/:id/reject`
- `POST /admin/members/:id/ban` { reason }
- `POST /admin/members/:id/unban`
- `GET /admin/search?q=` (ou filtre côté client si volume < 500)

**Sécurité** — Hash mot de passe (Argon2 / bcrypt), session JWT court-terme + refresh, rôle admin vérifié côté serveur sur chaque action, log audit pour ban/unban/approve/reject.

## Design Tokens

### Couleurs (oklch, conversion hex approximative)

| Token | oklch | hex approx | Usage |
|---|---|---|---|
| `--bg` | `oklch(0.15 0.006 280)` | `#16161a` | Fond global |
| `--bg-2` | `oklch(0.18 0.006 280)` | `#1c1c20` | Fond secondaire |
| `--surface` | `oklch(0.21 0.006 280)` | `#222226` | Inputs, cartes |
| `--surface-2` | `oklch(0.24 0.006 280)` | `#28282c` | Hover, boutons soft |
| `--surface-3` | `oklch(0.28 0.006 280)` | `#2e2e33` | Hover plus prononcé |
| `--line` | `oklch(0.32 0.008 280)` | `#393940` | Bordures |
| `--line-soft` | `oklch(0.28 0.006 280 / 0.6)` | — | Bordures discrètes |
| `--text` | `oklch(0.97 0.004 90)` | `#f5f5f3` | Texte principal |
| `--text-2` | `oklch(0.78 0.008 70)` | `#c3bfb5` | Texte secondaire |
| `--text-3` | `oklch(0.58 0.008 70)` | `#8b8579` | Texte tertiaire, eyebrows |
| `--accent` | `oklch(0.6 0.2 25)` | `#E11D2A` | Rouge GHR / CTAs |
| `--accent-soft` | `oklch(0.6 0.2 25 / 0.14)` | — | Backgrounds doux d'accent |
| `--accent-glow` | `oklch(0.62 0.21 25 / 0.4)` | — | Halo bouton primaire |
| `--ok` | `oklch(0.74 0.13 150)` | `#5cb88a` | Vert succès, dots actifs |
| `--warn` | `oklch(0.78 0.14 80)` | `#d4b06b` | Jaune ambré, pills demandes |
| `--danger` | `oklch(0.62 0.2 25)` | `#E11D2A` | Identique à accent |

**Rouge GHR officiel** : `#E11D2A` (extrait du logo). Les 5 variantes proposées dans le panneau Tweaks : `#E11D2A`, `#D71920`, `#B91C1C`, `#DC2626`, `#F43F5E` — à arbitrer avec le service communication du GHRMSA.

### Typographie

- **Sans (display + body)** : **Geist** (Google Fonts), poids 300 / 400 / 500 / 600 / 700. Activer `font-feature-settings: "ss01", "calt", "liga"`.
- **Mono (matricules, emails, codes)** : **Geist Mono**, poids 400 / 500. `letter-spacing: -0.01em`.
- **Serif italique éditorial** (chargé mais non utilisé dans la version finale — gardé pour retoucher si besoin) : **Instrument Serif**.

### Type scale

| Élément | Taille | Weight | Tracking | Line-height |
|---|---|---|---|---|
| Hero side-title (desktop) | 48 px | 300 | -0.045em | 1.0 |
| Auth-title (desktop) | 36 px | 400 | -0.045em | 1.0 |
| Welcome-title | 44 px | 400 | -0.045em | 0.98 |
| Panel-title (admin) | 28 px | 400 | -0.04em | 1.05 |
| H1 mobile | 36 px | 300 | -0.04em | 1.0 |
| H2 mobile | 26 px | 400 | -0.035em | 1.05 |
| Eyebrow | 10.5–11 px | 500 | 0.22–0.28em | — |
| Body | 14–15 px | 400 | -0.005em | 1.5–1.55 |
| Button | 14–15 px | 600 | — | — |
| Caption / meta | 11–13 px | 400–500 | — | — |

**Convention typographique** : la dernière ligne du hero (`.t-accent`) est en blanc pur + weight 400, le reste en gris (`oklch(0.55 0.008 70)`) + weight 300. Crée une hiérarchie par couleur+poids plutôt que par changement de famille.

### Spacing

Échelle utilisée : `2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44 px`.

Padding standards :
- Card auth : 44 px (desktop) / 20 px (mobile)
- Sections : gap 16–22 px
- Champs : gap 14–16 px entre, padding intérieur 14 × 14 px
- Boutons : 12–15 px vertical × 18–20 px horizontal

### Border radius

| Élément | Radius |
|---|---|
| Card shell | 24 px |
| Sections (welcome card, drawer items) | 14–20 px |
| Inputs, boutons | 12 px |
| Avatar | 10 px |
| Pills | 999 px (full) |
| Bottom sheet | 24 px top, 0 bottom |
| Toast | 12 px |

### Shadows

- **Card shell** : `0 30px 80px -20px oklch(0 0 0 / 0.6), inset 0 1px 0 oklch(1 0 0 / 0.04)`
- **Bouton primaire** : `0 6px 24px -8px var(--accent-glow), inset 0 1px 0 oklch(1 0 0 / 0.25)`
- **Toast** : `0 12px 32px -8px oklch(0 0 0 / 0.5)`
- **Logo drop-shadow** : `drop-shadow(0 4px 14px oklch(0 0 0 / 0.35))`

### Background decor (auth screens)

Deux radial gradients flous (`filter: blur(140px)`) :
- Glow 1 (rouge) : 720 × 720 px, top-left, `var(--accent-glow)`, opacity 0.45.
- Glow 2 (violet-bleu) : 620 × 620 px, bottom-right, `oklch(0.5 0.12 280 / 0.45)`.
- Grille fine : `linear-gradient(oklch(1 0 0 / 0.025) 1px, transparent 1px)` 48 × 48 px, mask radial pour fade au centre.

## Assets

- **`assets/logo-ghr.png`** — Logo officiel du Groupe Hospitalier de la Région Mulhouse Sud-Alsace, 518 × 792 px, PNG transparent. Fourni par le client.
- **`assets/logo-sau.png`** — Logo du service Urgences Mulhouse, 724 × 774 px, PNG transparent. Fourni par le client.

**À demander au service communication GHRMSA** : versions SVG vectorielles + favicon dédié + variantes monochrome pour les emails transactionnels.

## Files

```
design_handoff_sau_mulhouse/
├── README.md                              ← ce fichier
├── desktop/
│   ├── SAU Mulhouse Login.html            ← shell HTML (point d'entrée preview)
│   ├── app.jsx                            ← composants React (Login, Register, Admin, Member, Tweaks)
│   ├── styles.css                         ← tokens + styles desktop
│   └── tweaks-panel.jsx                   ← panneau Tweaks (à retirer en prod)
├── mobile/
│   ├── SAU Mulhouse Mobile.html
│   ├── mobile.jsx                         ← composants mobile (MLogin, MRegister, MAdmin, MSheet, MMember)
│   ├── mobile.css                         ← styles mobile (préfixés .m-)
│   └── ios-frame.jsx                      ← chrome iPhone (à retirer en prod — c'est juste pour la preview)
└── assets/
    ├── logo-ghr.png
    └── logo-sau.png
```

**Pour prévisualiser** : ouvrir l'un des `.html` dans Chrome/Safari. Les fichiers `.jsx` sont chargés via Babel inline (`<script type="text/babel">`), donc rien à compiler.

**Pour l'implémentation cible** :
1. Lire `styles.css` (desktop) et `mobile.css` pour copier les tokens dans le système de design existant (Tailwind config, CSS vars, theme provider…).
2. Lire `app.jsx` et `mobile.jsx` pour comprendre la structure de chaque écran ; recréer chaque composant avec les primitives du codebase cible (probablement shadcn/ui ou équivalent).
3. Récupérer les images vectorielles auprès du client (les PNG fournis sont des rasters de qualité moyenne pour les hautes densités).
4. Brancher les vraies routes API et la gestion de session/rôles.
5. Retirer le panneau Tweaks et le frame iOS, qui sont des outils de design uniquement.

## Questions ouvertes / décisions à confirmer

- Endpoint exact pour l'auth (Auth.js, Supabase, Clerk, custom backend ?)
- Politique de mot de passe (les règles indiquées sont indicatives, à valider RSSI/DSI du GHRMSA)
- Workflow de validation : un seul admin valide ? plusieurs admins ? notifications email aux demandeurs ?
- Stockage des banReason (texte libre vs catégorisé) et durée de rétention RGPD
- Multi-tenancy : un compte par hôpital du groupe ou compte unifié ?
- Format final des matricules : confirmer que c'est bien `M + 6 chiffres` partout dans le GHRMSA, ou existe-t-il des exceptions (cadres, internes, étudiants…) ?
