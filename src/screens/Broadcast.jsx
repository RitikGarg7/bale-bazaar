import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Shell, TopBar, BottomNav, Card, C, Tag, Spinner, EmptyState } from "../components/ui";

function generateMessage(bale, parties) {
  const totalWt = (Number(bale.weight_kg) * Number(bale.num_bales || 1)).toLocaleString("en-IN");
  const date    = bale.date
    ? new Date(bale.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  let msg = `🧺 *Bale Bazaar — Naya Stock Aaya!*\n\n`;
  msg += `📦 *${bale.brand}* (${bale.country})\n`;
  msg += `👕 Category: ${bale.category}\n`;
  msg += `⭐ Grade: ${bale.quality}\n`;
  msg += `📊 ${bale.num_bales} bales × ${bale.weight_kg} kg = *${totalWt} kg*\n`;
  if (bale.price_per_kg) msg += `💰 Rate: ₹${bale.price_per_kg}/kg\n`;
  if (date)              msg += `📅 Date: ${date}\n`;
  if (bale.notes)        msg += `📝 ${bale.notes}\n`;

  // Add photo links
  if (bale.media?.length > 0) {
    msg += `\n📸 *Photos / Videos:*\n`;
    bale.media.forEach((m, i) => {
      msg += `${i + 1}. ${m.webViewLink}\n`;
    });
  }

  msg += `\n_Interested hain? Reply karein!_ 🙏`;
  return msg;
}

export default function Broadcast({ nav }) {
  const { inventory, parties, loadAll, loading } = useApp();
  const [selectedBale,    setSelectedBale]    = useState(null);
  const [selectedParties, setSelectedParties] = useState([]);
  const [filterCountry,   setFilterCountry]   = useState("All");
  const [step,            setStep]            = useState("bale"); // bale → parties → send
  const [copied,          setCopied]          = useState(false);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Step 1 — pick a bale ──────────────────────────────────────────────────
  const inStockBales = inventory.filter(b => b.status !== "sold");

  // ── Step 2 — pick parties (smart filter by bale's country/category) ───────
  const suggestedParties = parties.filter(p => {
    if (!selectedBale) return true;
    const countryMatch   = !p.pref_countries?.length  || p.pref_countries.includes(selectedBale.country);
    const categoryMatch  = !p.pref_categories?.length || p.pref_categories.includes(selectedBale.category);
    return countryMatch || categoryMatch;
  });

  const otherParties = parties.filter(p => !suggestedParties.find(s => s.id === p.id));

  const toggleParty = (id) => {
    setSelectedParties(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = (list) => {
    const ids = list.map(p => p.id);
    const allSelected = ids.every(id => selectedParties.includes(id));
    if (allSelected) {
      setSelectedParties(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedParties(prev => [...new Set([...prev, ...ids])]);
    }
  };

  // ── Step 3 — send ─────────────────────────────────────────────────────────
  const message    = selectedBale ? generateMessage(selectedBale, selectedParties) : "";
  const encodedMsg = encodeURIComponent(message);

  const openWhatsApp = (phone) => {
    const clean = phone.replace(/\D/g, "");
    const num   = clean.startsWith("91") ? clean : `91${clean}`;
    window.open(`https://wa.me/${num}?text=${encodedMsg}`, "_blank");
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const selectedPartyObjects = parties.filter(p => selectedParties.includes(p.id));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Shell>
      <TopBar
        title="📣 Broadcast"
        bg={C.navy}
        onBack={step !== "bale" ? () => setStep(step === "send" ? "parties" : "bale") : undefined}
      />

      {/* Progress bar */}
      <div style={{ display: "flex", background: C.white, borderBottom: `1px solid ${C.border}` }}>
        {[["bale", "1. Stock Chunein"], ["parties", "2. Parties Chunein"], ["send", "3. Bhejein"]].map(([s, label]) => {
          const steps  = ["bale", "parties", "send"];
          const active = steps.indexOf(step) >= steps.indexOf(s);
          return (
            <div key={s} style={{
              flex: 1, padding: "10px 4px", textAlign: "center",
              fontSize: 11, fontWeight: 700,
              color:      active ? C.navy : C.inkLight,
              borderBottom: `3px solid ${active ? C.amber : "transparent"}`,
            }}>{label}</div>
          );
        })}
      </div>

      {loading ? <Spinner /> : (

        // ── STEP 1: Pick bale ───────────────────────────────────────────────
        step === "bale" ? (
          <div style={{ padding: "14px 16px 100px" }}>
            {inStockBales.length === 0 ? (
              <EmptyState icon="📦" title="Koi stock nahi hai" subtitle="Pehle stock tab mein bale add karein" />
            ) : (
              <>
                <p style={{ fontSize: 12, color: C.inkLight, marginBottom: 12, fontWeight: 600 }}>
                  Kaun sa stock broadcast karna hai?
                </p>
                {inStockBales.map(bale => (
                  <Card key={bale.id}
                    onClick={() => { setSelectedBale(bale); setSelectedParties([]); setStep("parties"); }}
                    style={{
                      marginBottom: 8, padding: "12px 14px",
                      border: `1.5px solid ${selectedBale?.id === bale.id ? C.amber : C.border}`,
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 15, color: C.ink }}>{bale.brand}</span>
                          <Tag color={C.navyDark} bg={C.navyLight}>{bale.country}</Tag>
                        </div>
                        <div style={{ fontSize: 13, color: C.inkMid }}>
                          {bale.category} · Grade {bale.quality} · {bale.num_bales} bales · {bale.weight_kg}kg
                          {bale.price_per_kg ? ` · ₹${bale.price_per_kg}/kg` : ""}
                        </div>
                        {bale.media?.length > 0 && (
                          <div style={{ fontSize: 11, color: C.navy, marginTop: 3, fontWeight: 600 }}>
                            📸 {bale.media.length} photos
                          </div>
                        )}
                      </div>
                      <span style={{ color: C.amber, fontSize: 22 }}>›</span>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        )

        // ── STEP 2: Pick parties ────────────────────────────────────────────
        : step === "parties" ? (
          <div style={{ padding: "14px 16px 110px" }}>

            {/* Selected bale summary */}
            <div style={{ background: C.amberLight, borderRadius: 12, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>📦</span>
              <div>
                <span style={{ fontWeight: 700, color: C.amberDark }}>{selectedBale.brand}</span>
                <span style={{ color: C.amberDark, fontSize: 13 }}> · {selectedBale.category} · Grade {selectedBale.quality}</span>
              </div>
            </div>

            {parties.length === 0 ? (
              <EmptyState icon="🤝" title="Koi party nahi hai" subtitle="Parties tab mein buyers add karein" />
            ) : (
              <>
                {/* Suggested parties */}
                {suggestedParties.length > 0 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        ✅ Suggested ({suggestedParties.length})
                      </p>
                      <button onClick={() => selectAll(suggestedParties)} style={{
                        background: "none", border: "none", fontSize: 12,
                        color: C.navy, fontWeight: 700, cursor: "pointer",
                      }}>
                        {suggestedParties.every(p => selectedParties.includes(p.id)) ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    {suggestedParties.map(p => (
                      <PartySelectCard key={p.id} party={p} selected={selectedParties.includes(p.id)} onToggle={() => toggleParty(p.id)} />
                    ))}
                  </>
                )}

                {/* Other parties */}
                {otherParties.length > 0 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "14px 0 8px" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        Other Parties ({otherParties.length})
                      </p>
                      <button onClick={() => selectAll(otherParties)} style={{
                        background: "none", border: "none", fontSize: 12,
                        color: C.navy, fontWeight: 700, cursor: "pointer",
                      }}>
                        {otherParties.every(p => selectedParties.includes(p.id)) ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    {otherParties.map(p => (
                      <PartySelectCard key={p.id} party={p} selected={selectedParties.includes(p.id)} onToggle={() => toggleParty(p.id)} />
                    ))}
                  </>
                )}
              </>
            )}

            {/* Next button */}
            {selectedParties.length > 0 && (
              <div style={{ position: "fixed", bottom: `calc(70px + max(6px, env(safe-area-inset-bottom)))`, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 398, zIndex: 50 }}>
                <button onClick={() => setStep("send")} style={{
                  width: "100%", padding: "15px", borderRadius: 12,
                  background: C.amber, color: C.white, border: "none",
                  fontSize: 16, fontWeight: 800, fontFamily: "'Baloo 2'",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)", cursor: "pointer",
                }}>
                  {selectedParties.length} Parties ke liye Message Banao →
                </button>
              </div>
            )}
          </div>
        )

        // ── STEP 3: Send ────────────────────────────────────────────────────
        : (
          <div style={{ padding: "14px 16px 100px" }}>

            {/* Message preview */}
            <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              Message Preview
            </p>
            <div style={{
              background: "#e9fbe9", borderRadius: 14, padding: "14px 16px",
              marginBottom: 16, fontSize: 13, color: C.ink, lineHeight: 1.7,
              whiteSpace: "pre-wrap", border: `1px solid #c3e6c3`,
              fontFamily: "monospace",
            }}>
              {message}
            </div>

            {/* Copy message button */}
            <button onClick={copyMessage} style={{
              width: "100%", padding: "13px", borderRadius: 12,
              background: copied ? C.green : C.navyLight,
              color: copied ? C.white : C.navy,
              border: "none", fontSize: 15, fontWeight: 700,
              cursor: "pointer", marginBottom: 20,
              transition: "all 0.2s",
            }}>
              {copied ? "✅ Message Copy Ho Gaya!" : "📋 Message Copy Karein (Groups ke liye)"}
            </button>

            {/* Individual WhatsApp buttons */}
            <p style={{ fontSize: 11, fontWeight: 700, color: C.inkLight, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
              Ya individual parties ko bhejein ({selectedPartyObjects.length})
            </p>

            {selectedPartyObjects.map(party => (
              <Card key={party.id} style={{ marginBottom: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: C.navyLight, color: C.navy,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 800, fontFamily: "'Baloo 2'",
                  }}>
                    {party.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{party.name}</div>
                    {party.city && <div style={{ fontSize: 12, color: C.inkLight }}>{party.city}</div>}
                  </div>
                  {party.phone ? (
                    <button onClick={() => openWhatsApp(party.phone)} style={{
                      background: "#25D366", color: C.white, border: "none",
                      borderRadius: 10, padding: "8px 14px",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                    }}>
                      <WhatsAppIcon /> Bhejo
                    </button>
                  ) : (
                    <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>No phone</span>
                  )}
                </div>
              </Card>
            ))}

            {/* Parties with no phone warning */}
            {selectedPartyObjects.some(p => !p.phone) && (
              <p style={{ fontSize: 12, color: C.red, marginTop: 8, textAlign: "center" }}>
                ⚠️ Kuch parties ka phone number nahi hai — Parties tab mein add karein
              </p>
            )}
          </div>
        )
      )}

      <BottomNav active="broadcast" nav={nav} />
    </Shell>
  );
}

function PartySelectCard({ party, selected, onToggle }) {
  return (
    <Card onClick={onToggle} style={{
      marginBottom: 8, padding: "11px 14px",
      border: `1.5px solid ${selected ? C.amber : C.border}`,
      background: selected ? C.amberLight : C.white,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${selected ? C.amber : C.border}`,
          background: selected ? C.amber : C.white,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {selected && <span style={{ color: C.white, fontSize: 13, fontWeight: 800 }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{party.name}</span>
          {party.city && <span style={{ fontSize: 12, color: C.inkLight, marginLeft: 8 }}>{party.city}</span>}
        </div>
        {party.phone && <span style={{ fontSize: 12, color: C.inkLight }}>{party.phone}</span>}
      </div>
    </Card>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
