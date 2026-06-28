import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { Shell, TopBar, BottomNav, Card, FAB, Spinner, EmptyState, C, Tag } from "../components/ui";
import MediaGallery from "../components/MediaGallery";
import SaleForm from "./SaleForm";
import BroadcastSheet from "../components/BroadcastSheet";

const COUNTRIES  = ["All", "Korea", "China", "USA", "UK", "Canada", "Australia", "Other"];
const CATEGORIES = ["Mix", "Shirts", "T-Shirts", "Jeans", "Trousers", "Jackets", "Kids", "Ladies", "Sweaters", "Shoes"];
const QUALITIES  = ["A", "B", "C", "Mix"];

function gradeColor(q) {
  if (q === "A") return { c: C.green,   bg: C.greenLight };
  if (q === "B") return { c: C.amber,   bg: C.amberLight };
  if (q === "C") return { c: C.red,     bg: C.redLight   };
  return              { c: C.inkLight, bg: C.bg          };
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.inkLight, fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.inkMid }}>{value}</div>
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

// ── Bale Card ─────────────────────────────────────────────────────────────────
function BaleCard({ bale, onTap, onSell, onBroadcast }) {
  const soldBales   = bale.sold_bales || 0;
  const remaining   = (bale.num_bales || 0) - soldBales;
  const photoCount  = bale.media?.length || 0;
  const isFullySold = remaining <= 0;

  const statusBg    = isFullySold ? C.greenLight : soldBales > 0 ? C.amberLight : C.navyLight;
  const statusColor = isFullySold ? C.green      : soldBales > 0 ? C.amberDark  : C.navy;
  const statusLabel = isFullySold ? "Sold Out"   : remaining + " baaki";

  return (
    <Card style={{ marginBottom: 8, padding: "12px 14px" }}>
      {/* Row 1 — category + grade + status + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span onClick={onTap} style={{ fontWeight: 700, fontSize: 15, color: C.ink, flex: 1, cursor: "pointer" }}>
          {bale.category}
        </span>
        <Tag color={gradeColor(bale.quality).c} bg={gradeColor(bale.quality).bg}>{bale.quality}</Tag>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: statusBg, color: statusColor }}>
          {statusLabel}
        </span>
      </div>

      {/* Row 2 — key numbers + action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <div onClick={onTap} style={{ flex: 1, display: "flex", gap: 16, cursor: "pointer" }}>
          <Stat label="Bales" value={bale.num_bales} />
          <Stat label="Wt/Bale" value={bale.weight_kg + " kg"} />
          {bale.price_per_kg && <Stat label="₹/kg" value={"₹" + bale.price_per_kg} />}
          {photoCount > 0 && <Stat label="Photos" value={"📸 " + photoCount} />}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {!isFullySold && (
            <button onClick={e => { e.stopPropagation(); onSell(); }} style={{
              background: C.green, color: C.white, border: "none",
              borderRadius: 8, padding: "7px 11px", fontSize: 12,
              fontWeight: 700, cursor: "pointer",
            }}>💸</button>
          )}
          <button onClick={e => { e.stopPropagation(); onBroadcast(); }} style={{
            background: C.amber, color: C.white, border: "none",
            borderRadius: 8, padding: "7px 11px", fontSize: 12,
            fontWeight: 700, cursor: "pointer",
          }}>📣</button>
          <button onClick={onTap} style={{
            background: C.bg, color: C.inkLight, border: "none",
            borderRadius: 8, padding: "7px 11px", fontSize: 14,
            fontWeight: 300, cursor: "pointer",
          }}>›</button>
        </div>
      </div>

      {/* Row 3 — date + notes (only if present) */}
      {(bale.date || bale.notes) && (
        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {bale.date && (
            <span style={{ fontSize: 11, color: C.inkLight }}>
              📅 {new Date(bale.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
          {bale.notes && (
            <span style={{ fontSize: 11, color: C.inkLight, fontStyle: "italic" }}>{bale.notes}</span>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Stock List ────────────────────────────────────────────────────────────────
export default function Inventory({ nav }) {
  const { inventory, loadAll, loading } = useApp();
  const [filter,   setFilter]   = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saleItem,       setSaleItem]       = useState(null);
  const [broadcastItem, setBroadcastItem] = useState(null);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = filter === "All" ? inventory : inventory.filter(b => b.country === filter);
  const sorted   = [...filtered].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const byBrand = sorted.reduce((acc, bale) => {
    const key = bale.brand + "||" + bale.country;
    if (!acc[key]) acc[key] = { brand: bale.brand, country: bale.country, bales: [] };
    acc[key].bales.push(bale);
    return acc;
  }, {});

  if (saleItem) {
    return (
      <SaleForm
        bale={saleItem}
        onDone={() => { setSaleItem(null); loadAll(); }}
        onBack={() => setSaleItem(null)}
      />
    );
  }

  if (showForm || editItem) {
    return (
      <BaleForm
        item={editItem}
        onDone={() => { setShowForm(false); setEditItem(null); loadAll(); }}
        onBack={() => { setShowForm(false); setEditItem(null); }}
      />
    );
  }

  return (
    <Shell>
      <TopBar title="📦 Stock" bg={C.navy} />

      <div style={{
        display: "flex", gap: 8, padding: "12px 16px",
        overflowX: "auto", background: C.white,
        borderBottom: "1px solid " + C.border,
        WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
      }}>
        {COUNTRIES.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: filter === c ? C.navy : C.bg,
            color:      filter === c ? C.white : C.inkMid,
          }}>{c}</button>
        ))}
      </div>

      <div style={{ padding: "14px 16px 110px" }}>
        {loading ? <Spinner /> : Object.keys(byBrand).length === 0 ? (
          <EmptyState icon="📦" title="Koi Stock Nahi Mila" subtitle='Neeche "+" dabao aur pehla bale add karo' />
        ) : (
          Object.values(byBrand).map(({ brand, country, bales }) => {
            const totalBalesCount = bales.reduce((s, b) => s + (Number(b.num_bales) || 0), 0);
            const totalSold       = bales.reduce((s, b) => s + (Number(b.sold_bales) || 0), 0);
            const totalRemaining  = totalBalesCount - totalSold;
            const totalWeight     = bales.reduce((s, b) => s + (Number(b.weight_kg) * Number(b.num_bales || 1)), 0);
            return (
              <div key={brand + "||" + country} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Baloo 2'", fontWeight: 800, fontSize: 16, color: C.ink }}>{brand}</span>
                  <Tag color={C.navyDark} bg={C.navyLight}>{country}</Tag>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: C.inkLight }}>
                    {totalRemaining} baaki · {totalWeight} kg
                  </span>
                </div>
                {bales.map(bale => (
                  <BaleCard
                    key={bale.id}
                    bale={bale}
                    onTap={() => setEditItem(bale)}
                    onSell={() => setSaleItem(bale)}
                    onBroadcast={() => setBroadcastItem(bale)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      <FAB onClick={() => setShowForm(true)} color={C.navy} />
      <BottomNav active="inventory" nav={nav} />
      {broadcastItem && <BroadcastSheet bale={broadcastItem} onClose={() => setBroadcastItem(null)} />}
    </Shell>
  );
}

// ── Add / Edit Bale Form ──────────────────────────────────────────────────────
function BaleForm({ item, onDone, onBack }) {
  const { saveBale, deleteBale, inventory } = useApp();
  const isEdit = !!item;

  const savedCat      = item?.category || "Mix";
  const isCustomSaved = !CATEGORIES.includes(savedCat);

  const [country,        setCountry]        = useState(item?.country      || "Korea");
  const [brandInput,     setBrandInput]     = useState(item?.brand        || "");
  const [category,       setCategory]       = useState(isCustomSaved ? "custom" : savedCat);
  const [customCategory, setCustomCategory] = useState(isCustomSaved ? savedCat : "");
  const [quality,        setQuality]        = useState(item?.quality      || "A");
  const [weightKg,       setWeightKg]       = useState(item?.weight_kg    || "");
  const [numBales,       setNumBales]       = useState(item?.num_bales    || "");
  const [pricePerKg,     setPricePerKg]     = useState(item?.price_per_kg || "");
  const [date,           setDate]           = useState(item?.date         || new Date().toISOString().slice(0, 10));
  const [status,         setStatus]         = useState(item?.status       || "in_stock");
  const [notes,          setNotes]          = useState(item?.notes        || "");
  const [media,          setMedia]          = useState(item?.media        || []);
  const [busy,           setBusy]           = useState(false);
  const [showBrands,     setShowBrands]     = useState(false);

  const finalCategory = category === "custom" ? customCategory.trim() : category;

  const existingBrands = [...new Set(
    inventory.filter(b => b.country === country).map(b => b.brand)
  )].filter(Boolean);

  const filteredBrands = existingBrands.filter(b =>
    b.toLowerCase().includes(brandInput.toLowerCase())
  );

  const totalWeight = weightKg && numBales ? Number(weightKg) * Number(numBales) : null;
  const totalValue  = totalWeight && pricePerKg ? (totalWeight * Number(pricePerKg)).toLocaleString("en-IN") : null;

  const handleSave = async () => {
    if (!brandInput.trim()) return alert("Brand ka naam likhein");
    if (!finalCategory)     return alert("Category likhein");
    if (!weightKg)          return alert("Weight likhein");
    if (!numBales)          return alert("Bales ki ginti likhein");

    setBusy(true);
    try {
      await saveBale({
        country,
        brand:        brandInput.trim().toUpperCase(),
        category:     finalCategory,
        quality,
        weight_kg:    Number(weightKg),
        num_bales:    Number(numBales),
        price_per_kg: pricePerKg ? Number(pricePerKg) : null,
        date,
        status,
        notes: notes.trim(),
        media,
      }, item?.id || null);
      onDone();
    } catch (e) {
      alert("Save nahi hua: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Yeh bale delete karein?")) return;
    setBusy(true);
    try {
      await deleteBale(item.id);
      onDone();
    } catch (e) {
      alert("Delete nahi hua: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <TopBar
        title={isEdit ? "Bale Edit Karein" : "Naya Bale Add Karein"}
        bg={C.navy}
        onBack={onBack}
        right={isEdit && (
          <button onClick={handleDelete} style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: 22, cursor: "pointer", padding: "8px" }}>🗑</button>
        )}
      />

      <div style={{ padding: "16px 16px 120px", overflowY: "auto" }}>

        <Label>Country *</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {COUNTRIES.filter(c => c !== "All").map(c => (
            <button key={c} onClick={() => { setCountry(c); setBrandInput(""); }} style={{
              padding: "8px 16px", borderRadius: 20, border: "none", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
              background: country === c ? C.navy : C.bg,
              color:      country === c ? C.white : C.inkMid,
            }}>{c}</button>
          ))}
        </div>

        <Label>Brand * <span style={{ color: C.inkLight, fontWeight: 400 }}>({country})</span></Label>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <input
            value={brandInput}
            onChange={e => { setBrandInput(e.target.value); setShowBrands(true); }}
            onFocus={() => setShowBrands(true)}
            placeholder="e.g. MSM, DO, ..."
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              border: "1.5px solid " + C.border, fontSize: 14,
              color: C.ink, background: C.white, textTransform: "uppercase",
            }}
          />
          {showBrands && filteredBrands.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0,
              background: C.white, border: "1.5px solid " + C.border,
              borderRadius: 10, zIndex: 20, overflow: "hidden", marginTop: 4,
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            }}>
              {filteredBrands.map(b => (
                <div key={b} onClick={() => { setBrandInput(b); setShowBrands(false); }}
                  style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", color: C.ink, borderBottom: "1px solid " + C.border }}>
                  {b}
                </div>
              ))}
            </div>
          )}
        </div>

        <Label>Category *</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: category === "custom" ? 8 : 16 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding: "7px 14px", borderRadius: 20, border: "none", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
              background: category === c ? C.amber : C.bg,
              color:      category === c ? C.white : C.inkMid,
            }}>{c}</button>
          ))}
          <button onClick={() => setCategory("custom")} style={{
            padding: "7px 14px", borderRadius: 20,
            border: "1.5px dashed " + (category === "custom" ? C.amber : C.border),
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: category === "custom" ? C.amberLight : "transparent",
            color:      category === "custom" ? C.amberDark : C.inkLight,
          }}>+ Custom</button>
        </div>
        {category === "custom" && (
          <input
            value={customCategory}
            onChange={e => setCustomCategory(e.target.value)}
            placeholder="Category likhein (e.g. Saris, Kurtas...)"
            autoFocus
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              border: "1.5px solid " + C.amber, fontSize: 14,
              color: C.ink, background: C.white, marginBottom: 16,
            }}
          />
        )}

        <Label>Quality / Grade *</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {QUALITIES.map(q => (
            <button key={q} onClick={() => setQuality(q)} style={{
              flex: 1, padding: "10px", borderRadius: 10, border: "none",
              fontSize: 14, fontWeight: 800, cursor: "pointer",
              background: quality === q ? gradeColor(q).c : C.bg,
              color:      quality === q ? C.white : gradeColor(q).c,
            }}>
              {q === "Mix" ? "Mix" : "Grade " + q}
            </button>
          ))}
        </div>

        <Label>Date *</Label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 10,
            border: "1.5px solid " + C.border, fontSize: 14,
            color: C.ink, background: C.white, marginBottom: 16,
          }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <Label>Wt / Bale (kg) *</Label>
            <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)}
              placeholder="e.g. 45"
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 15, fontWeight: 700 }} />
          </div>
          <div>
            <Label>No. of Bales *</Label>
            <input type="number" value={numBales} onChange={e => setNumBales(e.target.value)}
              placeholder="e.g. 10"
              style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 15, fontWeight: 700 }} />
          </div>
        </div>

        <Label>Buy Price / kg (₹) <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>
        <input type="number" value={pricePerKg} onChange={e => setPricePerKg(e.target.value)}
          placeholder="e.g. 350"
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 15, marginBottom: 16 }} />

        {totalWeight && (
          <div style={{ background: C.navyLight, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 24 }}>
            <Stat label="Total Weight" value={totalWeight + " kg"} />
            {totalValue && <Stat label="Total Cost" value={"₹" + totalValue} />}
          </div>
        )}

        {isEdit && (
          <>
            <Label>Status</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {["in_stock", "sold"].map(s => (
                <button key={s} onClick={() => setStatus(s)} style={{
                  flex: 1, padding: "10px", borderRadius: 10, border: "none",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: status === s ? (s === "sold" ? C.green : C.navy) : C.bg,
                  color:      status === s ? C.white : C.inkMid,
                }}>
                  {s === "sold" ? "✅ Sold" : "📦 In Stock"}
                </button>
              ))}
            </div>
          </>
        )}

        <Label>Notes <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Koi khaas baat? e.g. mixed sizes, minor defects..."
          rows={3}
          style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: "1.5px solid " + C.border, fontSize: 14, resize: "none", marginBottom: 16 }} />

        <Label>Photos / Videos <span style={{ color: C.inkLight, fontWeight: 400 }}>(optional)</span></Label>
        <MediaGallery
          baleId={item?.id}
          media={media}
          onChange={setMedia}
          country={country}
          brand={brandInput.trim().toUpperCase() || "Unknown"}
        />

        <div style={{ height: 20 }} />

        <button onClick={handleSave} disabled={busy} style={{
          width: "100%", padding: "15px", borderRadius: 12,
          background: busy ? C.border : C.navy,
          color: C.white, border: "none",
          fontSize: 16, fontWeight: 800, fontFamily: "'Baloo 2'",
          cursor: busy ? "default" : "pointer",
        }}>
          {busy ? "Saving..." : isEdit ? "💾 Update Karein" : "✅ Bale Add Karein"}
        </button>
      </div>
    </Shell>
  );
}
