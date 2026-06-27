import { Shell, TopBar, BottomNav, EmptyState, C } from "../components/ui";

export function Inventory({ nav }) {
  return (
    <Shell>
      <TopBar title="📦 Inventory" bg={C.navy} onBack={() => nav("home")} />
      <EmptyState
        icon="📦"
        title="Koi Bale Nahi Mila"
        subtitle="Pehla bale add karein — category, weight, grade, price ke saath"
      />
      <div style={{ position: "fixed", bottom: 80, right: 20 }}>
        <button style={{
          background: C.navy, color: "#fff", border: "none",
          borderRadius: "50%", width: 56, height: 56, fontSize: 28,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)", cursor: "pointer",
        }}>+</button>
      </div>
      <BottomNav active="inventory" nav={nav} />
    </Shell>
  );
}

export function Catalog({ nav }) {
  return (
    <Shell>
      <TopBar title="📸 Catalog" bg={C.navy} onBack={() => nav("home")} />
      <EmptyState
        icon="📸"
        title="Koi Catalog Item Nahi"
        subtitle="Bale ki photos/videos yahan upload karein parties ko dikhane ke liye"
      />
      <BottomNav active="catalog" nav={nav} />
    </Shell>
  );
}

export function Parties({ nav }) {
  return (
    <Shell>
      <TopBar title="🤝 Parties" bg={C.navy} onBack={() => nav("home")} />
      <EmptyState
        icon="🤝"
        title="Koi Party Nahi Mili"
        subtitle="Apne buyers aur contacts yahan add karein"
      />
      <div style={{ position: "fixed", bottom: 80, right: 20 }}>
        <button style={{
          background: C.amber, color: "#fff", border: "none",
          borderRadius: "50%", width: 56, height: 56, fontSize: 28,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)", cursor: "pointer",
        }}>+</button>
      </div>
      <BottomNav active="parties" nav={nav} />
    </Shell>
  );
}
