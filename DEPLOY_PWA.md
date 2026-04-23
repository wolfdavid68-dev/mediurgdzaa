# 📱 MediURG - Progressive Web App (PWA)

## 🎯 À propos

**MediURG** est une Progressive Web App hors ligne pour professionnels médicaux d'urgence (SAUV, SMUR, SAU). Elle permet d'accéder rapidement à +70 médicaments critiques avec :
- ✓ Indications
- ✓ Contre-indications  
- ✓ Effets indésirables
- ✓ Posologies adulte & pédiatrique
- ✓ Conditionnement

---

## 🚀 Installation & Déploiement

### **Option 1: Installation locale (développement)**

```bash
# Cloner/télécharger le projet
cd project

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm start
```

La PWA sera disponible sur `http://localhost:3000`

### **Option 2: Build de production**

```bash
npm run build
```

Les fichiers compilés seront dans `build/`

---

## 📲 Installation sur téléphone

### **Sur Android**
1. Ouvrir l'app dans Chrome
2. Cliquer sur ⋮ (menu) → "Installer l'app"
3. Appuyer sur "Installer"
4. L'app apparaît sur l'écran d'accueil

### **Sur iPhone/iPad**
1. Ouvrir dans Safari
2. Cliquer sur ⎙ → "Sur l'écran d'accueil"
3. Nommer l'app "MediURG"
4. Ajouter l'app

### **Sur navigateur (Windows/Mac/Linux)**
1. Accéder à l'URL
2. Cliquer sur 🔔 → "Installer MediURG"
3. L'app s'installe comme application native

---

## 💾 Stockage hors ligne

L'app fonctionne **100% hors ligne** :
- ✓ Service Worker met en cache tous les fichiers
- ✓ Les données des médicaments sont statiques (incluses)
- ✓ Pas de connexion réseau requise après le premier chargement
- ✓ Indicateur 📡 affiche l'état de connexion

### **Capacité de cache**
- Chrome/Edge/Firefox : ~50 MB
- Safari : Illimité
- Tous les médicaments occupent < 1 MB

---

## 🔗 Partage avec d'autres

### **Méthode 1: Partage du lien (recommandé)**
```
https://votre-domaine.com/mediurg
```
- ✓ Fonctionne sur tous les appareils
- ✓ Les gens installent leur propre version
- ✓ Mise à jour centralisée

### **Méthode 2: Partage natif (Android 12+)**
1. Installer l'app sur Android
2. Appuyer long sur l'icône
3. Cliquer "Partager"
4. Envoyer le lien via SMS/Email/Messaging

### **Méthode 3: Code QR**
```
Créer un QR code pointant vers:
https://votre-domaine.com/mediurg
```
- Imprimer et afficher dans les salles SAUV/SMUR
- Les gens scannent avec le téléphone
- Installation immédiate

### **Méthode 4: Distribution d'entreprise (Windows)**
```
# Créer un fichier .ps1 pour installer le raccourci
New-DesktopLink -Name "MediURG" -URL "https://..."
```

---

## 🌐 Déploiement en production

### **Sur un serveur web (recommandé)**

#### Hébergement gratuit/low-cost:
- **Netlify** (gratuit, HTTPS automatique)
  ```bash
  npm run build
  # Déployer le dossier 'build/'
  ```
- **Vercel** (gratuit, optimisé React)
- **GitHub Pages** (gratuit, static hosting)
- **Heroku** (gratuit/payant)

#### Hébergement traditionnel (cPanel, etc.):
1. Générer le build: `npm run build`
2. Uploader le contenu de `build/` via FTP
3. S'assurer que le `.htaccess` est copié
4. Tester: `https://votre-domaine.com`

### **Configuration HTTPS (obligatoire pour PWA)**
- ✓ Let's Encrypt (gratuit, auto-renouvellement)
- ✓ Cloudflare (gratuit, CDN + SSL)
- ✓ Certificat auto-signé pour tests

---

## 📊 Vérifier l'installation PWA

### **Chrome DevTools**
1. Ouvrir DevTools (F12)
2. Onglet "Application"
3. Section "Service Workers" : doit afficher "active"
4. Section "Cache Storage" : doit lister les caches

### **Vérification de la manifestation**
```bash
curl https://votre-domaine.com/manifest.json
```
Doit retourner un JSON valide

---

## 🔄 Mise à jour de l'app

### **Déployer une nouvelle version**

**Sur Netlify/Vercel:**
- Pousser vers la branche main
- Déploiement automatique en ~30 sec
- Les utilisateurs reçoivent une notification de mise à jour

**Sur serveur traditionnel:**
1. Générer nouveau build: `npm run build`
2. Uploader via FTP
3. Les utilisateurs verront une notification "nouvelle version disponible"
4. Cliquer "Mettre à jour"

### **Versioning du cache**
Le Service Worker utilise `CACHE_NAME = 'mediurg-v1'` dans le fichier `service-worker.js`. Pour forcer l'invalidation du cache :

```javascript
// Dans service-worker.js, changer:
const CACHE_NAME = 'mediurg-v2'; // ← v1 → v2
```

---

## 🛡️ Sécurité

### **HTTPS obligatoire**
- PWA nécessite HTTPS (sauf localhost)
- Certificat auto-signé possible pour tests

### **Données sensibles**
- Les données médicales sont statiques et non chiffrées
- Aucun serveur backend (pas d'authentification)
- Adaptation possible pour contexte sensible:
  ```javascript
  // localStorage pour données personnelles
  localStorage.setItem('favorites', JSON.stringify(favs));
  ```

---

## 🐛 Dépannage

### **L'app n'installe pas**
- ✓ Vérifier HTTPS activé
- ✓ Vérifier `manifest.json` valide
- ✓ Service Worker enregistré (voir DevTools)

### **Données pas en cache**
- ✓ Attendre 10 sec après le chargement (async)
- ✓ Vérifier DevTools → Application → Cache Storage
- ✓ Forcer refresh: Ctrl+Shift+R (Windows) ou Cmd+Shift+R (Mac)

### **App lente hors ligne**
- Les données sont déjà en cache
- Premier chargement peut prendre 5-10 sec
- Après ça: instantané hors ligne

---

## 📝 Fichiers importants

```
public/
├── index.html           ← HTML principal avec PWA setup
├── manifest.json        ← Configuration app (icônes, nom, etc.)
├── service-worker.js    ← Logique cache hors ligne
├── .htaccess            ← Config serveur Apache
└── (icônes PNG à ajouter)

src/
├── App.js               ← Composant React principal
├── index.js             ← Point d'entrée React
├── components/
│   ├── DrugList.js
│   └── DrugCard.js
└── data/
    └── drugs.js         ← +73 médicaments
```

---

## 📱 QR Code d'installation

```
Générer avec: https://www.qr-code-generator.com/
URL: https://votre-domaine.com/mediurg
```

---

## 📞 Support

- 🐛 Signaler un bug: GitHub Issues
- 💬 Questions: Discussion
- 📧 Email: [contact]

---

## 📄 Licence

Libre d'utilisation à titre médical et éducatif.

---

## ✨ Prochaines étapes

- [ ] Ajouter icônes PWA (192x192, 512x512)
- [ ] Déployer sur serveur HTTPS
- [ ] Ajouter fonction "Favoris" (localStorage)
- [ ] Ajouter partage natif (Web Share API)
- [ ] Tester sur iOS/Android réels
- [ ] Créer QR code de distribution

**Fait par: [Votre nom/équipe]**
**Dernière mise à jour: 23 avril 2026**
