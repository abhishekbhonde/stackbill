import { ImageResponse } from "next/og";
import { CATEGORY_COLORS } from "@/components/colors";
import { MILESTONES, breakdown, compact, decodeState, money, total } from "@/lib/pricing";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { stack, users, assumptions } = decodeState(params);
  const rows = breakdown(stack, users, assumptions).sort((x, y) => y.cost - x.cost);
  const sum = rows.reduce((s, r) => s + r.cost, 0);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa" }}>
          {`My stack at ${users.toLocaleString("en-US")} users costs`}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 120, fontWeight: 700, marginTop: 8 }}>
          {money(sum)}
          <span style={{ fontSize: 44, color: "#a1a1aa", marginLeft: 8 }}>/mo</span>
        </div>

        <div style={{ display: "flex", height: 20, borderRadius: 10, overflow: "hidden", marginTop: 24 }}>
          {rows.map(({ service, cost }) => (
            <div
              key={service.id}
              style={{ width: `${sum ? (cost / sum) * 100 : 0}%`, background: CATEGORY_COLORS[service.category] }}
            />
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 28, marginTop: 24, fontSize: 26 }}>
          {rows.slice(0, 6).map(({ service, cost }) => (
            <div key={service.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 14, height: 14, borderRadius: 7, background: CATEGORY_COLORS[service.category] }} />
              {`${service.name} ${money(cost)}`}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
          {MILESTONES.map((m) => (
            <div
              key={m}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "14px 24px",
                border: "2px solid #27272a",
                borderRadius: 14,
              }}
            >
              <span style={{ fontSize: 22, color: "#a1a1aa" }}>{compact(m)} users</span>
              <span style={{ fontSize: 34, fontWeight: 700 }}>{money(total(stack, m, assumptions))}</span>
            </div>
          ))}
          <div style={{ display: "flex", marginLeft: "auto", alignItems: "flex-end", fontSize: 28, color: "#a1a1aa" }}>
            stackbill — what does yours cost?
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
