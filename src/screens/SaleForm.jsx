import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Shell, TopBar, C } from "../components/ui";

const PAYMENT_MODES = [
  { id: "credit",   label: "Full Credit",    icon: "📋", desc: "Baad mein denge" },
  { id: "cash",     label: "Full Cash",       icon: "💵", desc: "Abhi de diya" },
  { id: "partial",  label: "Partial",         icon: "⚖️", desc: "Kuch abhi, kuch baad mein" },
];

const EXPENSE_TYPES = ["Transport", "Commission", "Loading", "Unloading", "Other"];

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, color: C.inkLight, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Baloo 2'", color: color || C.ink }}>{value}</div>
    </div>
  );
}

function Label({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
      {children}
    </p>
  );
}

export default function SaleForm({ bale, onDone, onBack }) {
  const { parties, saveBale, saveParty } = useApp();

  const remaining = (bale.num_bales || 0) - (bale.sold_bales || 0);

  const [numSold,      setNumSold]      = useState("");
  const [partyId,      setPartyId]      = useState("");
  const [saleRate,     setSaleRate]     = useState(bale.price_per_kg || "");
  const [saleDate,     setSaleDate]     = useState(new Date().toISOString().slice(0, 10));
  const [payMode,      setPayMode]      = useState("credit");
  const [paidAmt,      setPaidAmt]      = useState("");  // for partial
  const [expenses,     setExpenses]     = useState([]);  // [{type, amount, note}]
  const [notes,        setNotes]        = useState("");
  const [busy,         setBusy]         = useState(false);
  const [partySearch,  setPartySearch]  = useState("");
  const [showExpForm,  setShowExpForm]  = useState(false);
  const [expType,      setExpType]      = useState("Transport");
  const [expAmt,       setExpAmt]       = useState("");
  const [expNote,      setExpNote]      = useState("");

  const filteredParties = parties.filter(p =>
    p.name?.toLowerCase().includes(partySearch.toLowerCase()) ||
    p.phone?.includes(partySearch)
  );
  const selectedParty = parties.find(p => p.id === partyId);

  // ── Live calculations ───────────────────────────────────────────────────────
  const balesNum      = Number(numSold)   || 0;
  const rateNum       = Number(saleRate)  || 0;
  const totalWt       = balesNum * (Number(bale.weight_kg) || 0);
  const saleAmt       = totalWt * rateNum;
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const costAmt       = totalWt * (Number(bale.price_per_kg) || 0);
  const netSaleAmt    = saleAmt - totalExpenses;
  const profit        = bale.price_per_kg ? netSaleAmt - costAmt : null;
  const newRemaining  = remaining - balesNum;

  // How much is on credit
  const paidNow       = payMode === "cash"    ? saleAmt
                      : payMode === "partial"  ? (Number(paidAmt) || 0)
                      : 0;
  const creditAmt     = saleAmt - paidNow;

  // ── Add expense ─────────────────────────────────────────────────────────────
  const addExpense = () => {
    if (!expAmt || Number(expAmt) <= 0) return alert("Amount likhein");
    setExpenses(prev => [...prev, { type: expType, amount: Number(expAmt), note: expNote.trim() }]);
    setExpAmt(""); setExpNote(""); setShowExpForm(false);
  };

  const removeExpense = (idx) => setExpenses(prev => prev.filter((_, i) => i !== idx));

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!numSold || balesNum <= 0)  return alert("Kitne bale bechein? likhein");
    if (balesNum > remaining)        return alert("Sirf " + remaining + " bale baaki hain");
    if (!saleRate)                   return alert("Sale rate likhein");
    if (payMode === "partial" && (!paidAmt || Number(paidAmt) <= 0)) return alert("Kitna pay kiya likhein");

    setBusy(true);
    try {
      const { auth } = await import("../lib/firebase");
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not logged in");

      const { collection, doc, setDoc, addDoc, serverTimestamp, getFirestore } = await import("firebase/firestore");
      const _db = getFirestore();

      // 1. Save sale record under bale
      const saleRef = doc(collection(_db, "users", uid, "inventory", bale.id, "sales"));
      await setDoc(saleRef, {
        num_bales:      balesNum,
        weight_kg:      bale.weight_kg,
        total_weight:   totalWt,
        sale_rate:      rateNum,
        total_amount:   saleAmt,
        expenses,
        total_expenses: totalExpenses,
        net_amount:     netSaleAmt,
        profit,
        pay_mode:       payMode,
        paid_now:       paidNow,
        credit_amount:  creditAmt,
        party_id:       partyId || null,
        party_name:     selectedParty?.name || null,
        date:           saleDate,
        notes:          notes.trim(),
        updatedAt:      serverTimestamp(),
      });

      // 2. Update bale sold count
      const newSoldBales = (bale.sold_bales || 0) + balesNum;
      const newStatus    = newSoldBales >= bale.num_bales ? "sold" : "in_stock";
      await saveBale({ ...bale, sold_bales: newSoldBales, status: newStatus }, bale.id);

      // 3. Update party outstanding + ledger (only credit portion)
      if (partyId && selectedParty) {
        const newOutstanding = (selectedParty.outstanding || 0) + creditAmt;
        await saveParty({ ...selectedParty, outstanding: newOutstanding }, partyId);

        const ledgerRef = collection(_db, "users", uid, "parties", partyId, "ledger");
        await addDoc(ledgerRef, {
          type:          "sale",
          amount:        saleAmt,
          credit_amount: creditAmt,
          paid_now:      paidNow,
          pay_mode:      payMode,
          num_bales:     balesNum,
          total_weight:  totalWt,
          sale_rate:     rateNum,
          expenses,
          total_expenses: totalExpenses,
          bale_brand:    bale.brand,
          bale_category: bale.category,
          date:          saleDate,
          note:          bale.brand + " " + bale.category + " × " + balesNum + " bales",
          updatedAt:     serverTimestamp(),
        });
      }

      onDone();
    } catch (e) {
      alert("Save nahi hua: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <TopBar title="💸 Sale Record Karein" bg={C.navy} onBack={onBack} />

      <div style={{ padding: "16px 16px 120px", overflowY: "auto" }}>

        {/* Bale summary */}
        <div style={{ background: C.navyLight, borderRadius: 14, padding: "14px 16px", marginBottom: 20, display: "flex", justifyContent: "space-around" }}>
          <Stat label="Brand"     value={bale.brand} />
          <Stat label="Category"  value={bale.category} />
          <Stat label="Remaining" value={remaining} color={remaining <= 2 ? C.red : C.green} />
        </div>

        {/* Bales */}
        <Label>Kitne Bale Bechein? * <span style={{ color: C.inkLight, fontWeight: 400 }}>({remaining} baaki)</span></Label>
        <input type="number" value={numSold} onChange={e => setNumSold(e.target.value)}
          placeholder={"Max " + remaining} max={remaining}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 10,
            border: "1.5px solid " + (balesNum > remaining ? C.red : C.border),
            fontSize: 22, fontWeight: 800, marginBottom: 4, fontFamily: "'Baloo 2'",
            color: balesNum > remaining ? C.red : C.ink,
          }} />
        {balesNum > remaining && <p style={{ fontSize: 12, color: C.red, marginBottom: 8 }}>⚠️ Sirf {remaining} bale baaki hain</p>}
        <div style={{ height: 12 }} />

        {/* Sale rate */}
        <Label>Sale Rate (₹/kg) *</Label>
        <input type="number" value={saleRate} onChange={e => setSaleRate(e.target.value)}
          placeholder="e.g. 400"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 15, marginBottom: 16 }} />

        {/* Date */}
        <Label>Sale Date *</Label>
        <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)}
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14, color: C.ink, background: C.white, marginBottom: 16 }} />

        {/* Payment mode */}
        <Label>Payment Mode *</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {PAYMENT_MODES.map(m => (
            <button key={m.id} onClick={() => setPayMode(m.id)} style={{
              flex: 1, padding: "10px 6px", borderRadius: 10, border: "none",
              cursor: "pointer", textAlign: "center",
              background: payMode === m.id ? C.navy : C.bg,
              color:      payMode === m.id ? C.white : C.inkMid,
            }}>
              <div style={{ fontSize: 18 }}>{m.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3 }}>{m.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Partial — how much paid now */}
        {payMode === "partial" && (
          <>
            <Label>Abhi Kitna Diya? (₹) *</Label>
            <input type="number" value={paidAmt} onChange={e => setPaidAmt(e.target.value)}
              placeholder="e.g. 20000"
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.amber, fontSize: 15, marginBottom: 16 }} />
          </>
        )}

        {/* Misc expenses */}
        <Label>Miscellaneous Kharche <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>

        {expenses.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            {expenses.map((e, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", background: C.bg, borderRadius: 8, marginBottom: 6,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.inkMid, flex: 1 }}>
                  {e.type}{e.note ? " — " + e.note : ""}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>₹{Number(e.amount).toLocaleString("en-IN")}</span>
                <button onClick={() => removeExpense(i)} style={{ background: "none", border: "none", color: C.red, fontSize: 16, cursor: "pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {showExpForm ? (
          <div style={{ background: C.bg, borderRadius: 12, padding: "14px", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {EXPENSE_TYPES.map(t => (
                <button key={t} onClick={() => setExpType(t)} style={{
                  padding: "6px 12px", borderRadius: 20, border: "none",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  background: expType === t ? C.navy : C.white,
                  color:      expType === t ? C.white : C.inkMid,
                }}>{t}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <input type="number" value={expAmt} onChange={e => setExpAmt(e.target.value)}
                placeholder="Amount (₹)"
                style={{ padding: "10px 12px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 14 }} />
              <input value={expNote} onChange={e => setExpNote(e.target.value)}
                placeholder="Note (optional)"
                style={{ padding: "10px 12px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 14 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addExpense} style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "none",
                background: C.navy, color: C.white, fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>+ Add</button>
              <button onClick={() => setShowExpForm(false)} style={{
                padding: "10px 16px", borderRadius: 8, border: "none",
                background: C.bg, color: C.inkMid, fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowExpForm(true)} style={{
            width: "100%", padding: "11px", borderRadius: 10,
            border: "1.5px dashed " + C.border, background: "transparent",
            color: C.inkMid, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16,
          }}>+ Kharcha Add Karein</button>
        )}

        {/* Live calculation */}
        {balesNum > 0 && rateNum > 0 && (
          <div style={{
            background: C.amberLight, borderRadius: 14, padding: "14px 16px",
            marginBottom: 12, border: "1px solid " + C.amber + "33",
          }}>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: totalExpenses > 0 ? 10 : 0 }}>
              <Stat label="Total Wt"  value={totalWt + " kg"} />
              <Stat label="Sale Amt"  value={"₹" + saleAmt.toLocaleString("en-IN")} color={C.amber} />
              {profit !== null && (
                <Stat label="Net Profit" value={"₹" + Math.abs(profit).toLocaleString("en-IN")} color={profit >= 0 ? C.green : C.red} />
              )}
            </div>
            {totalExpenses > 0 && (
              <div style={{ borderTop: "1px solid " + C.amber + "44", paddingTop: 10, display: "flex", justifyContent: "space-around" }}>
                <Stat label="Kharche"   value={"₹" + totalExpenses.toLocaleString("en-IN")} color={C.red} />
                <Stat label="Net Sale"  value={"₹" + netSaleAmt.toLocaleString("en-IN")}   color={C.navy} />
              </div>
            )}
            {payMode !== "credit" && (
              <div style={{ borderTop: "1px solid " + C.amber + "44", paddingTop: 10, display: "flex", justifyContent: "space-around", marginTop: 10 }}>
                <Stat label="Paid Now"  value={"₹" + paidNow.toLocaleString("en-IN")}   color={C.green} />
                <Stat label="Credit"    value={"₹" + creditAmt.toLocaleString("en-IN")} color={creditAmt > 0 ? C.red : C.green} />
              </div>
            )}
          </div>
        )}

        {/* Remaining preview */}
        {balesNum > 0 && balesNum <= remaining && (
          <div style={{
            background: newRemaining === 0 ? C.greenLight : C.navyLight,
            borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            fontSize: 13, fontWeight: 600,
            color: newRemaining === 0 ? C.green : C.navy,
          }}>
            {newRemaining === 0 ? "✅ Yeh lot completely sell ho jayega" : "📦 Sale ke baad " + newRemaining + " bale bachega"}
          </div>
        )}

        {/* Party */}
        <Label>Party (Buyer) <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>
        {!partyId ? (
          <>
            <input value={partySearch} onChange={e => setPartySearch(e.target.value)}
              placeholder="🔍 Party dhundho..."
              style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14, background: C.bg, marginBottom: 8 }} />
            <div style={{ maxHeight: 160, overflowY: "auto", borderRadius: 10, border: "1px solid " + C.border, background: C.white, marginBottom: 16 }}>
              {filteredParties.length === 0 ? (
                <div style={{ padding: "14px 16px", color: C.inkLight, fontSize: 13, textAlign: "center" }}>Koi party nahi mili</div>
              ) : filteredParties.map(p => (
                <div key={p.id} onClick={() => { setPartyId(p.id); setPartySearch(""); }}
                  style={{ padding: "11px 14px", borderBottom: "1px solid " + C.border, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{p.name}</span>
                  {p.city && <span style={{ fontSize: 12, color: C.inkLight }}>{p.city}</span>}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ background: C.navyLight, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <span style={{ fontWeight: 700, color: C.navy }}>{selectedParty?.name}</span>
              {selectedParty?.city && <span style={{ fontSize: 12, color: C.inkLight, marginLeft: 8 }}>{selectedParty.city}</span>}
            </div>
            <button onClick={() => setPartyId("")} style={{ background: "none", border: "none", color: C.red, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕ Badlo</button>
          </div>
        )}

        {/* Notes */}
        <Label>Notes <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Koi khaas baat..."
          rows={2}
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14, resize: "none", marginBottom: 20 }} />

        {/* Save */}
        <button onClick={handleSave} disabled={busy || balesNum > remaining || balesNum <= 0} style={{
          width: "100%", padding: "15px", borderRadius: 12,
          background: busy || balesNum > remaining || balesNum <= 0 ? C.border : C.green,
          color: C.white, border: "none",
          fontSize: 16, fontWeight: 800, fontFamily: "'Baloo 2'",
          cursor: busy || balesNum > remaining || balesNum <= 0 ? "default" : "pointer",
        }}>
          {busy ? "Saving..." : "✅ " + (balesNum > 0 ? balesNum + " " : "") + "Bale Sell Karein"}
        </button>
      </div>
    </Shell>
  );
}
