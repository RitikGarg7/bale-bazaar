import PartyLedger from "./PartyLedger";
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Shell, TopBar, BottomNav, Card, FAB, Spinner, EmptyState, C, Tag } from "../components/ui";

const PARTY_TYPES  = ["Buyer", "Agent", "Both"];
const COUNTRIES    = ["Korea", "China", "USA", "UK", "Canada", "Australia", "Other"];
const CATEGORIES   = ["Mix", "Shirts", "T-Shirts", "Jeans", "Trousers", "Jackets", "Kids", "Ladies", "Sweaters", "Shoes"];

const CONTACT_PICKER_SUPPORTED = typeof window !== "undefined" && "contacts" in navigator && "ContactsManager" in window;

function typeColor(t) {
  if (t === "Buyer")  return { c: C.navy,  bg: C.navyLight  };
  if (t === "Agent")  return { c: C.amber, bg: C.amberLight };
  return                     { c: C.green, bg: C.greenLight };
}

// ── Party Card ────────────────────────────────────────────────────────────────
function PartyCard({ party, onTap, onEdit }) {
  const tc = typeColor(party.type);
  return (
    <Card onClick={onTap} style={{ marginBottom: 8, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
          background: tc.bg, color: tc.c,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, fontFamily: "'Baloo 2'",
        }}>
          {party.name?.charAt(0)?.toUpperCase() || "?"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 16, color: C.ink }}>
              {party.name}
            </span>
            <Tag color={tc.c} bg={tc.bg}>{party.type}</Tag>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
            {party.phone && (
              <span style={{ fontSize: 13, color: C.inkMid }}>📞 {party.phone}</span>
            )}
            {party.city && (
              <span style={{ fontSize: 13, color: C.inkMid }}>📍 {party.city}</span>
            )}
          </div>

          {/* Preferences */}
          {(party.pref_countries?.length > 0 || party.pref_categories?.length > 0) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {party.pref_countries?.map(c => (
                <span key={c} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: C.navyLight, color: C.navy }}>{c}</span>
              ))}
              {party.pref_categories?.map(c => (
                <span key={c} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: C.amberLight, color: C.amberDark }}>{c}</span>
              ))}
            </div>
          )}

          {/* Outstanding */}
          {party.outstanding != null && party.outstanding !== 0 && (
            <div style={{
              marginTop: 6, fontSize: 13, fontWeight: 700,
              color: party.outstanding > 0 ? C.red : C.green,
            }}>
              {party.outstanding > 0
                ? `⚠️ Baaki: ₹${Math.abs(party.outstanding).toLocaleString("en-IN")}`
                : `✅ Advance: ₹${Math.abs(party.outstanding).toLocaleString("en-IN")}`}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
          <span style={{ color: C.border, fontSize: 20 }}>›</span>
          <button onClick={e => { e.stopPropagation(); onEdit(); }} style={{
            background: C.bg, border: "1px solid " + C.border,
            borderRadius: 6, padding: "3px 8px",
            fontSize: 11, color: C.inkMid, cursor: "pointer", fontWeight: 600,
          }}>✏️ Edit</button>
        </div>
      </div>
    </Card>
  );
}

// ── Party List ────────────────────────────────────────────────────────────────
export default function Parties({ nav }) {
  const { parties, loadAll, loading } = useApp();
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("All");
  const [showForm,   setShowForm]   = useState(false);
  const [ledgerItem, setLedgerItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [prefill,  setPrefill]  = useState(null);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = parties.filter(p => {
    const matchFilter = filter === "All" || p.type === filter;
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search) ||
      p.city?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Sort by outstanding desc (most baaki first)
  const sorted = [...filtered].sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));

  const handleContactPick = async () => {
    try {
      const contacts = await navigator.contacts.select(["name", "tel"], { multiple: false });
      if (contacts && contacts.length > 0) {
        const c = contacts[0];
        setPrefill({
          name:  c.name?.[0] || "",
          phone: c.tel?.[0]  || "",
        });
        setShowForm(true);
      }
    } catch (e) {
      if (e.name !== "AbortError") alert("Contacts access nahi mila: " + e.message);
    }
  };

  if (ledgerItem) {
    return (
      <PartyLedger
        party={ledgerItem}
        onBack={() => { setLedgerItem(null); loadAll(); }}
      />
    );
  }

  if (showForm || editItem) {
    return (
      <PartyForm
        item={editItem}
        prefill={prefill}
        onDone={() => { setShowForm(false); setEditItem(null); setPrefill(null); loadAll(); }}
        onBack={() => { setShowForm(false); setEditItem(null); setPrefill(null); }}
        nav={nav}
      />
    );
  }

  return (
    <Shell>
      <TopBar title="🤝 Parties" bg={C.navy} />

      {/* Search */}
      <div style={{ padding: "10px 16px", background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Naam, phone ya city se dhundho..."
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: `1.5px solid ${C.border}`, fontSize: 14,
            background: C.bg, color: C.ink,
          }}
        />
      </div>

      {/* Type filter */}
      <div style={{
        display: "flex", gap: 8, padding: "10px 16px",
        background: C.white, borderBottom: `1px solid ${C.border}`,
      }}>
        {["All", ...PARTY_TYPES].map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{
            padding: "6px 14px", borderRadius: 20, border: "none",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: filter === t ? C.navy : C.bg,
            color:      filter === t ? C.white : C.inkMid,
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: "14px 16px 110px" }}>
        {loading ? <Spinner /> : sorted.length === 0 ? (
          <EmptyState
            icon="🤝"
            title={search ? "Koi party nahi mili" : "Koi party nahi hai"}
            subtitle={search ? "Search change karein" : 'Neeche "+" dabao aur pehli party add karo'}
          />
        ) : (
          sorted.map(p => (
            <PartyCard key={p.id} party={p} onTap={() => setLedgerItem(p)} onEdit={() => setEditItem(p)} />
          ))
        )}
      </div>

      {/* FAB — two buttons if contact picker supported */}
      {CONTACT_PICKER_SUPPORTED ? (
        <>
          <button onClick={handleContactPick} style={{
            position: "fixed",
            bottom: `calc(70px + max(6px, env(safe-area-inset-bottom)))`,
            right: 84,
            background: C.amber, color: "#fff", border: "none",
            borderRadius: "50%", width: 56, height: 56, fontSize: 22,
            boxShadow: "0 4px 20px rgba(0,0,0,0.2)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }} title="Phone contacts se add karein">📱</button>
          <FAB onClick={() => { setPrefill(null); setShowForm(true); }} color={C.navy} />
        </>
      ) : (
        <FAB onClick={() => { setPrefill(null); setShowForm(true); }} color={C.navy} />
      )}

      <BottomNav active="parties" nav={nav} />
    </Shell>
  );
}

// ── Party Form ────────────────────────────────────────────────────────────────
function PartyForm({ item, prefill, onDone, onBack }) {
  const { saveParty, deleteParty } = useApp();
  const isEdit = !!item;

  const [name,            setName]           = useState(item?.name            || prefill?.name    || "");
  const [phone,           setPhone]          = useState(item?.phone           || prefill?.phone   || "");
  const [city,            setCity]           = useState(item?.city            || "");
  const [type,            setType]           = useState(item?.type            || "Buyer");
  const [prefCountries,   setPrefCountries]  = useState(item?.pref_countries  || []);
  const [prefCategories,  setPrefCategories] = useState(item?.pref_categories || []);
  const [outstanding,     setOutstanding]    = useState(item?.outstanding     ?? "");
  const [outType,         setOutType]        = useState((item?.outstanding ?? 0) >= 0 ? "baaki" : "advance");
  const [notes,           setNotes]          = useState(item?.notes           || "");
  const [busy,            setBusy]           = useState(false);

  const toggleArr = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Party ka naam likhein");

    const outAmt = outstanding === "" ? 0 : Number(outstanding);
    const finalOutstanding = outType === "advance" ? -Math.abs(outAmt) : Math.abs(outAmt);

    setBusy(true);
    try {
      await saveParty({
        name:            name.trim(),
        phone:           phone.trim(),
        city:            city.trim(),
        type,
        pref_countries:  prefCountries,
        pref_categories: prefCategories,
        outstanding:     finalOutstanding,
        notes:           notes.trim(),
      }, item?.id || null);
      onDone();
    } catch (e) {
      alert("Save nahi hua: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Yeh party delete karein?")) return;
    setBusy(true);
    try {
      await deleteParty(item.id);
      onDone();
    } catch (e) {
      alert("Delete nahi hua: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <TopBar
        title={isEdit ? "Party Edit Karein" : "Nayi Party Add Karein"}
        bg={C.navy}
        onBack={onBack}
        right={isEdit && (
          <button onClick={handleDelete} style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: 22, cursor: "pointer", padding: "8px" }}>🗑</button>
        )}
      />

      <div style={{ padding: "16px 16px 120px", overflowY: "auto" }}>

        {/* Name */}
        <Label>Naam *</Label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Ramesh Traders"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 15, marginBottom: 16 }} />

        {/* Phone */}
        <Label>Phone / WhatsApp</Label>
        <input value={phone} onChange={e => setPhone(e.target.value)}
          type="tel" placeholder="e.g. 9812345678"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 15, marginBottom: 16 }} />

        {/* City */}
        <Label>City</Label>
        <input value={city} onChange={e => setCity(e.target.value)}
          placeholder="e.g. Delhi, Mumbai, Ludhiana"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 15, marginBottom: 16 }} />

        {/* Type */}
        <Label>Party Type *</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {PARTY_TYPES.map(t => {
            const tc = typeColor(t);
            return (
              <button key={t} onClick={() => setType(t)} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                background: type === t ? tc.c : C.bg,
                color:      type === t ? C.white : tc.c,
              }}>{t}</button>
            );
          })}
        </div>

        {/* Country preferences */}
        <Label>Country Preference</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {COUNTRIES.map(c => (
            <button key={c} onClick={() => toggleArr(prefCountries, setPrefCountries, c)} style={{
              padding: "7px 14px", borderRadius: 20, border: "none",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: prefCountries.includes(c) ? C.navy : C.bg,
              color:      prefCountries.includes(c) ? C.white : C.inkMid,
            }}>{c}</button>
          ))}
        </div>

        {/* Category preferences */}
        <Label>Category Preference</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => toggleArr(prefCategories, setPrefCategories, c)} style={{
              padding: "7px 14px", borderRadius: 20, border: "none",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: prefCategories.includes(c) ? C.amber : C.bg,
              color:      prefCategories.includes(c) ? C.white : C.inkMid,
            }}>{c}</button>
          ))}
        </div>

        {/* Outstanding */}
        <Label>Outstanding Amount (₹)</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {[["baaki", "⚠️ Baaki (wo denge)", C.red], ["advance", "✅ Advance (humne liya)", C.green]].map(([val, label, col]) => (
            <button key={val} onClick={() => setOutType(val)} style={{
              flex: 1, padding: "9px", borderRadius: 10, border: "none",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: outType === val ? col : C.bg,
              color:      outType === val ? C.white : C.inkMid,
            }}>{label}</button>
          ))}
        </div>
        <input
          type="number"
          value={outstanding}
          onChange={e => setOutstanding(e.target.value)}
          placeholder="0"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 15, marginBottom: 16 }}
        />

        {/* Notes */}
        <Label>Notes <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Koi khaas baat party ke baare mein..."
          rows={3}
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 14, resize: "none", marginBottom: 20 }} />

        {/* Save */}
        <button onClick={handleSave} disabled={busy} style={{
          width: "100%", padding: "15px", borderRadius: 12,
          background: busy ? C.border : C.navy,
          color: C.white, border: "none",
          fontSize: 16, fontWeight: 800, fontFamily: "'Baloo 2'",
          cursor: busy ? "default" : "pointer",
        }}>
          {busy ? "Saving..." : isEdit ? "💾 Update Karein" : "✅ Party Add Karein"}
        </button>
      </div>
    </Shell>
  );
}

function Label({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
      {children}
    </p>
  );
}
