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
- `components/preparation/model/recipeSteps.ts` construit les étapes des
  recettes génériques.
- `components/preparation/model/specialRecipes.ts` regroupe les exceptions
  cliniques spécialisées sans les mélanger à l’orchestrateur principal.
- `components/PrepBlock.tsx` orchestre l’affichage historique de préparation.
- `components/preparation/PrepBlockParts.tsx` regroupe les types, sélecteurs et
  en-têtes purement visuels de ce bloc sans multiplier les micro-fichiers.
- `components/preparation/PrepRecipeCalculations.tsx` rend les calculs propres
  aux différentes familles de recettes.
- `components/preparation/PrepCalculationLayouts.tsx` compose les variantes
  classique et v2 sans alourdir l’orchestrateur.
- `components/preparation/PreparationDoseStepper.tsx` gère la saisie numérique
  contrôlée de la préparation publique.

Le terme `preview` ne doit être utilisé que pour les surcharges réellement
expérimentales activées par `?author=preview`. La préparation v2.5 publique est
nommée `Preparation` dans les fichiers et les API TypeScript.

Les traitements particuliers utilisent `drug.preparationStrategy` dans les
données cliniques. Le moteur ne doit pas sélectionner une règle métier à partir
d'un identifiant numérique de médicament.

Le build sépare `medicaments` et `medicaments-preparation`. Le premier contient
la liste et la fiche, le second les calculateurs spécialisés ; les deux restent
précachés par Workbox pour garantir le fonctionnement hors ligne.

Les données PSE et les alias de recherche vivent dans `data-pse` et
`data-search`, séparément des fiches `data-medic`. Les styles de préparation,
du journal des versions et de l’ACR suivent également leur chunk fonctionnel au
lieu d’alourdir le CSS principal.

## Dossier ACR

- `components/AcrRecordView.tsx` orchestre le dossier et son état.
- `components/acr/AcrRecordControls.tsx` contient les contrôles de formulaire.
- `components/acr/AcrRecordText.ts` génère le bilan anonyme copiable.

## Limites de taille

`npm run verify:source-size` applique une limite uniforme de 1 000 lignes aux
fichiers de code applicatif, sans exception. Les tests et les tables de données
cliniques sont exclus de ce contrôle spécifique.

Une extraction doit conserver l’API publique quand c’est possible, déplacer
une responsabilité complète et être couverte par les tests existants ou par un
test ciblé.
