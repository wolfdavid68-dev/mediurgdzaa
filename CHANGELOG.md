# Changelog

Toutes les modifications notables de **MediURG** sont consignées dans ce fichier.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Convention : 🟢 Ajouté · 🔵 Modifié · 🟠 Corrigé · 🔴 Supprimé.

## [2026-05-16]

### 🟢 Ajouté

- **Médicaments — Nalbuphine IV** (analgésie, id 80). Opioïde agoniste-antagoniste
  (κ / antagoniste µ) à effet plafond respiratoire, non stupéfiant. Posologies
  adulte et pédiatrique (dont voie intrarectale), calculateur de préparation et
  table de dilution pédiatrique. Snapshot anti-renumérotation des IDs mis à jour.

### 🟠 Corrigé

- **Auth** — résolution matricule → email via fonction `SECURITY DEFINER`
  (correction d'une fuite RLS).

## [2026-05-15]

### 🟢 Ajouté

- **Admin** — accès par appui long sur le logo (remplace la roue flottante).
- **Auth** — garantie hors-ligne « appairé une fois → plus de login », tolérance
  offline robuste, hooks Forgot/Reset partagés, design mobile dédié du handoff
  et durcissement iOS, accessibilité du drawer.

### 🔵 Modifié

- **Admin (mobile)** — boutons du header en libellés texte (lève toute ambiguïté).
- **Auth** — refactor : hooks partagés, police Geist, Forgot/Reset mobile.

### 🟠 Corrigé

- **Auth** — `?auth=preview` collant (le logout renvoyait sur l'app) ;
  `handleLogout` qui avalait l'erreur ; déconnexion hors-ligne.
- **CI** — `AuthErrorKind` non exporté (knip) ; scope `jest-dom` au seul projet
  `dom` (corrige des tests flaky).

### 🔴 Supprimé

- **Data** — suppression complète du Célestène (bétaméthasone).
- Doublon `persistStorage` (redondant).

## [2026-05-14]

### 🟢 Ajouté

- **Auth** — logos du design handoff (GHR + SAU côte à côte sur le login),
  détection des liens de recovery expirés avec bandeau d'information dédié.

### 🟠 Corrigé

- **Auth** — taille du logo de login alignée sur le design (80 px / 60 px mobile).
