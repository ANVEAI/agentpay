// Closes the AgentPay loop end to end: an agent hits a gated endpoint, gets a 402,
// pays USDC on Base Sepolia, and retries with proof to get the content.
//
//   TARGET_URL=http://localhost:3000/api/premium \
//   AGENT_PRIVATE_KEY=0x... \
//   pnpm demo
//
// With no AGENT_PRIVATE_KEY it generates a throwaway wallet and tells you how to fund it.
import {
  createPublicClient,
  createWalletClient,
  http,
  erc20Abi,
  formatUnits,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://sepolia.base.org";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const TARGET = process.env.TARGET_URL ?? "http://localhost:3000/api/premium";

let pk = process.env.AGENT_PRIVATE_KEY;
const generated = !pk;
if (!pk) pk = generatePrivateKey();

const account = privateKeyToAccount(pk);
const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

console.log("AgentPay demo — agent →", TARGET);
console.log("agent wallet:", account.address, generated ? "(throwaway; set AGENT_PRIVATE_KEY to use yours)" : "");

const [usdc, eth] = await Promise.all([
  pub.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
  pub.getBalance({ address: account.address }),
]);
console.log(`balances: ${formatUnits(usdc, 6)} USDC, ${formatUnits(eth, 18)} ETH`);

console.log("\n[1] GET", TARGET);
const r1 = await fetch(TARGET);
if (r1.status !== 402) {
  console.log("    unexpected status", r1.status, "-", await r1.text());
  process.exit(1);
}
const req = (await r1.json()).accepts?.[0];
console.log("    → 402 Payment Required:", req.amountFormatted, "USDC to", req.payTo);

if (usdc < BigInt(req.maxAmountRequired) || eth === 0n) {
  console.log("\n⚠ agent wallet not funded enough to pay. Fund it on Base Sepolia:");
  console.log("    USDC:    https://faucet.circle.com  (select Base Sepolia)");
  console.log("    ETH gas: a Base Sepolia faucet");
  console.log("  Address:", account.address);
  console.log("  Then re-run with AGENT_PRIVATE_KEY set to this wallet.");
  process.exit(0);
}

console.log("\n[2] paying", req.amountFormatted, "USDC →", req.payTo);
const hash = await wallet.writeContract({
  address: req.asset,
  abi: erc20Abi,
  functionName: "transfer",
  args: [req.payTo, BigInt(req.maxAmountRequired)],
});
console.log("    tx:", hash);
console.log("    explorer: https://sepolia.basescan.org/tx/" + hash);
await pub.waitForTransactionReceipt({ hash });
console.log("    settled ✓");

console.log("\n[3] sign proof + retry");
const message = `agentpay-payment:v1:${req.payTo.toLowerCase()}:${req.maxAmountRequired}:${hash.toLowerCase()}`;
const signature = await account.signMessage({ message });
const xPayment = Buffer.from(
  JSON.stringify({ txHash: hash, signer: account.address, signature }),
).toString("base64");
const r2 = await fetch(TARGET, { headers: { "x-payment": xPayment } });
console.log("    →", r2.status, await r2.text());
console.log("\n✅ loop closed: 402 → pay → sign → 200");
