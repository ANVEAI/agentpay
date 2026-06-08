# Security Policy

AgentPay moves money, so we take this seriously. It currently runs on **Base Sepolia
testnet** — do not use it with mainnet funds yet.

## Reporting a vulnerability

Please report privately, not in a public issue:
- open a GitHub Security Advisory on this repository, or
- email `security@agentpay.app`.

We aim to acknowledge within 72 hours.

## Security model

- **Non-custodial.** Funds settle wallet-to-wallet in USDC. AgentPay never holds funds and
  never handles private keys. USDC settlement is final — there are no chargebacks.
- **Payment verification** (`verifyPayment`) checks on-chain that the proof transaction: has
  a valid hash format, succeeded, is buried by enough confirmations (`minConfirmations`,
  default 1 — reorg safety), is recent (freshness window, default 900s), sent at least the
  required USDC to the merchant from the real USDC contract, and is signed by the paying
  wallet (signer == on-chain payer) when `requireSignature` is on (gateway default).
- **Replay guard.** Each proof transaction unlocks a resource once. In managed mode the
  control plane de-dups by (project, txHash), durable across restarts.
- **Rate limiting.** Auth, provisioning, and SDK endpoints are rate-limited per IP + token.

## Threats handled

- **Account takeover.** Sign-In-With-Ethereum uses a single-use nonce (consumed on every
  attempt) bound to the request domain, over an httpOnly + SameSite session cookie; the
  verify endpoint is rate-limited. Production refuses to boot with a missing/default
  `SESSION_SECRET` (no forgeable cookies). API keys are stored hashed; the admin token is
  env-only and compared in constant time.
- **Reversed / reorged transactions.** USDC is final (no chargebacks). The gateway requires
  block confirmations before honoring a payment, so a shallow reorg can't reverse access.
- **Payment manipulation.** Amount, recipient, and the USDC contract address are verified
  on-chain (a fake token or spoofed Transfer log is ignored); the tx hash is format-checked;
  replays are one-time-use; stale transfers are rejected; and the proof is signed by the
  paying wallet and bound to payTo + amount + resource + tx hash, so a third party who sees an
  in-flight tx hash can't claim it and a proof can't be reused on a different endpoint.

## Known limitations (MVP)

- Proof-of-payment is signed by the paying wallet (EIP-191) and bound to recipient + amount +
  resource + tx hash, so a leaked tx hash can't be replayed by a third party. It does not yet
  use EIP-3009 `transferWithAuthorization` (merchant-submitted settlement) — the agent sends
  its own transfer.
- Rate limiting and the static-mode replay store are **in-memory** — use Redis/DB for
  multi-instance production.
- Testnet only for now.

## Hardening required before a multi-tenant hosted plane

The self-host model — one operator owns the server, the admin token, and the API keys — is the
current target, and these are safe under it. A shared, multi-tenant cloud raises the bar; address
each before hosting other people's merchants:

- **Re-verify payments at the events endpoint.** `/api/cp/events` records `from`/`amount` as
  reported by the API-key holder; the gateway verifies on-chain before calling it, but the
  endpoint itself trusts the caller. A shared plane should independently re-verify on-chain and
  derive `from`/`amount` from the receipt.
- **Server-side spend caps.** Per-agent `dailyLimit` is enforced best-effort in the SDK
  (`createPaidFetch`); a hosted plane should enforce it where payments are accepted.
- **Scope admin provisioning per tenant.** The single `AGENTPAY_ADMIN_TOKEN` is all-or-nothing
  and can set an arbitrary project `owner` — fine for one operator, unsafe shared. Use
  per-merchant credentials.
- **Trust the right client IP.** Rate-limit keys use `x-forwarded-for`; behind a proxy, pin to
  the platform's trusted client IP so the header can't be spoofed for fresh buckets.
- **Block webhook SSRF at egress.** Webhook URLs are validated to http(s); a shared plane must
  also block private/link-local IP ranges so a tenant can't point a webhook at internal infra.

## Handling secrets

- Never commit `.env` / `.env.local`, private keys, API keys, or `AGENTPAY_ADMIN_TOKEN`.
  They are gitignored — keep it that way.
- Treat agent wallet private keys and the admin token as secrets: scope them tightly and
  rotate them.
