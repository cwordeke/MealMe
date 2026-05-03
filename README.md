# MealMe 🍽️

**Find meals that fit your macros on campus.**

 **Live App:** https://mealme-six.vercel.app/

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

---

## Overview

Traditional calorie trackers ask you to log what you *already* ate.  
MealMe flips the model.

It pulls live daily menus from university dining halls and tells you exactly what you *should* eat before you walk in.

Using a custom **Target Match Engine** and a weighted penalty algorithm, the app:
- Filters out junk data  
- Evaluates meals against your remaining macros (Protein, Carbs, Fats, Calories)  
- Recommends the best option in a dynamic daily timeline ledger  

---

## Core Features

- **Target Match Algorithm**  
  Scores meals using a weighted penalty system to find the best macro fit.

- **Live API Sync**  
  Fetches daily WordPress and HFS JSON data. No HTML scraping.

- **Data Sanitization Pipeline**  
  Removes zero-calorie items, duplicates, and condiments.

- **Multi-Tenant Architecture**  
  Supports multiple universities with different schemas and themes.

- **Premium UI/UX**  
  Built with Framer Motion, GSAP, and Shadcn for smooth animations and a timeline-style interface.

---

## Tech Stack

**Frontend**
- React 19  
- TypeScript  
- Vite  

**Styling & UI**
- Tailwind CSS (v4)  
- Shadcn UI  
- Class Variance Authority  
- Lucide Icons  

**Animation**
- Framer Motion  
- GSAP  
- Tailwind Animate  

**Mapping**
- Mapbox GL  

**Backend / API**
- Node.js  
- Express  
- Vercel Serverless Functions  

---

## Architecture Highlights

### Proxy API Route (`/api/dining`)

University APIs often block browser requests due to CORS.

MealMe routes requests through a serverless proxy that:
- Injects required headers  
- Bypasses CORS restrictions  
- Returns a unified JSON format  

---

### Data Sanitization (`src/lib/menuSanitize.ts`)

Dining data is messy.

This layer:
- Removes low-value items (e.g. condiments)  
- Uses calorie thresholds and keyword filtering  
- Classifies items as `isMainMeal` or `isAddOn`  

---

## Deployment

Hosted on **Vercel**.

- Automatically builds from GitHub  
- Serverless functions run from `/api`  
- Environment variables configured in Vercel dashboard  

---

## Swan Hacks 2026

This project was built for the 2026 Iowa State Swan Hacks Hackathon

**Team members:**
- https://github.com/cwordeke
- https://github.com/aarush2807

