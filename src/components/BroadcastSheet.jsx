/**
 * BroadcastSheet — bottom sheet popup for broadcasting a bale to parties
 * Opens from the Stock tab bale card
 */
import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { C } from "./ui";

function generateMessage(bale) {
  const totalWt = (Number(bale.weight_kg) * Number(bale.num_bales || 1));
  const remaining = (bale.num_bales || 0) - (bale.sold_bales || 0);
  const date = bale.date
    ? new Date(bale.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  let msg = "🧺 *Bale Bazaar — Naya Stock Aaya!*\n\n";
  msg += "📦 *" + bale.brand + "* (" + bale.country + ")\n";
  msg += "👕 Category: " + bale.category + "\n";
  msg += "⭐ Grade: " + bale.quality + "\n";
  msg += "📊 " + remaining + " bales × " + bale.weight_kg + " kg available\n";
  if (bale.price_per_kg) msg += "💰 Rate: ₹" + bale.price_per_kg + "/kg\n";
  if (date)              msg += "📅 Date: " + date + "\n";
  if (bale.notes)        msg += "📝 " + bale.notes + "\n";
  if (bale.media?.length > 0) {
    msg += "\n📸 *Photos / Videos:*\n";
    bale.media.forEach((m, i) => { msg += (i + 1) + ". " + m.webViewLink + "\n"; });
  }
  msg += "\n_Interested hain? Reply karein!_ 🙏";
  return msg;
}

export default function BroadcastSheet({ bale, onClose }) {
  const { parties } = useApp();
  const [selected,    setSelected]    = useState([]);
  const [copied,      setCopied]      = useState(false);
  const [step,        setStep]        = useState("parties"); // parties → send

  // Smart suggest — match party preferences
  const suggested = parties.filter(p => {
    const cm = !p.pref_countries?.length  || p.pref_countries.includes(bale.country);
    const km = !p.pref_categories?.length || p.pref_categories.includes(bale.category);
    return cm || km;
  });
  const others = parties.filter(p => !suggested.find(s => s.id === p.id));

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = (list) => {
    const ids = list.map(p => p.id);
    const allSel = ids.every(id => selected.includes(id));
    setSelected(prev => allSel ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const message    = generateMessage(bale);
  const encodedMsg = encodeURIComponent(message);
  const selectedObjs = parties.filter(p => selected.includes(p.id));

  const openWhatsApp = (phone) => {
    const clean = phone.replace(/\D/g, "");
    const num   = clean.startsWith("91") ? clean : "91" + clean;
    window.open("https://wa.me/" + num + "?text=" + encodedMsg, "_blank");
  };

  const copyMessage = async () => {
    try { await navigator.clipboard.writeText(message); }
    catch { const t = document.createElement("textarea"); t.value = message; document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Close on backdrop tap
  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 150,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 430,
        background: C.white,
        borderRadius: "20px 20px 0 0",
        maxHeight: "85vh",
        display: "flex", flexDirection: "column",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
        </div>

        {/* Header */}
        <div style={{ padding: "12px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid " + C.border }}>
          <div>
            <div style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 16, color: C.ink }}>
              📣 Broadcast
            </div>
            <div style={{ fontSize: 12, color: C.inkLight }}>
              {bale.brand} · {bale.category} · Grade {bale.quality}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {step === "send" && (
              <button onClick={() => setStep("parties")} style={{
                background: C.bg, border: "none", borderRadius: 8,
                padding: "6px 12px", fontSize: 13, fontWeight: 600,
                color: C.inkMid, cursor: "pointer",
              }}>← Back</button>
            )}
            <button onClick={onClose} style={{
              background: C.bg, border: "none", borderRadius: 8,
              padding: "6px 10px", fontSize: 18, cursor: "pointer", color: C.inkMid,
            }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>

          {step === "parties" ? (
            <>
              {parties.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: C.inkLight, fontSize: 14 }}>
                  Parties tab mein buyers add karein pehle
                </div>
              ) : (
                <>
                  {/* Suggested */}
                  {suggested.length > 0 && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          ✅ Suggested ({suggested.length})
                        </span>
                        <button onClick={() => selectAll(suggested)} style={{ background: "none", border: "none", fontSize: 12, color: C.navy, fontWeight: 700, cursor: "pointer" }}>
                          {suggested.every(p => selected.includes(p.id)) ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                      {suggested.map(p => <PartyRow key={p.id} party={p} selected={selected.includes(p.id)} onToggle={() => toggle(p.id)} />)}
                    </>
                  )}

                  {/* Others */}
                  {others.length > 0 && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "12px 0 8px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          Other ({others.length})
                        </span>
                        <button onClick={() => selectAll(others)} style={{ background: "none", border: "none", fontSize: 12, color: C.navy, fontWeight: 700, cursor: "pointer" }}>
                          {others.every(p => selected.includes(p.id)) ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                      {others.map(p => <PartyRow key={p.id} party={p} selected={selected.includes(p.id)} onToggle={() => toggle(p.id)} />)}
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Message preview */}
              <div style={{
                background: "#e9fbe9", borderRadius: 12, padding: "12px 14px",
                fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap",
                color: C.ink, marginBottom: 12, fontFamily: "monospace",
                border: "1px solid #c3e6c3",
              }}>
                {message}
              </div>

              {/* Copy button */}
              <button onClick={copyMessage} style={{
                width: "100%", padding: "11px", borderRadius: 10,
                background: copied ? C.green : C.navyLight,
                color: copied ? C.white : C.navy,
                border: "none", fontSize: 14, fontWeight: 700,
                cursor: "pointer", marginBottom: 14, transition: "all 0.2s",
              }}>
                {copied ? "✅ Copy Ho Gaya!" : "📋 Copy (Groups ke liye)"}
              </button>

              {/* Individual send */}
              <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
                Individual Bhejein ({selectedObjs.length})
              </p>
              {selectedObjs.map(party => (
                <div key={party.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", borderBottom: "1px solid " + C.border,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: C.navyLight, color: C.navy,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 14, flexShrink: 0,
                  }}>{party.name?.charAt(0)?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{party.name}</div>
                    {party.city && <div style={{ fontSize: 11, color: C.inkLight }}>{party.city}</div>}
                  </div>
                  {party.phone ? (
                    <button onClick={() => openWhatsApp(party.phone)} style={{
                      background: "#25D366", color: C.white, border: "none",
                      borderRadius: 8, padding: "7px 12px",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <WaIcon /> Bhejo
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>No phone</span>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer CTA */}
        {step === "parties" && selected.length > 0 && (
          <div style={{ padding: "10px 16px 0" }}>
            <button onClick={() => setStep("send")} style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: C.amber, color: C.white, border: "none",
              fontSize: 15, fontWeight: 800, fontFamily: "'Baloo 2'",
              cursor: "pointer",
            }}>
              {selected.length} Parties ke liye Message Banao →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PartyRow({ party, selected, onToggle }) {
  return (
    <div onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "9px 10px", borderRadius: 10, marginBottom: 6, cursor: "pointer",
      background: selected ? C.amberLight : C.bg,
      border: "1.5px solid " + (selected ? C.amber : "transparent"),
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0,
        border: "2px solid " + (selected ? C.amber : C.border),
        background: selected ? C.amber : C.white,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <span style={{ color: C.white, fontSize: 12, fontWeight: 800 }}>✓</span>}
      </div>
      <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: C.ink }}>{party.name}</span>
      {party.city && <span style={{ fontSize: 12, color: C.inkLight }}>{party.city}</span>}
    </div>
  );
}

function WaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
