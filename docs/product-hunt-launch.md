# AgentPay — Product Hunt launch kit

Everything to launch **AgentPay** on Product Hunt under the **Citerlabs** banner. Copy/paste the
fields below into the listing; the assets are in this repo. You create the PH listing and hit
publish — this kit makes that a paste-and-go.

> Maker: **Citerlabs** · Repo: `github.com/ANVEAI/agentpay` · Site: `agentpay.citerlabs.com` (set on deploy)

---

## 1. The basics

- **Name:** AgentPay
- **Tagline (≤60 chars) — pick one:**
  - `The drop-in payment rail for AI agents` ← recommended
  - `Let AI agents pay your API in USDC, in one line`
  - `Stripe for AI agents — open source`
  - `Open-source payments for autonomous AI agents`
- **Topics (choose 3):** Developer Tools · Artificial Intelligence · Payments _(alt: Open Source, APIs, Crypto)_
- **Links:**
  - Website → `https://agentpay.citerlabs.com`
  - GitHub → `https://github.com/ANVEAI/agentpay`
  - Docs → `https://agentpay.citerlabs.com/docs`
  - Demo (60s reel) → `https://agentpay.citerlabs.com/launch-video.html`
- **Pricing:** Free / Open source (MIT)

## 2. Description (the listing body)

> AI agents are starting to buy things — APIs, data, compute. AgentPay is the easiest way to
> charge them. Drop one line into your server and unpaid requests get an HTTP 402; the agent pays
> in USDC over the open x402 standard and retries; the money lands straight in your wallet.
> Non-custodial, gasless (EIP-3009), with a spend policy so you decide exactly what an agent can
> pay — allowed vendors, blocked sites, per-intent caps, model allow-list, daily budget. Open
> source, your keys. Stripe for AI agents.

## 3. First comment (post as the maker within 60 seconds, then pin it)

> Hey Product Hunt 👋 — I'm building AgentPay at **Citerlabs**.
>
> Over the last year, agents went from answering questions to *doing things* — calling APIs,
> buying data, renting compute. But the moment an agent needs to **pay**, everything breaks: shared
> API keys, manual reviews, and you're liable for whatever it spends. There was no clean way to
> charge an agent, or to put guardrails on one.
>
> AgentPay is the payment rail for that world:
> • **One line** to gate a route — `paymentGateway({ payTo, amount })`. Unpaid → HTTP 402; the
>   agent pays USDC and retries; you get paid.
> • **You stay in control** — a spend policy with allowed vendors, blocked sites, per-intent caps,
>   a model allow-list, and a daily budget, enforced before every payment.
> • **Non-custodial + gasless** — USDC over the open x402 standard, EIP-3009 authorizations, settled
>   on Base. Your keys, never ours.
> • **Open source (MIT)** — self-host the whole thing, or hand it to a coding agent to provision.
>
> It's testnet today (Base Sepolia) and there's a 60-second demo + a drop-in `<agentpay-button>`.
> I'd love your take: **if your agent could spend money, what's the first thing you'd let it buy —
> and what limit would you put on it?**
>
> Repo + docs in the links. AMA in the comments all day 🙌

## 4. Gallery (order matters — lead with the video)

1. **`agentpay-launch.mp4`** — the 60s launch reel _(video first; it auto-plays muted, so the
   on-screen text carries it)_. File: `video/out/agentpay-launch.mp4`.
2. **Landing** — "Accept AI-agent payments in USDC" + the 3-step how-it-works. _(screenshot `/`)_
3. **The flow** — `402 → pay → 200`, color-coded. _(grab from the video ~frame 1405, or the docs)_
4. **Spend policy** — the agent `/wallet` with vendors/blocked/caps/models/budget. _(screenshot `/wallet` after connecting)_
5. **One line of code** — the `/docs` integration snippet. _(screenshot `/docs`)_
6. **`og.png`** — the brand card, as the thumbnail/last slide. File: `apps/dashboard/public/og.png`.

Capture the screenshots at 1270×760 (PH gallery) or 1920×1080. The wallet/policy shots need a
connected MetaMask — do those on your machine.

## 5. Cross-posts (fire when the listing is live)

**X / Twitter (thread):**
> 1/ AI agents can finally pay for what they use.
> We just launched **AgentPay** on Product Hunt — the open-source, drop-in payment rail for AI
> agents. One line of code, USDC, non-custodial. 🧵 [PH link]
>
> 2/ The problem: agents call APIs, buy data, rent compute — but paying breaks. Shared keys,
> manual reviews, and you're liable. No guardrails.
>
> 3/ AgentPay: gate a route in one line → unpaid requests get a 402 → the agent pays USDC over
> x402 → you get paid. The money lands straight in your wallet. Non-custodial, gasless on Base.
>
> 4/ You decide what it can pay: allowed vendors, blocked sites, per-intent caps, a model
> allow-list, a daily budget — enforced on every call.
>
> 5/ Open source (MIT), self-hostable, by @citerlabs. ⭐ the repo + try the 60s demo. Support us
> on PH today 👉 [PH link]

**LinkedIn:**
> We just launched AgentPay on Product Hunt 🚀
> AI agents are starting to buy things — APIs, data, compute — but there's no clean, safe way to
> charge them. AgentPay is the open-source payment rail for that: one line of code, USDC over the
> open x402 standard, non-custodial, with a spend policy so you decide exactly what an agent can
> pay. Built at Citerlabs. Would love your support and feedback — link in comments.

## 6. Launch-day checklist

**T-48h**
- [ ] PH listing drafted (tagline, description, topics, links) — saved as a scheduled launch.
- [ ] Gallery assets exported (video + 4 screenshots + og.png); video < 50MB, MP4/H.264.
- [ ] First comment written + saved; cross-posts drafted.
- [ ] Deploy is live + healthy (landing, /docs, /wallet, /pay, /launch-video.html all load; gateway returns 402).
- [ ] `NEXT_PUBLIC_SITE_URL` set to the production URL so og:image previews resolve.
- [ ] Line up 10–20 supporters (DM them the date; don't ask for upvotes outright — ask them to "check it out").

**T-24h**
- [ ] Confirm the launch is scheduled for **12:01 AM PT, Tue–Thu**.
- [ ] Test the PH preview card (paste the URL in a Slack/X DM — confirm og.png + title render).
- [ ] Pre-write 5 likely-FAQ answers (custody, mainnet, fees, x402, how the policy is enforced).

**Launch (12:01 AM PT)**
- [ ] Listing goes live → post the **first maker comment within 60s** → **pin it**.
- [ ] Fire the X thread + LinkedIn post (link to the PH page).
- [ ] Share in 3–5 relevant communities (AI-agent / dev / crypto Discords + Slacks + Indie Hackers).

**First 4 hours (the ranking window)**
- [ ] Reply to **every** comment within ~15 min. Be specific, technical, warm.
- [ ] Pin the best question. Thank early supporters by name.
- [ ] Watch the [Cloudflare AI Crawl Control / GA4] for traffic; fix anything that 500s fast.

**Rest of day**
- [ ] Keep replying. Re-share the thread mid-morning ET and mid-afternoon ET.
- [ ] Post a "we're #N" update if you're top-5.

**T+24h**
- [ ] Thank-you post to supporters. Note follower count gained (higher-signal than upvotes).
- [ ] Capture metrics: upvotes, comments, GitHub stars delta, site traffic, trial/clone signups.

## 7. Targets (typical mid-week)

| Metric | Target |
|---|---|
| 3-second video hold | > 70% |
| Upvotes by EOD | 300–500 (top-5) |
| Comments by EOD | 50+ |
| New GitHub stars | track delta from launch |
| Maker followers gained | 100+ |

## 8. Assets in this repo

- **Videos:** `video/out/agentpay-launch.mp4` (master), `…-9x16.mp4` (social), `…-teaser-15s.mp4` (teaser).
- **Social card / og:** `apps/dashboard/public/og.png` (1200×630).
- **Re-render anything:** `cd video && pnpm render` (or `render:social` / `render:teaser`); regenerate audio with `pnpm audio`.

---

_The actual Product Hunt account, listing creation, and the publish action are yours — this kit
covers everything up to "hit launch." Built by Citerlabs._
