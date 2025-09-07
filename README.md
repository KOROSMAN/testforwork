# JOBGATE Video Studio - Plateforme Complète

## 📹 Description

Studio vidéo professionnel intégré pour JOBGATE avec système de matching candidat-recruteur, notifications temps réel et intégration IA avancée. Solution complète de recrutement vidéo pour humaniser le processus d'embauche.

### ✨ Fonctionnalités principales

#### 🎬 Studio Vidéo Candidat
- **Enregistrement intégré** : Capture vidéo directement depuis le navigateur
- **Tests qualité IA** : Analyse temps réel (visage, éclairage, audio, positionnement)
- **Instructions interactives** : Guide étape par étape pendant l'enregistrement (90s)
- **Sélection périphériques** : Choix caméra/microphone avec aperçu
- **Liaison CV automatique** : Intégration directe au profil candidat

#### 👥 Interface Recruteur
- **Recherche avancée** : Filtres par qualité vidéo, compétences, localisation
- **Consultation vidéos** : Lecteur intégré avec analytics de visionnage
- **Profils candidats** : Vue complète avec CV + vidéo synchronisés
- **Tableau de bord** : Statistiques et métriques de recrutement

#### 🔔 Système Notifications
- **Temps réel** : Notifications instantanées (vidéo consultée, profil mis à jour)
- **Préférences** : Contrôle email, push, SMS par utilisateur
- **Templates** : Messages personnalisables selon les événements
- **Centre notifications** : Interface unifiée pour toutes les alertes

#### 🤖 Intelligence Artificielle
- **Analyse qualité** : Score global basé sur 4 critères (face, lumière, audio, position)
- **Recommandations** : Suggestions d'amélioration en temps réel
- **Matching automatique** : Correspondance candidat-poste basée sur la vidéo
- **Analytics prédictifs** : Insights sur le succès des candidatures

## 🏗️ Architecture technique

### Frontend (React.js)
```
frontend/
├── src/
│   ├── components/
│   │   ├── VideoStudio.js          # Studio d'enregistrement
│   │   ├── CandidateSearch.js      # Recherche recruteurs
│   │   ├── NotificationCenter.js   # Centre notifications
│   │   └── QualityChecker.js       # Tests qualité IA
│   ├── services/
│   │   ├── api.js                  # API vidéos
│   │   ├── candidateAPI.js         # API candidats
│   │   └── notificationAPI.js      # API notifications
│   └── App.js
```

### Backend (Django)
```
backend/
├── videos/              # Gestion vidéos
├── candidate/           # Profils candidats
├── notifications/       # Système notifications
└── video_studio/        # Configuration Django
```

### Base de données (PostgreSQL)
- **Videos** : Métadonnées complètes, scores qualité
- **CandidateProfile** : Profils enrichis avec vidéos
- **Notifications** : Système complet avec préférences
- **Analytics** : Métriques de performance et usage

## 🚀 Installation complète

### Prérequis
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Redis (optionnel pour cache)

### 1. Cloner et setup initial
```bash
git clone https://github.com/username/jobgate-video-studio.git
cd jobgate-video-studio
```

### 2. Backend Django
```bash
cd backend

# Environnement virtuel
python -m venv venv
venv\Scripts\activate     # Windows
source venv/bin/activate  # Linux/Mac

# Dépendances
pip install -r requirements.txt
```

### 3. Configuration PostgreSQL
```sql
-- Créer base de données
CREATE DATABASE "JobgateServ";
CREATE USER postgres WITH PASSWORD '123';
GRANT ALL PRIVILEGES ON DATABASE "JobgateServ" TO postgres;
```

### 4. Variables d'environnement
```bash
# Créer backend/.env
SECRET_KEY=your-secret-key-here
DEBUG=True

# Database
DB_NAME=JobgateServ
DB_USER=postgres
DB_PASSWORD=123
DB_HOST=localhost
DB_PORT=5432

# Media
MEDIA_URL=/media/
MEDIA_ROOT=media

# Notifications (optionnel)
NOTIFICATION_EMAIL_ENABLED=False
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### 5. Migrations et données
```bash
# Migrations
python manage.py makemigrations videos
python manage.py makemigrations candidate
python manage.py makemigrations notifications
python manage.py migrate

# Super utilisateur
python manage.py createsuperuser

# Serveur développement
python manage.py runserver
```

### 6. Frontend React
```bash
cd ../frontend

# Dépendances
npm install

# Développement
npm start
```

## 📱 Guide d'utilisation

### Pour les candidats

1. **Accès** : http://localhost:3000
2. **Tests qualité** : Analyse automatique de votre setup
   - Détection faciale (score min: 70%)
   - Qualité éclairage (optimal: 70-85%)
   - Niveau audio (clair et audible)
   - Positionnement centré
3. **Enregistrement guidé** :
   - 0-20s : Présentation personnelle
   - 20-45s : Formation et projets
   - 45-70s : Compétences et motivations
   - 70-90s : Objectifs professionnels
4. **Sauvegarde et liaison** : Intégration automatique au profil

### Pour les recruteurs

1. **Recherche candidats** : Filtres avancés
2. **Consultation vidéos** : Analytics de visionnage
3. **Profils complets** : CV + vidéo synchronisés
4. **Notifications** : Alertes nouveaux candidats

### Administration

- **Django Admin** : http://127.0.0.1:8000/admin/
- **API Explorer** : http://127.0.0.1:8000/api/
- **Documentation** : Endpoints REST complets

## 🔌 API Endpoints complets

### Vidéos
```
GET    /api/videos/                      # Liste avec filtres
POST   /api/videos/                      # Création
GET    /api/videos/{id}/                 # Détail complet
PUT    /api/videos/{id}/                 # Mise à jour
DELETE /api/videos/{id}/                 # Suppression
POST   /api/videos/{id}/link_to_cv/      # Liaison profil
POST   /api/videos/{id}/approve/         # Approbation
POST   /api/upload/                      # Upload optimisé
```

### Candidats
```
GET    /api/candidate/profiles/          # Liste profils
POST   /api/candidate/profiles/          # Création profil
GET    /api/candidate/profiles/search/   # Recherche avancée
POST   /api/candidate/quick-video-link/  # Liaison rapide
GET    /api/candidate/dashboard-stats/{id}/ # Statistiques
```

### Notifications
```
GET    /api/notifications/notifications/ # Liste avec filtres
POST   /api/notifications/create/        # Création
POST   /api/notifications/{id}/mark_as_read/ # Marquer lu
GET    /api/notifications/stats/{user_id}/   # Statistiques
```

### Tests qualité
```
POST   /api/quality-checks/batch_update/ # Tests multiples
POST   /api/quality-analysis/            # Analyse temps réel
GET    /api/quality-checks/              # Historique
```

## 📊 Modèles de données avancés

### Video (Extended)
```python
- Métadonnées : titre, description, durée, format
- Qualité : score global, détails par critère
- Relations : user, profil candidat, analytics
- États : draft, processing, completed, approved
- CV : linked_to_cv, cv_update_suggested
```

### CandidateProfile (New)
```python
- Informations : nom, formation, expérience
- Vidéo : presentation_video, quality_score, last_updated
- Métrics : profile_completeness, status
- Relations : user, video_views, sync_logs
```

### Notification (New)
```python
- Types : video_linked, video_viewed, sync_needed
- Contenu : title, message, priority, extra_data
- État : is_read, is_archived, read_at
- Actions : action_url, action_text
```

### VideoViewLog (New)
```python
- Tracking : viewer, viewed_at, duration
- Feedback : rating, notes, completed_viewing
- Analytics : view_count, unique_viewers
```

## 🎯 Intégration JOBGATE Platform

### Architecture modulaire
- **apps/candidate/** : Gestion profils candidats
- **apps/notifications/** : Système notifications
- **apps/videos/** : Studio vidéo core
- **Integration ready** : Compatible avec l'écosystème JOBGATE

### Fonctionnalités d'entreprise
- **Multi-tenant** : Support entreprises multiples
- **Permissions** : Rôles candidat/recruteur/admin
- **Analytics** : Métriques business complètes
- **Scalabilité** : Architecture prête pour la charge

### Sécurité
- **JWT Authentication** : Tokens sécurisés
- **CORS Configuration** : Domaines autorisés
- **File Validation** : Vérification uploads
- **SQL Injection** : Protection ORM Django

## 🔧 Développement avancé

### Structure complète
```
jobgate-video-studio/
├── backend/
│   ├── video_studio/        # Configuration Django
│   ├── videos/              # App vidéos core
│   ├── candidate/           # Profils candidats
│   ├── notifications/       # Système notifications
│   ├── media/               # Stockage fichiers
│   ├── logs/                # Logs application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Composants React
│   │   ├── services/        # API clients
│   │   ├── utils/           # Utilitaires
│   │   └── assets/          # Ressources statiques
│   ├── public/
│   └── package.json
├── docs/                    # Documentation
├── tests/                   # Tests automatisés
└── deploy/                  # Configuration déploiement
```

### Tests et qualité
```bash
# Backend
python manage.py test                    # Tests unitaires
python manage.py check                   # Vérifications Django
flake8 .                                # Style Python

# Frontend
npm test                                # Tests React
npm run lint                            # ESLint
npm run build                           # Build production
```

### Performance
- **Cache Redis** : Réponses API rapides
- **Optimisation DB** : Index et requêtes optimisées
- **CDN Ready** : Fichiers statiques
- **Compression** : Gzip, minification

## 🚀 Déploiement production

### Infrastructure recommandée
- **Serveur** : Ubuntu 20.04+ ou CentOS 8+
- **Web Server** : Nginx + Gunicorn
- **Base de données** : PostgreSQL 12+ avec réplication
- **Cache** : Redis cluster
- **Storage** : AWS S3 ou équivalent
- **Monitoring** : Sentry + Grafana

### Configuration production
```bash
# Variables environnement
DEBUG=False
ALLOWED_HOSTS=jobgate.ma,api.jobgate.ma
SECRET_KEY=super-secure-production-key

# Database
DB_HOST=production-db-host
DB_PASSWORD=secure-production-password

# Media Storage
MEDIA_URL=https://cdn.jobgate.ma/media/
AWS_S3_BUCKET=jobgate-media-production

# Email
EMAIL_HOST=smtp.mailgun.org
EMAIL_HOST_USER=notifications@jobgate.ma
```

### Scripts déploiement
```bash
# Build et deploy
./deploy/build.sh                       # Build complet
./deploy/migrate.sh                     # Migrations production
./deploy/collect-static.sh              # Fichiers statiques
./deploy/restart-services.sh            # Restart services
```

## 📈 Analytics et monitoring

### Métriques business
- **Candidats** : Taux de complétion vidéo, qualité moyenne
- **Recruteurs** : Temps de visionnage, taux de contact
- **Platform** : Utilisateurs actifs, conversions
- **Performance** : Temps de réponse, erreurs

### Dashboards
- **Admin** : Vue globale plateforme
- **Candidat** : Statistiques personnelles
- **Recruteur** : Métriques de recherche
- **Entreprise** : ROI recrutement

## 🤝 Contribution

### Workflow développement
1. **Fork** le projet
2. **Branche feature** : `git checkout -b feature/nom-fonctionnalite`
3. **Développement** : Code + tests
4. **Commits** : Messages descriptifs
5. **Pull Request** : Review + merge

### Standards code
- **Python** : PEP8, type hints
- **JavaScript** : ESLint, Prettier
- **Git** : Conventional commits
- **Documentation** : Docstrings + README

## 📝 Roadmap

### Version 2.0 (Q2 2025)
- **IA matching** : Algorithme de correspondance avancé
- **Multi-langues** : Support FR/EN/AR
- **Mobile app** : Application native
- **Intégrations** : LinkedIn, Indeed, etc.

### Version 3.0 (Q4 2025)
- **Live interviews** : Entretiens vidéo en direct
- **AI Assessment** : Évaluation automatique compétences
- **White label** : Solution pour autres entreprises
- **Enterprise** : Fonctionnalités grandes entreprises

## 📞 Support et contact

### Équipe projet
- **Développement** : Équipe EMSI/JOBGATE
- **Encadrement académique** : Pr Youness El Jonhy (y.eljonhy@emsi.ma)
- **Encadrement professionnel** : Aouatif BOZAZ (a.bozaz@jobgate.ma)

### Support technique
- **Documentation** : /docs/ (à venir)
- **Issues** : GitHub Issues
- **Email** : support@jobgate.ma
- **Plateforme** : www.jobgate.ma

## 📄 Licence

Copyright © 2025 JOBGATE. Tous droits réservés.
Développé dans le cadre du partenariat EMSI-JOBGATE.

---

⭐ **Projet complet de recrutement vidéo nouvelle génération - Powered by JOBGATE & EMSI**