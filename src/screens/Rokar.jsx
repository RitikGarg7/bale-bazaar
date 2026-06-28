/**
 * Rokar — Daily Transaction Log
 * Single entry point for all 5 voucher types.
 * Auto-posts to: Cash Book, Party Ledger, Supplier Ledger, Stock Inventory.
 *
 * Vouchers:
 *   F6 Receipt  — money received from party
 *   F5 Payment  — money paid out (expense/supplier)
 *   F8 Sale     — bale sold to party
 *   F9 Purchase — bale purchased (adds to stock)
 *   F4 Contra   — cash ↔ bank transfer
 */
import { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { Shell, TopBar, BottomNav, C, Spinner } from "../components/ui";
import { auth } from "../lib/firebase";
import {
  getFirestore, collection, getDocs, addDoc,
  doc, setDoc, getDoc, deleteDoc, serverTimestamp, updateDoc, increment
} from "firebase/firestore";

const VOUCHER_TYPES = [
  { id: "receipt",  label: "Receipt",  short: "F6", icon: "💰", color: C.green,  desc: "Paisa mila" },
  { id: "payment",  label: "Payment",  short: "F5", icon: "💳", color: C.red,    desc: "Paisa diya" },
  { id: "sale",     label: "Sale",     short: "F8", icon: "💸", color: C.amber,  desc: "Maal becha" },
  { id: "purchase", label: "Purchase", short: "F9", icon: "📦", color: C.navy,   desc: "Maal kharida" },
  { id: "contra",   label: "Contra",   short: "F4", icon: "🔄", color: "#7C3AED", desc: "Cash ↔ Bank" },
];

const EXPENSE_CATS  = ["Transport", "Commission", "Loading", "Salary", "Customs", "Rent", "Other"];
const CATEGORIES    = ["Mix", "Shirts", "T-Shirts", "Jeans", "Trousers", "Jackets", "Kids", "Ladies", "Sweaters", "Shoes"];
const QUALITIES     = ["A", "B", "C", "Mix"];
const COUNTRIES     = ["Korea", "China", "USA", "UK", "Canada", "Australia", "Other"];

function today()  { return new Date().toISOString().slice(0, 10); }
function fmt(n)   { return "₹" + Number(Math.abs(n) || 0).toLocaleString("en-IN"); }
function Label({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{children}</p>;
}

// ── Main Rokar Screen ─────────────────────────────────────────────────────────
export default function Rokar({ nav }) {
  const [date,      setDate]      = useState(today());
  const [entries,   setEntries]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [vType,     setVType]     = useState("receipt");

  useEffect(() => { loadEntries(); }, [date]);

  const loadEntries = async () => {
    setLoading(true);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const _db = getFirestore();
    const snap = await getDocs(collection(_db, "users", uid, "rokar"));
    const all  = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => e.date === date)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
    setEntries(all);
    setLoading(false);
  };

  const handleDelete = async (entry) => {
    if (!window.confirm("Yeh entry delete karein? Linked cash book entries bhi hatenge.")) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const _db = getFirestore();
    await deleteDoc(doc(_db, "users", uid, "rokar", entry.id));
    loadEntries();
  };

  // Totals for the day
  const cashIn   = entries.filter(e => e.cash_dr > 0).reduce((s, e) => s + e.cash_dr, 0);
  const cashOut  = entries.filter(e => e.cash_cr > 0).reduce((s, e) => s + e.cash_cr, 0);
  const bankIn   = entries.filter(e => e.bank_dr > 0).reduce((s, e) => s + e.bank_dr, 0);
  const bankOut  = entries.filter(e => e.bank_cr > 0).reduce((s, e) => s + e.bank_cr, 0);

  const vColor = (type) => VOUCHER_TYPES.find(v => v.id === type)?.color || C.inkLight;
  const vIcon  = (type) => VOUCHER_TYPES.find(v => v.id === type)?.icon  || "📝";

  return (
    <Shell>
      <TopBar title="📒 Rokar" bg={C.navy} />

      {/* Date picker */}
      <div style={{ background: C.white, borderBottom: "1px solid " + C.border, padding: "10px 14px" }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14 }} />
      </div>

      {/* Day summary strip */}
      <div style={{ background: C.navyDark, padding: "10px 12px", display: "flex", gap: 0 }}>
        {[
          { label: "💵 Cash In",  value: fmt(cashIn),  color: "#a5d6a7" },
          { label: "💵 Cash Out", value: fmt(cashOut), color: "#ef9a9a" },
          { label: "🏦 Bank In",  value: fmt(bankIn),  color: "#a5d6a7" },
          { label: "🏦 Bank Out", value: fmt(bankOut), color: "#ef9a9a" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "'Baloo 2'", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Voucher type selector */}
      <div style={{ background: C.white, borderBottom: "1px solid " + C.border, padding: "10px 12px", display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {VOUCHER_TYPES.map(v => (
          <button key={v.id} onClick={() => { setVType(v.id); setShowForm(true); }}
            style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 20, border: "none",
              background: C.bg, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            <span style={{ fontSize: 16 }}>{v.icon}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: v.color }}>{v.label}</div>
              <div style={{ fontSize: 9, color: C.inkLight }}>{v.short}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Entry list */}
      <div style={{ padding: "12px 14px 100px" }}>
        {loading ? <Spinner /> : entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.inkLight }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📒</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Aaj koi entry nahi</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Upar se voucher type chunein</div>
          </div>
        ) : entries.map((e, i) => {
          const v = VOUCHER_TYPES.find(v => v.id === e.type);
          return (
            <div key={e.id} style={{
              background: C.white, borderRadius: 12, padding: "12px 14px",
              marginBottom: 8, border: "1px solid " + C.border,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: (v?.color || C.navy) + "18",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                }}>{v?.icon}</div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: v?.color }}>{v?.label}</span>
                    {e.voucher_no && <span style={{ fontSize: 10, color: C.inkLight, fontWeight: 600 }}>#{e.voucher_no}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: C.ink, fontWeight: 600 }}>{e.particulars}</div>
                  {e.narration && <div style={{ fontSize: 11, color: C.inkLight, marginTop: 2 }}>{e.narration}</div>}

                  {/* Amounts */}
                  <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                    {e.cash_dr > 0 && <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>💵 +{fmt(e.cash_dr)}</span>}
                    {e.cash_cr > 0 && <span style={{ fontSize: 11, color: C.red,   fontWeight: 700 }}>💵 -{fmt(e.cash_cr)}</span>}
                    {e.bank_dr > 0 && <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>🏦 +{fmt(e.bank_dr)}</span>}
                    {e.bank_cr > 0 && <span style={{ fontSize: 11, color: C.red,   fontWeight: 700 }}>🏦 -{fmt(e.bank_cr)}</span>}
                    {e.credit_amount > 0 && <span style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>📋 {fmt(e.credit_amount)} credit</span>}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 15, color: C.ink }}>
                    {fmt(e.amount)}
                  </div>
                  <button
                    onClick={() => handleDelete(e)}
                    style={{
                      background: C.redLight, color: C.red, border: "none",
                      borderRadius: 6, padding: "3px 8px", fontSize: 11,
                      fontWeight: 700, cursor: "pointer",
                    }}>🗑 Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Voucher form */}
      {showForm && (
        <VoucherForm
          type={vType}
          date={date}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadEntries(); }}
          nav={nav}
        />
      )}

      <BottomNav active="rokar" nav={nav} />
    </Shell>
  );
}

// ── Voucher Form ──────────────────────────────────────────────────────────────
function VoucherForm({ type, date, onClose, onSaved }) {
  const { parties, inventory, saveBale, saveParty, loadAll } = useApp();
  const v = VOUCHER_TYPES.find(v => v.id === type);

  // Common
  const [amount,      setAmount]      = useState("");
  const [payMode,     setPayMode]     = useState("cash"); // cash | bank | credit | partial
  const [cashAmt,     setCashAmt]     = useState("");
  const [bankAmt,     setBankAmt]     = useState("");
  const [narration,   setNarration]   = useState("");
  const [busy,        setBusy]        = useState(false);

  // Receipt / Payment
  const [partyId,     setPartyId]     = useState("");
  const [partySearch, setPartySearch] = useState("");
  const [expCat,      setExpCat]      = useState("Transport");

  // Sale
  const [baleId,      setBaleId]      = useState("");
  const [numSold,     setNumSold]     = useState("");
  const [saleRate,    setSaleRate]    = useState("");

  // Purchase
  const [country,     setCountry]     = useState("Korea");
  const [brand,       setBrand]       = useState("");
  const [category,    setCategory]    = useState("Mix");
  const [quality,     setQuality]     = useState("A");
  const [weightKg,    setWeightKg]    = useState("");
  const [numBales,    setNumBales]    = useState("");
  const [buyRate,     setBuyRate]     = useState("");
  const [supplierName,setSupplierName]= useState("");

  // Contra
  const [contraDir,   setContraDir]   = useState("cash_to_bank");

  const selectedParty = parties.find(p => p.id === partyId);
  const selectedBale  = inventory.find(b => b.id === baleId);
  const filteredParties = parties.filter(p =>
    p.name?.toLowerCase().includes(partySearch.toLowerCase()) ||
    p.phone?.includes(partySearch)
  );
  const inStockBales = inventory.filter(b => ((b.num_bales || 0) - (b.sold_bales || 0)) > 0);

  // Live calcs
  const amtNum      = Number(amount) || 0;
  const cashAmtNum  = Number(cashAmt) || 0;
  const bankAmtNum  = Number(bankAmt) || 0;
  const totalWt     = (Number(numBales) || 0) * (Number(weightKg) || 0);
  const purchaseAmt = totalWt * (Number(buyRate) || 0);
  const saleTotal   = (Number(numSold) || 0) * (Number(selectedBale?.weight_kg) || 0) * (Number(saleRate) || 0);

  const handleSave = async () => {
    setBusy(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error("Not logged in");
      const _db = getFirestore();

      // Get voucher number
      const counterRef = doc(_db, "users", uid, "meta", "counters");
      const counterSnap = await getDoc(counterRef);
      const counters = counterSnap.exists() ? counterSnap.data() : {};
      const vNum = (counters[type] || 0) + 1;
      await setDoc(counterRef, { ...counters, [type]: vNum }, { merge: true });
      const voucherNo = type.toUpperCase().slice(0, 2) + "-" + String(vNum).padStart(4, "0");

      // Base rokar entry
      const rokarEntry = {
        type, date, voucher_no: voucherNo,
        ts: Date.now(), updatedAt: serverTimestamp(),
        cash_dr: 0, cash_cr: 0, bank_dr: 0, bank_cr: 0, credit_amount: 0,
      };

      // ── RECEIPT ────────────────────────────────────────────────────────────
      if (type === "receipt") {
        if (!amtNum) return alert("Amount likhein");
        rokarEntry.amount       = amtNum;
        rokarEntry.particulars  = "To " + (selectedParty?.name || "Party");
        rokarEntry.narration    = narration;
        rokarEntry.party_id     = partyId || null;
        rokarEntry.party_name   = selectedParty?.name || null;
        if (payMode === "cash")         { rokarEntry.cash_dr = amtNum; }
        else if (payMode === "bank")    { rokarEntry.bank_dr = amtNum; }
        else if (payMode === "partial") { rokarEntry.cash_dr = cashAmtNum; rokarEntry.bank_dr = bankAmtNum; }

        // Update party outstanding
        if (partyId && selectedParty) {
          const total = payMode === "partial" ? cashAmtNum + bankAmtNum : amtNum;
          await saveParty({ ...selectedParty, outstanding: (selectedParty.outstanding || 0) - total }, partyId);
          await addDoc(collection(_db, "users", uid, "parties", partyId, "ledger"), {
            type: "payment", amount: total, pay_mode: payMode,
            date, note: narration || "Payment received", updatedAt: serverTimestamp(),
          });
        }

        // Cash book entries
        if (rokarEntry.cash_dr > 0) await addCashEntry(_db, uid, date, "in", "cash", rokarEntry.cash_dr, "To " + (selectedParty?.name || narration || "Receipt"), voucherNo);
        if (rokarEntry.bank_dr > 0) await addCashEntry(_db, uid, date, "in", "bank", rokarEntry.bank_dr, "To " + (selectedParty?.name || narration || "Receipt"), voucherNo);
      }

      // ── PAYMENT ────────────────────────────────────────────────────────────
      else if (type === "payment") {
        if (!amtNum) return alert("Amount likhein");
        rokarEntry.amount      = amtNum;
        rokarEntry.particulars = "By " + (narration || expCat);
        rokarEntry.narration   = narration;
        rokarEntry.category    = expCat;
        rokarEntry.party_id    = partyId || null;
        if (payMode === "cash")         { rokarEntry.cash_cr = amtNum; }
        else if (payMode === "bank")    { rokarEntry.bank_cr = amtNum; }
        else if (payMode === "partial") { rokarEntry.cash_cr = cashAmtNum; rokarEntry.bank_cr = bankAmtNum; }

        // Reduce supplier outstanding if linked to party
        if (partyId && selectedParty) {
          const total = payMode === "partial" ? cashAmtNum + bankAmtNum : amtNum;
          await saveParty({ ...selectedParty, outstanding: (selectedParty.outstanding || 0) - total }, partyId);
        }

        if (rokarEntry.cash_cr > 0) await addCashEntry(_db, uid, date, "out", "cash", rokarEntry.cash_cr, "By " + (narration || expCat), voucherNo);
        if (rokarEntry.bank_cr > 0) await addCashEntry(_db, uid, date, "out", "bank", rokarEntry.bank_cr, "By " + (narration || expCat), voucherNo);
      }

      // ── SALE ───────────────────────────────────────────────────────────────
      else if (type === "sale") {
        if (!baleId)    return alert("Bale chunein");
        if (!numSold)   return alert("Kitne bale bechein likhein");
        if (!saleRate)  return alert("Rate likhein");
        const remaining = (selectedBale.num_bales || 0) - (selectedBale.sold_bales || 0);
        if (Number(numSold) > remaining) return alert("Sirf " + remaining + " bale baaki hain");

        const creditAmt = payMode === "cash" ? 0 : payMode === "bank" ? 0 : payMode === "partial" ? saleTotal - cashAmtNum - bankAmtNum : saleTotal;
        const paidCash  = payMode === "cash" ? saleTotal : payMode === "partial" ? cashAmtNum : 0;
        const paidBank  = payMode === "bank" ? saleTotal : payMode === "partial" ? bankAmtNum : 0;

        rokarEntry.amount        = saleTotal;
        rokarEntry.particulars   = "By Sales — " + selectedBale.brand + " " + selectedBale.category;
        rokarEntry.narration     = narration || (selectedParty?.name || "");
        rokarEntry.bale_id       = baleId;
        rokarEntry.party_id      = partyId || null;
        rokarEntry.party_name    = selectedParty?.name || null;
        rokarEntry.num_bales     = Number(numSold);
        rokarEntry.sale_rate     = Number(saleRate);
        rokarEntry.cash_dr       = paidCash;
        rokarEntry.bank_dr       = paidBank;
        rokarEntry.credit_amount = creditAmt;

        // Update stock
        const newSold   = (selectedBale.sold_bales || 0) + Number(numSold);
        const newStatus = newSold >= selectedBale.num_bales ? "sold" : "in_stock";
        await saveBale({ ...selectedBale, sold_bales: newSold, status: newStatus }, baleId);

        // Party ledger + outstanding
        if (partyId && selectedParty && creditAmt > 0) {
          await saveParty({ ...selectedParty, outstanding: (selectedParty.outstanding || 0) + creditAmt }, partyId);
          await addDoc(collection(_db, "users", uid, "parties", partyId, "ledger"), {
            type: "sale", amount: saleTotal, credit_amount: creditAmt,
            paid_now: paidCash + paidBank, pay_mode: payMode,
            num_bales: Number(numSold), sale_rate: Number(saleRate),
            bale_brand: selectedBale.brand, bale_category: selectedBale.category,
            date, note: selectedBale.brand + " " + selectedBale.category + " × " + numSold + " bales",
            updatedAt: serverTimestamp(),
          });
        }

        if (paidCash > 0) await addCashEntry(_db, uid, date, "in", "cash", paidCash, "To Sales — " + selectedBale.brand, voucherNo);
        if (paidBank > 0) await addCashEntry(_db, uid, date, "in", "bank", paidBank, "To Sales — " + selectedBale.brand, voucherNo);
      }

      // ── PURCHASE ───────────────────────────────────────────────────────────
      else if (type === "purchase") {
        if (!brand)    return alert("Brand likhein");
        if (!weightKg) return alert("Weight likhein");
        if (!numBales) return alert("Bales likhein");

        const creditAmt = payMode === "credit" ? purchaseAmt : payMode === "partial" ? purchaseAmt - cashAmtNum - bankAmtNum : 0;
        const paidCash  = payMode === "cash" ? purchaseAmt : payMode === "partial" ? cashAmtNum : 0;
        const paidBank  = payMode === "bank" ? purchaseAmt : payMode === "partial" ? bankAmtNum : 0;

        rokarEntry.amount        = purchaseAmt;
        rokarEntry.particulars   = "By Purchases — " + brand.toUpperCase() + " " + category;
        rokarEntry.narration     = supplierName;
        rokarEntry.supplier_name = supplierName;
        rokarEntry.cash_cr       = paidCash;
        rokarEntry.bank_cr       = paidBank;
        rokarEntry.credit_amount = creditAmt;

        // Add to inventory
        await saveBale({
          country, brand: brand.toUpperCase(), category, quality,
          weight_kg: Number(weightKg), num_bales: Number(numBales),
          price_per_kg: buyRate ? Number(buyRate) : null,
          date, status: "in_stock", sold_bales: 0,
          notes: supplierName ? "Supplier: " + supplierName : "",
          media: [],
        }, null);

        // Supplier ledger (if credit)
        if (creditAmt > 0 && supplierName) {
          await addDoc(collection(_db, "users", uid, "supplier_ledger"), {
            supplier: supplierName, amount: creditAmt, date,
            narration: brand.toUpperCase() + " " + category + " × " + numBales + " bales",
            updatedAt: serverTimestamp(),
          });
        }

        if (paidCash > 0) await addCashEntry(_db, uid, date, "out", "cash", paidCash, "By Purchases — " + brand.toUpperCase(), voucherNo);
        if (paidBank > 0) await addCashEntry(_db, uid, date, "out", "bank", paidBank, "By Purchases — " + brand.toUpperCase(), voucherNo);
      }

      // ── CONTRA ─────────────────────────────────────────────────────────────
      else if (type === "contra") {
        if (!amtNum) return alert("Amount likhein");
        const fromCash = contraDir === "cash_to_bank";
        rokarEntry.amount      = amtNum;
        rokarEntry.particulars = fromCash ? "Cash → Bank (C)" : "Bank → Cash (C)";
        rokarEntry.cash_dr     = fromCash ? 0 : amtNum;
        rokarEntry.cash_cr     = fromCash ? amtNum : 0;
        rokarEntry.bank_dr     = fromCash ? amtNum : 0;
        rokarEntry.bank_cr     = fromCash ? 0 : amtNum;

        await addCashEntry(_db, uid, date, "out", fromCash ? "cash" : "bank", amtNum, fromCash ? "To Bank A/c (C)" : "To Cash A/c (C)", voucherNo);
        await addCashEntry(_db, uid, date, "in",  fromCash ? "bank" : "cash", amtNum, fromCash ? "By Cash A/c (C)" : "By Bank A/c (C)", voucherNo);
      }

      // Save rokar entry
      await addDoc(collection(_db, "users", uid, "rokar"), rokarEntry);

      await loadAll();
      onSaved();
    } catch (e) {
      alert("Save nahi hua: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{
        width: "100%", maxWidth: 430, background: C.white,
        borderRadius: "20px 20px 0 0", maxHeight: "92vh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{v?.icon}</span>
              <div>
                <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 18, color: v?.color }}>{v?.label} Voucher</div>
                <div style={{ fontSize: 11, color: C.inkLight }}>{v?.desc}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.inkLight }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>

          {/* ── RECEIPT ── */}
          {type === "receipt" && (
            <>
              <PartyPicker parties={filteredParties} selected={selectedParty} search={partySearch} onSearch={setPartySearch} onSelect={id => { setPartyId(id); setPartySearch(""); }} onClear={() => setPartyId("")} label="Party (Kisne Diya?) *" />
              <Label>Amount (₹) *</Label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus
                style={inputStyle} />
              <PayModeSelector mode={payMode} onChange={setPayMode} showCredit={false}
                cashAmt={cashAmt} onCashAmt={setCashAmt} bankAmt={bankAmt} onBankAmt={setBankAmt} total={amtNum} />
              <Label>Narration</Label>
              <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="e.g. Against invoice, advance..."
                style={inputStyle} />
            </>
          )}

          {/* ── PAYMENT ── */}
          {type === "payment" && (
            <>
              <Label>Category *</Label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {EXPENSE_CATS.map(c => (
                  <button key={c} onClick={() => setExpCat(c)} style={{
                    padding: "6px 12px", borderRadius: 20, border: "none", fontSize: 12,
                    fontWeight: 600, cursor: "pointer",
                    background: expCat === c ? C.navy : C.bg,
                    color: expCat === c ? C.white : C.inkMid,
                  }}>{c}</button>
                ))}
              </div>
              <Label>Amount (₹) *</Label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus style={inputStyle} />
              <PayModeSelector mode={payMode} onChange={setPayMode} showCredit={false}
                cashAmt={cashAmt} onCashAmt={setCashAmt} bankAmt={bankAmt} onBankAmt={setBankAmt} total={amtNum} />
              <Label>Narration / Description</Label>
              <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="e.g. Delhi truck, Agent commission..." style={inputStyle} />
              <PartyPicker parties={filteredParties} selected={selectedParty} search={partySearch} onSearch={setPartySearch} onSelect={id => { setPartyId(id); setPartySearch(""); }} onClear={() => setPartyId("")} label="Party / Supplier (Optional)" />
            </>
          )}

          {/* ── SALE ── */}
          {type === "sale" && (
            <>
              <Label>Bale Chunein *</Label>
              <div style={{ maxHeight: 160, overflowY: "auto", borderRadius: 10, border: "1px solid " + C.border, background: C.white, marginBottom: 14 }}>
                {inStockBales.length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", color: C.inkLight, fontSize: 13 }}>Koi stock nahi hai</div>
                ) : inStockBales.map(b => {
                  const rem = (b.num_bales || 0) - (b.sold_bales || 0);
                  return (
                    <div key={b.id} onClick={() => { setBaleId(b.id); setSaleRate(b.price_per_kg || ""); }}
                      style={{
                        padding: "10px 14px", borderBottom: "1px solid " + C.border, cursor: "pointer",
                        background: baleId === b.id ? C.navyLight : C.white,
                      }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: baleId === b.id ? C.navy : C.ink }}>{b.brand} — {b.category} (Grade {b.quality})</div>
                      <div style={{ fontSize: 11, color: C.inkLight }}>{rem} bales baaki · {b.weight_kg}kg each</div>
                    </div>
                  );
                })}
              </div>
              {selectedBale && (
                <div style={{ background: C.navyLight, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.navy, fontWeight: 600 }}>
                  ✅ {selectedBale.brand} {selectedBale.category} · {(selectedBale.num_bales || 0) - (selectedBale.sold_bales || 0)} baaki
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <Label>No. of Bales *</Label>
                  <input type="number" value={numSold} onChange={e => setNumSold(e.target.value)} placeholder="0" style={{ ...inputStyle, marginBottom: 0 }} />
                </div>
                <div>
                  <Label>Rate (₹/kg) *</Label>
                  <input type="number" value={saleRate} onChange={e => setSaleRate(e.target.value)} placeholder="0" style={{ ...inputStyle, marginBottom: 0 }} />
                </div>
              </div>
              {saleTotal > 0 && (
                <div style={{ background: C.amberLight, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.amberDark }}>Total: {Number(numSold) * (selectedBale?.weight_kg || 0)} kg</span>
                  <span style={{ fontWeight: 800, color: C.amberDark, fontFamily: "'Baloo 2'" }}>{fmt(saleTotal)}</span>
                </div>
              )}
              <PayModeSelector mode={payMode} onChange={setPayMode} showCredit={true}
                cashAmt={cashAmt} onCashAmt={setCashAmt} bankAmt={bankAmt} onBankAmt={setBankAmt} total={saleTotal} />
              <PartyPicker parties={filteredParties} selected={selectedParty} search={partySearch} onSearch={setPartySearch} onSelect={id => { setPartyId(id); setPartySearch(""); }} onClear={() => setPartyId("")} label="Party (Buyer)" />
              <Label>Narration</Label>
              <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="e.g. 2 bales MSM jeans..." style={inputStyle} />
            </>
          )}

          {/* ── PURCHASE ── */}
          {type === "purchase" && (
            <>
              <Label>Country *</Label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {COUNTRIES.map(c => (
                  <button key={c} onClick={() => setCountry(c)} style={{
                    padding: "7px 14px", borderRadius: 20, border: "none", fontSize: 13,
                    fontWeight: 600, cursor: "pointer",
                    background: country === c ? C.navy : C.bg,
                    color: country === c ? C.white : C.inkMid,
                  }}>{c}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <Label>Brand *</Label>
                  <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. MSM"
                    style={{ ...inputStyle, marginBottom: 0, textTransform: "uppercase" }} />
                </div>
                <div>
                  <Label>Supplier</Label>
                  <input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Kim Trading..."
                    style={{ ...inputStyle, marginBottom: 0 }} />
                </div>
              </div>
              <Label>Category *</Label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    padding: "6px 12px", borderRadius: 20, border: "none", fontSize: 12,
                    fontWeight: 600, cursor: "pointer",
                    background: category === c ? C.amber : C.bg,
                    color: category === c ? C.white : C.inkMid,
                  }}>{c}</button>
                ))}
              </div>
              <Label>Grade *</Label>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {QUALITIES.map(q => (
                  <button key={q} onClick={() => setQuality(q)} style={{
                    flex: 1, padding: "9px", borderRadius: 10, border: "none",
                    fontSize: 13, fontWeight: 800, cursor: "pointer",
                    background: quality === q ? C.navy : C.bg,
                    color: quality === q ? C.white : C.inkMid,
                  }}>{q === "Mix" ? "Mix" : "Grade " + q}</button>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div><Label>Wt/Bale (kg)</Label><input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="45" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                <div><Label>No. Bales</Label><input type="number" value={numBales} onChange={e => setNumBales(e.target.value)} placeholder="10" style={{ ...inputStyle, marginBottom: 0 }} /></div>
                <div><Label>Buy ₹/kg</Label><input type="number" value={buyRate} onChange={e => setBuyRate(e.target.value)} placeholder="255" style={{ ...inputStyle, marginBottom: 0 }} /></div>
              </div>
              {purchaseAmt > 0 && (
                <div style={{ background: C.navyLight, borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: C.navy }}>Total: {totalWt} kg</span>
                  <span style={{ fontWeight: 800, color: C.navy, fontFamily: "'Baloo 2'" }}>{fmt(purchaseAmt)}</span>
                </div>
              )}
              <PayModeSelector mode={payMode} onChange={setPayMode} showCredit={true}
                cashAmt={cashAmt} onCashAmt={setCashAmt} bankAmt={bankAmt} onBankAmt={setBankAmt} total={purchaseAmt} />
            </>
          )}

          {/* ── CONTRA ── */}
          {type === "contra" && (
            <>
              <Label>Transfer Direction *</Label>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[["cash_to_bank", "💵 Cash → 🏦 Bank"], ["bank_to_cash", "🏦 Bank → 💵 Cash"]].map(([d, label]) => (
                  <button key={d} onClick={() => setContraDir(d)} style={{
                    flex: 1, padding: "11px 8px", borderRadius: 10, border: "none",
                    background: contraDir === d ? "#7C3AED" : C.bg,
                    color: contraDir === d ? C.white : C.inkMid,
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}>{label}</button>
                ))}
              </div>
              <Label>Amount (₹) *</Label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus style={inputStyle} />
              <Label>Narration</Label>
              <input value={narration} onChange={e => setNarration(e.target.value)} placeholder="e.g. Cash deposit in bank" style={inputStyle} />
            </>
          )}
        </div>

        {/* Save button */}
        <div style={{ padding: "12px 20px max(16px, env(safe-area-inset-bottom))", borderTop: "1px solid " + C.border, flexShrink: 0 }}>
          <button onClick={handleSave} disabled={busy} style={{
            width: "100%", padding: "14px", borderRadius: 12,
            background: busy ? C.border : v?.color,
            color: C.white, border: "none",
            fontSize: 16, fontWeight: 800, fontFamily: "'Baloo 2'",
            cursor: busy ? "default" : "pointer",
          }}>
            {busy ? "Saving..." : "✅ " + v?.label + " Save Karein"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helper: add cash/bank book entry ─────────────────────────────────────────
async function addCashEntry(_db, uid, date, type, account, amount, particulars, voucherNo) {
  await addDoc(collection(_db, "users", uid, "cashbook_entries"), {
    date, type, account, amount, particulars,
    voucher_no: voucherNo, source: "rokar",
    ts: Date.now(), updatedAt: serverTimestamp(),
  });
}

// ── Reusable components ───────────────────────────────────────────────────────
function PayModeSelector({ mode, onChange, showCredit, cashAmt, onCashAmt, bankAmt, onBankAmt, total }) {
  const modes = [
    { id: "cash",    label: "💵 Cash"    },
    { id: "bank",    label: "🏦 Bank"    },
    { id: "partial", label: "⚖️ Partial" },
  ];
  if (showCredit) modes.push({ id: "credit", label: "📋 Credit" });

  return (
    <>
      <Label>Payment Mode *</Label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {modes.map(m => (
          <button key={m.id} onClick={() => onChange(m.id)} style={{
            flex: 1, padding: "9px 4px", borderRadius: 10, border: "none",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: mode === m.id ? C.navy : C.bg,
            color: mode === m.id ? C.white : C.inkMid,
          }}>{m.label}</button>
        ))}
      </div>
      {mode === "partial" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div>
            <Label>Cash (₹)</Label>
            <input type="number" value={cashAmt} onChange={e => onCashAmt(e.target.value)} placeholder="0" style={{ ...inputStyle, marginBottom: 0 }} />
          </div>
          <div>
            <Label>Bank (₹)</Label>
            <input type="number" value={bankAmt} onChange={e => onBankAmt(e.target.value)} placeholder="0" style={{ ...inputStyle, marginBottom: 0 }} />
          </div>
        </div>
      )}
    </>
  );
}

function PartyPicker({ parties, selected, search, onSearch, onSelect, onClear, label }) {
  return (
    <>
      <Label>{label}</Label>
      {!selected ? (
        <>
          <input value={search} onChange={e => onSearch(e.target.value)} placeholder="🔍 Party dhundho..."
            style={{ ...inputStyle, marginBottom: 8 }} />
          {search && (
            <div style={{ maxHeight: 140, overflowY: "auto", borderRadius: 10, border: "1px solid " + C.border, marginBottom: 14 }}>
              {parties.length === 0 ? (
                <div style={{ padding: "12px 14px", color: C.inkLight, fontSize: 13 }}>Nahi mili</div>
              ) : parties.map(p => (
                <div key={p.id} onClick={() => onSelect(p.id)}
                  style={{ padding: "10px 14px", borderBottom: "1px solid " + C.border, cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: C.inkLight }}>{p.city}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ background: C.navyLight, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ fontWeight: 700, color: C.navy }}>{selected.name}</span>
          <button onClick={onClear} style={{ background: "none", border: "none", color: C.red, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕</button>
        </div>
      )}
    </>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1.5px solid " + C.border, fontSize: 14,
  color: C.ink, background: C.white, marginBottom: 14,
  boxSizing: "border-box",
};
