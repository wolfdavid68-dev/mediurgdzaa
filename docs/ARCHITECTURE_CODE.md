# Architecture du code MediURG

Ce document décrit le découpage attendu pour éviter le retour de composants
monolithiques. Les données cliniques denses de `src/data/` ne suivent pas la
même limite : elles sont des tables déclaratives contrôlées par les rapports de
données, et non des modules cumulant logique, état et rendu.

## Préparation médicamenteuse

- `components/PreparationModel.ts` orchestre la construction du modèle public
  de préparation.
- `components/preparation/model/types.ts` porte les contrats du modèle.
- `components/preparation/model/utils.ts` contient le parsing et les fonctions
  de présentation pures.
- `components/preparation/model/pse.ts` contient les calculs et étapes propres
  au pousse-seringue électrique.
- `components/PrepBlock.tsx` orchestre l’affichage historique de préparation.
- `components/preparation/PrepBlockParts.tsx` regroupe les types, sélecteurs et
  en-têtes purement visuels de ce bloc sans multiplier les micro-fichiers.
- `components/preparation/PreparationDoseStepper.tsx` gère la saisie numérique
  contrôlée de la préparation publique.

Le terme `preview` ne doit être utilisé que pour les surcharges réellement
expérimentales activées par `?author=preview`. La préparation v2.5 publique est
nommée `Preparation` dans les fichiers et les API TypeScript.

## Dossier ACR

- `components/AcrRecordView.tsx` orchestre le dossier et son état.
- `components/acr/AcrRecordControls.tsx` contient les contrôles de formulaire.
- `components/acr/AcrRecordText.ts` génère le bilan anonyme copiable.

## Limites de taille

`npm run verify:source-size` applique une limite de 1 000 lignes aux fichiers
de code applicatif. `PrepBlock.tsx` et `PreparationModel.ts` disposent
temporairement d’un plafond de 2 000 lignes : cette exception empêche toute
croissance et doit diminuer lors des prochaines extractions. Les tests et les
tables de données cliniques sont exclus de ce contrôle spécifique.

Une extraction doit conserver l’API publique quand c’est possible, déplacer
une responsabilité complète et être couverte par les tests existants ou par un
test ciblé.
