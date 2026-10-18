# StackBill

**What will your stack cost when you grow?** Pick your services (Vercel, Supabase, Clerk, Claude, Resend, PostHog…), slide to your user count, and see the monthly bill at 1K, 10K, 100K and 1M users.

Live: https://stackbill-pi.vercel.app

## Features

- Cost breakdown per service, with the biggest cost highlighted
- Bills at 1K / 10K / 100K / 1M users
- Editable usage assumptions (page views, emails, AI calls, tokens per user)
- Shareable links that keep your exact stack, with a generated LinkedIn/X preview card

## Run locally

```bash
npm install
npm run dev
```

## Update prices

All pricing lives in [`src/lib/pricing.ts`](src/lib/pricing.ts). Each service has a `cost(users, assumptions)` function and a note describing what's included. Prices are estimates from public pricing pages (last checked Oct 2026).
