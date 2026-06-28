import { useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Shell, C, Card, BottomNav, Spinner, EmptyState } from "../components/ui";

export default function Home({ nav }) {
  const { session, inventory, parties, loading, loadAll, logout } = useApp();

  useEffect(() => { loadAll(); }, [loadAll]);

  const totalBales   = inventory.reduce((s, b) => s + (Number(b.num_bales) || 0), 0);
  const inStockKg    = inventory.filter(b => b.status !== "sold").reduce((s, b) => s + (Number(b.weight_kg) || 0) * (Number(b.num_bales) || 1), 0);
  const totalParties = parties.length;
  const soldBales    = inventory.filter(b => b.status === "sold").reduce((s, b) => s + (Number(b.num_bales) || 0), 0);

  const stats = [
    { label: "Total Bales",   value: totalBales,           icon: "📦", color: C.navy  },
    { label: "In Stock (kg)", value: inStockKg.toFixed(0), icon: "⚖️", color: C.green },
    { label: "Parties",       value: totalParties,         icon: "🤝", color: C.amber },
    { label: "Sold Bales",    value: soldBales,                 icon: "✅", color: "#7C3AED" },
  ];

  const modules = [
    { id: "inventory", icon: "📦", label: "Stock / Inventory", desc: "Bale aur lot manage karein",          ready: true  },
    { id: "parties",   icon: "🤝", label: "Parties",           desc: "Buyers aur contacts manage karein",   ready: true  },
    { id: "broadcast", icon: "📣", label: "Broadcast",         desc: "Parties ko catalog bhejein",          ready: false },
    { id: "reports",   icon: "📊", label: "Reports",           desc: "Stock in/out history",                ready: false },
    { id: "ledger",    icon: "💰", label: "Ledger",            desc: "Payments aur outstanding",            ready: false },
  ];

  return (
    <Shell>
      {/* Header */}
      <div style={{
        background: `linear-gradient(160deg, ${C.navyDark} 0%, ${C.navy} 100%)`,
        padding: "0 16px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🧺</span>
            <span style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 20, color: C.white }}>
              Bale Bazaar
            </span>
          </div>
          {session?.photoURL && (
            <img
              src={session.photoURL}
              alt="avatar"
              onClick={() => nav("settings")}
              style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", cursor: "pointer" }}
            />
          )}
        </div>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginBottom: 2 }}>Jai Shri Ram 🙏</p>
        <h2 style={{ color: C.white, fontSize: 20, fontFamily: "'Baloo 2'", fontWeight: 700, margin: 0 }}>
          {session?.displayName?.split(" ")[0] || "Sethji"} ka Dashboard
        </h2>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        {/* Stats */}
        {loading ? <Spinner /> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {stats.map(s => (
              <Card key={s.label} style={{ padding: "14px" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: s.color + "18", color: s.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, marginBottom: 10,
                }}>{s.icon}</div>
                <div style={{ fontFamily: "'Baloo 2'", fontSize: 26, fontWeight: 800, color: C.ink, lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, color: C.inkLight, fontWeight: 500, marginTop: 4 }}>{s.label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Modules */}
        <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
          Modules
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {modules.map(m => (
            <Card key={m.id}
              onClick={m.ready ? () => nav(m.id) : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                opacity: m.ready ? 1 : 0.55,
                cursor: m.ready ? "pointer" : "default",
              }}>
              <span style={{ fontSize: 26, width: 36, textAlign: "center", flexShrink: 0 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 15, color: C.ink }}>{m.label}</span>
                  {!m.ready && (
                    <span style={{ fontSize: 10, background: C.amberLight, color: C.amberDark, padding: "2px 7px", borderRadius: 20, fontWeight: 600 }}>
                      Jaldi Aayega
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>{m.desc}</div>
              </div>
              {m.ready && <span style={{ color: C.border, fontSize: 22, fontWeight: 300 }}>›</span>}
            </Card>
          ))}
        </div>
      </div>

      <BottomNav active="home" nav={nav} />
    </Shell>
  );
}
