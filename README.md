# GigWeatherWage

AI-powered weather-risk insurance experience for gig workers.

## Live App

- Production URL: https://gigweatherwage.vercel.app

## Current Status

This repository is now only for `gigweatherwage`.
All previous FSAD temporary project traces were removed.

## What Is Implemented

- React single-page app (`create-react-app`)
- Firebase Authentication integration
- Registration with:
  - Name
  - Username
  - Phone
  - Email
  - Password + Confirm Password
  - City + Zone
- Login using **Username or Email** + Password
- Password visibility (eye toggle) on auth forms
- Forgot password using Firebase reset email
- Dynamic city/zone weather monitor in Alerts tab
- Dynamic premium calculations based on:
  - City risk
  - Zone factor
  - Platform factor
  - Plan/work profile
- Automatic premium adjustment on city/zone change:
  - Increased risk -> `pendingPremiumDue`
  - Decreased risk -> `billingCredit`
- Payments flow includes due settlement using available credit
- Profile edit flow for:
  - Name
  - Username
  - Email
  - City
  - Zone
  - Password
- Account controls:
  - Logout
  - Pause/Resume account
  - Delete account
  - Support action (`support@devtrails.com`)

## Weather Data

The Alerts city weather fetch uses Open-Meteo APIs:

- Geocoding API to resolve city coordinates
- Forecast API for weather snapshot
- Air quality API for AQI signals

## Tech Stack

- Frontend: React 18
- Auth: Firebase Auth
- Build toolchain: `react-scripts` (CRA)
- Deployment: Vercel

## Local Development

```bash
npm install
npm start
```

Build production bundle:

```bash
npm run build
```

## Environment Notes

Configure Firebase project credentials in the app runtime environment as required by your Firebase setup.

If email update/password update fails for a logged-in user, Firebase may require recent re-authentication.

For AI assistant backend (`/api/chat`) add these environment variables:

- `OPENAI_API_KEY` = your OpenAI API key
- `OPENAI_MODEL` = optional model override (default: `gpt-4o-mini`)

## Deployment Notes

- This repo is configured for Vercel static build output (`build/`).
- Deploy command used:

```bash
npx vercel --prod --yes
```

After deployment, production alias is expected at:

- https://gigweatherwage.vercel.app

For Vercel deployments, set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in Project Settings -> Environment Variables.

## Team

- Kotapothula Siva Raga Adithi
- Rohini Yadagiri
- Garikipati Tejaswi
- Bhanu Siva Tejaswani Meesala
