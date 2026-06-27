/**
 * context/AppContext.jsx
 * Global state for Bale Bazaar — auth, inventory, parties, catalog
 */
import { createContext, useContext, useState, useCallback } from "react";
import { auth, db, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "../lib/firebase";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [session,   setSession]   = useState(undefined); // undefined=loading, null=logged out
  const [inventory, setInventory] = useState([]);
  const [parties,   setParties]   = useState([]);
  const [catalog,   setCatalog]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const initAuth = useCallback((onResolved) => {
    return onAuthStateChanged(auth, (user) => {
      setSession(user);
      if (onResolved) onResolved(user);
    });
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const result   = await signInWithPopup(auth, provider);
    setSession(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setSession(null);
    setInventory([]);
    setParties([]);
    setCatalog([]);
  }, []);

  // ── Load all data ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [inv, par, cat] = await Promise.all([
        db.getAll("inventory"),
        db.getAll("parties"),
        db.getAll("catalog"),
      ]);
      setInventory(inv);
      setParties(par);
      setCatalog(cat);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Inventory CRUD ────────────────────────────────────────────────────────
  const saveBale = useCallback(async (baleData, id = null) => {
    const newId = await db.upsert("inventory", id, baleData);
    const saved = { id: newId, ...baleData };
    setInventory(prev => id ? prev.map(b => b.id === id ? saved : b) : [saved, ...prev]);
    return newId;
  }, []);

  const deleteBale = useCallback(async (id) => {
    await db.delete("inventory", id);
    setInventory(prev => prev.filter(b => b.id !== id));
  }, []);

  // ── Parties CRUD ──────────────────────────────────────────────────────────
  const saveParty = useCallback(async (partyData, id = null) => {
    const newId = await db.upsert("parties", id, partyData);
    const saved = { id: newId, ...partyData };
    setParties(prev => id ? prev.map(p => p.id === id ? saved : p) : [saved, ...prev]);
    return newId;
  }, []);

  const deleteParty = useCallback(async (id) => {
    await db.delete("parties", id);
    setParties(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Catalog CRUD ──────────────────────────────────────────────────────────
  const saveCatalogItem = useCallback(async (itemData, id = null) => {
    const newId = await db.upsert("catalog", id, itemData);
    const saved = { id: newId, ...itemData };
    setCatalog(prev => id ? prev.map(c => c.id === id ? saved : c) : [saved, ...prev]);
    return newId;
  }, []);

  const deleteCatalogItem = useCallback(async (id) => {
    await db.delete("catalog", id);
    setCatalog(prev => prev.filter(c => c.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      session, inventory, parties, catalog, loading, error,
      initAuth, loginWithGoogle, logout, loadAll,
      saveBale, deleteBale,
      saveParty, deleteParty,
      saveCatalogItem, deleteCatalogItem,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
