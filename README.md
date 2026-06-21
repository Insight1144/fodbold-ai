# MATCHPREDICT.AI — Fodbold Forudsigelse

AI-drevet fodboldanalyse med realtidsdata. Bygget med React, Vite, Tailwind og Claude AI.

## Deploy til Vercel

### 1. Push til GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DIT_BRUGERNAVN/fodbold-forudsigelse.git
git push -u origin main
```

### 2. Importer i Vercel
1. Gå til [vercel.com](https://vercel.com) → "Add New Project"
2. Vælg dit GitHub repo
3. Framework detectes automatisk som **Vite**
4. Klik **Deploy**

### 3. Tilføj API-nøgle
I Vercel Dashboard:
- **Settings → Environment Variables**
- Navn: `ANTHROPIC_API_KEY`
- Værdi: Din nøgle fra [console.anthropic.com](https://console.anthropic.com)
- Husk at **Redeploy** efter du har tilføjet nøglen

## Lokal udvikling

```bash
npm install
echo "ANTHROPIC_API_KEY=din_nøgle" > .env.local
npx vercel dev   # Kører både frontend og API-routes lokalt
```

## Arkitektur

```
/api/predict.ts    →  Claude claude-sonnet-4-6 med web search (kampanalyse)
/api/matches.ts    →  Claude claude-sonnet-4-6 med web search (dagens kampe)
/src/              →  React frontend (Vite + Tailwind v4)
```

API-nøglen lever kun på serveren — den eksponeres aldrig i browseren.
