# Stayfit App — Source Structure

## Folder Layout

```
src/
├── App.jsx                    ← Root: state, routing, auth (~3000 lines)
├── firebase.js                ← Firebase config (unchanged)
│
├── constants/
│   └── index.js               ← COLORS, FONTS, GOALS, food lists, country data
│
├── services/
│   ├── database.js            ← All Firebase/DB calls (swap backend here)
│   └── ai.js                  ← Gemini / Groq / OpenRouter AI calls
│
├── utils/
│   └── index.js               ← Pure functions: BMI, metrics, streaks, sessions
│
└── components/
    ├── shared/                ← Reusable UI (BMIGauge, GoalRing, etc.)
    ├── features/              ← Feature screens (StepCounter, FoodLog, etc.)
    ├── dashboard/             ← Dashboard sections (SettingsPanel, AIMealPlan)
    └── admin/                 ← Admin panel components (UserCard, AdminPanel)
```

## Swapping the Backend

All Firebase calls live in `src/services/database.js`.
To switch to a different backend (Supabase, REST API, etc.):
1. Edit only `src/services/database.js`
2. Keep the same function signatures (sbGetUser, sbAddLog, etc.)
3. App.jsx and components need zero changes

## Swapping the Frontend

The logic in `src/utils/` and `src/services/` is framework-agnostic.
To use with React Native or Next.js:
1. Copy `constants/`, `services/`, `utils/` as-is
2. Rewrite `components/` for the new platform
