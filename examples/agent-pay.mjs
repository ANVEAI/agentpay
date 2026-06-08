// The agent side: fetch a paid endpoint and pay automatically on HTTP 402.
//   AGENT_PRIVATE_KEY=0x... node examples/agent-pay.mjs
// The agent wallet needs Base Sepolia USDC (faucet.circle.com) and a little ETH for gas.
import { payAndFetch } from "@agentpay/merchant-sdk/client";

const res = await payAndFetch("http://localhost:8080/api/premium/report", {
  privateKey: process.env.AGENT_PRIVATE_KEY,
});

console.log("status:", res.status);
console.log("body:", await res.json());
