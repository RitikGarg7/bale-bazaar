import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Shell, TopBar, C } from "../components/ui";
import { db } from "../lib/firebase";

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, color: C.inkLight, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Baloo 2'", color: color || C.ink }}>{value}</div>
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

  const [numSold,    setNumSold]    = useState("");
  const [partyId,    setPartyId]    = useState("");
  const [saleRate,   setSaleRate]   = useState(bale.price_per_kg || "");
  const [saleDate,   setSaleDate]   = useState(new Date().toISOString().slice(0, 10));
  const [notes,      setNotes]      = useState("");
  const [busy,       setBusy]       = useState(false);
  const [partySearch,setPartySearch]= useState("");

  const filteredParties = parties.filter(p =>
    p.name?.toLowerCase().includes(partySearch.toLowerCase()) ||
    p.phone?.includes(partySearch)
  );

  const selectedParty = parties.find(p => p.id === partyId);

  // Live calculations
  const balesNum    = Number(numSold) || 0;
  const rateNum     = Number(saleRate) || 0;
  const totalWt     = balesNum * (Number(bale.weight_kg) || 0);
  const saleAmt     = totalWt * rateNum;
  const costAmt     = totalWt * (Number(bale.price_per_kg) || 0);
  const profit      = bale.price_per_kg ? saleAmt - costAmt : null;
  const newRemaining = remaining - balesNum;

  const handleSave = async () => {
    if (!numSold || balesNum <= 0)    return alert("Kitne bale bechein? likhein");
    if (balesNum > remaining)          return alert(`Sirf ${remaining} bale baaki hain`);
    if (!saleRate)                     return alert("Sale rate likhein");

    setBusy(true);
    try {
      const auth = (await import("../lib/firebase")).auth;
      const uid  = auth.currentUser?.uid;
      if (!uid) throw new Error("Not logged in");

      // 1. Save sale record under the bale
      const { collection, doc, setDoc, serverTimestamp, getFirestore } = await import("firebase/firestore");
      const { initializeApp, getApps } = await import("firebase/app");
      const _db = getFirestore();

      const saleRef = doc(collection(_db, "users", uid, "inventory", bale.id, "sales"));
      await setDoc(saleRef, {
        num_bales:    balesNum,
        weight_kg:    bale.weight_kg,
        total_weight: totalWt,
        sale_rate:    rateNum,
        total_amount: saleAmt,
        profit:       profit,
        party_id:     partyId || null,
        party_name:   selectedParty?.name || null,
        date:         saleDate,
        notes:        notes.trim(),
        updatedAt:    serverTimestamp(),
      });

      // 2. Update bale — increment sold_bales, update status
      const newSoldBales = (bale.sold_bales || 0) + balesNum;
      const newStatus    = newSoldBales >= bale.num_bales ? "sold" : "in_stock";

      await saveBale({
        ...bale,
        sold_bales: newSoldBales,
        status:     newStatus,
      }, bale.id);

      // 3. Update party outstanding (they owe you the sale amount)
      if (partyId && selectedParty) {
        const currentOutstanding = selectedParty.outstanding || 0;
        await saveParty({
          ...selectedParty,
          outstanding: currentOutstanding + saleAmt,
        }, partyId);
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
        <div style={{
          background: C.navyLight, borderRadius: 14, padding: "14px 16px",
          marginBottom: 20, display: "flex", justifyContent: "space-around",
        }}>
          <Stat label="Brand"     value={bale.brand} />
          <Stat label="Category"  value={bale.category} />
          <Stat label="Remaining" value={remaining} color={remaining <= 2 ? C.red : C.green} />
        </div>

        {/* Number of bales sold */}
        <Label>Kitne Bale Bechein? * <span style={{ color: C.inkLight, fontWeight: 400 }}>({remaining} baaki hain)</span></Label>
        <input
          type="number"
          value={numSold}
          onChange={e => setNumSold(e.target.value)}
          placeholder={`Max ${remaining}`}
          max={remaining}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 10,
            border: `1.5px solid ${balesNum > remaining ? C.red : C.border}`,
            fontSize: 22, fontWeight: 800, marginBottom: 4,
            color: balesNum > remaining ? C.red : C.ink,
            fontFamily: "'Baloo 2'",
          }}
        />
        {balesNum > remaining && (
          <p style={{ fontSize: 12, color: C.red, marginBottom: 12 }}>⚠️ Sirf {remaining} bale baaki hain</p>
        )}
        <div style={{ height: 12 }} />

        {/* Sale rate */}
        <Label>Sale Rate (₹/kg) *</Label>
        <input
          type="number"
          value={saleRate}
          onChange={e => setSaleRate(e.target.value)}
          placeholder="e.g. 400"
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 10,
            border: `1.5px solid ${C.border}`, fontSize: 15, marginBottom: 16,
          }}
        />

        {/* Sale date */}
        <Label>Sale Date *</Label>
        <input
          type="date"
          value={saleDate}
          onChange={e => setSaleDate(e.target.value)}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 10,
            border: `1.5px solid ${C.border}`, fontSize: 14,
            color: C.ink, background: C.white, marginBottom: 16,
          }}
        />

        {/* Live calculation */}
        {balesNum > 0 && rateNum > 0 && (
          <div style={{
            background: C.amberLight, borderRadius: 14, padding: "14px 16px",
            marginBottom: 20, display: "flex", justifyContent: "space-around",
            border: `1px solid ${C.amber}33`,
          }}>
            <Stat label="Total Wt"   value={`${totalWt} kg`} />
            <Stat label="Sale Amt"   value={`₹${saleAmt.toLocaleString("en-IN")}`} color={C.amber} />
            {profit !== null && (
              <Stat
                label="Profit"
                value={`₹${Math.abs(profit).toLocaleString("en-IN")}`}
                color={profit >= 0 ? C.green : C.red}
              />
            )}
          </div>
        )}

        {/* New remaining preview */}
        {balesNum > 0 && balesNum <= remaining && (
          <div style={{
            background: newRemaining === 0 ? C.greenLight : C.navyLight,
            borderRadius: 10, padding: "10px 14px", marginBottom: 16,
            fontSize: 13, fontWeight: 600,
            color: newRemaining === 0 ? C.green : C.navy,
          }}>
            {newRemaining === 0
              ? "✅ Yeh lot completely sell ho jayega"
              : `📦 Sale ke baad ${newRemaining} bale bacha rahega`}
          </div>
        )}

        {/* Party selection */}
        <Label>Party (Buyer) <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>
        {!partyId ? (
          <>
            <input
              value={partySearch}
              onChange={e => setPartySearch(e.target.value)}
              placeholder="🔍 Party dhundho..."
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10,
                border: `1.5px solid ${C.border}`, fontSize: 14,
                background: C.bg, marginBottom: 8,
              }}
            />
            <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white }}>
              {filteredParties.length === 0 ? (
                <div style={{ padding: "14px 16px", color: C.inkLight, fontSize: 13, textAlign: "center" }}>
                  Koi party nahi mili
                </div>
              ) : (
                filteredParties.map(p => (
                  <div key={p.id} onClick={() => { setPartyId(p.id); setPartySearch(""); }}
                    style={{
                      padding: "11px 14px", borderBottom: `1px solid ${C.border}`,
                      cursor: "pointer", display: "flex", justifyContent: "space-between",
                    }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{p.name}</span>
                    {p.city && <span style={{ fontSize: 12, color: C.inkLight }}>{p.city}</span>}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div style={{
            background: C.navyLight, borderRadius: 10, padding: "12px 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16,
          }}>
            <div>
              <span style={{ fontWeight: 700, color: C.navy }}>{selectedParty?.name}</span>
              {selectedParty?.city && <span style={{ fontSize: 12, color: C.inkLight, marginLeft: 8 }}>{selectedParty.city}</span>}
            </div>
            <button onClick={() => setPartyId("")} style={{
              background: "none", border: "none", color: C.red,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>✕ Badlo</button>
          </div>
        )}

        {/* Notes */}
        <div style={{ marginTop: 16 }}>
          <Label>Notes <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Koi khaas baat..."
            rows={2}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              border: `1.5px solid ${C.border}`, fontSize: 14,
              resize: "none", marginBottom: 20,
            }} />
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={busy || balesNum > remaining || balesNum <= 0} style={{
          width: "100%", padding: "15px", borderRadius: 12,
          background: busy || balesNum > remaining || balesNum <= 0 ? C.border : C.green,
          color: C.white, border: "none",
          fontSize: 16, fontWeight: 800, fontFamily: "'Baloo 2'",
          cursor: busy || balesNum > remaining || balesNum <= 0 ? "default" : "pointer",
        }}>
          {busy ? "Saving..." : `✅ ${balesNum > 0 ? balesNum : ""} Bale Sell Karein`}
        </button>
      </div>
    </Shell>
  );
}
