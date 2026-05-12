# Backend API Endpoints Reference

## Base URL
```
http://localhost:8000/api
```

## Authentication Endpoints

### Register (Sign Up)
```
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiI...",
  "user": {
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepass123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiI...",
  "user": {
    "email": "john@example.com",
    "name": "John Doe",
    "profile": {...}
  }
}
```

### Get Profile
```
GET /profile
Authorization: Bearer {token}

Response:
{
  "profile": {
    "language": "en",
    "wellnessScore": 78,
    "favoriteActivities": []
  },
  "email": "john@example.com",
  "name": "John Doe"
}
```

---

## Mood Tracking Endpoints

### Submit Mood
```
POST /mood
Authorization: Bearer {token}
Content-Type: application/json

{
  "mood": "calm",
  "note": "Had a good meditation session today"
}

Response:
{
  "message": "Mood saved.",
  "mood": {
    "_id": "...",
    "email": "john@example.com",
    "mood": "calm",
    "note": "Had a good meditation session today",
    "createdAt": "2026-05-11T10:30:00Z"
  }
}
```

### Get Mood History
```
GET /mood/history
Authorization: Bearer {token}

Response:
{
  "history": [
    {
      "_id": "...",
      "mood": "calm",
      "note": "Great day",
      "createdAt": "2026-05-11T10:30:00Z"
    },
    ...
  ]
}
```

---

## Chatbot Endpoints

### Send Chat Message
```
POST /chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "I'm feeling stressed about work",
  "mood": "stressed"
}

Response:
{
  "reply": "I understand work stress can feel overwhelming. Let's break this down...",
  "sentiment": "challenged",
  "recommendation": "Try a 5-minute grounding exercise."
}
```

### Get Wellness Tips
```
GET /wellness
Authorization: Bearer {token}

Response:
{
  "quote": "A healthy mind is a peaceful mind.",
  "affirmation": "You are allowed to take moments for yourself today.",
  "tips": [
    "Try a 5-minute grounding exercise.",
    "Write one thing you accomplished today.",
    "Take a break from screens and breathe deeply."
  ]
}
```

---

## Admin Endpoints

### Get All Users
```
GET /admin/users
Authorization: Bearer {token}
Note: Requires user role to be 'admin'

Response:
{
  "users": [
    {
      "email": "user@example.com",
      "name": "User Name",
      "role": "user",
      "createdAt": "2026-05-11T10:00:00Z"
    },
    ...
  ]
}
```

### Get Analytics
```
GET /admin/analytics
Authorization: Bearer {token}
Note: Requires user role to be 'admin'

Response:
{
  "totalUsers": 42,
  "totalChats": 156
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Token is missing!",
  "message": "Authentication required"
}
```

### 400 Bad Request
```json
{
  "error": "Name, email, and password are required."
}
```

### 403 Forbidden
```json
{
  "error": "Admin access required."
}
```

---

## How Frontend Uses These

### Frontend → Backend Flow:

1. **User Signs Up**
   - Sends: `POST /auth/register`
   - Stores: JWT token in localStorage
   - Redirects: to `/`

2. **User Accesses Dashboard**
   - Calls: `GET /mood/history`
   - Displays: Mood trends chart
   - Calls: `GET /wellness`
   - Displays: Daily tips & affirmations

3. **User Chats with AI**
   - Sends: `POST /chat` with message + current mood
   - Backend: Connects to OpenAI GPT-4o
   - Frontend: Displays response with typing animation

4. **User Tracks Mood**
   - Sends: `POST /mood` with emoji + optional note
   - Stores: In MongoDB
   - Updates: Chart with new data point

---

## Testing the API (cURL examples)

```bash
# Signup
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"test123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Get profile (replace TOKEN)
curl -X GET http://localhost:8000/api/profile \
  -H "Authorization: Bearer TOKEN"

# Send chat
curl -X POST http://localhost:8000/api/chat \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"I feel anxious","mood":"anxious"}'
```

---

## Database Schema (MongoDB)

### users collection
```json
{
  "_id": ObjectId,
  "name": "John Doe",
  "email": "john@example.com",
  "password": "hashed_password",
  "createdAt": Date,
  "lastLogin": Date,
  "role": "user",
  "profile": {
    "language": "en",
    "wellnessScore": 78,
    "favoriteActivities": []
  }
}
```

### moods collection
```json
{
  "_id": ObjectId,
  "email": "john@example.com",
  "mood": "calm",
  "note": "Had a good day",
  "createdAt": Date
}
```

### chats collection
```json
{
  "_id": ObjectId,
  "email": "john@example.com",
  "message": "I'm stressed",
  "reply": "I understand...",
  "mood": "stressed",
  "sentiment": "challenged",
  "createdAt": Date
}
```

---

That's it! Your backend API is fully documented and ready to use. 🚀
