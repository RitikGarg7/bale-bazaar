import { useState, useEffect } from "react";
import { Shell, TopBar, C, Spinner, EmptyState } from "../components/ui";
import { auth } from "../lib/firebase";
import {
  getFirestore, collection, getDocs,
  addDoc, serverTimestamp
} from "firebase/firestore";

function fmt(n) { return "₹" + Number(Math.abs(n) || 0).toLocaleString("en-IN"); }

function Label({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{children}</p>;
}

// ── Supplier List ─────────────────────────────────────────────────────────────
export default function SupplierLedger({ onBack }) {
  const [suppliers,   setSuppliers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const _db = getFirestore();

    const snap = await getDocs(collection(_db, "users", uid, "supplier_ledger"));
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Also pull from rokar purchase entries
    const rokarSnap = await getDocs(collection(_db, "users", uid, "rokar"));
    const purchases = rokarSnap.docs
      .map(d => ({ id: "r_" + d.id, ...d.data() }))
      .filter(e => e.type === "purchase" && e.supplier_name);

    // Group by supplier name
    const supplierMap = {};
    [...entries, ...purchases].forEach(e => {
      const name = e.supplier || e.supplier_name || "Unknown";
      if (!supplierMap[name]) supplierMap[name] = { name, entries: [], total_credit: 0, total_paid: 0 };
      supplierMap[name].entries.push(e);
      if (e.credit_amount > 0) supplierMap[name].total_credit += e.credit_amount;
      if (e.type === "supplier_payment") supplierMap[name].total_paid += e.amount || 0;
    });

    setSuppliers(Object.values(supplierMap));
    setLoading(false);
  };

  if (selected) {
    return <SupplierDetail supplier={selected} onBack={() => { setSelected(null); loadSuppliers(); }} />;
  }

  return (
    <Shell>
      <TopBar title="🏭 Supplier Ledger" bg={C.navy} onBack={onBack} />

      <div style={{ padding: "14px 16px 80px" }}>
        {loading ? <Spinner /> : suppliers.length === 0 ? (
          <EmptyState icon="🏭" title="Koi supplier nahi" subtitle="Purchase voucher mein supplier ka naam add karein" />
        ) : suppliers.map(s => {
          const outstanding = s.total_credit - s.total_paid;
          return (
            <div key={s.name} onClick={() => setSelected(s)}
              style={{
                background: C.white, borderRadius: 12, padding: "14px 16px",
                marginBottom: 8, border: "1px solid " + C.border, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                background: C.navyLight, color: C.navy,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 16, fontFamily: "'Baloo 2'",
              }}>{s.name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 15, color: C.ink }}>{s.name}</div>
                <div style={{ fontSize: 12, color: C.inkLight }}>{s.entries.length} purchases</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 16, color: outstanding > 0 ? C.red : C.green }}>
                  {fmt(outstanding)}
                </div>
                <div style={{ fontSize: 11, color: C.inkLight }}>{outstanding > 0 ? "Humhara baaki" : "Saaf"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

// ── Supplier Detail / Ledger ──────────────────────────────────────────────────
function SupplierDetail({ supplier, onBack }) {
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount,   setPayAmount]   = useState("");
  const [payDate,     setPayDate]     = useState(new Date().toISOString().slice(0, 10));
  const [payNote,     setPayNote]     = useState("");
  const [payMode,     setPayMode]     = useState("bank");
  const [entries,     setEntries]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [busy,        setBusy]        = useState(false);

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    setLoading(true);
    const uid = auth.currentUser?.uid;
    const _db = getFirestore();

    const snap = await getDocs(collection(_db, "users", uid, "supplier_ledger"));
    const ledger = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => (e.supplier || e.supplier_name) === supplier.name);

    const rokarSnap = await getDocs(collection(_db, "users", uid, "rokar"));
    const rokar = rokarSnap.docs
      .map(d => ({ id: "r_" + d.id, ...d.data() }))
      .filter(e => e.type === "purchase" && e.supplier_name === supplier.name);

    const all = [...ledger, ...rokar].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    setEntries(all);
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) return alert("Amount likhein");
    setBusy(true);
    try {
      const uid = auth.currentUser?.uid;
      const _db = getFirestore();

      await addDoc(collection(_db, "users", uid, "supplier_ledger"), {
        supplier: supplier.name, type: "supplier_payment",
        amount: Number(payAmount), pay_mode: payMode,
        date: payDate, narration: payNote.trim() || "Payment to supplier",
        updatedAt: serverTimestamp(),
      });

      // Add to cash/bank book
      await addDoc(collection(_db, "users", uid, "cashbook_entries"), {
        date: payDate, type: "out", account: payMode,
        amount: Number(payAmount),
        particulars: "By " + supplier.name + " (Supplier payment)",
        source: "supplier_payment", ts: Date.now(),
        updatedAt: serverTimestamp(),
      });

      // Add to rokar
      await addDoc(collection(_db, "users", uid, "rokar"), {
        type: "payment", date: payDate,
        amount: Number(payAmount),
        particulars: "By " + supplier.name,
        narration: payNote.trim() || "Supplier payment",
        cash_dr: 0, cash_cr: payMode === "cash" ? Number(payAmount) : 0,
        bank_dr: 0, bank_cr: payMode === "bank" ? Number(payAmount) : 0,
        credit_amount: 0, ts: Date.now(), updatedAt: serverTimestamp(),
      });

      setPayAmount(""); setPayNote(""); setShowPayment(false);
      loadEntries();
    } catch (e) {
      alert("Save nahi hua: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  // Running balance
  let balance = 0;
  const rows = entries.map(e => {
    const isPurchase = e.type === "purchase" || e.credit_amount > 0;
    const isPayment  = e.type === "supplier_payment";
    const dr = isPayment  ? (e.amount || 0) : 0;
    const cr = isPurchase ? (e.credit_amount || e.amount || 0) : 0;
    balance += cr - dr;
    return { ...e, dr, cr, runningBal: balance };
  });

  const outstanding = rows.length > 0 ? rows[rows.length - 1].runningBal : 0;

  return (
    <Shell>
      <TopBar title={supplier.name} bg={C.navy} onBack={onBack}
        right={
          <button onClick={() => setShowPayment(true)} style={{
            background: "rgba(255,255,255,0.15)", color: C.white,
            border: "none", borderRadius: 8, padding: "6px 12px",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>+ Payment</button>
        }
      />

      {/* Outstanding banner */}
      <div style={{
        background: "linear-gradient(135deg, " + C.navyDark + ", " + C.navy + ")",
        padding: "16px 20px",
      }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
          {outstanding > 0 ? "Humhara Baaki (Supplier ko dena hai)" : "Hisaab Saaf ✅"}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: outstanding > 0 ? "#ffcdd2" : "#a5d6a7", fontFamily: "'Baloo 2'" }}>
          {fmt(outstanding)}
        </div>
      </div>

      {/* Ledger table */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%" }}>
          <thead>
            <tr>
              {["Date", "Particulars", "Dr (Paid)", "Cr (Purchased)", "Balance"].map(h => (
                <th key={h} style={{
                  padding: "9px 12px", fontSize: 11, fontWeight: 700,
                  background: C.navy, color: C.white,
                  textAlign: h === "Date" ? "center" : h.includes("Dr") || h.includes("Cr") || h === "Balance" ? "right" : "left",
                  borderRight: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: C.inkLight }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: C.inkLight, fontSize: 13 }}>Koi transaction nahi</td></tr>
            ) : rows.map((e, i) => (
              <tr key={e.id} style={{ background: i % 2 === 0 ? C.white : "#fafafa" }}>
                <td style={{ ...td, textAlign: "center", color: C.inkLight, fontSize: 11, whiteSpace: "nowrap" }}>
                  {e.date ? new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                </td>
                <td style={{ ...td, minWidth: 180 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>
                    {e.type === "supplier_payment" ? "Payment to " + supplier.name : "Purchase — " + (e.narration || "")}
                  </div>
                  {e.pay_mode && <div style={{ fontSize: 11, color: C.inkLight }}>{e.pay_mode}</div>}
                </td>
                <td style={{ ...td, textAlign: "right", color: C.green, fontWeight: 700 }}>
                  {e.dr > 0 ? fmt(e.dr) : "—"}
                </td>
                <td style={{ ...td, textAlign: "right", color: C.red, fontWeight: 700 }}>
                  {e.cr > 0 ? fmt(e.cr) : "—"}
                </td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800, fontFamily: "'Baloo 2'", color: e.runningBal > 0 ? C.red : C.green, whiteSpace: "nowrap" }}>
                  {fmt(e.runningBal)}
                  <div style={{ fontSize: 9, fontWeight: 400, color: C.inkLight }}>{e.runningBal > 0 ? "humhara baaki" : "saaf"}</div>
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr style={{ background: C.navyLight }}>
                <td style={{ ...td }} />
                <td style={{ ...td, fontWeight: 800, color: C.navy, fontFamily: "'Baloo 2'" }}>Closing Balance</td>
                <td style={{ ...td }} /><td style={{ ...td }} />
                <td style={{ ...td, textAlign: "right", fontWeight: 800, fontFamily: "'Baloo 2'", color: outstanding > 0 ? C.red : C.green }}>
                  {fmt(outstanding)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment sheet */}
      {showPayment && (
        <div onClick={e => e.target === e.currentTarget && setShowPayment(false)}
          style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 430, background: C.white, borderRadius: "20px 20px 0 0", padding: "20px 20px max(20px, env(safe-area-inset-bottom))" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
            </div>
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 18, marginBottom: 16 }}>
              💳 Supplier Payment
            </div>
            <Label>Amount (₹) *</Label>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
              placeholder="0" autoFocus
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 18, fontWeight: 700, marginBottom: 14 }} />
            <Label>Mode *</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[["cash", "💵 Cash"], ["bank", "🏦 Bank/Wire"]].map(([m, label]) => (
                <button key={m} onClick={() => setPayMode(m)} style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "none",
                  background: payMode === m ? C.navy : C.bg,
                  color: payMode === m ? C.white : C.inkMid,
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>{label}</button>
              ))}
            </div>
            <Label>Date *</Label>
            <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14, marginBottom: 14 }} />
            <Label>Note</Label>
            <input value={payNote} onChange={e => setPayNote(e.target.value)}
              placeholder="e.g. Wire transfer, SWIFT ref..."
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14, marginBottom: 20 }} />
            <button onClick={handlePayment} disabled={busy} style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: busy ? C.border : C.navy,
              color: C.white, border: "none", fontSize: 15, fontWeight: 800,
              fontFamily: "'Baloo 2'", cursor: busy ? "default" : "pointer",
            }}>{busy ? "Saving..." : "✅ Payment Record Karein"}</button>
          </div>
        </div>
      )}
    </Shell>
  );
}

const td = {
  padding: "10px 12px", fontSize: 13,
  borderRight: "1px solid " + C.border,
  borderBottom: "1px solid " + C.border,
};
