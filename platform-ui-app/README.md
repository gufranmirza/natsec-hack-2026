# mission-commander

Next.js dashboard for the Mission Commander product — an edge-native
AI mission command surface that fuses tactical data into one operational
picture and supports human-in-the-loop tasking.

## Getting started

```bash
npm install
cp example.local .env.local    # fill in PLATFORM_API_URL
npm run dev
```

### Environment variables

Validated at boot by `src/env.mjs`:

| Var                 | What                                                          |
|---------------------|---------------------------------------------------------------|
| `PLATFORM_API_URL`  | Base URL of the backend API (e.g. `http://localhost:8081`)    |

## Routes

- `/`        — redirects to the drone operations console
- `/home`    — drone-first mission command demo

The `/home` demo includes scenario playback, deterministic commander copilot
answers with citations, simulated drone sensor preview, human-approved tasking,
and degraded-link edge execution.

## Layout

```
src/
├── app/                          Next App Router pages
├── components/
│   ├── _layout/                  sidebar + nav + theme
│   ├── ui/ hooks/ providers/ icons/ lib/   shadcn primitives + utilities
├── services/
│   └── devices/                  typed REST client + react-query hooks
├── env.mjs                       runtime env validation
└── styles/globals.css
```
