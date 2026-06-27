// Shared design system — tokens + primitive components
// Bale Bazaar brand: navy + amber, warm industrial feel

export const C = {
  navy:       "#1B3A5C",
  navyLight:  "#EBF0F7",
  navyDark:   "#122840",
  amber:      "#D4870A",
  amberLight: "#FDF3E3",
  amberDark:  "#A8660A",
  green:      "#1A6B3A",
  greenLight: "#E8F5EE",
  red:        "#C8230A",
  redLight:   "#FDF0EE",
  ink:        "#141414",
  inkMid:     "#3D3D3D",
  inkLight:   "#7A7A7A",
  bg:         "#F5F4F0",
  white:      "#FFFFFF",
  border:     "#E2DDD8",
};

export const G = `
  @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Noto+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
  body{font-family:'Noto Sans',sans-serif;background:${C.bg};color:${C.ink}}
  input,select,textarea,button{font-family:'Noto Sans',sans-serif}
  button{cursor:pointer}
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
  @keyframes spin{to{transform:rotate(360deg)}}
`;

export function Shell({ children, style }) {
  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: C.bg, position: "relative", overflow: "hidden", ...style }}>
      <style>{G}</style>
      {children}
    </div>
  );
}

export function TopBar({ title, onBack, right, bg = C.white }) {
  const isLight = bg === C.white || bg === C.bg;
  return (
    <div style={{ background: bg, borderBottom: isLight ? `1px solid ${C.border}` : "none", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
      {onBack && (
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, color: isLight ? C.inkMid : C.white, padding: "8px 8px 8px 0" }}>←</button>
      )}
      <span style={{ fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 18, color: isLight ? C.ink : C.white, flex: 1 }}>{title}</span>
      {right}
    </div>
  );
}

export function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.white, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", style, disabled, type = "button" }) {
  const variants = {
    primary:   { background: C.navy,  color: C.white, border: "none" },
    amber:     { background: C.amber, color: C.white, border: "none" },
    secondary: { background: C.white, color: C.navy,  border: `1.5px solid ${C.navy}` },
    green:     { background: C.green, color: C.white, border: "none" },
    red:       { background: C.red,   color: C.white, border: "none" },
    ghost:     { background: "transparent", color: C.inkMid, border: "none" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...variants[variant], borderRadius: 12, padding: "13px 20px", fontSize: 15, fontWeight: 600, width: "100%", opacity: disabled ? 0.45 : 1, fontFamily: "'Baloo 2'", ...style }}>
      {children}
    </button>
  );
}

export function Field({ label, value, onChange, type = "text", placeholder, prefix, suffix, hint, required, readOnly, rows }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 5 }}>
          {label}{required && <span style={{ color: C.red }}> *</span>}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.inkLight, fontSize: 14, fontWeight: 600, pointerEvents: "none" }}>{prefix}</span>}
        {rows ? (
          <textarea value={value} onChange={e => onChange && onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly} rows={rows}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: readOnly ? C.bg : C.white, fontSize: 14, color: C.ink, resize: "none" }} />
        ) : (
          <input type={type} value={value} onChange={e => onChange && onChange(e.target.value)} placeholder={placeholder} readOnly={readOnly}
            style={{ width: "100%", padding: `12px ${suffix ? "52px" : "16px"} 12px ${prefix ? "36px" : "16px"}`, borderRadius: 10, border: `1.5px solid ${C.border}`, background: readOnly ? C.bg : C.white, fontSize: 14, color: C.ink }} />
        )}
        {suffix && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: C.inkLight, fontSize: 12 }}>{suffix}</span>}
      </div>
      {hint && <p style={{ fontSize: 11, color: C.inkLight, marginTop: 3 }}>{hint}</p>}
    </div>
  );
}

export function Tag({ children, color = C.navy, bg = C.navyLight }) {
  return <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: bg }}>{children}</span>;
}

export function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && <span style={{ fontSize: 11, color: C.inkLight, fontWeight: 600 }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

export function BottomNav({ active, nav }) {
  const items = [
    ["home",      "🏠", "Home"],
    ["inventory", "📦", "Inventory"],
    ["catalog",   "📸", "Catalog"],
    ["parties",   "🤝", "Parties"],
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: C.white, borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100, paddingBottom: 6 }}>
      {items.map(([id, icon, label]) => (
        <button key={id} onClick={() => nav(id)}
          style={{ flex: 1, background: "none", border: "none", padding: "10px 0 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 21 }}>{icon}</span>
          <span style={{ fontSize: 10, fontWeight: active === id ? 700 : 400, color: active === id ? C.amber : C.inkLight }}>{label}</span>
          {active === id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.amber }} />}
        </button>
      ))}
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 120 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${C.border}`, borderTopColor: C.navy, animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: C.inkLight }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontWeight: 700, fontSize: 16, color: C.inkMid, marginBottom: 6 }}>{title}</p>
      {subtitle && <p style={{ fontSize: 13 }}>{subtitle}</p>}
    </div>
  );
}
