// Add AgentPay to an Express site. The integration is the one app.use() line.
//   npm i express @agentpay/merchant-sdk
//   AGENTPAY_PAYTO=0xYourWallet node examples/merchant-express.mjs
import express from "express";
import { paymentGateway } from "@agentpay/merchant-sdk/express";

const app = express();

// Gate any route behind an agent payment. That is the whole integration.
app.use(
  "/api/premium",
  paymentGateway({
    payTo: process.env.AGENTPAY_PAYTO, // your wallet receives the USDC
    amount: 0.5, // 0.5 USDC per call
  }),
);

app.get("/api/premium/report", (req, res) => {
  // req.agentpay holds the verified payment (payer, amount, tx hash)
  res.json({ report: "the good stuff", paidBy: req.agentpay.from });
});

app.listen(8080, () => console.log("merchant running on http://localhost:8080"));
