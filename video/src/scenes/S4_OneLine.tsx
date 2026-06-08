import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { display } from "../fonts";
import { rise } from "../anim";

const Line: React.FC<{ frame: number; delay: number; children: React.ReactNode }> = ({ frame, delay, children }) => (
  <div style={{ ...rise(frame, delay, 16) }}>{children}</div>
);

export const S4_OneLine: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 34 }}>
      <div
        style={{
          ...rise(frame, 0),
          fontFamily: display,
          fontSize: 24,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: theme.accent,
        }}
      >
        one line of code
      </div>

      <div
        style={{
          fontFamily: theme.mono,
          fontSize: 36,
          lineHeight: 1.7,
          textAlign: "left",
          background: "#0c0e15",
          border: `1px solid ${theme.border}`,
          borderRadius: 20,
          padding: "44px 52px",
          color: "#c9d1e3",
          boxShadow: "0 50px 140px -30px rgba(108,124,255,.5)",
          maxWidth: 1400,
        }}
      >
        <Line frame={frame} delay={6}>
          <span style={{ color: "#5b6478" }}>// gate any route behind an agent payment</span>
        </Line>
        <Line frame={frame} delay={14}>
          <span style={{ color: "#c4a6ff" }}>import</span> {"{ paymentGateway }"}{" "}
          <span style={{ color: "#c4a6ff" }}>from</span>{" "}
          <span style={{ color: theme.accent2 }}>&quot;@agentpay/merchant-sdk/express&quot;</span>;
        </Line>
        <div style={{ height: 14 }} />
        <Line frame={frame} delay={28}>
          app.<span style={{ color: "#c4a6ff" }}>use</span>(
          <span style={{ color: theme.accent2 }}>&quot;/api/premium&quot;</span>,{" "}
          <span style={{ color: "#fff", fontWeight: 600 }}>paymentGateway({"{ payTo, amount }"})</span>);
        </Line>
      </div>

      <div style={{ ...rise(frame, 44), fontSize: 38, color: theme.muted, fontFamily: display }}>
        That&apos;s the whole integration.
      </div>
    </AbsoluteFill>
  );
};
