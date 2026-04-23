# 📲 Guide rapide d'installation PWA MediURG

## 1️⃣ Générer les icônes (important!)

**Allez sur:** https://www.simicart.com/manifest-generator.html

1. **Upload une image** (logo 512x512px minimum)
2. **Sélectionner tailles:**
   - 32x32 (favicon)
   - 192x192 (home screen Android)
   - 512x512 (splash screen Android)
   - 180x180 (iOS)
   - 192x192 & 512x512 maskable

3. **Télécharger le ZIP** et extraire dans `public/`

Les fichiers générés:
```
public/
├── favicon-32x32.png
├── icon-192.png
├── icon-192-maskable.png
├── icon-512.png
├── icon-512-maskable.png
└── apple-touch-icon.png
```

---

## 2️⃣ Tester localement

```bash
npm install
npm start
```

Ouvrir Chrome → DevTools (F12) → Application → Manifest
Doit afficher ✓ en vert

---

## 3️⃣ Déployer sur Netlify (gratuit + HTTPS)

```bash
# 1. Créer un compte Netlify.com
# 2. Installer CLI
npm install -g netlify-cli

# 3. Builder
npm run build

# 4. Déployer
netlify deploy --prod --dir=build

# Récupérer URL: https://xxxxx.netlify.app
```

**Alternative: drag & drop le dossier `build/` sur Netlify**

---

## 4️⃣ Créer un QR code de partage

Sur votre téléphone:
```
URL: https://votre-app.netlify.app
Aller sur: qr-code-generator.com
Télécharger le PNG
```

Partager en PDF/imprimé dans les ambulances/hôpitaux

---

## 5️⃣ Installation par les utilisateurs

### Android
1. Ouvrir Chrome → URL de votre app
2. Cliquer ⋮ → "Installer l'app"
3. ✓ L'app est sur l'écran d'accueil

### iPhone
1. Ouvrir Safari → URL de votre app  
2. Cliquer ⎙ (partage) → "Sur l'écran d'accueil"
3. ✓ L'app est sur l'écran d'accueil

### Windows/Mac/Linux
1. Ouvrir lien dans Chrome
2. Cliquer 🔔 → "Installer MediURG"
3. ✓ L'app s'installe comme application native

---

## 6️⃣ Partage facile entre utilisateurs

### Option A: Envoyer le lien
```
https://votre-app.netlify.app
```
- Copier/coller en SMS
- Envoyer par Email
- Partager sur WhatsApp
- Tous les appareils: ✓

### Option B: Partage natif (Android uniquement)
1. Appui long sur icône MediURG
2. Cliquer "Partager"
3. Envoyer à un contact
4. Ils cliquent → Installation auto

### Option C: QR code dans salle d'attente
1. Générer QR code (voir étape 4)
2. Imprimer en A4
3. Afficher dans:
   - Salle SAUV
   - Poste SMUR
   - Salle de pause SAU
4. Les gens scannent → Installation instantanée

---

## 🔄 Mettre à jour l'app

**Après la première installation:**

1. Modifier le code
2. `npm run build`
3. Redéployer: `netlify deploy --prod --dir=build`
4. Les utilisateurs voient "Nouvelle version disponible"
5. Cliquer "Mettre à jour"

---

## ✅ Checklist avant production

- [ ] Icônes PWA générées (public/icon-*.png)
- [ ] manifest.json complété
- [ ] service-worker.js en place
- [ ] npm run build sans erreur
- [ ] Testé sur Android (Chrome)
- [ ] Testé sur iPhone (Safari)
- [ ] Déployé sur HTTPS (Netlify/Vercel)
- [ ] Indicateur hors ligne fonctionne
- [ ] QR code créé et partagé

---

## 🚀 Commandes essentielles

```bash
# Démarrer dev
npm start

# Builder pour production
npm run build

# Vérifier taille
du -sh build/

# Déployer (après netlify login)
netlify deploy --prod --dir=build
```

---

## 📊 Vérifier le fonctionnement

**Dans DevTools (F12):**

1. **Onglet Application**
   - Section "Service Workers" → doit être "active"
   - Section "Cache Storage" → doit lister "mediurg-runtime"

2. **Onglet Network**
   - Activer "Offline" mode
   - Rafraîchir (Ctrl+R)
   - L'app doit fonctionner complètement

3. **Manifest**
   - Doit afficher ✓ valide
   - Tous les icons ✓

---

## 💾 Points clés PWA

✓ **Hors ligne:** Service Worker cache tout
✓ **Installable:** manifest.json + icons
✓ **Fast:** Cache first strategy
✓ **Sécurisé:** HTTPS obligatoire
✓ **Shareable:** Un lien = installation pour tous

---

Besoin d'aide? Voir **DEPLOY_PWA.md** pour guide complet.

**Bienvenue dans le futur des apps! 🚀**
