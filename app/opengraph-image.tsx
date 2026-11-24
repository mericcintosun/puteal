import { ImageResponse } from "next/og";

export const alt = "Puteal: send every household to a safe well";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// IDENTITY.md key block colors (D8 graphite). ImageResponse cannot read CSS variables.
const GROUND = "#151413";
const SURFACE = "#1d1c1a";
const LINE = "#38352f";
const INK = "#eceae6";
const ACCENT = "#e0632c";
const OK = "#69a56f";
const BAD = "#ef6a5a";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: GROUND, color: INK, padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, border: `8px solid ${ACCENT}`, background: SURFACE, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: OK }} />
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2 }}>Puteal</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.08, maxWidth: 980, letterSpacing: -1.5 }}>
            The safe well is usually next door. Puteal tells every household which one.
          </div>
          <div style={{ fontSize: 26, color: INK, opacity: 0.7, maxWidth: 980 }}>
            Walking routes to safe tubewells in arsenic-affected Bangladesh, with a cap on every pump and a what-if for the next deep well.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, borderTop: `2px solid ${LINE}`, paddingTop: 24, fontSize: 22 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: OK }} />
          <div style={{ display: "flex" }}>safe well</div>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: BAD, marginLeft: 24 }} />
          <div style={{ display: "flex" }}>over the limit</div>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: ACCENT, marginLeft: 24 }} />
          <div style={{ display: "flex" }}>next deep well</div>
          <div style={{ display: "flex", marginLeft: "auto", color: ACCENT }}>SDG 6.1</div>
        </div>
      </div>
    ),
    size
  );
}
