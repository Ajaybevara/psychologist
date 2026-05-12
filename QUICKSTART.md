# 🚀 MindCare Psychologist Chatbot - Quick Start Guide

## What You Have

✅ Full-stack React + Flask web app
✅ AI-powered chatbot with GPT-4o integration
✅ Mood tracking dashboard with analytics
✅ User authentication (signup/login)
✅ Multi-language support (English + Indian languages)
✅ Responsive design with animations

---

## Backend Setup (Flask + MongoDB)

### 1. Open Terminal 1 and navigate to backend:
```bash
cd "c:\Users\ajayb\OneDrive\ドキュメント\Desktop\doctors_chatbot\backend"
```

### 2. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate
```

### 3. Install dependencies:
```bash
pip install -r requirements.txt
```

### 4. Configure `.env` file:

Create file: `.env` in the backend folder with:
```
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.mongodb.net/mentalwellness?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_key_make_it_long_and_random
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxx
PASSWORD_RESET_TOKEN_EXPIRY_HOURS=1
```

**To get these keys:**
- **MongoDB**: Sign up free at https://www.mongodb.com/cloud/atlas (free tier available)
- **OpenAI API Key**: Get from https://platform.openai.com/account/api-keys

### 5. Start backend server:
```bash
python app.py
```

You should see:
```
* Running on http://0.0.0.0:8000
```

---

## Frontend Setup (React + Vite)

### 1. Open Terminal 2 and navigate to frontend:
```bash
cd "c:\Users\ajayb\OneDrive\ドキュメント\Desktop\doctors_chatbot\frontend"
```

### 2. Dependencies already installed, just run:
```bash
npm run dev
```

You should see:
```
➜  Local:   http://localhost:3001/
```

---

## 🌐 Access the App

1. Open your browser to: **http://localhost:3001**
2. Click "Create account" to sign up
3. Fill in your details and submit
4. Explore:
   - **Dashboard** - Mood tracking & wellness insights
   - **AI Support** - Chat with MindCare chatbot
   - **Mood Tracker** - Daily check-ins with analytics
   - **Wellness Tools** - Breathing exercises & affirmations

---

## ✨ Features Included

### Authentication
- ✅ Signup with email/password
- ✅ Login with JWT session
- ✅ Profile management

### AI Chatbot
- ✅ Real-time chat with GPT-4o
- ✅ Text-to-speech output
- ✅ Mood-aware responses
- ✅ CBT-based guidance
- ✅ Support categories (stress, anxiety, motivation, etc.)

### Dashboard
- ✅ Mood analytics with charts
- ✅ Weekly/monthly trends
- ✅ Wellness tips & affirmations
- ✅ Breathing exercise guides
- ✅ Recent mood history

### Design
- ✅ Modern glassmorphism UI
- ✅ Smooth animations
- ✅ Dark mode (default)
- ✅ Fully responsive (mobile/tablet/desktop)
- ✅ Psychology-themed colors (teal, blue, purple)

---

## Troubleshooting

### Issue: "Cannot connect to backend"
**Solution:** Make sure backend is running on http://localhost:8000

### Issue: "Module not found" errors in frontend
**Solution:** Run `npm install` again:
```bash
npm install
```

### Issue: OpenAI API errors
**Solution:** Check your API key is correct and has available credits

### Issue: MongoDB connection fails
**Solution:** 
- Check internet connection
- Verify connection string is correct
- Make sure IP whitelist includes your IP in MongoDB Atlas

---

## File Structure

```
doctors_chatbot/
├── backend/
│   ├── app.py                 # Flask REST API
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Environment template
│
└── frontend/
    ├── src/
    │   ├── App.jsx             # Main app routing
    │   ├── components/
    │   │   ├── AuthPanel.jsx   # Login & signup
    │   │   ├── ChatPanel.jsx   # AI chatbot
    │   │   ├── Dashboard.jsx   # Analytics dashboard
    │   │   ├── MoodTracker.jsx # Mood check-in
    │   │   ├── Sidebar.jsx     # Navigation
    │   │   └── WellnessTools.jsx # Breathing, affirmations
    │   ├── services/
    │   │   └── api.js          # API client
    │   └── hooks/
    │       └── useAuth.js      # Auth hook
    └── package.json            # NPM dependencies
```

---

## Next Steps

1. **Customize**: Modify colors, add your brand logo, change affirmations
2. **Deploy**: 
   - Frontend → Vercel (https://vercel.com)
   - Backend → Render (https://render.com) or Railway (https://railway.app)
3. **Admin Panel**: Check `/admin` to view users and analytics
4. **Mobile**: The app is fully responsive and PWA-ready

---

## Support

If you encounter issues:
1. Check that both backend AND frontend are running
2. Verify `.env` has correct API keys
3. Check browser console for errors (F12)
4. Check terminal for error messages

---

Enjoy your MindCare application! 🧠💚
