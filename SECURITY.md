# Security Policy

AgentPay moves money, so we take this seriously. It currently runs on **Base Sepolia
testnet** — do not use it with mainnet funds yet.

## Reporting a vulnerability

Please report privately, not in a public issue:
- open a GitHub Security Advisory on this repository, or
- email `security@agentpay.app`.

We aim to acknowledge within 72 hours.

## Security model

- **Non-custodial.** Funds settle wallet-to-wallet in USDC. AgentPay never holds funds,
  and the SDK and dashboard never handle a user's private keys.
- **Payment verification** (`verifyPayment`) checks on-chain that the proof transaction
  (1) succeeded, (2) is recent (freshness window, default 900s — stops replays of old,
  unrelated transfers), and (3) sent at least the required USDC to the merchant address.
- **Replay guard.** Each proof transaction unlocks a resource only once (pluggable store).

## Known limitations (MVP)

- The default replay store is **in-memory** — use a persistent store (Redis/DB) in
  production so a restart doesn't reset it.
- Payment is bound to amount + recipient + freshness, **not yet to a signed per-request
  nonce**. The full x402 signed `X-PAYMENT` payload (cryptographic request binding) is on
  the roadmap.
- Testnet only for now.

## Handling secrets

- Never commit `.env` / `.env.local`, private keys, API keys, or `AGENTPAY_ADMIN_TOKEN`.
  They are gitignored — keep it that way.
- Treat agent wallet private keys and the admin token as secrets: scope them tightly and
  rotate them.
