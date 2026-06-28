import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Shell, TopBar, C, Card, Spinner } from "../components/ui";
import { db, auth } from "../lib/firebase";
import {
  collection, doc, getDocs, addDoc, query,
  orderBy, serverTimestamp, getFirestore
} from "firebase/firestore";

function fmt(amt) {
  return "₹" + Math.abs(amt).toLocaleString("en-IN");
}

function Label({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
      {children}
    </p>
  );
}

export default function PartyLedger({ party, onBack }) {
  const { saveParty } = useApp();
  const [entries,     setEntries]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount,   setPayAmount]   = useState("");
  const [payDate,     setPayDate]     = useState(new Date().toISOString().slice(0, 10));
  const [payNote,     setPayNote]     = useState("");
  const [busy,        setBusy]        = useState(false);

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const _db  = getFirestore();
      const ref  = collection(_db, "users", uid, "parties", party.id, "ledger");
      const q    = query(ref, orderBy("date", "desc"));
      const snap = await getDocs(q);
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      const ref = collection(_db, "users", uid, "parties", party.id, "ledger");
      await addDoc(ref, {
        type:      "payment",
        amount:    Number(payAmount),
        date:      payDate,
        note:      payNote.trim() || "Payment received",
        updatedAt: serverTimestamp(),
      });

      // Update party outstanding
      const newOutstanding = (party.outstanding || 0) - Number(payAmount);
      await saveParty({ ...party, outstanding: newOutstanding }, party.id);

      setPayAmount("");
      setPayNote("");
      setShowPayment(false);
      loadEntries();
    } catch (e) {
      alert("Save nahi hua: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const outstanding = party.outstanding || 0;

  return (
    <Shell>
      <TopBar title={party.name} bg={C.navy} onBack={onBack} />

      {/* Outstanding banner */}
      <div style={{
        background: outstanding > 0
          ? "linear-gradient(135deg, #C8230A, #e53935)"
          : "linear-gradient(135deg, #1A6B3A, #2e7d32)",
        padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
            {outstanding > 0 ? "Baaki (wo denge)" : outstanding < 0 ? "Advance (humne liya)" : "Hisaab saaf ✅"}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "white", fontFamily: "'Baloo 2'" }}>
            {outstanding !== 0 ? fmt(outstanding) : "₹0"}
          </div>
        </div>
        {outstanding > 0 && (
          <button onClick={() => setShowPayment(true)} style={{
            background: "rgba(255,255,255,0.2)", color: "white",
            border: "1.5px solid rgba(255,255,255,0.4)",
            borderRadius: 10, padding: "10px 16px",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
          }}>
            💰 Payment
          </button>
        )}
      </div>

      {/* Party info */}
      <div style={{ background: C.white, padding: "10px 20px", borderBottom: "1px solid " + C.border, display: "flex", gap: 20 }}>
        {party.phone && <span style={{ fontSize: 13, color: C.inkMid }}>📞 {party.phone}</span>}
        {party.city  && <span style={{ fontSize: 13, color: C.inkMid }}>📍 {party.city}</span>}
        <span style={{ fontSize: 13, color: C.inkMid }}>🏷 {party.type}</span>
      </div>

      {/* Payment form */}
      {showPayment && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 150,
          background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }} onClick={e => e.target === e.currentTarget && setShowPayment(false)}>
          <div style={{
            width: "100%", maxWidth: 430, background: C.white,
            borderRadius: "20px 20px 0 0",
            padding: "20px 20px max(20px, env(safe-area-inset-bottom))",
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
            </div>
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 18, color: C.ink, marginBottom: 16 }}>
              💰 Payment Record Karein
            </div>

            <Label>Amount (₹) *</Label>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
              placeholder="e.g. 50000" autoFocus
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 18, fontWeight: 700, marginBottom: 14 }} />

            <Label>Date *</Label>
            <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14, marginBottom: 14 }} />

            <Label>Note <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>
            <input value={payNote} onChange={e => setPayNote(e.target.value)}
              placeholder="e.g. Cash, NEFT, Cheque..."
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

      {/* Ledger entries */}
      <div style={{ padding: "14px 16px 80px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
          Transactions
        </p>

        {loading ? <Spinner /> : entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.inkLight, fontSize: 14 }}>
            Koi transaction nahi hai abhi
          </div>
        ) : (
          entries.map(e => {
            const isPayment = e.type === "payment";
            const isSale    = e.type === "sale";
            return (
              <div key={e.id} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 0", borderBottom: "1px solid " + C.border,
              }}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: isPayment ? C.greenLight : C.navyLight,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>
                  {isPayment ? "💰" : "📦"}
                </div>

                {/* Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>
                    {isPayment ? "Payment Received" : e.note || "Sale"}
                  </div>
                  <div style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>
                    {e.date ? new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                    {e.note && isSale ? " · " + e.note : ""}
                    {isPayment && e.note ? " · " + e.note : ""}
                  </div>
                </div>

                {/* Amount */}
                <div style={{
                  fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 16,
                  color: isPayment ? C.green : C.red,
                  flexShrink: 0,
                }}>
                  {isPayment ? "-" : "+"}{fmt(e.amount)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Shell>
  );
}
