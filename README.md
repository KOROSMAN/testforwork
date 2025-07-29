# 🎥 JOBGATE Video Studio

Professional video recording module for the JOBGATE recruitment platform.

## 📋 Project Overview

This project adds a native video recording studio to JOBGATE, allowing candidates to record professional presentation videos directly within the platform, enhancing the recruitment process with a more human and engaging approach.

## ✨ Current Features (v1.0)

### 🎯 Feature 1: Basic Video Capture ✅
- WebRTC Video Recording: Native browser-based video capture
- Device Selection: Choose camera and microphone
- Real-time Preview: Live video feed during setup
- Recording Controls: Start, Stop, Preview, Reset
- Professional UI: JOBGATE-branded interface
- Responsive Design: Works on desktop and mobile
- Progress Indicators: Clear 3-step workflow

## 🛠️ Tech Stack

- **Frontend**: React.js + react-webcam
- **Backend**: Django (Python) - *Coming in Feature 4*
- **Database**: PostgreSQL - *Coming in Feature 4*
- **Video Capture**: WebRTC + getUserMedia API
- **Styling**: Custom CSS with JOBGATE branding

## 📱 Screenshots

*Feature 1 - Video Capture Interface*
- Clean, professional video recording interface
- Device settings panel
- Real-time recording status
- Progress workflow indicators

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+
- Python 3.8+
- Git

### Frontend Setup
```bash
# Clone the repository
git clone [repository-url]
cd jobgate-video-studio/frontend

# Install dependencies
npm install

# Start development server
npm start
# App will open at http://localhost:3000
```

### Backend Setup (Coming Soon)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

## 📈 Development Roadmap

### 🎯 Feature 2: Quality Tests (Next)
- Automatic quality detection (lighting, audio, framing)
- Real-time feedback and suggestions
- Pre-recording quality checks

### 🎯 Feature 3: Interactive Instructions
- Step-by-step recording guidance
- Professional presentation tips
- Dynamic content suggestions

### 🎯 Feature 4: Backend & Storage
- Django API integration
- Secure video storage
- User profile linking
- PostgreSQL database

### 🎯 Feature 5: Recruiter Interface
- Secure video playback
- No-download viewing
- Candidate profile integration

## 🎨 Design Philosophy

- **Professional**: Clean, corporate-ready interface
- **User-Friendly**: Intuitive 3-step workflow
- **Responsive**: Mobile and desktop optimized
- **Branded**: Consistent with JOBGATE visual identity
- **Accessible**: Clear instructions and feedback

## 🔧 Current Functionality

1. **Ready State**: Camera preview with device selection
2. **Recording State**: Active recording with visual indicators
3. **Preview State**: Playback recorded video with validation options

## 🤝 Contributing

This is an academic project for JOBGATE integration. Development follows an iterative approach with incremental feature releases.

## 📊 Browser Support

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

## 📞 Contact

- **Academic Supervisor**: Pr Youness El Jonhy - y.eljonhy@emsi.ma
- **Professional Supervisor**: Aouatif BOZAZ - a.bozaz@jobgate.ma

## 📝 License

Educational project for EMSI Summer Internship Program 2025.

---

**Status**: ✅ Feature 1 Complete | 🔄 Feature 2 In Development

*Transforming recruitment in Morocco, one video at a time.* 🇲🇦