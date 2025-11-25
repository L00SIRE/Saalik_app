# Saalik Hybrid App

Cross-platform (iOS priority) Expo app plus Node/Express imagination service that powers Saalik's login experience, travel-intent capture, and conversational concierge.

## Repo structure

```
Saalik_app/
├── frontend/saalik-mobile  # Expo + React Native client
└── backend                 # Express + TypeScript AI scaffolding
```

### Frontend highlights
- League Spartan typography, `bgsaalik.jpg` hero backdrop, gradient login UI matching provided art direction.
- Intent chips (Religious / Scenic / Cultural / Adventure / Wellness) and free-form prompt field that call the backend "imagination" model.
- Modal chatbot that pings `/api/chat` for concierge-style replies.
- Axios service layer + `.env` support via `EXPO_PUBLIC_API_URL`.

### Backend highlights
- TypeScript Express API with `/api/experience-plan` and `/api/chat`.
- Lightweight "imagination engine" scoring intents and emitting itinerary-style plans.
- Zod validation + modular service design, ready to swap with real LLM provider.

## Getting started

### Backend
```bash
cd /Users/sumandangal/Saalik_app/backend
cp .env.example .env   # adjust PORT if needed
npm install            # already run once, safe to repeat
npm run dev            # starts express server on http://localhost:4000
```

### Frontend (Expo)
```bash
cd /Users/sumandangal/Saalik_app/frontend/saalik-mobile
cp .env.example .env                      # point to deployed backend when ready
npm install                               # already run once, safe to repeat
npx expo run:ios or npx expo start --ios  # iOS priority
npx expo start --android                  # Android build
```

> The login screen, AI intent planner, and chatbot all read the API URL from `EXPO_PUBLIC_API_URL`; ensure your backend is running locally or hosted before launching the app.

## Next steps
- Wire experience plans to actual CMS or itinerary data.
- Replace imagination engine with OpenAI / Vertex / local LLM.
- Add authentication + secure storage for Remember Me toggle.
- Style chatbot with streaming responses and voice trigger.
