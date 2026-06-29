import { useState, useEffect } from "react";
import { Shell, TopBar, C } from "../components/ui";
import { auth } from "../lib/firebase";
import {
  getFirestore, collection, getDocs,
  doc, setDoc, getDoc, serverTimestamp
} from "firebase/firestore";

function fmt(n) { return "₹" + Number(Math.abs(n) || 0).toLocaleString("en-IN"); }
function today() { return new Date().toISOString().slice(0, 10); }

function Row({ label, book, actual, diff }) {
  const match = diff === 0;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
      padding: "12px 16px", borderBottom: "1px solid " + C.border,
      background: actual !== null ? (match ? "#f0fdf4" : "#fff5f5") : C.white,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, textAlign: "center" }}>{fmt(book)}</div>
      <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right", color: actual !== null ? (match ? C.green : C.red) : C.inkLight }}>
        {actual !== null ? fmt(actual) : "—"}
      </div>
    </div>
  );
}

export default function DayClosing({ onBack }) {
  const [date,        setDate]        = useState(today());
  const [loading,     setLoading]     = useState(true);
  const [bookCash,    setBookCash]    = useState(0);
  const [bookBank,    setBookBank]    = useState(0);
  const [physCash,    setPhysCash]    = useState("");
  const [physBank,    setPhysBank]    = useState("");
  const [closed,      setClosed]      = useState(false);
  const [closedData,  setClosedData]  = useState(null);
  const [busy,        setBusy]        = useState(false);
  const [breakdown,   setBreakdown]   = useState({ cashIn: 0, cashOut: 0, bankIn: 0, bankOut: 0, openCash: 0, openBank: 0 });

  useEffect(() => { load(); }, [date]);

  const load = async () => {
    setLoading(true);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const _db = getFirestore();

    // Opening balance
    let openCash = 0, openBank = 0;
    const obSnap = await getDoc(doc(_db, "users", uid, "cashbook", "opening_" + date));
    if (obSnap.exists()) {
      openCash = obSnap.data().cash || 0;
      openBank = obSnap.data().bank || 0;
    } else {
      // try yesterday closing
      const yd = new Date(date);
      yd.setDate(yd.getDate() - 1);
      const ydStr = yd.toISOString().slice(0, 10);
      const ydSnap = await getDoc(doc(_db, "users", uid, "cashbook", "closing_" + ydStr));
      if (ydSnap.exists()) {
        openCash = ydSnap.data().cash || 0;
        openBank = ydSnap.data().bank || 0;
      }
    }

    // Cashbook entries for the day
    const cbSnap = await getDocs(collection(_db, "users", uid, "cashbook_entries"));
    const dayEntries = cbSnap.docs
      .map(d => d.data())
      .filter(e => e.date === date);

    const cashIn  = dayEntries.filter(e => e.type === "in"  && e.account === "cash").reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const cashOut = dayEntries.filter(e => e.type === "out" && e.account === "cash").reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const bankIn  = dayEntries.filter(e => e.type === "in"  && e.account === "bank").reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const bankOut = dayEntries.filter(e => e.type === "out" && e.account === "bank").reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const closingCash = openCash + cashIn - cashOut;
    const closingBank = openBank + bankIn - bankOut;

    setBookCash(closingCash);
    setBookBank(closingBank);
    setBreakdown({ cashIn, cashOut, bankIn, bankOut, openCash, openBank });

    // Check if already closed
    const closedSnap = await getDoc(doc(_db, "users", uid, "cashbook", "closing_" + date));
    if (closedSnap.exists()) {
      setClosed(true);
      setClosedData(closedSnap.data());
      setPhysCash(String(closedSnap.data().phys_cash || ""));
      setPhysBank(String(closedSnap.data().phys_bank || ""));
    } else {
      setClosed(false);
      setClosedData(null);
    }

    setLoading(false);
  };

  const handleClose = async () => {
    if (physCash === "") return alert("Physical cash likhein");
    if (physBank === "") return alert("Bank balance likhein");
    setBusy(true);
    const uid = auth.currentUser?.uid;
    const _db = getFirestore();
    await setDoc(doc(_db, "users", uid, "cashbook", "closing_" + date), {
      date,
      cash:       bookCash,
      bank:       bookBank,
      phys_cash:  Number(physCash),
      phys_bank:  Number(physBank),
      cash_diff:  Number(physCash) - bookCash,
      bank_diff:  Number(physBank) - bookBank,
      closed_at:  serverTimestamp(),
    });
    setClosed(true);
    await load();
    setBusy(false);
  };

  const cashDiff = physCash !== "" ? Number(physCash) - bookCash : null;
  const bankDiff = physBank !== "" ? Number(physBank) - bookBank : null;
  const allMatch = cashDiff === 0 && bankDiff === 0;

  return (
    <Shell>
      <TopBar title="🔒 Day Closing" bg={C.navy} onBack={onBack} />

      {/* Date picker */}
      <div style={{ background: C.white, borderBottom: "1px solid " + C.border, padding: "10px 14px" }}>
        <input type="date" value={date} onChange={e => { setDate(e.target.value); setPhysCash(""); setPhysBank(""); }}
          style={{ width: "100%", padding: "9px 14px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.inkLight }}>Loading...</div>
      ) : (
        <div style={{ padding: "16px 0 80px" }}>

          {/* Status banner */}
          {closed ? (
            <div style={{
              margin: "0 16px 16px", borderRadius: 14, padding: "14px 16px",
              background: allMatch ? "linear-gradient(135deg, #1A6B3A, #2e7d32)" : "linear-gradient(135deg, #C8230A, #e53935)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 28 }}>{allMatch ? "✅" : "⚠️"}</span>
              <div>
                <div style={{ color: C.white, fontWeight: 800, fontSize: 15, fontFamily: "'Baloo 2'" }}>
                  {allMatch ? "Day Closed — Hisaab Saaf!" : "Day Closed — Difference Hai"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 }}>
                  {new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              margin: "0 16px 16px", borderRadius: 14, padding: "14px 16px",
              background: C.amberLight, border: "1px solid " + C.amber + "44",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 24 }}>📒</span>
              <div>
                <div style={{ color: C.amberDark, fontWeight: 700, fontSize: 14 }}>Din abhi band nahi hua</div>
                <div style={{ color: C.amber, fontSize: 12, marginTop: 2 }}>Neeche physical cash aur bank balance bharein</div>
              </div>
            </div>
          )}

          {/* Book breakdown */}
          <div style={{ margin: "0 16px 16px", background: C.white, borderRadius: 14, overflow: "hidden", border: "1px solid " + C.border }}>
            <div style={{ background: C.navyDark, padding: "10px 16px" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>Aaj ka summary (Book se)</div>
              <div style={{ display: "flex", gap: 0 }}>
                {[
                  { label: "Cash Opening", value: fmt(breakdown.openCash) },
                  { label: "Cash In",      value: fmt(breakdown.cashIn)   },
                  { label: "Cash Out",     value: fmt(breakdown.cashOut)  },
                  { label: "Bank In",      value: fmt(breakdown.bankIn)   },
                  { label: "Bank Out",     value: fmt(breakdown.bankOut)  },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{s.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.white, fontFamily: "'Baloo 2'" }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              padding: "8px 16px", background: C.bg,
              borderBottom: "1px solid " + C.border,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.inkLight, textTransform: "uppercase" }}>Account</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", textAlign: "center" }}>📒 Book Balance</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", textAlign: "right" }}>✋ Physical</div>
            </div>

            {/* Cash row */}
            <Row
              label="💵 Cash"
              book={bookCash}
              actual={physCash !== "" ? Number(physCash) : null}
              diff={cashDiff || 0}
            />

            {/* Bank row */}
            <Row
              label="🏦 Bank"
              book={bookBank}
              actual={physBank !== "" ? Number(physBank) : null}
              diff={bankDiff || 0}
            />

            {/* Difference rows */}
            {physCash !== "" && cashDiff !== 0 && (
              <div style={{ padding: "10px 16px", background: "#fff5f5", borderBottom: "1px solid " + C.border }}>
                <div style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>
                  ⚠️ Cash difference: {cashDiff > 0 ? "+" : ""}{fmt(cashDiff)}
                  <span style={{ fontWeight: 400, marginLeft: 6 }}>
                    {cashDiff > 0 ? "(Extra cash — koi entry miss hai?)" : "(Cash kam — koi expense record nahi?)" }
                  </span>
                </div>
              </div>
            )}
            {physBank !== "" && bankDiff !== 0 && (
              <div style={{ padding: "10px 16px", background: "#fff5f5" }}>
                <div style={{ fontSize: 12, color: C.red, fontWeight: 700 }}>
                  ⚠️ Bank difference: {bankDiff > 0 ? "+" : ""}{fmt(bankDiff)}
                  <span style={{ fontWeight: 400, marginLeft: 6 }}>
                    {bankDiff > 0 ? "(Extra — cheque cleared?)" : "(Kam — koi payment miss?)" }
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Physical entry */}
          <div style={{ margin: "0 16px 16px", background: C.white, borderRadius: 14, padding: "16px", border: "1px solid " + C.border }}>
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 15, color: C.ink, marginBottom: 14 }}>
              ✋ Physical Count Karein
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", marginBottom: 6 }}>
                💵 Cash in Hand (₹)
              </div>
              <input
                type="number"
                value={physCash}
                onChange={e => setPhysCash(e.target.value)}
                placeholder="Haath mein kitna cash hai?"
                disabled={closed}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 10,
                  border: "1.5px solid " + (cashDiff !== null && cashDiff !== 0 ? C.red : cashDiff === 0 ? C.green : C.border),
                  fontSize: 18, fontWeight: 700, fontFamily: "'Baloo 2'",
                  background: closed ? C.bg : C.white, color: C.ink,
                  boxSizing: "border-box",
                }}
              />
              {physCash !== "" && (
                <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: cashDiff === 0 ? C.green : C.red }}>
                  {cashDiff === 0 ? "✅ Book se match kar raha hai!" : (cashDiff > 0 ? "📈 " : "📉 ") + "Book: " + fmt(bookCash) + " · Difference: " + (cashDiff > 0 ? "+" : "") + fmt(cashDiff)}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", marginBottom: 6 }}>
                🏦 Bank Balance (₹)
              </div>
              <input
                type="number"
                value={physBank}
                onChange={e => setPhysBank(e.target.value)}
                placeholder="Bank app mein kitna balance hai?"
                disabled={closed}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 10,
                  border: "1.5px solid " + (bankDiff !== null && bankDiff !== 0 ? C.red : bankDiff === 0 ? C.green : C.border),
                  fontSize: 18, fontWeight: 700, fontFamily: "'Baloo 2'",
                  background: closed ? C.bg : C.white, color: C.ink,
                  boxSizing: "border-box",
                }}
              />
              {physBank !== "" && (
                <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: bankDiff === 0 ? C.green : C.red }}>
                  {bankDiff === 0 ? "✅ Book se match kar raha hai!" : (bankDiff > 0 ? "📈 " : "📉 ") + "Book: " + fmt(bookBank) + " · Difference: " + (bankDiff > 0 ? "+" : "") + fmt(bankDiff)}
                </div>
              )}
            </div>

            {!closed ? (
              <button onClick={handleClose} disabled={busy || physCash === "" || physBank === ""} style={{
                width: "100%", padding: "14px", borderRadius: 12,
                background: busy || physCash === "" || physBank === "" ? C.border : C.navy,
                color: C.white, border: "none",
                fontSize: 16, fontWeight: 800, fontFamily: "'Baloo 2'",
                cursor: busy || physCash === "" || physBank === "" ? "default" : "pointer",
              }}>
                {busy ? "Saving..." : "🔒 Din Band Karein"}
              </button>
            ) : (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 13, color: C.inkLight }}>
                  Din band ho gaya · Kal ka opening balance auto set ho jayega
                </div>
                <div style={{ fontSize: 12, color: C.inkLight, marginTop: 4 }}>
                  💵 Cash carry forward: <strong style={{ color: C.navy }}>{fmt(bookCash)}</strong> · 🏦 Bank: <strong style={{ color: C.navy }}>{fmt(bookBank)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Next day preview */}
          {closed && (
            <div style={{ margin: "0 16px", background: C.navyLight, borderRadius: 14, padding: "14px 16px", border: "1px solid " + C.navyLight }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 8 }}>📅 Kal ka Opening Balance (Auto)</div>
              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.inkLight, textTransform: "uppercase" }}>Cash</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, fontFamily: "'Baloo 2'" }}>{fmt(bookCash)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.inkLight, textTransform: "uppercase" }}>Bank</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.navy, fontFamily: "'Baloo 2'" }}>{fmt(bookBank)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
