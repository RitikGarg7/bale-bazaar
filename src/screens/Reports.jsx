import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Shell, TopBar, BottomNav, Card, C, Spinner } from "../components/ui";
import { auth } from "../lib/firebase";
import {
  getFirestore, collection, getDocs, addDoc,
  query, orderBy, where, doc, setDoc, getDoc, serverTimestamp
} from "firebase/firestore";

function fmt(n)   { return "₹" + Math.abs(Number(n) || 0).toLocaleString("en-IN"); }
function today()  { return new Date().toISOString().slice(0, 10); }
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function Label({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>{children}</p>;
}

function SectionTitle({ children }) {
  return <p style={{ fontSize: 13, fontWeight: 800, color: C.ink, fontFamily: "'Baloo 2'", marginBottom: 12 }}>{children}</p>;
}

// ── Main Reports Screen ───────────────────────────────────────────────────────
export default function Reports({ nav }) {
  const [active, setActive] = useState("home"); // home | pl | cashbook | outstanding

  if (active === "pl")          return <StockPL      onBack={() => setActive("home")} nav={nav} />;
  if (active === "cashbook")    return <CashBook     onBack={() => setActive("home")} nav={nav} />;
  if (active === "outstanding") return <Outstanding  onBack={() => setActive("home")} nav={nav} />;

  const cards = [
    { id: "pl",          icon: "📊", label: "Stock P&L",          desc: "Har lot ka profit/loss" },
    { id: "cashbook",    icon: "💵", label: "Cash & Bank Book",    desc: "Daily cash aur bank transactions" },
    { id: "outstanding", icon: "📋", label: "Party Outstandings",  desc: "Kaun kitna dega" },
  ];

  return (
    <Shell>
      <TopBar title="📊 Reports" bg={C.navy} />
      <div style={{ padding: "16px 16px 100px" }}>
        {cards.map(c => (
          <Card key={c.id} onClick={() => setActive(c.id)} style={{ marginBottom: 10, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 28 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Baloo 2'", fontWeight: 700, fontSize: 15, color: C.ink }}>{c.label}</div>
                <div style={{ fontSize: 12, color: C.inkLight, marginTop: 2 }}>{c.desc}</div>
              </div>
              <span style={{ color: C.border, fontSize: 22 }}>›</span>
            </div>
          </Card>
        ))}
      </div>
      <BottomNav active="reports" nav={nav} />
    </Shell>
  );
}

// ── Stock P&L ─────────────────────────────────────────────────────────────────
function StockPL({ onBack, nav }) {
  const { inventory, loadAll, loading } = useApp();
  const [sales, setSales] = useState({});

  useEffect(() => {
    loadAll();
    loadSales();
  }, []);

  const loadSales = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const _db = getFirestore();
    const salesMap = {};
    for (const bale of inventory) {
      if (!bale.id) continue;
      const ref  = collection(_db, "users", uid, "inventory", bale.id, "sales");
      const snap = await getDocs(query(ref, orderBy("date", "desc")));
      salesMap[bale.id] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    setSales(salesMap);
  };

  useEffect(() => { if (inventory.length) loadSales(); }, [inventory]);

  const totalBuyCost   = inventory.reduce((s, b) => s + (Number(b.weight_kg) || 0) * (Number(b.num_bales) || 0) * (Number(b.price_per_kg) || 0), 0);
  const totalSaleAmt   = Object.values(sales).flat().reduce((s, e) => s + (Number(e.total_amount) || 0), 0);
  const totalExpenses  = Object.values(sales).flat().reduce((s, e) => s + (Number(e.total_expenses) || 0), 0);
  const totalProfit    = totalSaleAmt - totalExpenses - totalBuyCost;

  return (
    <Shell>
      <TopBar title="📊 Stock P&L" bg={C.navy} onBack={onBack} />
      <div style={{ padding: "14px 16px 100px" }}>

        {/* Summary banner */}
        <div style={{
          background: "linear-gradient(135deg, " + C.navyDark + ", " + C.navy + ")",
          borderRadius: 16, padding: "16px 20px", marginBottom: 16,
          display: "flex", justifyContent: "space-around",
        }}>
          {[
            { label: "Total Cost",   value: fmt(totalBuyCost),  color: C.redLight  },
            { label: "Total Sales",  value: fmt(totalSaleAmt),  color: C.amberLight },
            { label: "Net Profit",   value: fmt(totalProfit),   color: totalProfit >= 0 ? "#a5d6a7" : "#ef9a9a" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginBottom: 4, textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "'Baloo 2'" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {loading ? <Spinner /> : inventory.map(bale => {
          const baleSales    = sales[bale.id] || [];
          const soldQty      = baleSales.reduce((s, e) => s + (Number(e.num_bales) || 0), 0);
          const soldWt       = baleSales.reduce((s, e) => s + (Number(e.total_weight) || 0), 0);
          const saleRevenue  = baleSales.reduce((s, e) => s + (Number(e.total_amount) || 0), 0);
          const saleExpenses = baleSales.reduce((s, e) => s + (Number(e.total_expenses) || 0), 0);
          const buyCost      = soldWt * (Number(bale.price_per_kg) || 0);
          const profit       = saleRevenue - saleExpenses - buyCost;
          const remaining    = (Number(bale.num_bales) || 0) - (Number(bale.sold_bales) || 0);

          return (
            <Card key={bale.id} style={{ marginBottom: 10, padding: "14px 16px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 15, color: C.ink }}>{bale.brand}</span>
                <span style={{ fontSize: 12, color: C.inkLight }}>·</span>
                <span style={{ fontSize: 13, color: C.inkMid }}>{bale.category}</span>
                <span style={{ fontSize: 12, color: C.inkLight }}>·</span>
                <span style={{ fontSize: 12, color: C.inkLight }}>Grade {bale.quality}</span>
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 20,
                  background: remaining === 0 ? C.greenLight : C.amberLight,
                  color: remaining === 0 ? C.green : C.amberDark,
                }}>
                  {remaining === 0 ? "Sold Out" : remaining + " baaki"}
                </span>
              </div>

              {/* Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: baleSales.length > 0 ? 10 : 0 }}>
                <MiniStat label="Bought"    value={bale.num_bales + " bales"} />
                <MiniStat label="Sold"      value={soldQty + " bales"} />
                <MiniStat label="Buy Cost"  value={bale.price_per_kg ? fmt(Number(bale.weight_kg) * Number(bale.num_bales) * Number(bale.price_per_kg)) : "—"} />
              </div>

              {baleSales.length > 0 && (
                <>
                  <div style={{ height: 1, background: C.border, marginBottom: 10 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <MiniStat label="Sale Amt"   value={fmt(saleRevenue)} />
                    <MiniStat label="Kharche"    value={fmt(saleExpenses)} color={C.red} />
                    <MiniStat label="Profit"     value={fmt(profit)}       color={profit >= 0 ? C.green : C.red} />
                  </div>

                  {/* Sale breakdown */}
                  {baleSales.map((s, i) => (
                    <div key={i} style={{
                      marginTop: 8, padding: "8px 10px", background: C.bg,
                      borderRadius: 8, fontSize: 12, color: C.inkMid,
                      display: "flex", justifyContent: "space-between",
                    }}>
                      <span>{s.date ? new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""} · {s.num_bales} bales · ₹{s.sale_rate}/kg</span>
                      <span style={{ fontWeight: 700, color: C.ink }}>{fmt(s.total_amount)}</span>
                    </div>
                  ))}
                </>
              )}
            </Card>
          );
        })}
      </div>
      <BottomNav active="reports" nav={nav} />
    </Shell>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.inkLight, fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: color || C.ink }}>{value}</div>
    </div>
  );
}

// ── Cash & Bank Book ──────────────────────────────────────────────────────────
function CashBook({ onBack, nav }) {
  const [mode,         setMode]         = useState("cash"); // cash | bank
  const [date,         setDate]         = useState(today());
  const [entries,      setEntries]      = useState([]);
  const [openingBal,   setOpeningBal]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [showOpening,  setShowOpening]  = useState(false);
  const [entryType,    setEntryType]    = useState("in");
  const [entryAmt,     setEntryAmt]     = useState("");
  const [entryDesc,    setEntryDesc]    = useState("");
  const [entryCategory,setEntryCategory]= useState("Transport");
  const [busy,         setBusy]         = useState(false);

  const EXPENSE_CATS = ["Transport", "Commission", "Loading", "Salary", "Customs", "Other"];

  useEffect(() => { loadData(); }, [mode, date]);

  const loadData = async () => {
    setLoading(true);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const _db = getFirestore();

    // Load opening balance for this date + mode
    const obRef  = doc(_db, "users", uid, "cashbook", mode + "_" + date);
    const obSnap = await getDoc(obRef);
    setOpeningBal(obSnap.exists() ? (obSnap.data().opening || 0) : 0);

    // Load manual entries
    const ref  = collection(_db, "users", uid, "cashbook_entries");
    const q    = query(ref, where("mode", "==", mode), where("date", "==", date), orderBy("updatedAt", "asc"));
    const snap = await getDocs(q);
    const manual = snap.docs.map(d => ({ id: d.id, ...d.data(), source: "manual" }));

    // Pull party ledger entries for today
    const partyEntries = [];
    const partiesSnap = await getDocs(collection(_db, "users", uid, "parties"));
    for (const pd of partiesSnap.docs) {
      const lq = query(
        collection(_db, "users", uid, "parties", pd.id, "ledger"),
        where("date", "==", date)
      );
      const lsnap = await getDocs(lq);
      for (const ld of lsnap.docs) {
        const data = ld.data();
        if (data.type === "payment") {
          partyEntries.push({
            id: ld.id, type: "in", amount: data.amount,
            desc: "Payment — " + pd.data().name,
            date, mode: data.pay_mode === "bank" ? "bank" : "cash",
            source: "party", updatedAt: data.updatedAt,
          });
        }
        if (data.type === "sale" && data.pay_mode === "cash" && mode === "cash") {
          partyEntries.push({
            id: ld.id + "_sale", type: "in", amount: data.paid_now || 0,
            desc: "Sale (cash) — " + (data.note || ""),
            date, mode: "cash", source: "sale", updatedAt: data.updatedAt,
          });
        }
        if (data.type === "sale" && data.pay_mode === "bank" && mode === "bank") {
          partyEntries.push({
            id: ld.id + "_sale", type: "in", amount: data.paid_now || 0,
            desc: "Sale (bank) — " + (data.note || ""),
            date, mode: "bank", source: "sale", updatedAt: data.updatedAt,
          });
        }
        // Sale expenses auto-flow
        if (data.type === "sale" && data.expenses?.length > 0) {
          data.expenses.forEach((exp, ei) => {
            partyEntries.push({
              id: ld.id + "_exp_" + ei, type: "out", amount: exp.amount,
              desc: exp.type + (exp.note ? " — " + exp.note : ""),
              date, mode: "cash", source: "expense", updatedAt: data.updatedAt,
            });
          });
        }
      }
    }

    const filtered = partyEntries.filter(e => e.mode === mode && e.amount > 0);
    setEntries([...manual, ...filtered].sort((a, b) => {
      const ta = a.updatedAt?.seconds || 0;
      const tb = b.updatedAt?.seconds || 0;
      return ta - tb;
    }));
    setLoading(false);
  };

  const saveOpening = async (val) => {
    const uid = auth.currentUser?.uid;
    const _db = getFirestore();
    await setDoc(doc(_db, "users", uid, "cashbook", mode + "_" + date), {
      opening: Number(val), date, mode, updatedAt: serverTimestamp(),
    });
    setOpeningBal(Number(val));
    setShowOpening(false);
  };

  const addEntry = async () => {
    if (!entryAmt || Number(entryAmt) <= 0) return alert("Amount likhein");
    setBusy(true);
    const uid = auth.currentUser?.uid;
    const _db = getFirestore();
    await addDoc(collection(_db, "users", uid, "cashbook_entries"), {
      mode, date, type: entryType,
      amount:   Number(entryAmt),
      desc:     entryType === "out" ? entryCategory + (entryDesc ? " — " + entryDesc : "") : entryDesc,
      category: entryType === "out" ? entryCategory : "receipt",
      updatedAt: serverTimestamp(),
    });
    setEntryAmt(""); setEntryDesc(""); setShowForm(false);
    await loadData();
    setBusy(false);
  };

  // Running balance
  let balance = openingBal;
  const rows = entries.map(e => {
    const amt = Number(e.amount) || 0;
    if (e.type === "in")  balance += amt;
    if (e.type === "out") balance -= amt;
    return { ...e, runningBal: balance };
  });

  const totalIn  = entries.filter(e => e.type === "in").reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalOut = entries.filter(e => e.type === "out").reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const closing  = openingBal + totalIn - totalOut;

  return (
    <Shell>
      <TopBar title="💵 Cash & Bank Book" bg={C.navy} onBack={onBack} />

      {/* Mode toggle */}
      <div style={{ display: "flex", background: C.white, borderBottom: "1px solid " + C.border }}>
        {[["cash", "💵 Cash"], ["bank", "🏦 Bank"]].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: "12px", border: "none", cursor: "pointer",
            background: mode === m ? C.navy : C.white,
            color: mode === m ? C.white : C.inkMid,
            fontWeight: 700, fontSize: 14, fontFamily: "'Baloo 2'",
            borderBottom: "3px solid " + (mode === m ? C.amber : "transparent"),
          }}>{label}</button>
        ))}
      </div>

      {/* Date picker */}
      <div style={{ padding: "10px 16px", background: C.white, borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 12 }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 14 }} />
        <button onClick={() => setShowOpening(true)} style={{
          background: C.navyLight, color: C.navy, border: "none",
          borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Opening: {fmt(openingBal)}</button>
      </div>

      <div style={{ padding: "12px 16px 110px" }}>

        {/* Summary row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Opening", value: fmt(openingBal), color: C.navy },
            { label: "In",      value: fmt(totalIn),    color: C.green },
            { label: "Out",     value: fmt(totalOut),   color: C.red },
            { label: "Closing", value: fmt(closing),    color: closing >= 0 ? C.navy : C.red },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: C.white, borderRadius: 10, padding: "8px", textAlign: "center", border: "1px solid " + C.border }}>
              <div style={{ fontSize: 9, color: C.inkLight, fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: s.color, fontFamily: "'Baloo 2'", marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Entries */}
        {loading ? <Spinner /> : rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: C.inkLight, fontSize: 13 }}>
            Aaj koi transaction nahi hai
          </div>
        ) : rows.map((e, i) => (
          <div key={e.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 0", borderBottom: "1px solid " + C.border,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
              background: e.type === "in" ? C.greenLight : C.redLight,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>
              {e.type === "in" ? "↓" : "↑"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{e.desc || "—"}</div>
              {e.source !== "manual" && (
                <div style={{ fontSize: 10, color: C.inkLight, marginTop: 2 }}>Auto · {e.source}</div>
              )}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: e.type === "in" ? C.green : C.red }}>
                {e.type === "in" ? "+" : "-"}{fmt(e.amount)}
              </div>
              <div style={{ fontSize: 10, color: C.inkLight }}>{fmt(e.runningBal)}</div>
            </div>
          </div>
        ))}

        {/* Add entry button */}
        <button onClick={() => setShowForm(true)} style={{
          width: "100%", marginTop: 16, padding: "12px", borderRadius: 10,
          border: "1.5px dashed " + C.border, background: "transparent",
          color: C.inkMid, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ Manual Entry Add Karein</button>
      </div>

      {/* Opening balance sheet */}
      {showOpening && (
        <BottomSheet onClose={() => setShowOpening(false)} title={"Opening Balance — " + (mode === "cash" ? "Cash" : "Bank")}>
          <Label>Opening Balance (₹)</Label>
          <input type="number" defaultValue={openingBal} id="ob_input" autoFocus
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 18, fontWeight: 700, marginBottom: 16 }} />
          <button onClick={() => saveOpening(document.getElementById("ob_input").value)} style={{
            width: "100%", padding: "13px", borderRadius: 10, background: C.navy,
            color: C.white, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>Save</button>
        </BottomSheet>
      )}

      {/* Add entry sheet */}
      {showForm && (
        <BottomSheet onClose={() => setShowForm(false)} title="Entry Add Karein">
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["in", "↓ Money In", C.green], ["out", "↑ Money Out", C.red]].map(([t, label, color]) => (
              <button key={t} onClick={() => setEntryType(t)} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none",
                background: entryType === t ? color : C.bg,
                color: entryType === t ? C.white : C.inkMid,
                fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>

          {entryType === "out" && (
            <>
              <Label>Category</Label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {EXPENSE_CATS.map(c => (
                  <button key={c} onClick={() => setEntryCategory(c)} style={{
                    padding: "6px 12px", borderRadius: 20, border: "none", fontSize: 12,
                    fontWeight: 600, cursor: "pointer",
                    background: entryCategory === c ? C.navy : C.bg,
                    color: entryCategory === c ? C.white : C.inkMid,
                  }}>{c}</button>
                ))}
              </div>
            </>
          )}

          <Label>Amount (₹) *</Label>
          <input type="number" value={entryAmt} onChange={e => setEntryAmt(e.target.value)}
            placeholder="0" autoFocus
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 18, fontWeight: 700, marginBottom: 12 }} />

          <Label>Description</Label>
          <input value={entryDesc} onChange={e => setEntryDesc(e.target.value)}
            placeholder={entryType === "in" ? "e.g. Advance from Ramesh" : "e.g. Delhi truck"}
            style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14, marginBottom: 16 }} />

          <button onClick={addEntry} disabled={busy} style={{
            width: "100%", padding: "13px", borderRadius: 10,
            background: busy ? C.border : (entryType === "in" ? C.green : C.red),
            color: C.white, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer",
          }}>{busy ? "Saving..." : "✅ Add Karein"}</button>
        </BottomSheet>
      )}

      <BottomNav active="reports" nav={nav} />
    </Shell>
  );
}

// ── Party Outstanding ─────────────────────────────────────────────────────────
function Outstanding({ onBack, nav }) {
  const { parties, loadAll, loading } = useApp();

  useEffect(() => { loadAll(); }, []);

  const withBalance = [...parties]
    .filter(p => p.outstanding !== 0 && p.outstanding != null)
    .sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0));

  const totalOwed = withBalance.filter(p => p.outstanding > 0).reduce((s, p) => s + p.outstanding, 0);
  const totalAdv  = withBalance.filter(p => p.outstanding < 0).reduce((s, p) => s + Math.abs(p.outstanding), 0);

  return (
    <Shell>
      <TopBar title="📋 Party Outstandings" bg={C.navy} onBack={onBack} />
      <div style={{ padding: "14px 16px 100px" }}>

        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ background: C.redLight, borderRadius: 12, padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 4 }}>TOTAL BAAKI</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.red, fontFamily: "'Baloo 2'" }}>{fmt(totalOwed)}</div>
          </div>
          <div style={{ background: C.greenLight, borderRadius: 12, padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 4 }}>TOTAL ADVANCE</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.green, fontFamily: "'Baloo 2'" }}>{fmt(totalAdv)}</div>
          </div>
        </div>

        {loading ? <Spinner /> : withBalance.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: C.inkLight }}>Sab hisaab saaf hai ✅</div>
        ) : withBalance.map(p => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0", borderBottom: "1px solid " + C.border,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: p.outstanding > 0 ? C.redLight : C.greenLight,
              color: p.outstanding > 0 ? C.red : C.green,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 15, flexShrink: 0,
            }}>{p.name?.charAt(0)?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{p.name}</div>
              {p.city && <div style={{ fontSize: 12, color: C.inkLight }}>{p.city}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 16, color: p.outstanding > 0 ? C.red : C.green }}>
                {fmt(p.outstanding)}
              </div>
              <div style={{ fontSize: 11, color: C.inkLight }}>
                {p.outstanding > 0 ? "Baaki" : "Advance"}
              </div>
            </div>
          </div>
        ))}
      </div>
      <BottomNav active="reports" nav={nav} />
    </Shell>
  );
}

// ── Reusable bottom sheet ─────────────────────────────────────────────────────
function BottomSheet({ children, onClose, title }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: C.white, borderRadius: "20px 20px 0 0", padding: "20px 20px max(20px, env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
        </div>
        <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 17, color: C.ink, marginBottom: 16 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
