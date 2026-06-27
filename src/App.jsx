import { useState, useEffect } from "react";
import { auth, onAuthStateChanged } from "./lib/firebase";
import { AppProvider, useApp } from "./context/AppContext";

import Login     from "./screens/Login";
import Home      from "./screens/Home";
import { Inventory, Catalog, Parties } from "./screens/Placeholders";

function Router() {
  const { session } = useApp();
  const [screen, setScreen] = useState("login");
  const [hist,   setHist]   = useState([]);

  // Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user && screen !== "login") {
        setScreen("login");
        setHist([]);
      }
    });
    return () => unsub();
  }, [screen]);

  // Intercept iOS swipe-back & Android hardware back
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

  const back = () => {
    setHist(h => {
      const prev = h[h.length - 1] || "home";
      setScreen(prev);
      return h.slice(0, -1);
    });
    window.history.pushState({ page: "app" }, "");
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
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
