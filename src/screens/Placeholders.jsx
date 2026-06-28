import { Shell, TopBar, BottomNav, EmptyState, FAB, C } from "../components/ui";

export function Inventory({ nav }) {
  return (
    <Shell>
      <TopBar title="📦 Stock / Inventory" bg={C.navy} onBack={() => nav("home")} />
      <div style={{ paddingBottom: 100 }}>
        <EmptyState
          icon="📦"
          title="Koi Bale Nahi Mila"
          subtitle="Pehla bale add karein — category, weight, grade, price ke saath"
        />
      </div>
      <FAB onClick={() => {}} color={C.navy} />
      <BottomNav active="inventory" nav={nav} />
    </Shell>
  );
}

export function Parties({ nav }) {
  return (
    <Shell>
      <TopBar title="🤝 Parties" bg={C.navy} onBack={() => nav("home")} />
      <div style={{ paddingBottom: 100 }}>
        <EmptyState
          icon="🤝"
          title="Koi Party Nahi Mili"
          subtitle="Apne buyers aur contacts yahan add karein"
        />
      </div>
      <FAB onClick={() => {}} color={C.green} />
      <BottomNav active="parties" nav={nav} />
    </Shell>
  );
}

export function Settings({ nav, onLogout }) {
  return (
    <Shell>
      <TopBar title="⚙️ Settings" bg={C.navy} onBack={() => nav("home")} />
      <div style={{ padding: "20px 16px 100px" }}>
        <EmptyState
          icon="⚙️"
          title="Settings"
          subtitle="Profile, notifications aur app preferences yahan aayenge"
        />
        <div style={{ padding: "0 16px" }}>
          <button
            onClick={onLogout}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: "#FDF0EE", border: "1.5px solid #C8230A",
              color: "#C8230A", fontSize: 15, fontWeight: 700,
              cursor: "pointer",
            }}>
            🚪 Logout
          </button>
        </div>
      </div>
      <BottomNav active="settings" nav={nav} />
    </Shell>
  );
}
