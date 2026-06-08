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
  default 1 — reorg safety), is recent (freshness window, default 900s), and sent at least
  the required USDC to the merchant from the real USDC contract.
- **Replay guard.** Each proof transaction unlocks a resource once. In managed mode the
  control plane de-dups by (project, txHash), durable across restarts.
- **Rate limiting.** Auth, provisioning, and SDK endpoints are rate-limited per IP + token.

## Threats handled

- **Account takeover.** Sign-In-With-Ethereum uses a single-use nonce (consumed on every
  attempt) bound to the request domain, over an httpOnly + SameSite session cookie; the
  verify endpoint is rate-limited. API keys are stored hashed; the admin token is env-only.
- **Reversed / reorged transactions.** USDC is final (no chargebacks). The gateway requires
  block confirmations before honoring a payment, so a shallow reorg can't reverse access.
- **Payment manipulation.** Amount, recipient, and the USDC contract address are verified
  on-chain (a fake token or spoofed Transfer log is ignored); the tx hash is format-checked;
  replays are one-time-use; stale transfers are rejected.

## Known limitations (MVP)

- Proof-of-payment is a tx hash bound to amount + recipient + confirmations + freshness +
  one-time-use, but **not yet to a signed per-request nonce**. The full x402 signed
  `X-PAYMENT` payload (cryptographic binding of the payment to the paying agent) is on the
  roadmap — until then, treat a leaked in-flight tx hash as it would be on any x402 endpoint.
- Rate limiting and the static-mode replay store are **in-memory** — use Redis/DB for
  multi-instance production.
- Testnet only for now.

## Handling secrets

- Never commit `.env` / `.env.local`, private keys, API keys, or `AGENTPAY_ADMIN_TOKEN`.
  They are gitignored — keep it that way.
- Treat agent wallet private keys and the admin token as secrets: scope them tightly and
  rotate them.
