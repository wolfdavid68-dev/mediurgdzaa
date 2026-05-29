# Ajouter ou modifier un médicament

Guide court pour éviter les oublis entre données cliniques, calculateurs, liens
protocoles et stockage local.

## Avant de commencer

- Ne jamais renuméroter un `id` existant : les notes locales utilisent
  `mediurg-note-{id}` et les données PSE référencent ces ids.
- Garder les libellés, commentaires et contenus en français.
- Reprendre la forme d'un médicament proche plutôt que créer de nouveaux champs.

## Médicament simple

1. Modifier le fichier de catégorie dans `src/data/drugs/`.
2. Vérifier les champs structurants : `id`, `nom`, `commercial`, `dci`, `classe`,
   `cat`, `svc`, `couleur`, `icon`, `desc`, `indic`, `ci`, `ei`, `cond`, `poso`.
3. Si une nouvelle catégorie est créée, l'ajouter au barrel `src/data/drugs.js`.
4. Lancer `npm run report:data:strict`.

## Préparation et calculateur

1. Si le médicament a une préparation pondérale, renseigner `prep` en reprenant
   une forme existante compatible avec `src/lib/calc.ts`.
2. Si le médicament est prescrit au PSE, ajouter l'entrée correspondante dans
   `src/data/pse.js`.
3. Ajouter ou adapter un test dans `src/lib/calc.test.ts` si un nouveau format de
   dose ou d'unité apparaît.

## Protocoles et kits

1. Si le médicament apparaît dans un protocole et doit être cliquable, ajouter
   son motif dans `DRUG_PATTERNS` de `src/components/ProtocolCard.tsx`.
2. Si le médicament est utilisé dans un kit, vérifier `drugId`, `nom`, `role`,
   `dose`, `prep` et les champs de checklist qui référencent `from`.
3. Lancer `npm run report:data:strict` pour détecter les liens orphelins.

## Incompatibilités

1. Ajouter l'entrée dans `src/data/incompatibilities.js` si la voie IV est
   concernée.
2. Les noms dans `items[].with` et `compatibleWith[]` doivent correspondre
   exactement au champ `drug` d'une autre entrée.
3. Lancer `npm test -- src/lib/incompatibilityIndex.test.ts`.

## Vérifications recommandées

```bash
npm run report:data:strict
npm run verify
npm run build
npm run verify:pwa-offline
```

Si la modification touche l'UI Médicaments, Kits ou Incompatibilités, lancer
aussi :

```bash
npm run verify:pwa-offline:browser
npm run verify:offline-screenshots
npm run verify:a11y-keyboard
```
