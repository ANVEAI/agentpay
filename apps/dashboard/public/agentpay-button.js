/**
 * AgentPay drop-in button — a zero-dependency web component.
 *
 *   <script src="https://your-host/agentpay-button.js"></script>
 *   <agentpay-button to="0xWallet" amount="5"></agentpay-button>
 *
 * Attributes:
 *   to         merchant wallet to receive USDC (or use api-key)
 *   amount     amount in USDC (e.g. "5" or "0.5")
 *   api-key    managed mode: resolve to/amount from the control plane
 *   base-url   control-plane URL for api-key mode (default: AgentPay cloud)
 *   mode       "payment" (default) or "subscription" (authorizes an allowance)
 *   label      custom button text
 *   token      ERC-20 token address (default: Base Sepolia USDC)
 *   decimals   token decimals (default 6)
 *   chain-id   EVM chain id (default 84532, Base Sepolia)
 *
 * Events (bubbling): "agentpay:success" { txHash, from }, "agentpay:error" { error }
 */
(function () {
  var USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  var CHAIN = 84532;
  var SEL_TRANSFER = "0xa9059cbb"; // transfer(address,uint256)
  var SEL_APPROVE = "0x095ea7b3"; // approve(address,uint256)
  var CLOUD = "https://api.agentpay.app";

  function pad(h) { return h.padStart(64, "0"); }
  function encAddr(a) { return pad(String(a).toLowerCase().replace(/^0x/, "")); }
  function encUint(b) { return pad(b.toString(16)); }
  function toBaseUnits(amount, decimals) {
    var parts = String(amount).split(".");
    var whole = parts[0] || "0";
    var frac = (parts[1] || "") + "0".repeat(decimals);
    return BigInt(whole + frac.slice(0, decimals));
  }

  class AgentPayButton extends HTMLElement {
    connectedCallback() { this.render(); }

    render() {
      var amount = this.getAttribute("amount") || "0";
      var mode = this.getAttribute("mode") || "payment";
      var label =
        this.getAttribute("label") ||
        (mode === "subscription" ? "Subscribe · " + amount + " USDC" : "Pay " + amount + " USDC");
      var btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText =
        "all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;" +
        "background:#6c7cff;color:#fff;font:600 14px/1 ui-sans-serif,system-ui,-apple-system,sans-serif;" +
        "padding:11px 16px;border-radius:10px;transition:filter .15s ease;";
      btn.onmouseenter = function () { btn.style.filter = "brightness(1.08)"; };
      btn.onmouseleave = function () { btn.style.filter = "none"; };
      var self = this;
      btn.onclick = function () { self.pay(btn); };
      this.innerHTML = "";
      this.appendChild(btn);
    }

    async resolve() {
      var apiKey = this.getAttribute("api-key");
      if (apiKey) {
        var baseUrl = this.getAttribute("base-url") || CLOUD;
        var res = await fetch(baseUrl + "/api/cp/config", {
          headers: { authorization: "Bearer " + apiKey },
        });
        if (!res.ok) throw new Error("AgentPay config fetch failed (" + res.status + ")");
        var d = await res.json();
        return { to: d.payTo, amount: d.amountFormatted || d.amount, token: USDC, decimals: 6, chainId: CHAIN };
      }
      return {
        to: this.getAttribute("to"),
        amount: this.getAttribute("amount") || "0",
        token: this.getAttribute("token") || USDC,
        decimals: parseInt(this.getAttribute("decimals") || "6", 10),
        chainId: parseInt(this.getAttribute("chain-id") || String(CHAIN), 10),
      };
    }

    async pay(btn) {
      var eth = window.ethereum;
      if (!eth) { this.fail(new Error("No wallet found. Install MetaMask.")); return; }
      var mode = this.getAttribute("mode") || "payment";
      var orig = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Confirm in wallet…";
      try {
        var cfg = await this.resolve();
        if (!cfg.to) throw new Error("agentpay-button needs a 'to' or 'api-key' attribute");
        var accounts = await eth.request({ method: "eth_requestAccounts" });
        var from = accounts[0];
        await this.ensureChain(eth, cfg.chainId);
        var value = toBaseUnits(cfg.amount, cfg.decimals);
        var sel = mode === "subscription" ? SEL_APPROVE : SEL_TRANSFER;
        var data = sel + encAddr(cfg.to) + encUint(value);
        var txHash = await eth.request({
          method: "eth_sendTransaction",
          params: [{ from: from, to: cfg.token, data: data }],
        });
        btn.textContent = "Confirming…";
        await this.waitReceipt(eth, txHash);
        btn.textContent = mode === "subscription" ? "✓ Subscribed" : "✓ Paid";
        this.dispatchEvent(
          new CustomEvent("agentpay:success", { bubbles: true, detail: { txHash: txHash, from: from } }),
        );
      } catch (e) {
        btn.disabled = false;
        btn.textContent = orig;
        this.fail(e);
      }
    }

    async ensureChain(eth, chainId) {
      var hex = "0x" + chainId.toString(16);
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
      } catch (e) {
        if (e && e.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: hex,
              chainName: "Base Sepolia",
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.base.org"],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            }],
          });
        } else {
          throw e;
        }
      }
    }

    async waitReceipt(eth, hash) {
      for (var i = 0; i < 60; i++) {
        var r = await eth.request({ method: "eth_getTransactionReceipt", params: [hash] });
        if (r) return r;
        await new Promise(function (res) { setTimeout(res, 2000); });
      }
      throw new Error("timed out waiting for confirmation");
    }

    fail(e) {
      this.dispatchEvent(
        new CustomEvent("agentpay:error", { bubbles: true, detail: { error: String((e && e.message) || e) } }),
      );
      console.error("[agentpay]", e);
    }
  }

  if (!customElements.get("agentpay-button")) {
    customElements.define("agentpay-button", AgentPayButton);
  }
})();
