import { useState, useEffect } from "react";
import { Shell, TopBar, C, Spinner } from "../components/ui";
import { auth } from "../lib/firebase";
import { getFirestore, collection, getDocs } from "firebase/firestore";

function fmt(n) { return "₹" + Number(Math.abs(n) || 0).toLocaleString("en-IN"); }

function today()      { return new Date().toISOString().slice(0, 10); }
function weekStart()  { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }

const PERIODS = [
  { id: "day",   label: "Today",      from: today,      to: today      },
  { id: "week",  label: "This Week",  from: weekStart,  to: today      },
  { id: "month", label: "This Month", from: monthStart, to: today      },
  { id: "custom",label: "Custom",     from: null,       to: null       },
];

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ padding: "8px 16px", background: color + "18", borderLeft: "4px solid " + color }}>
        <span style={{ fontSize: 12, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function PnLRow({ label, value, color, bold, indent }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px " + (indent ? "24px" : "16px") + " 10px " + (indent ? "28px" : "16px"),
      borderBottom: "1px solid " + C.border,
      background: bold ? C.navyLight : C.white,
    }}>
      <span style={{ fontSize: indent ? 12 : 13, color: bold ? C.navy : C.inkMid, fontWeight: bold ? 800 : 500 }}>{label}</span>
      <span style={{ fontSize: indent ? 12 : 14, fontWeight: bold ? 800 : 600, color: color || (bold ? C.navy : C.ink), fontFamily: bold ? "'Baloo 2'" : "inherit" }}>
        {fmt(value)}
      </span>
    </div>
  );
}

export default function PnL({ onBack }) {
  const [period,   setPeriod]   = useState("day");
  const [fromDate, setFromDate] = useState(today());
  const [toDate,   setToDate]   = useState(today());
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const p = PERIODS.find(p => p.id === period);
    if (p && p.from) {
      setFromDate(p.from());
      setToDate(p.to());
    }
  }, [period]);

  useEffect(() => { load(); }, [fromDate, toDate]);

  const load = async () => {
    setLoading(true);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const _db = getFirestore();

    const snap = await getDocs(collection(_db, "users", uid, "rokar"));
    const entries = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => e.date >= fromDate && e.date <= toDate);

    // Sales
    const sales       = entries.filter(e => e.type === "sale");
    const totalSales  = sales.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const salesCash   = sales.reduce((s, e) => s + (Number(e.cash_dr) || 0), 0);
    const salesBank   = sales.reduce((s, e) => s + (Number(e.bank_dr) || 0), 0);
    const salesCredit = sales.reduce((s, e) => s + (Number(e.credit_amount) || 0), 0);

    // Purchases
    const purchases      = entries.filter(e => e.type === "purchase");
    const totalPurchases = purchases.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const purCash        = purchases.reduce((s, e) => s + (Number(e.cash_cr) || 0), 0);
    const purBank        = purchases.reduce((s, e) => s + (Number(e.bank_cr) || 0), 0);
    const purCredit      = purchases.reduce((s, e) => s + (Number(e.credit_amount) || 0), 0);

    // Expenses (payments)
    const payments = entries.filter(e => e.type === "payment");
    const expByCategory = {};
    payments.forEach(e => {
      const cat = e.category || "Other";
      expByCategory[cat] = (expByCategory[cat] || 0) + (Number(e.amount) || 0);
    });
    const totalExpenses = payments.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Receipts
    const receipts      = entries.filter(e => e.type === "receipt");
    const totalReceipts = receipts.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // P&L
    const grossProfit = totalSales - totalPurchases;
    const netProfit   = grossProfit - totalExpenses;

    setData({
      totalSales, salesCash, salesBank, salesCredit, salesCount: sales.length,
      totalPurchases, purCash, purBank, purCredit, purCount: purchases.length,
      expByCategory, totalExpenses,
      totalReceipts, receiptsCount: receipts.length,
      grossProfit, netProfit,
    });
    setLoading(false);
  };

  return (
    <Shell>
      <TopBar title="📊 P&L Statement" bg={C.navy} onBack={onBack} />

      {/* Period selector */}
      <div style={{ background: C.white, borderBottom: "1px solid " + C.border, padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: period === "custom" ? 10 : 0 }}>
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10, border: "none",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: period === p.id ? C.navy : C.bg,
              color:      period === p.id ? C.white : C.inkMid,
            }}>{p.label}</button>
          ))}
        </div>
        {period === "custom" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 13 }} />
            <span style={{ color: C.inkLight, fontSize: 12 }}>to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 13 }} />
          </div>
        )}
      </div>

      {/* Date range label */}
      <div style={{ background: C.navyDark, padding: "8px 16px", textAlign: "center" }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
          {fromDate === toDate
            ? new Date(fromDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
            : new Date(fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " — " + new Date(toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>

      {loading ? <Spinner /> : !data ? null : (
        <div style={{ paddingBottom: 80 }}>

          {/* Net Profit banner */}
          <div style={{
            background: data.netProfit >= 0
              ? "linear-gradient(135deg, #1A6B3A, #2e7d32)"
              : "linear-gradient(135deg, #C8230A, #e53935)",
            padding: "20px 20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
                {data.netProfit >= 0 ? "Net Profit 🎉" : "Net Loss ⚠️"}
              </div>
              <div style={{ fontSize: 34, fontWeight: 800, color: C.white, fontFamily: "'Baloo 2'", lineHeight: 1 }}>
                {fmt(data.netProfit)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Gross Profit</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.9)", fontFamily: "'Baloo 2'" }}>{fmt(data.grossProfit)}</div>
            </div>
          </div>

          {/* INCOME */}
          <Section title="Income" color={C.green}>
            <PnLRow label={"Sales (" + data.salesCount + " transactions)"} value={data.totalSales} bold />
            <PnLRow label="— Cash sales"   value={data.salesCash}   indent color={C.green} />
            <PnLRow label="— Bank sales"   value={data.salesBank}   indent color={C.green} />
            <PnLRow label="— Credit sales" value={data.salesCredit} indent color={C.amber} />
          </Section>

          {/* PURCHASES */}
          <Section title="Purchases" color={C.red}>
            <PnLRow label={"Purchases (" + data.purCount + " transactions)"} value={data.totalPurchases} bold />
            <PnLRow label="— Cash paid"   value={data.purCash}   indent color={C.red} />
            <PnLRow label="— Bank paid"   value={data.purBank}   indent color={C.red} />
            <PnLRow label="— On credit"   value={data.purCredit} indent color={C.amber} />
          </Section>

          {/* GROSS PROFIT */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "14px 16px", background: C.navyLight,
            borderTop: "2px solid " + C.navy, borderBottom: "2px solid " + C.navy,
            marginBottom: 16,
          }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: C.navy, fontFamily: "'Baloo 2'" }}>Gross Profit (Sales - Purchases)</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: data.grossProfit >= 0 ? C.green : C.red, fontFamily: "'Baloo 2'" }}>{fmt(data.grossProfit)}</span>
          </div>

          {/* EXPENSES */}
          {data.totalExpenses > 0 && (
            <Section title="Expenses" color={C.amber}>
              {Object.entries(data.expByCategory).map(([cat, amt]) => (
                <PnLRow key={cat} label={cat} value={amt} indent color={C.amberDark} />
              ))}
              <PnLRow label="Total Expenses" value={data.totalExpenses} bold />
            </Section>
          )}

          {/* NET PROFIT */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            padding: "16px", margin: "0 16px 16px",
            background: data.netProfit >= 0 ? C.greenLight : C.redLight,
            borderRadius: 14,
            border: "2px solid " + (data.netProfit >= 0 ? C.green : C.red),
          }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: data.netProfit >= 0 ? C.green : C.red, fontFamily: "'Baloo 2'" }}>
              Net Profit
            </span>
            <span style={{ fontWeight: 800, fontSize: 20, color: data.netProfit >= 0 ? C.green : C.red, fontFamily: "'Baloo 2'" }}>
              {fmt(data.netProfit)}
            </span>
          </div>

          {/* Collections */}
          {data.totalReceipts > 0 && (
            <div style={{ margin: "0 16px", background: C.white, borderRadius: 14, border: "1px solid " + C.border, overflow: "hidden" }}>
              <div style={{ padding: "10px 16px", background: C.navyLight, borderBottom: "1px solid " + C.border }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: C.navy, textTransform: "uppercase" }}>Collections (Cash Received)</span>
              </div>
              <PnLRow label={"Receipts (" + data.receiptsCount + " entries)"} value={data.totalReceipts} />
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
