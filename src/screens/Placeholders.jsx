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

export function Catalog({ nav }) {
  return (
    <Shell>
      <TopBar title="📸 Catalog" bg={C.navy} onBack={() => nav("home")} />
      <div style={{ paddingBottom: 100 }}>
        <EmptyState
          icon="📸"
          title="Koi Catalog Item Nahi"
          subtitle="Bale ki photos/videos yahan upload karein parties ko dikhane ke liye"
        />
      </div>
      <FAB onClick={() => {}} color={C.amber} />
      <BottomNav active="catalog" nav={nav} />
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
