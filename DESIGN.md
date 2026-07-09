---
name: MediURG
description: PWA clinique offline-first pour pharmacologie et protocoles d'urgence.
colors:
  emergency-red: "#ff4757"
  clinical-blue: "#4da6ff"
  success-green: "#4ade80"
  warning-amber: "#ffaa33"
  night-bg: "#0a0a12"
  night-surface: "#12121c"
  night-card: "#161620"
  night-border: "#2a2a3a"
  night-text: "#e8e8f0"
  light-bg: "#e8edf5"
  light-surface: "#f8fafc"
  light-card: "#ffffff"
  light-border: "#c8d1e1"
  light-text: "#111827"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "2rem"
    fontWeight: 850
    lineHeight: 1.05
    letterSpacing: "0"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 850
    lineHeight: 1.2
    letterSpacing: "0"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1.2
  mono:
    fontFamily: "SF Mono, Consolas, Fira Mono, Courier New, monospace"
    fontSize: "0.875rem"
    fontWeight: 750
    lineHeight: 1.2
rounded:
  xs: "3px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  modal: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.emergency-red}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "46px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.emergency-red}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "46px"
  card-clinical:
    backgroundColor: "{colors.night-card}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.lg}"
    padding: "12px"
  input-clinical:
    backgroundColor: "{colors.night-surface}"
    textColor: "{colors.night-text}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
    height: "32px"
---

# Design System: MediURG

## 1. Overview

**Creative North Star: "Le cockpit clinique sobre"**

MediURG est une interface de travail pour des équipes d'urgence, pas une vitrine. Le design doit donner priorité à la lecture rapide, aux cibles tactiles sûres, aux contrastes élevés et à une densité maîtrisée. L'esthétique acceptable est celle d'un poste de soin fiable : sombre ou claire selon le thème utilisateur, structurée par des surfaces nettes, et animée seulement quand l'état change.

Le système rejette les effets décoratifs, les gradients de démonstration, les cartes trop molles et les ombres de landing page. Le rouge porte les urgences, les actions critiques et l'ACR ; le bleu porte l'information et le focus ; le vert confirme les états réussis. Chaque couleur doit aider une décision.

**Key Characteristics:**

- Dense, clinique, lisible au doigt comme au clavier.
- Offline-first : les états doivent rester compréhensibles même sans réseau.
- Accent rare : une couleur forte signale une action ou un état, jamais un décor.
- Formes modérées : rayon 6-12px pour les contrôles, 16px maximum pour les modales desktop.

## 2. Colors

La palette combine une base nuit très sombre, un thème clair froid, et trois couleurs sémantiques stables.

### Primary

- **Rouge urgence**: action primaire, ACR, danger clinique, reset destructif et éléments de chrono critique.

### Secondary

- **Bleu clinique**: focus clavier, information, liens d'état et actions secondaires techniques.
- **Vert validation**: succès, sauvegarde, statut rempli, confirmation.
- **Ambre vigilance**: avertissement, mode test, réseau dégradé et états qui demandent attention sans danger immédiat.

### Neutral

- **Nuit profonde**: fond par défaut du thème sombre, réservé aux surfaces globales.
- **Surface nuit**: header, toolbar, champs et panneaux.
- **Carte nuit**: cartes de médicaments, sections, panneaux ACR.
- **Fond clair froid**: thème clair, fond d'application et zones de lecture longue.
- **Carte claire**: composants au repos en thème clair.

### Named Rules

**The One Signal Rule.** Une surface ne doit pas mélanger rouge, bleu et vert en décor. Une couleur forte signifie une action ou un état.

**The Contrast First Rule.** Le texte secondaire reste lisible. Les gris trop pâles sur fonds teintés sont interdits.

## 3. Typography

**Display Font:** système sans-serif, avec Geist chargé en application quand disponible.
**Body Font:** système sans-serif.
**Label/Mono Font:** SF Mono / Consolas / Fira Mono pour chronos, posologies et valeurs temporelles.

**Character:** La typographie est utilitaire, compacte et stable. Les titres sont francs mais jamais héroïques ; les libellés sont courts, gras, et proches du champ qu'ils pilotent.

### Hierarchy

- **Display** (850, 23-32px, 1.05): titres de modales ou surfaces majeures uniquement.
- **Title** (850, 15-17px, 1.2): titres de sections, cartes et panneaux cliniques.
- **Body** (500-750, 13-15px, 1.5): contenu clinique, descriptions, cellules et messages.
- **Label** (800, 11-12px, 1.2): libellés de champs, badges, filtres et catégories.
- **Mono** (750-900, 12-46px, 1.0-1.2): chronos, cycles, doses, horaires et données qui doivent rester alignées.

### Named Rules

**The No Hero Type Rule.** L'application n'utilise pas de titres marketing. Un écran clinique doit charger dans la tâche, pas dans un spectacle.

## 4. Elevation

MediURG utilise une élévation hybride : bordures et couches tonales d'abord, ombres ensuite. Les ombres sont petites sur les cartes et plus larges seulement pour les modales dans le top layer. Les ombres décoratives avec bordure 1px sur tous les éléments sont interdites.

### Shadow Vocabulary

- **Carte clinique** (`0 8px 18px rgb(0 0 0 / 0.22)`): panneaux ACR et cartes critiques en thème sombre.
- **Modale clinique** (`0 24px 70px rgb(0 0 0 / 0.58)`): dossier ACR desktop et surfaces top layer.
- **Carte claire** (`0 6px 16px rgb(15 23 42 / 0.08)`): thème clair, juste assez pour séparer les surfaces blanches.

### Named Rules

**The Border Before Shadow Rule.** La séparation vient d'abord de la bordure et du contraste tonal. L'ombre sert à hiérarchiser, pas à décorer.

## 5. Components

### Buttons

- **Shape:** rectangle compact à coins modérés (6-8px), cercle uniquement pour les boutons icônes.
- **Primary:** rouge urgence, texte blanc, hauteur tactile minimale 44-46px.
- **Hover / Focus:** hover par changement de fond ou de bordure ; focus visible bleu avec outline 2px.
- **Secondary / Ghost:** fond transparent ou teinte légère, couleur sémantique conservée.

### Chips

- **Style:** petite surface bordée, libellé gras, hauteur 32px environ.
- **State:** sélection en rouge ou vert selon le contexte ; `aria-pressed` obligatoire pour les choix togglables.

### Cards / Containers

- **Corner Style:** 10-12px pour cartes, 16px pour modales desktop.
- **Background:** surfaces issues du thème courant ; éviter les fonds inventés hors tokens.
- **Shadow Strategy:** faible sur les cartes, plus marquée seulement sur une modale.
- **Internal Padding:** dense, généralement 8-14px selon la criticité et la largeur.

### Inputs / Fields

- **Style:** bordure nette, fond surface, rayon 6px, labels au-dessus ou collés à gauche en mode compact.
- **Focus:** bordure bleue et halo léger.
- **Error / Disabled:** l'erreur doit nommer la récupération ; disabled baisse l'opacité mais garde le texte lisible.

### Navigation

- **Style, typography, default/hover/active states, mobile treatment.** Header sticky, bottom navigation mobile, onglets et filtres compacts. L'actif doit être visible par couleur et poids, pas seulement par un effet subtil.

### Dossier ACR

Le dossier ACR est la surface la plus dense : header court, bande de contexte desktop, sections numérotées repliables, toolbar basse. Le chrono domine, mais le reste doit rester calme pour permettre la saisie sous pression.

## 6. Do's and Don'ts

### Do:

- **Do** garder le français pour les libellés, messages et contenus cliniques.
- **Do** utiliser les variables globales (`--bg`, `--card`, `--text`, `--accent`) ou les variables locales ACR pour toute nouvelle couleur.
- **Do** conserver des cibles tactiles de 44px minimum pour les actions importantes.
- **Do** vérifier thème sombre, thème clair, mobile et desktop après une modification de surface clinique.
- **Do** garder les interactions standard : vrais boutons, vrais champs, focus visible, états disabled explicites.

### Don't:

- **Don't** utiliser de gradient text, glassmorphism décoratif, rayons de carte supérieurs à 16px, ou ombres larges sur chaque carte.
- **Don't** créer une grille de cartes marketing ou un hero pour une surface outil.
- **Don't** diluer le rouge urgence en décoration. Il doit rester un signal clinique ou une action.
- **Don't** masquer une information critique derrière un hover inaccessible au tactile.
- **Don't** modifier la densité en rendant les composants plus hauts sans nécessité clinique.
