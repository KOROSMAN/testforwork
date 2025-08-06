# JOBGATE Video Studio

## 📹 Description

Studio vidéo intégré pour la plateforme JOBGATE permettant aux candidats d'enregistrer des vidéos de présentation professionnelles avec analyse qualité IA en temps réel.

### ✨ Fonctionnalités principales

- **Studio vidéo intégré** : Enregistrement directement depuis le navigateur
- **Tests qualité IA** : Analyse automatique de la vidéo, audio, éclairage et positionnement
- **Instructions interactives** : Guide en temps réel pendant l'enregistrement (90 secondes)
- **Sélection périphériques** : Choix caméra/microphone
- **Sauvegarde base de données** : Stockage PostgreSQL avec métadonnées complètes
- **Interface responsive** : Compatible desktop et mobile
- **API REST complète** : Backend Django avec endpoints complets

## 🏗️ Architecture technique

### Frontend (React.js)
- **React 18** avec hooks modernes
- **react-webcam** pour capture vidéo
- **axios** pour communication API
- **CSS moderne** avec design JOBGATE

### Backend (Django)
- **Django 5.0+** avec Django REST Framework
- **PostgreSQL** pour stockage données
- **Modèles** : Video, QualityCheck, RecordingSession, Analytics
- **API REST** complète avec upload de fichiers
- **Admin Django** pour gestion

### Base de données
- **PostgreSQL** avec tables optimisées
- **Stockage fichiers** dans `/media/videos/`
- **Métadonnées complètes** : durée, qualité, analytics

## 🚀 Installation et Setup

### Prérequis
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Git

### 1. Cloner le projet
```bash
git clone <your-repo-url>
cd jobgate-video-studio
```

### 2. Setup Backend (Django)
```bash
cd backend

# Créer environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Installer dépendances
pip install -r requirements.txt
```

### 3. Configuration PostgreSQL

**Créer base de données :**
```sql
-- Dans psql ou pgAdmin
CREATE DATABASE video_studio_db;
CREATE USER video_studio_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE video_studio_db TO video_studio_user;
```

**Configurer `.env` :**
```bash
# Créer backend/.env
DB_NAME=video_studio_db
DB_USER=postgres
DB_PASSWORD=your_postgresql_password
DB_HOST=localhost
DB_PORT=5432

DEBUG=True
SECRET_KEY=your-secret-key
MEDIA_ROOT=media/
MEDIA_URL=/media/
```

### 4. Migrations et admin
```bash
# Appliquer migrations
python manage.py makemigrations
python manage.py migrate

# Créer superuser
python manage.py createsuperuser

# Lancer serveur
python manage.py runserver
```

### 5. Setup Frontend (React)
```bash
cd ../frontend

# Installer dépendances
npm install

# Lancer en développement
npm start
```

## 📱 Utilisation

### Interface utilisateur

1. **Accéder** : http://localhost:3000
2. **Test API** : Cliquer "🔗 Test API Connection"
3. **Analyse qualité** : "Start Quality Check" (score minimum 80%)
4. **Enregistrement** : "Start Recording" → suivre instructions interactives
5. **Sauvegarde** : "Save to Database"

### Administration

- **Admin Django** : http://127.0.0.1:8000/admin/
- **API Browser** : http://127.0.0.1:8000/api/
- **pgAdmin** : Gestion base de données

## 🔌 API Endpoints

### Vidéos
```
GET    /api/videos/                     # Liste vidéos
POST   /api/videos/                     # Créer vidéo
GET    /api/videos/{id}/                # Détail vidéo
POST   /api/videos/{id}/start_recording/ # Démarrer session
POST   /api/videos/{id}/stop_recording/  # Arrêter session
POST   /api/videos/{id}/approve/         # Approuver vidéo
POST   /api/videos/{id}/link_to_cv/      # Lier au CV
```

### Tests qualité
```
GET    /api/quality-checks/             # Liste tests
POST   /api/quality-checks/batch_update/ # Mise à jour batch
POST   /api/quality-analysis/           # Analyse temps réel
```

### Upload
```
POST   /api/upload/                     # Upload vidéo spécialisé
```

## 📊 Modèles de données

### Video
- Utilisateur, titre, description
- Fichier vidéo, thumbnail
- Durée, taille, format, résolution
- Score qualité global, statut approbation
- Liens CV, suggestions mise à jour

### QualityCheck
- Types : face, lighting, audio, positioning
- Score (0-100), statut, message
- Détails techniques JSON

### RecordingSession
- Session d'enregistrement
- Instructions montrées/complétées
- Paramètres périphériques
- Statistiques temps

### VideoAnalytics
- Métriques qualité détaillées
- Statistiques usage
- Données amélioration continue

## 🎯 Intégration JOBGATE

Ce module est conçu pour s'intégrer parfaitement dans l'écosystème JOBGATE :

- **Architecture modulaire** compatible `apps/`
- **Modèles User** standard Django
- **API REST** prête pour JWT auth
- **Liaison CandidateProfile** (future)
- **Notifications CV** (future)
- **Dashboard recruteurs** (future)

## 🔧 Développement

### Structure projet
```
jobgate-video-studio/
├── backend/                 # Django API
│   ├── video_studio/       # Configuration Django
│   ├── videos/             # App principale
│   ├── media/              # Fichiers uploadés
│   └── requirements.txt    # Dépendances Python
├── frontend/               # React app
│   ├── src/
│   │   ├── components/     # Composants React
│   │   └── services/       # API services
│   └── package.json        # Dépendances Node
└── README.md
```

### Scripts utiles
```bash
# Backend
python manage.py shell        # Console Django
python manage.py dbshell      # Console PostgreSQL
python manage.py collectstatic # Fichiers statiques

# Frontend  
npm run build                 # Build production
npm test                      # Tests
```

## 🚀 Déploiement

### Préparation production
1. **Variables environnement** : Configurer `.env` production
2. **DEBUG=False** : Désactiver mode debug
3. **ALLOWED_HOSTS** : Configurer domaines autorisés
4. **Fichiers statiques** : `collectstatic`
5. **Base de données** : PostgreSQL production
6. **Serveur web** : Nginx + Gunicorn recommandé

## 🤝 Contribution

1. Fork le projet
2. Créer branche feature (`git checkout -b feature/amazing-feature`)
3. Commit changements (`git commit -m 'Add amazing feature'`)
4. Push branche (`git push origin feature/amazing-feature`)
5. Ouvrir Pull Request

## 📝 License

Projet développé pour JOBGATE - Propriété intellectuelle protégée.

## 👥 Équipe

- **Développement** : Projet EMSI/JOBGATE
- **Encadrement académique** : Pr Youness El Jonhy
- **Encadrement professionnel** : Aouatif BOZAZ (JOBGATE)

## 📞 Support

Pour support technique ou questions :
- Email académique : y.eljonhy@emsi.ma
- Email professionnel : a.bozaz@jobgate.ma
- Plateforme : www.jobgate.ma

---

⭐ **Projet réalisé dans le cadre de la formation EMSI en partenariat avec JOBGATE**