import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Shell, TopBar, BottomNav, C } from "../components/ui";
import { auth } from "../lib/firebase";
import {
  getFirestore, collection, getDocs, addDoc,
  doc, setDoc, getDoc, deleteDoc, query, where, serverTimestamp
} from "firebase/firestore";

function today() { return new Date().toISOString().slice(0, 10); }
function fmt(n)  { return Number(n || 0).toLocaleString("en-IN"); }

function Label({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{children}</p>;
}

const EXPENSE_CATS = ["Transport", "Commission", "Loading", "Salary", "Customs", "Purchase", "Other"];

export default function CashBook({ onBack, nav }) {
  const [date,         setDate]         = useState(today());
  const [entries,      setEntries]      = useState([]);
  const [openCash,     setOpenCash]     = useState(0);
  const [openBank,     setOpenBank]     = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [showOpening,  setShowOpening]  = useState(false);

  // Form state
  const [fType,    setFType]    = useState("in");    // in | out | contra
  const [fAccount, setFAccount] = useState("cash");  // cash | bank
  const [fCat,     setFCat]     = useState("Transport");
  const [fAmt,     setFAmt]     = useState("");
  const [fDesc,    setFDesc]    = useState("");
  const [busy,     setBusy]     = useState(false);

  // Opening form
  const [oCash,    setOCash]    = useState("");
  const [oBank,    setOBank]    = useState("");

  useEffect(() => { loadData(); }, [date]);

  const loadData = async () => {
    setLoading(true);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const _db = getFirestore();

    // Opening balances
    const obSnap = await getDoc(doc(_db, "users", uid, "cashbook", "opening_" + date));
    if (obSnap.exists()) {
      setOpenCash(obSnap.data().cash || 0);
      setOpenBank(obSnap.data().bank || 0);
    } else {
      // Try to get yesterday's closing as today's opening
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);
      const yd = yesterday.toISOString().slice(0, 10);
      const ydSnap = await getDoc(doc(_db, "users", uid, "cashbook", "closing_" + yd));
      if (ydSnap.exists()) {
        setOpenCash(ydSnap.data().cash || 0);
        setOpenBank(ydSnap.data().bank || 0);
      } else {
        setOpenCash(0); setOpenBank(0);
      }
    }

    // Manual entries
    const snap = await getDocs(collection(_db, "users", uid, "cashbook_entries"));
    const manual = snap.docs
      .map(d => ({ id: d.id, ...d.data(), source: "manual" }))
      .filter(e => e.date === date);

    // Auto-pull from party ledger
    const autoEntries = [];
    const partiesSnap = await getDocs(collection(_db, "users", uid, "parties"));
    for (const pd of partiesSnap.docs) {
      const lsnap = await getDocs(collection(_db, "users", uid, "parties", pd.id, "ledger"));
      for (const ld of lsnap.docs) {
        const data = ld.data();
        if (data.date !== date) continue;
        if (data.type === "payment" && data.amount > 0) {
          const acct = data.pay_mode === "bank" ? "bank" : "cash";
          autoEntries.push({ id: ld.id + "_pay", type: "in", account: acct, amount: data.amount, particulars: "By " + pd.data().name, source: "auto", ts: data.updatedAt?.seconds || 0 });
        }
        if (data.type === "sale" && data.paid_now > 0) {
          const acct = data.pay_mode === "bank" ? "bank" : "cash";
          autoEntries.push({ id: ld.id + "_sale", type: "in", account: acct, amount: data.paid_now, particulars: "To Sales — " + (data.note || pd.data().name), source: "auto", ts: data.updatedAt?.seconds || 0 });
        }
        if (data.type === "sale" && data.expenses?.length > 0) {
          data.expenses.forEach((exp, i) => {
            autoEntries.push({ id: ld.id + "_exp_" + i, type: "out", account: "cash", amount: exp.amount, particulars: "By " + exp.type + (exp.note ? " — " + exp.note : ""), source: "auto", ts: data.updatedAt?.seconds || 0 });
          });
        }
      }
    }

    const all = [...manual, ...autoEntries].sort((a, b) => (a.ts || 0) - (b.ts || 0));
    setEntries(all);
    setLoading(false);
  };

  const saveOpening = async () => {
    const uid = auth.currentUser?.uid;
    const _db = getFirestore();
    await setDoc(doc(_db, "users", uid, "cashbook", "opening_" + date), {
      cash: Number(oCash) || 0, bank: Number(oBank) || 0,
      date, updatedAt: serverTimestamp(),
    });
    setOpenCash(Number(oCash) || 0);
    setOpenBank(Number(oBank) || 0);
    setShowOpening(false);
  };

  const addEntry = async () => {
    if (!fAmt || Number(fAmt) <= 0) return alert("Amount likhein");
    setBusy(true);
    const uid = auth.currentUser?.uid;
    const _db = getFirestore();

    if (fType === "contra") {
      // Contra: cash→bank or bank→cash — TWO entries
      const amt = Number(fAmt);
      const fromAcc = fAccount;
      const toAcc   = fAccount === "cash" ? "bank" : "cash";
      await addDoc(collection(_db, "users", uid, "cashbook_entries"), {
        date, type: "out", account: fromAcc, amount: amt,
        particulars: "To " + (toAcc === "bank" ? "Bank A/c" : "Cash A/c") + " (C)",
        category: "contra", source: "manual", ts: Date.now(), updatedAt: serverTimestamp(),
      });
      await addDoc(collection(_db, "users", uid, "cashbook_entries"), {
        date, type: "in", account: toAcc, amount: amt,
        particulars: "By " + (fromAcc === "bank" ? "Bank A/c" : "Cash A/c") + " (C)",
        category: "contra", source: "manual", ts: Date.now() + 1, updatedAt: serverTimestamp(),
      });
    } else {
      const particulars = fType === "in"
        ? "To " + (fDesc || fCat)
        : "By " + (fDesc || fCat);
      await addDoc(collection(_db, "users", uid, "cashbook_entries"), {
        date, type: fType, account: fAccount, amount: Number(fAmt),
        particulars, category: fCat,
        source: "manual", ts: Date.now(), updatedAt: serverTimestamp(),
      });
    }

    setFAmt(""); setFDesc(""); setShowForm(false);
    await loadData();
    setBusy(false);
  };

  const handleDelete = async (entry) => {
    if (!entry?.id || entry.source !== "manual") return;
    if (!window.confirm("Yeh entry delete karein?")) return;
    const uid = auth.currentUser?.uid;
    const _db = getFirestore();
    await deleteDoc(doc(_db, "users", uid, "cashbook_entries", entry.id));
    await loadData();
  };

  // ── Calculate totals ─────────────────────────────────────────────────────────
  const drEntries = entries.filter(e => e.type === "in");
  const crEntries = entries.filter(e => e.type === "out");

  const drCashTotal = drEntries.filter(e => e.account === "cash").reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const drBankTotal = drEntries.filter(e => e.account === "bank").reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const crCashTotal = crEntries.filter(e => e.account === "cash").reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const crBankTotal = crEntries.filter(e => e.account === "bank").reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const closingCash = openCash + drCashTotal - crCashTotal;
  const closingBank = openBank + drBankTotal - crBankTotal;

  const maxRows = Math.max(drEntries.length, crEntries.length);

  const cellStyle = {
    padding: "7px 8px", fontSize: 12, borderRight: "1px solid " + C.border,
    borderBottom: "1px solid " + C.border, color: C.ink, whiteSpace: "nowrap",
  };
  const headCell = {
    ...cellStyle,
    background: C.navy, color: C.white, fontWeight: 700, fontSize: 11,
  };
  const amtCell  = { ...cellStyle, textAlign: "right", fontWeight: 600, minWidth: 64 };
  const dateCell = { ...cellStyle, minWidth: 44, color: C.inkLight, fontSize: 11 };
  const partCell = { ...cellStyle, minWidth: 140 };
  const totCell  = { ...amtCell,  background: C.navyLight, fontWeight: 800, color: C.navy };

  const shortDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";

  return (
    <Shell>
      <TopBar title="📒 Cash Book" bg={C.navy} onBack={onBack} />

      {/* Date + controls */}
      <div style={{ background: C.white, borderBottom: "1px solid " + C.border, padding: "10px 12px", display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 13 }} />
        <button onClick={() => { setOCash(openCash); setOBank(openBank); setShowOpening(true); }} style={{
          background: C.navyLight, color: C.navy, border: "none", borderRadius: 8,
          padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
        }}>Opening ✏️</button>
        <button onClick={() => setShowForm(true)} style={{
          background: C.amber, color: C.white, border: "none", borderRadius: 8,
          padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>+ Entry</button>
      </div>

      {/* Closing summary strip */}
      <div style={{ background: C.navyDark, padding: "8px 16px", display: "flex", gap: 0 }}>
        {[
          { label: "Cash Opening", value: fmt(openCash) },
          { label: "Cash Closing", value: fmt(closingCash), highlight: true },
          { label: "Bank Opening", value: fmt(openBank) },
          { label: "Bank Closing", value: fmt(closingBank), highlight: true },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "'Baloo 2'", color: s.highlight ? C.amber : "rgba(255,255,255,0.8)" }}>
              ₹{s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Double column table */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%", tableLayout: "fixed" }}>
          <colgroup>
            {/* Dr side */}
            <col style={{ width: 52 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 68 }} />
            <col style={{ width: 68 }} />
            {/* Divider */}
            <col style={{ width: 4 }} />
            {/* Cr side */}
            <col style={{ width: 52 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 68 }} />
            <col style={{ width: 68 }} />
          </colgroup>

          {/* Header */}
          <thead>
            <tr>
              <td style={{ ...headCell, textAlign: "center" }}>Date</td>
              <td style={{ ...headCell }}>Particulars (Dr)</td>
              <td style={{ ...headCell, textAlign: "right" }}>Cash</td>
              <td style={{ ...headCell, textAlign: "right" }}>Bank</td>
              <td style={{ background: C.border, padding: 0 }} />
              <td style={{ ...headCell, textAlign: "center" }}>Date</td>
              <td style={{ ...headCell }}>Particulars (Cr)</td>
              <td style={{ ...headCell, textAlign: "right" }}>Cash</td>
              <td style={{ ...headCell, textAlign: "right" }}>Bank</td>
            </tr>
          </thead>

          <tbody>
            {/* Opening balance row */}
            <tr style={{ background: C.navyLight }}>
              <td style={{ ...dateCell, fontWeight: 600, color: C.navy }}>{shortDate(date)}</td>
              <td style={{ ...partCell, fontWeight: 700, color: C.navy }}>To Balance b/d</td>
              <td style={{ ...amtCell, color: C.navy }}>{fmt(openCash)}</td>
              <td style={{ ...amtCell, color: C.navy }}>{fmt(openBank)}</td>
              <td style={{ background: C.border, padding: 0 }} />
              <td style={dateCell} />
              <td style={partCell} />
              <td style={amtCell} />
              <td style={amtCell} />
            </tr>

            {/* Transaction rows */}
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 20, color: C.inkLight, fontSize: 13 }}>
                  Loading...
                </td>
              </tr>
            ) : (
              Array.from({ length: Math.max(maxRows, 1) }).map((_, i) => {
                const dr = drEntries[i];
                const cr = crEntries[i];
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? C.white : "#fafafa" }}>
                    {/* Dr side */}
                    <td style={dateCell}>{dr ? shortDate(date) : ""}</td>
                    <td style={{ ...partCell, color: dr?.source === "auto" ? C.navy : C.ink }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                        <span>{dr ? (dr.particulars || "—") : ""}</span>
                        {dr?.source === "auto" && <span style={{ fontSize: 9, color: C.amber, fontWeight: 700 }}>AUTO</span>}
                        {dr?.source === "manual" && (
                          <button onClick={() => handleDelete(dr)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 13, padding: 0, flexShrink: 0 }}>🗑</button>
                        )}
                      </div>
                    </td>
                    <td style={amtCell}>{dr?.account === "cash" && dr?.amount ? fmt(dr.amount) : (dr ? "—" : "")}</td>
                    <td style={amtCell}>{dr?.account === "bank" && dr?.amount ? fmt(dr.amount) : (dr ? "—" : "")}</td>
                    {/* Divider */}
                    <td style={{ background: C.border, padding: 0 }} />
                    {/* Cr side */}
                    <td style={dateCell}>{cr ? shortDate(date) : ""}</td>
                    <td style={{ ...partCell, color: cr?.source === "auto" ? C.navy : C.ink }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                        <span>{cr ? (cr.particulars || "—") : ""}</span>
                        {cr?.source === "auto" && <span style={{ fontSize: 9, color: C.amber, fontWeight: 700 }}>AUTO</span>}
                        {cr?.source === "manual" && (
                          <button onClick={() => handleDelete(cr)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 13, padding: 0, flexShrink: 0 }}>🗑</button>
                        )}
                      </div>
                    </td>
                    <td style={amtCell}>{cr?.account === "cash" && cr?.amount ? fmt(cr.amount) : (cr ? "—" : "")}</td>
                    <td style={amtCell}>{cr?.account === "bank" && cr?.amount ? fmt(cr.amount) : (cr ? "—" : "")}</td>
                  </tr>
                );
              })
            )}

            {/* Closing balance row */}
            <tr style={{ background: C.navyLight }}>
              <td style={dateCell} />
              <td style={{ ...partCell }} />
              <td style={amtCell} />
              <td style={amtCell} />
              <td style={{ background: C.border, padding: 0 }} />
              <td style={{ ...dateCell, fontWeight: 600, color: C.navy }}>{shortDate(date)}</td>
              <td style={{ ...partCell, fontWeight: 700, color: C.navy }}>By Balance c/d</td>
              <td style={{ ...amtCell, color: C.navy }}>{fmt(closingCash)}</td>
              <td style={{ ...amtCell, color: C.navy }}>{fmt(closingBank)}</td>
            </tr>

            {/* Totals row */}
            <tr>
              <td style={{ ...dateCell, background: C.ink, color: C.white }} />
              <td style={{ ...partCell, background: C.ink, color: C.white, fontWeight: 800, fontFamily: "'Baloo 2'" }}>TOTAL</td>
              <td style={{ ...totCell, background: C.ink, color: C.amber }}>{fmt(openCash + drCashTotal)}</td>
              <td style={{ ...totCell, background: C.ink, color: C.amber }}>{fmt(openBank + drBankTotal)}</td>
              <td style={{ background: C.border, padding: 0 }} />
              <td style={{ ...dateCell, background: C.ink, color: C.white }} />
              <td style={{ ...partCell, background: C.ink, color: C.white, fontWeight: 800, fontFamily: "'Baloo 2'" }}>TOTAL</td>
              <td style={{ ...totCell, background: C.ink, color: C.amber }}>{fmt(crCashTotal + closingCash)}</td>
              <td style={{ ...totCell, background: C.ink, color: C.amber }}>{fmt(crBankTotal + closingBank)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ height: 80 }} />

      {/* Opening balance sheet */}
      {showOpening && (
        <BottomSheet title="Opening Balance Set Karein" onClose={() => setShowOpening(false)}>
          <Label>Cash Opening (₹)</Label>
          <input type="number" value={oCash} onChange={e => setOCash(e.target.value)}
            placeholder="0" autoFocus
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 18, fontWeight: 700, marginBottom: 14 }} />
          <Label>Bank Opening (₹)</Label>
          <input type="number" value={oBank} onChange={e => setOBank(e.target.value)}
            placeholder="0"
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 18, fontWeight: 700, marginBottom: 16 }} />
          <button onClick={saveOpening} style={{
            width: "100%", padding: "13px", borderRadius: 10, background: C.navy,
            color: C.white, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>✅ Save Opening Balance</button>
        </BottomSheet>
      )}

      {/* Add entry sheet */}
      {showForm && (
        <BottomSheet title="Entry Add Karein" onClose={() => setShowForm(false)}>
          {/* Type */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[["in", "Dr (In)", C.green], ["out", "Cr (Out)", C.red], ["contra", "Contra (C)", C.amber]].map(([t, label, col]) => (
              <button key={t} onClick={() => setFType(t)} style={{
                flex: 1, padding: "9px 4px", borderRadius: 10, border: "none",
                background: fType === t ? col : C.bg,
                color: fType === t ? C.white : C.inkMid,
                fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>

          {/* Account — cash or bank */}
          {fType !== "contra" ? (
            <>
              <Label>Account</Label>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[["cash", "💵 Cash"], ["bank", "🏦 Bank"]].map(([a, label]) => (
                  <button key={a} onClick={() => setFAccount(a)} style={{
                    flex: 1, padding: "9px", borderRadius: 10, border: "none",
                    background: fAccount === a ? C.navy : C.bg,
                    color: fAccount === a ? C.white : C.inkMid,
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>{label}</button>
                ))}
              </div>
            </>
          ) : (
            <>
              <Label>Transfer From</Label>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {[["cash", "💵 Cash → Bank"], ["bank", "🏦 Bank → Cash"]].map(([a, label]) => (
                  <button key={a} onClick={() => setFAccount(a)} style={{
                    flex: 1, padding: "9px", borderRadius: 10, border: "none",
                    background: fAccount === a ? C.amber : C.bg,
                    color: fAccount === a ? C.white : C.inkMid,
                    fontWeight: 700, fontSize: 12, cursor: "pointer",
                  }}>{label}</button>
                ))}
              </div>
            </>
          )}

          {/* Category for out entries */}
          {fType === "out" && (
            <>
              <Label>Category</Label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {EXPENSE_CATS.map(c => (
                  <button key={c} onClick={() => setFCat(c)} style={{
                    padding: "5px 11px", borderRadius: 20, border: "none", fontSize: 12,
                    fontWeight: 600, cursor: "pointer",
                    background: fCat === c ? C.navy : C.bg,
                    color: fCat === c ? C.white : C.inkMid,
                  }}>{c}</button>
                ))}
              </div>
            </>
          )}

          <Label>Amount (₹) *</Label>
          <input type="number" value={fAmt} onChange={e => setFAmt(e.target.value)}
            placeholder="0" autoFocus
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 18, fontWeight: 700, marginBottom: 12 }} />

          {fType !== "contra" && (
            <>
              <Label>Particulars</Label>
              <input value={fDesc} onChange={e => setFDesc(e.target.value)}
                placeholder={fType === "in" ? "e.g. Ramesh Traders, Advance" : "e.g. Delhi transport"}
                style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14, marginBottom: 16 }} />
            </>
          )}

          <button onClick={addEntry} disabled={busy} style={{
            width: "100%", padding: "13px", borderRadius: 10,
            background: busy ? C.border : (fType === "in" ? C.green : fType === "out" ? C.red : C.amber),
            color: C.white, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>{busy ? "Saving..." : "✅ Add Karein"}</button>
        </BottomSheet>
      )}

      <BottomNav active="reports" nav={nav} />
    </Shell>
  );
}

function BottomSheet({ children, onClose, title }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: C.white, borderRadius: "20px 20px 0 0", padding: "20px 20px max(20px, env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
        </div>
        <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 17, color: C.ink, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {title}
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.inkLight }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
