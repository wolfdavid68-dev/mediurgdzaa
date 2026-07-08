# Raccourcis vocaux et liens profonds (deep links)

MediURG s'ouvre directement sur un écran précis via des paramètres d'URL.
C'est le mécanisme utilisé par les raccourcis du manifest PWA (appui long sur
l'icône Android) et c'est aussi ce qui permet de piloter l'app à la voix avec
**Siri** (iPhone) ou **Gemini / Assistant Google** (Android) : l'assistant ne
fait qu'ouvrir la bonne URL, MediURG fait le reste — y compris hors-ligne,
puisque le service worker sert l'app sans réseau.

La résolution des paramètres vit dans `src/lib/deepLink.ts` (testée par
`deepLink.test.ts`) et est appliquée au lancement par `App.tsx`. Une fois
appliqué, chaque paramètre est retiré de l'URL pour qu'un simple refresh ne
rejoue pas le raccourci.

## Paramètres supportés

| URL | Effet |
| --- | --- |
| `/?mode=acr` | Ouvre directement la modale **URGENCE ACR** (chrono + drogues) |
| `/?page=medicaments` \| `protocoles` \| `echelles` | Ouvre la page demandée |
| `/?page=protocoles&tab=PISU` \| `incompatibilites` \| `ecg` \| `kits` | Ouvre Protocoles sur le sous-onglet |
| `/?kit=ktc` | Ouvre Protocoles → Kits avec le **kit déployé** et amené à l'écran (ids : voir `PREP_KITS` dans `src/data/prepKits.js`, ex. `ktc`, `isr`, `pa`, `drain-thoracique`) |
| `/?med=CORDARONE` | Ouvre Médicaments avec la recherche préremplie ; si le résultat est **sans ambiguïté**, la fiche s'ouvre déployée |
| `/?med=42` | Idem par id de médicament (toujours sans ambiguïté → fiche déployée) |
| `/?poids=80` ou `/?poids=12,5` | Prérègle le **poids patient** (borné à 300 kg, virgule ou point acceptés ; expire au bout de 3 h comme une saisie manuelle) |

Les paramètres se combinent :

```
https://<domaine>/?med=CORDARONE&poids=80
https://<domaine>/?kit=ktc
https://<domaine>/?mode=acr&poids=25
```

Les écrans à accès complet (protocoles, kits, ACR) ne s'appliquent qu'une fois
la session validée ; le paramètre reste dans l'URL et est rejoué dès que
l'accès est accordé (utile quand le lien ouvre l'app sur l'écran de connexion).

## « Dis Siri, protocole KTC » (iPhone / iPad)

1. Ouvrir l'app **Raccourcis** d'Apple.
2. Nouveau raccourci → action **« Ouvrir l'URL »** →
   `https://<domaine>/?kit=ktc`.
3. Nommer le raccourci exactement comme la phrase à prononcer, par exemple
   **« Protocole KTC »**.
4. Dire « Dis Siri, protocole KTC » : MediURG s'ouvre sur le kit KTC déployé.

Créer autant de raccourcis que de besoins : « Mode ACR » → `/?mode=acr`,
« Cordarone » → `/?med=CORDARONE`, etc. Astuce : l'action « Dicter du texte »
de Raccourcis permet aussi de construire un raccourci générique qui demande le
nom du médicament puis ouvre `/?med=<texte dicté>`.

## « Hey Google, protocole KTC » (Android)

1. Ouvrir l'app **Google Home / Assistant** → **Routines**.
2. Nouvelle routine → déclencheur vocal « protocole KTC » → action
   **« Ouvrir une URL »** (ou « Essayez d'ajouter… » → ouvrir un site) →
   `https://<domaine>/?kit=ktc`.
3. La phrase déclenche l'ouverture de MediURG (installée en PWA, l'URL s'ouvre
   dans la fenêtre de l'app).

À défaut de routine, dire simplement à Gemini/Assistant « ouvre
`<domaine>/?kit=ktc` » fonctionne aussi.

## Raccourcis manifest (appui long sur l'icône)

Les raccourcis statiques du manifest PWA (`vite.config.ts`, clé
`manifest.shortcuts`) utilisent le même mécanisme : URGENCE ACR,
Incompatibilités, Kits, PISU. Tout nouveau raccourci manifest doit pointer vers
une URL de ce tableau.
