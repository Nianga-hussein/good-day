# 📋 Guide de déploiement — GoodDay → Google Drive (PRINCE2)

## Vue d'ensemble

```
Projet créé sur GoodDay
       ↓ webhook
   Ton serveur
       ↓ Google Drive API
Dossiers + fichiers copiés automatiquement
```

---

## ÉTAPE 1 — Préparer Google Drive API

### 1.1 Créer un Service Account Google

1. Va sur https://console.cloud.google.com
2. Crée un nouveau projet (ex: "goodday-automation")
3. Active l'API **Google Drive API** (APIs & Services > Enable APIs)
4. Va dans **IAM & Admin > Service Accounts > Create Service Account**
5. Donne-lui un nom (ex: "drive-automation")
6. Télécharge la clé JSON : Actions > Manage keys > Add Key > JSON
7. **Garde ce fichier JSON précieusement — c'est ton accès Drive**

### 1.2 Partager ton dossier racine avec le Service Account

1. Ouvre Google Drive
2. Fais clic droit sur le dossier racine de tes projets > Partager
3. Colle l'email du Service Account (ex: `drive-automation@ton-projet.iam.gserviceaccount.com`)
4. Donne-lui le rôle **Éditeur**

### 1.3 Partager les templates avec le Service Account

Répète la même opération pour chaque fichier template que tu as sur Drive
(ou mets tous tes templates dans un dossier et partage ce dossier).

---

## ÉTAPE 2 — Récupérer les IDs de tes templates

Pour chaque template sur Google Drive :
1. Fais clic droit sur le fichier > **Obtenir le lien**
2. L'URL ressemble à : `https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVEIEA/view`
3. L'ID est la partie entre `/d/` et `/view` : `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVEIEA`

Mets ces IDs dans le fichier `server.js` dans la section `TEMPLATE_IDS`.

---

## ÉTAPE 3 — Déployer le serveur (Render.com — gratuit)

1. Va sur https://render.com et crée un compte
2. **New > Web Service > Connect a GitHub repo** (ou upload le code)
3. Configuration :
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
4. Ajoute les variables d'environnement (**Environment > Add Environment Variable**) :

| Nom | Valeur |
|-----|--------|
| `DRIVE_ROOT_FOLDER_ID` | L'ID du dossier racine Drive (dans l'URL du dossier) |
| `GOOGLE_SERVICE_ACCOUNT` | Le contenu du fichier JSON du Service Account (tout coller) |
| `GOODDAY_WEBHOOK_SECRET` | Un mot de passe de ton choix (ex: `monsecret123`) |

5. Déploie → Render te donnera une URL comme `https://ton-app.onrender.com`

---

## ÉTAPE 4 — Configurer le Webhook GoodDay

1. Dans GoodDay : **Organization > Settings > API**
2. Clique **Manage Webhooks > New Webhook**
3. Configure :
   - **Event type** : `project.create`
   - **Endpoint URL** : `https://ton-app.onrender.com/webhook/goodday`
   - **Secret** : le même mot de passe que `GOODDAY_WEBHOOK_SECRET`
4. Sauvegarde

---

## ÉTAPE 5 — Tester

1. Crée un projet test sur GoodDay
2. Regarde les logs sur Render (Logs tab)
3. Vérifie que les dossiers apparaissent sur Google Drive

---

## Résultat attendu sur Drive

```
📁 [Nom du projet GoodDay]
├── 📁 01_Starting_Up_a_Project_SU
│   ├── 📁 Project_Mandate
│   ├── 📁 Project_Brief
│   │   └── 📄 MonProjet_ProjectBrief.docx  ← copie indépendante !
│   ├── 📁 Project_Product_Description
│   │   └── 📄 MonProjet_ProductDescription.docx
│   └── 📁 Lessons_from_previous_projects
│       └── 📊 MonProjet_LessonsLog.xlsx
├── 📁 02_Initiating_a_Project_IP
│   └── ... (tous les fichiers Management Approaches etc.)
└── ...
```

Chaque fichier est une **copie indépendante** de ton template.
Modifier un fichier dans un projet n'affecte JAMAIS les autres projets.

---

## Questions fréquentes

**Q: Et si je veux ajouter un Stage_02, Stage_03 ?**
Dans `server.js`, duplique le bloc `stage01` et change le nom du dossier.

**Q: Et si le projet GoodDay est un sous-projet (pas un vrai projet PRINCE2) ?**
Tu peux filtrer par `project.parentId` dans le webhook pour ignorer les sous-projets.

**Q: Render.com s'endort après 15 min (plan gratuit)**
Le premier webhook après une pause peut prendre 30-50s à répondre.
Solution : upgrade Render ($7/mois) ou utiliser Google Cloud Functions.
