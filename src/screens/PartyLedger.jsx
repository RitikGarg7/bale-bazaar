import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Shell, TopBar, C, Spinner } from "../components/ui";
import { auth } from "../lib/firebase";
import {
  getFirestore, collection, getDocs,
  addDoc, serverTimestamp
} from "firebase/firestore";

function fmt(n) { return "₹" + Number(Math.abs(n) || 0).toLocaleString("en-IN"); }

function Label({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{children}</p>;
}

export default function PartyLedger({ party, onBack }) {
  const { saveParty } = useApp();
  const [entries,     setEntries]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount,   setPayAmount]   = useState("");
  const [payDate,     setPayDate]     = useState(new Date().toISOString().slice(0, 10));
  const [payNote,     setPayNote]     = useState("");
  const [payMode,     setPayMode]     = useState("cash");
  const [busy,        setBusy]        = useState(false);

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const _db  = getFirestore();

      // Load party ledger entries
      const ledgerSnap = await getDocs(collection(_db, "users", uid, "parties", party.id, "ledger"));
      const ledger = ledgerSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Load rokar entries linked to this party
      const rokarSnap = await getDocs(collection(_db, "users", uid, "rokar"));
      const rokar = rokarSnap.docs
        .map(d => ({ id: "r_" + d.id, ...d.data(), from_rokar: true }))
        .filter(e => e.party_id === party.id && (e.type === "sale" || e.type === "receipt"));

      // Merge + dedupe (ledger entries created by rokar may overlap)
      const ledgerIds = new Set(ledger.map(e => e.id));
      const extraRokar = rokar.filter(r => !ledger.find(l =>
        l.date === r.date && Math.abs((l.amount || 0) - (r.amount || 0)) < 1
      ));

      const all = [...ledger, ...extraRokar].sort((a, b) => {
        const da = a.date || ""; const db = b.date || "";
        if (da !== db) return da.localeCompare(db);
        return (a.ts || 0) - (b.ts || 0);
      });

      setEntries(all);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!payAmount || Number(payAmount) <= 0) return alert("Amount likhein");
    setBusy(true);
    try {
      const uid = auth.currentUser?.uid;
      const _db = getFirestore();

      // Save ledger entry
      await addDoc(collection(_db, "users", uid, "parties", party.id, "ledger"), {
        type: "payment", amount: Number(payAmount),
        pay_mode: payMode, date: payDate,
        note: payNote.trim() || "Payment received",
        updatedAt: serverTimestamp(),
      });

      // Also add to rokar
      await addDoc(collection(_db, "users", uid, "rokar"), {
        type: "receipt", date: payDate,
        amount: Number(payAmount),
        particulars: "To " + party.name,
        narration: payNote.trim() || "Payment received",
        party_id: party.id, party_name: party.name,
        cash_dr: payMode === "cash" ? Number(payAmount) : 0,
        bank_dr: payMode === "bank" ? Number(payAmount) : 0,
        cash_cr: 0, bank_cr: 0, credit_amount: 0,
        ts: Date.now(), updatedAt: serverTimestamp(),
      });

      // Add to cashbook
      await addDoc(collection(_db, "users", uid, "cashbook_entries"), {
        date: payDate, type: "in", account: payMode,
        amount: Number(payAmount),
        particulars: "To " + party.name,
        source: "party_payment", ts: Date.now(),
        updatedAt: serverTimestamp(),
      });

      // Update outstanding
      const newOutstanding = (party.outstanding || 0) - Number(payAmount);
      await saveParty({ ...party, outstanding: newOutstanding }, party.id);

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
    const isSale    = e.type === "sale";
    const isPayment = e.type === "payment" || e.type === "receipt";
    const isReceipt = e.type === "receipt";
    const dr = isSale    ? (e.amount || e.total_amount || 0) : 0;
    const cr = isPayment ? (e.amount || 0) : 0;
    balance += dr - cr;
    return { ...e, dr, cr, runningBal: balance };
  });

  const outstanding = party.outstanding || 0;

  return (
    <Shell>
      <TopBar title={party.name} bg={C.navy} onBack={onBack}
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
        background: outstanding > 0
          ? "linear-gradient(135deg, #C8230A, #e53935)"
          : outstanding < 0
          ? "linear-gradient(135deg, #1A6B3A, #2e7d32)"
          : "linear-gradient(135deg, #1B3A5C, #2563eb)",
        padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
            {outstanding > 0 ? "Baaki — Wo Denge" : outstanding < 0 ? "Advance — Humne Liya" : "Hisaab Saaf ✅"}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "white", fontFamily: "'Baloo 2'" }}>
            {fmt(outstanding)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {party.phone && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>📞 {party.phone}</div>}
          {party.city  && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>📍 {party.city}</div>}
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{party.type}</div>
        </div>
      </div>

      {/* Ledger table */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%" }}>
          <thead>
            <tr>
              {["Date", "Particulars", "Dr (Baaki)", "Cr (Received)", "Balance"].map(h => (
                <th key={h} style={{
                  padding: "9px 12px", fontSize: 11, fontWeight: 700,
                  background: C.navy, color: C.white, textAlign: h === "Date" ? "center" : h.includes("Dr") || h.includes("Cr") || h === "Balance" ? "right" : "left",
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
                    {e.type === "sale" ? "Sales — " + (e.bale_brand || "") + " " + (e.bale_category || "") : ""}
                    {e.type === "payment" || e.type === "receipt" ? "Payment Received" : ""}
                  </div>
                  {(e.note || e.narration || e.num_bales) && (
                    <div style={{ fontSize: 11, color: C.inkLight }}>
                      {e.num_bales ? e.num_bales + " bales · ₹" + e.sale_rate + "/kg" : ""}
                      {e.note || e.narration || ""}
                      {e.pay_mode ? " · " + e.pay_mode : ""}
                    </div>
                  )}
                </td>
                <td style={{ ...td, textAlign: "right", color: C.red, fontWeight: 700 }}>
                  {e.dr > 0 ? fmt(e.dr) : "—"}
                </td>
                <td style={{ ...td, textAlign: "right", color: C.green, fontWeight: 700 }}>
                  {e.cr > 0 ? fmt(e.cr) : "—"}
                </td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800, fontFamily: "'Baloo 2'", color: e.runningBal > 0 ? C.red : C.green, whiteSpace: "nowrap" }}>
                  {fmt(e.runningBal)}
                  <div style={{ fontSize: 9, fontWeight: 400, color: C.inkLight }}>{e.runningBal > 0 ? "baaki" : "advance"}</div>
                </td>
              </tr>
            ))}

            {/* Closing balance row */}
            {rows.length > 0 && (
              <tr style={{ background: C.navyLight }}>
                <td style={{ ...td }} />
                <td style={{ ...td, fontWeight: 800, color: C.navy, fontFamily: "'Baloo 2'" }}>Closing Balance</td>
                <td style={{ ...td }} />
                <td style={{ ...td }} />
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
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 18, color: C.ink, marginBottom: 16 }}>
              💰 Payment Record Karein
            </div>

            <Label>Amount (₹) *</Label>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
              placeholder="e.g. 50000" autoFocus
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 18, fontWeight: 700, marginBottom: 14 }} />

            <Label>Mode *</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[["cash", "💵 Cash"], ["bank", "🏦 Bank/NEFT"]].map(([m, label]) => (
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

            <Label>Note <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>
            <input value={payNote} onChange={e => setPayNote(e.target.value)}
              placeholder="e.g. Cash, NEFT ref no..."
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14, marginBottom: 20 }} />

            <button onClick={handlePayment} disabled={busy} style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: busy ? C.border : C.green,
              color: C.white, border: "none",
              fontSize: 15, fontWeight: 800, fontFamily: "'Baloo 2'",
              cursor: busy ? "default" : "pointer",
            }}>
              {busy ? "Saving..." : "✅ Payment Record Karein"}
            </button>
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
