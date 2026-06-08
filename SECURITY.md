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
  verify endpoint is rate-limited. API keys are stored hashed; the admin token is env-only.
- **Reversed / reorged transactions.** USDC is final (no chargebacks). The gateway requires
  block confirmations before honoring a payment, so a shallow reorg can't reverse access.
- **Payment manipulation.** Amount, recipient, and the USDC contract address are verified
  on-chain (a fake token or spoofed Transfer log is ignored); the tx hash is format-checked;
  replays are one-time-use; stale transfers are rejected; and the proof is signed by the
  paying wallet, so a third party who sees an in-flight tx hash can't claim it.

## Known limitations (MVP)

- Proof-of-payment is signed by the paying wallet (EIP-191) and bound to amount + recipient +
  tx hash, so a leaked tx hash can't be replayed by a third party. It does not yet use EIP-3009
  `transferWithAuthorization` (merchant-submitted settlement) — the agent sends its own transfer.
- Rate limiting and the static-mode replay store are **in-memory** — use Redis/DB for
  multi-instance production.
- Testnet only for now.

## Handling secrets

- Never commit `.env` / `.env.local`, private keys, API keys, or `AGENTPAY_ADMIN_TOKEN`.
  They are gitignored — keep it that way.
- Treat agent wallet private keys and the admin token as secrets: scope them tightly and
  rotate them.
