# AStocks

Vibe coding project
https://stock-ochre-mu.vercel.app/

A personal stock portfolio tracker for **US and Korean** holdings. Save your tickers, share count, and average cost — then see total profit % updated with live market prices whenever you open the dashboard (and every 60 seconds while you stay on the page).

Built with Next.js, deployed on Vercel.

## Features

- Email/password login with secure sessions
- Track holdings in **USD** (US stocks) and **KRW** (Korean stocks)
- Live quotes via Yahoo Finance (US tickers like `AAPL`, Korean like `005930` or `005930.KS`)
- Combined portfolio profit % with FX conversion (USD/KRW)
- Per-market breakdown for US and Korea

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Postgres database**

   Use [Neon](https://neon.tech), [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), or any PostgreSQL provider.

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

4. **Run migrations**

   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).


## Korean stock tickers

- **KOSPI**: use 6-digit code, e.g. `005930` (Samsung) — app auto-appends `.KS`
- **KOSDAQ**: include suffix, e.g. `035720.KQ` (Kakao)

## Tech stack

- Next.js 16 (App Router)
- NextAuth (credentials)
- Prisma + PostgreSQL
- Tailwind CSS
- Yahoo Finance (unofficial chart API)
