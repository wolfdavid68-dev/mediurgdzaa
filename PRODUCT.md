---
name: MediURG
register: product
platform: web
description: PWA clinique offline-first pour les soignants des urgences.
audience:
  primary: Soignants des urgences en SAU, SAUV et SMUR.
  excluded: Soignants de réanimation comme cible produit principale.
constraints:
  - Doit rester utilisable hors ligne.
  - Doit rester lisible et manipulable sous pression clinique.
  - Doit conserver les libellés, contenus et conventions en français.
---

# Product: MediURG

## Positionnement

MediURG est une application de travail clinique pour les soignants des urgences. Elle sert à retrouver vite une information de pharmacologie, un protocole, une aide au calcul, une compatibilité ou une fiche d'action pendant une prise en charge urgente.

Le produit n'est pas destiné à devenir une vitrine, un portail éditorial ou un outil généraliste de réanimation. Sa priorité est le moment de terrain aux urgences : peu de temps, attention fragmentée, gestes à sécuriser, réseau parfois absent.

## Utilisateurs

Les utilisateurs principaux sont les soignants des urgences : équipes SAU, SAUV et SMUR, avec une utilisation au poste, au lit du patient ou en mobilité. Ils consultent l'application pour confirmer rapidement une dose, préparer un médicament, suivre une séquence, documenter un ACR ou retrouver un protocole.

Les soignants de réanimation ne sont pas inclus dans la cible principale. Les choix produit, la densité, le vocabulaire et les priorités fonctionnelles doivent rester centrés sur l'urgence.

## Promesse

MediURG doit donner une réponse fiable, rapide et actionnable, même hors ligne. Le succès du produit se mesure à la capacité de l'utilisateur à atteindre l'information utile sans détour, sans réseau obligatoire, sans ambiguïté visuelle et sans charge cognitive inutile.

## Capacités centrales

- Recherche et consultation des médicaments d'urgence.
- Calculs de dose, préparation, débit PSE et aides pondérales.
- Protocoles PISU et parcours cliniques d'urgence.
- Incompatibilités, kits de préparation, ECG et surfaces spécialisées.
- Mode ACR avec chrono, cycles, actions et dossier.
- Favoris, historique, notes et état local utilisables hors ligne.
- Passerelle Tutorat quand le contexte utilisateur le demande.

## Principes produit

**Offline-first réel.** L'application doit continuer à rendre les informations cliniques critiques sans réseau après chargement/appairage. Les états en ligne, hors ligne ou dégradés doivent être explicites et calmes.

**Temps court.** Les chemins fréquents doivent privilégier la reconnaissance immédiate, la densité lisible et les actions directes. Une étape ajoutée doit avoir une justification clinique ou de sécurité.

**Confiance clinique.** Le rouge signale l'urgence, le danger, l'ACR ou une action critique. Les confirmations, avertissements et états doivent être stables, compréhensibles et non décoratifs.

**Français métier.** Les libellés, messages, contenus et conventions restent en français médical d'urgence. Ne pas introduire de tonalité marketing.

**Tactile et clavier.** Les interactions doivent fonctionner au doigt, au clavier et en conditions imparfaites. Les informations critiques ne doivent pas dépendre du survol.

## Voix

La voix est sobre, directe et clinique. Elle peut être rassurante par sa précision, mais elle ne doit jamais devenir promotionnelle, bavarde ou spectaculaire.

Les bons textes sont courts, situés, utiles : "Dose calculée", "Hors ligne", "Mettre à jour", "Dossier ACR", "Enregistrer". Les textes longs doivent aider une décision ou expliquer une récupération possible.

## Anti-références

- Landing page, hero marketing, storytelling de marque.
- Dashboard SaaS décoratif ou grille de cartes sans priorité clinique.
- Gradients, glassmorphism, ombres larges répétées, arrondis excessifs.
- Rouge utilisé comme décoration.
- Informations critiques masquées derrière un hover.
- Interfaces qui supposent un réseau disponible pour les tâches principales.
- Parcours orientés réanimation au détriment des urgences.

## Accessibilité et sécurité d'usage

MediURG doit viser une lisibilité forte : contrastes robustes, focus visible, cibles tactiles suffisantes, états disabled nommés, mouvement réduit respecté et informations non portées uniquement par la couleur.

L'accessibilité ici est une condition de sécurité pratique : l'interface doit rester compréhensible sous stress, sur mobile, en thème sombre ou clair, et dans un contexte de réseau instable ou absent.
