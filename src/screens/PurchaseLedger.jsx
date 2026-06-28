import { useState, useEffect } from "react";
import { Shell, TopBar, C, Spinner } from "../components/ui";
import { auth } from "../lib/firebase";
import { getFirestore, collection, getDocs } from "firebase/firestore";

function fmt(n) { return "₹" + Number(Math.abs(n) || 0).toLocaleString("en-IN"); }

export default function PurchaseLedger({ onBack }) {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { load(); }, [fromDate, toDate]);

  const load = async () => {
    setLoading(true);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const _db = getFirestore();
    const snap = await getDocs(collection(_db, "users", uid, "rokar"));
    const purchases = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(e => e.type === "purchase" && e.date >= fromDate && e.date <= toDate)
      .sort((a, b) => a.date.localeCompare(b.date));
    setEntries(purchases);
    setLoading(false);
  };

  const totalPurchases = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalCash      = entries.reduce((s, e) => s + (Number(e.cash_cr) || 0), 0);
  const totalBank      = entries.reduce((s, e) => s + (Number(e.bank_cr) || 0), 0);
  const totalCredit    = entries.reduce((s, e) => s + (Number(e.credit_amount) || 0), 0);

  const cell = { padding: "9px 10px", fontSize: 12, borderBottom: "1px solid " + C.border, borderRight: "1px solid " + C.border };
  const head = { ...cell, background: C.navy, color: C.white, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" };
  const amt  = { ...cell, textAlign: "right", fontWeight: 600 };

  return (
    <Shell>
      <TopBar title="📦 Purchase Ledger" bg={C.navy} onBack={onBack} />

      {/* Date filter */}
      <div style={{ background: C.white, borderBottom: "1px solid " + C.border, padding: "10px 14px", display: "flex", gap: 8, alignItems: "center" }}>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 13 }} />
        <span style={{ color: C.inkLight, fontSize: 13 }}>to</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1.5px solid " + C.border, fontSize: 13 }} />
      </div>

      {/* Summary */}
      <div style={{ background: C.navyDark, padding: "10px 14px", display: "flex" }}>
        {[
          { label: "Total Purchase", value: fmt(totalPurchases), color: C.amber },
          { label: "Cash",           value: fmt(totalCash),      color: "#ffcdd2" },
          { label: "Bank",           value: fmt(totalBank),      color: "#ffcdd2" },
          { label: "Credit",         value: fmt(totalCredit),    color: "#ef9a9a" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "'Baloo 2'", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%" }}>
          <thead>
            <tr>
              <th style={{ ...head, minWidth: 70 }}>Date</th>
              <th style={{ ...head, minWidth: 120 }}>Supplier</th>
              <th style={{ ...head, minWidth: 140 }}>Item</th>
              <th style={{ ...head, minWidth: 60 }}>Bales</th>
              <th style={{ ...head, minWidth: 65 }}>Rate</th>
              <th style={{ ...head, minWidth: 80 }}>Amount</th>
              <th style={{ ...head, minWidth: 70 }}>Cash</th>
              <th style={{ ...head, minWidth: 70 }}>Bank</th>
              <th style={{ ...head, minWidth: 70 }}>Credit</th>
              <th style={{ ...head, minWidth: 60 }}>Voucher</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: 24, color: C.inkLight }}>Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: 24, color: C.inkLight, fontSize: 13 }}>Is period mein koi purchase nahi</td></tr>
            ) : entries.map((e, i) => (
              <tr key={e.id} style={{ background: i % 2 === 0 ? C.white : "#fafafa" }}>
                <td style={{ ...cell, fontSize: 11, color: C.inkLight, whiteSpace: "nowrap" }}>
                  {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                </td>
                <td style={{ ...cell, fontWeight: 600 }}>{e.supplier_name || "—"}</td>
                <td style={{ ...cell, fontSize: 11, color: C.inkMid }}>{e.particulars?.replace("By Purchases — ", "") || "—"}</td>
                <td style={{ ...amt }}>{e.num_bales || "—"}</td>
                <td style={{ ...amt }}>{e.buy_rate ? "₹" + e.buy_rate : "—"}</td>
                <td style={{ ...amt, color: C.red, fontWeight: 800 }}>{fmt(e.amount)}</td>
                <td style={{ ...amt, color: C.red }}>{e.cash_cr > 0 ? fmt(e.cash_cr) : "—"}</td>
                <td style={{ ...amt, color: C.red }}>{e.bank_cr > 0 ? fmt(e.bank_cr) : "—"}</td>
                <td style={{ ...amt, color: C.amber }}>{e.credit_amount > 0 ? fmt(e.credit_amount) : "—"}</td>
                <td style={{ ...cell, fontSize: 10, color: C.inkLight }}>{e.voucher_no || "—"}</td>
              </tr>
            ))}
            {entries.length > 0 && (
              <tr style={{ background: C.ink }}>
                <td style={{ ...cell, background: C.ink, color: C.white, fontWeight: 800, fontFamily: "'Baloo 2'" }} colSpan={5}>TOTAL</td>
                <td style={{ ...amt, background: C.ink, color: C.amber, fontWeight: 800 }}>{fmt(totalPurchases)}</td>
                <td style={{ ...amt, background: C.ink, color: "#ffcdd2", fontWeight: 800 }}>{fmt(totalCash)}</td>
                <td style={{ ...amt, background: C.ink, color: "#ffcdd2", fontWeight: 800 }}>{fmt(totalBank)}</td>
                <td style={{ ...amt, background: C.ink, color: "#ef9a9a", fontWeight: 800 }}>{fmt(totalCredit)}</td>
                <td style={{ ...cell, background: C.ink }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ height: 40 }} />
    </Shell>
  );
}
