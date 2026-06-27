import { useState, useEffect } from "react";
import { auth, onAuthStateChanged } from "./lib/firebase";
import { AppProvider, useApp } from "./context/AppContext";
import { C } from "./components/ui";

import Login        from "./screens/Login";
import Home         from "./screens/Home";
import { Inventory, Catalog, Parties } from "./screens/Placeholders";

// ── Env-var guard — shows setup screen instead of crashing ───────────────────
const ENV_MISSING = !import.meta.env.VITE_FIREBASE_API_KEY ||
                     import.meta.env.VITE_FIREBASE_API_KEY === "your_api_key";

function SetupNeeded() {
  return (
    <div style={{
      maxWidth: 430, margin: "0 auto", minHeight: "100vh",
      background: "#F5F4F0", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 28,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>⚙️</div>
      <h2 style={{ color: C.navy, fontWeight: 800, fontSize: 22, marginBottom: 8, textAlign: "center" }}>
        Firebase Setup Needed
      </h2>
      <p style={{ color: "#555", fontSize: 14, textAlign: "center", lineHeight: 1.7, marginBottom: 24 }}>
        Add your Firebase config as environment variables on Vercel:
      </p>
      <div style={{
        background: "#1e293b", color: "#94a3b8", borderRadius: 12,
        padding: "16px 20px", fontSize: 12, fontFamily: "monospace",
        width: "100%", lineHeight: 2,
      }}>
        {[
          "VITE_FIREBASE_API_KEY",
          "VITE_FIREBASE_AUTH_DOMAIN",
          "VITE_FIREBASE_PROJECT_ID",
          "VITE_FIREBASE_STORAGE_BUCKET",
          "VITE_FIREBASE_MESSAGING_SENDER_ID",
          "VITE_FIREBASE_APP_ID",
        ].map(k => (
          <div key={k}><span style={{ color: "#7dd3fc" }}>{k}</span>=...</div>
        ))}
      </div>
      <p style={{ color: "#888", fontSize: 12, marginTop: 20, textAlign: "center", lineHeight: 1.7 }}>
        Vercel → Project → Settings → Environment Variables<br />
        Then redeploy. Firebase Console → Project Settings → Web App.
      </p>
    </div>
  );
}

function Router() {
  const { session } = useApp();
  const [screen, setScreen] = useState("login");
  const [hist,   setHist]   = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user && screen !== "login") {
        setScreen("login");
        setHist([]);
      }
    });
    return () => unsub();
  }, [screen]);

  // iOS swipe-back / Android hardware back interception
  useEffect(() => {
    window.history.pushState({ page: "app" }, "");
    const handlePopState = () => {
      window.history.pushState({ page: "app" }, "");
      setHist(h => {
        if (h.length === 0) return h;
        const prev = h[h.length - 1];
        setScreen(prev);
        return h.slice(0, -1);
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const nav = (to) => {
    setHist(h => [...h, screen]);
    setScreen(to);
    window.history.pushState({ page: to }, "");
  };

  if (screen === "login") {
    return (
      <Login onLoggedIn={() => {
        setHist([]);
        setScreen("home");
        window.history.pushState({ page: "home" }, "");
      }} />
    );
  }

  const screens = {
    home:      <Home      nav={nav} />,
    inventory: <Inventory nav={nav} />,
    catalog:   <Catalog   nav={nav} />,
    parties:   <Parties   nav={nav} />,
  };

  return screens[screen] || <Home nav={nav} />;
}

export default function App() {
  if (ENV_MISSING) return <SetupNeeded />;

  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
