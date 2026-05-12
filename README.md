# Psychologist Support Chatbot

A modern AI-powered mental wellness web application with a calming UI, secure user authentication, AI chatbot support, mood tracking, and wellness tools.

## Structure

- `frontend/` — React + Vite + Tailwind frontend
- `backend/` — Python Flask REST API with MongoDB support

## Local setup

1. Backend
   - `cd backend`
   - `python -m venv venv`
   - `venv\Scripts\activate`
   - `pip install -r requirements.txt`
   - copy `.env.example` to `.env` and populate values
   - `python app.py`

2. Frontend
   - `cd frontend`
   - `npm install`
   - `npm run dev`

## Notes

- The backend expects `MONGODB_URI`, `JWT_SECRET`, and `OPENAI_API_KEY` in `.env`.
- Admin routes require a user with `role: admin` set in MongoDB.
- The chat assistant uses OpenAI GPT APIs and includes sentiment-aware support.

## Deployment

- The frontend can be deployed as a static app to Vercel or Netlify.
- The backend is a Flask API and should be deployed separately to Python hosts like Heroku, Render, or Railway.
- See `DEPLOYMENT.md` for setup commands and host-specific instructions.
