import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Shell, C, Btn, Spinner } from "../components/ui";

export default function Login({ onLoggedIn }) {
  const { loginWithGoogle, initAuth } = useApp();
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState("");

  // Check if already logged in on mount
  useEffect(() => {
    const unsub = initAuth((user) => {
      if (user) onLoggedIn();
    });
    return () => unsub && unsub();
  }, [initAuth, onLoggedIn]);

  const handleGoogle = async () => {
    setBusy(true); setError("");
    try {
      await loginWithGoogle();
      onLoggedIn();
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") {
        setError("Google login mein dikkat aayi. Dobara try karein.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      {/* Hero Header */}
      <div style={{
        background: `linear-gradient(160deg, ${C.navyDark} 0%, ${C.navy} 100%)`,
        padding: "60px 28px 48px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🧺</div>
        <h1 style={{
          fontFamily: "'Baloo 2'",
          fontWeight: 800,
          fontSize: 36,
          color: C.white,
          lineHeight: 1.1,
          margin: 0,
        }}>
          Bale Bazaar
        </h1>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginTop: 10, fontStyle: "italic" }}>
          Panipat Used Clothing — Stock & Catalog Hub
        </p>
      </div>

      {/* Feature pills */}
      <div style={{
        display: "flex",
        gap: 8,
        padding: "20px 20px 0",
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {["📦 Bale Inventory", "📸 Photo Catalog", "🤝 Party Management", "📣 Broadcast Stock"].map(f => (
          <span key={f} style={{
            background: C.amberLight,
            color: C.amberDark,
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: 20,
            border: `1px solid ${C.amber}33`,
          }}>{f}</span>
        ))}
      </div>

      {/* Login Card */}
      <div style={{ padding: "28px 24px 40px" }}>
        {error && (
          <div style={{
            background: C.redLight,
            border: `1px solid ${C.red}`,
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: C.red,
            fontWeight: 600,
          }}>
            ⚠️ {error}
          </div>
        )}

        {busy ? (
          <Spinner />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 14, color: C.inkMid, textAlign: "center", lineHeight: 1.7, marginBottom: 4 }}>
              Apne Google account se login karein
            </p>

            <button onClick={handleGoogle} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background: C.white,
              border: `1.5px solid ${C.border}`,
              borderRadius: 14,
              padding: "15px 20px",
              fontSize: 15,
              fontWeight: 600,
              color: C.ink,
              cursor: "pointer",
              width: "100%",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
            }}>
              <GoogleIcon />
              Google se Login Karein
            </button>

            <p style={{ fontSize: 11, color: C.inkLight, textAlign: "center", marginTop: 4, lineHeight: 1.6 }}>
              Aapka data sirf aapke account mein save hoga
            </p>
          </div>
        )}
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: C.inkLight, padding: "0 24px 32px" }}>
        Panipat Used Clothing Trade ke liye banaya gaya 🏭
      </p>
    </Shell>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.84l6.09-6.09C34.46 3.19 29.55 1 24 1 14.82 1 7.07 6.48 3.64 14.18l7.08 5.5C12.43 13.84 17.76 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.09-.4-4.57H24v8.64h12.68c-.55 2.94-2.2 5.43-4.68 7.1l7.17 5.57C43.21 37.18 46.5 31.28 46.5 24.5z"/>
      <path fill="#FBBC05" d="M10.72 28.68A14.5 14.5 0 0 1 9.5 24c0-1.63.28-3.21.72-4.68l-7.08-5.5A23.94 23.94 0 0 0 0 24c0 3.88.93 7.55 2.55 10.79l8.17-6.11z"/>
      <path fill="#34A853" d="M24 47c5.55 0 10.2-1.84 13.6-4.99l-7.17-5.57c-1.84 1.23-4.2 1.96-6.43 1.96-6.24 0-11.57-4.34-13.28-10.17l-8.17 6.11C7.07 41.52 14.82 47 24 47z"/>
    </svg>
  );
}
