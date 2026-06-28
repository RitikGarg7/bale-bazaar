/**
 * MediaGallery — upload, view photos/videos from Google Drive
 * Used inside the bale edit form
 */
import { useState, useRef } from "react";
import { uploadToDrive, deleteFromDrive } from "../lib/drive";
import { C } from "./ui";

export default function MediaGallery({ baleId, media = [], onChange }) {
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [lightbox,   setLightbox]   = useState(null); // { url, mimeType }
  const fileRef = useRef();

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded = [...media];
    for (const file of Array.from(files)) {
      try {
        setProgress(0);
        const result = await uploadToDrive(file, setProgress);
        uploaded.push(result);
      } catch (e) {
        alert("Upload failed: " + e.message);
      }
    }
    setUploading(false);
    setProgress(0);
    onChange(uploaded);
  };

  const handleDelete = async (item, idx) => {
    if (!window.confirm("Yeh media delete karein?")) return;
    try {
      await deleteFromDrive(item.id);
    } catch (e) { /* ignore if already deleted */ }
    const updated = media.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const isVideo = (item) => item.mimeType && item.mimeType.startsWith("video/");

  return (
    <div>
      {/* Thumbnail strip */}
      {media.length > 0 && (
        <div style={{
          display: "flex", gap: 8, overflowX: "auto",
          padding: "4px 0 8px", scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {media.map((item, idx) => (
            <div key={item.id || idx} style={{ position: "relative", flexShrink: 0 }}>
              <div
                onClick={() => setLightbox(item)}
                style={{
                  width: 90, height: 90, borderRadius: 10,
                  background: C.bg, border: `1.5px solid ${C.border}`,
                  overflow: "hidden", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                {isVideo(item) ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 28 }}>▶️</div>
                    <div style={{ fontSize: 10, color: C.inkLight, marginTop: 2 }}>Video</div>
                  </div>
                ) : (
                  <img
                    src={item.thumbnailUrl}
                    alt="bale"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => { e.target.style.display = "none"; }}
                  />
                )}
              </div>
              {/* Delete button */}
              <button
                onClick={() => handleDelete(item, idx)}
                style={{
                  position: "absolute", top: -6, right: -6,
                  width: 20, height: 20, borderRadius: "50%",
                  background: C.red, color: C.white,
                  border: "none", fontSize: 11, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, lineHeight: 1,
                }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: "none" }}
        onChange={e => handleFiles(e.target.files)}
      />

      {uploading ? (
        <div style={{
          background: C.navyLight, borderRadius: 10, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden",
          }}>
            <div style={{
              width: `${progress}%`, height: "100%",
              background: C.navy, borderRadius: 3,
              transition: "width 0.2s",
            }} />
          </div>
          <span style={{ fontSize: 13, color: C.navy, fontWeight: 700, flexShrink: 0 }}>{progress}%</span>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current.click()}
          style={{
            width: "100%", padding: "12px", borderRadius: 10,
            border: `2px dashed ${C.border}`,
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            color: C.inkMid, fontSize: 14, fontWeight: 600,
          }}>
          <span style={{ fontSize: 20 }}>📎</span>
          {media.length === 0 ? "Photos / Videos Add Karein" : "Aur Add Karein"}
        </button>
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox item={lightbox} all={media} onClose={() => setLightbox(null)} onNav={setLightbox} />
      )}
    </div>
  );
}

// ── Full screen lightbox ──────────────────────────────────────────────────────
function Lightbox({ item, all, onClose, onNav }) {
  const idx     = all.findIndex(m => m.id === item.id);
  const isVideo = item.mimeType && item.mimeType.startsWith("video/");

  const prev = () => idx > 0             && onNav(all[idx - 1]);
  const next = () => idx < all.length-1  && onNav(all[idx + 1]);

  // Swipe support
  const touchStart = useRef(null);
  const onTouchStart = e => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = e => {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    touchStart.current = null;
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)",
        zIndex: 200, display: "flex", flexDirection: "column",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", flexShrink: 0,
      }}>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
          {idx + 1} / {all.length}
        </span>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <a
            href={item.webViewLink}
            target="_blank"
            rel="noreferrer"
            style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, textDecoration: "none", fontWeight: 600 }}
          >
            🔗 Drive mein kholo
          </a>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: C.white,
            fontSize: 28, cursor: "pointer", lineHeight: 1,
          }}>✕</button>
        </div>
      </div>

      {/* Media */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", overflow: "hidden" }}>
        {isVideo ? (
          <iframe
            src={item.embedUrl}
            style={{ width: "100%", maxWidth: 500, aspectRatio: "16/9", border: "none", borderRadius: 12 }}
            allow="autoplay"
            allowFullScreen
          />
        ) : (
          <img
            src={item.embedUrl}
            alt="bale"
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }}
          />
        )}
      </div>

      {/* Prev / Next */}
      {all.length > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", flexShrink: 0 }}>
          <button onClick={prev} disabled={idx === 0} style={{
            background: "rgba(255,255,255,0.12)", border: "none", color: C.white,
            borderRadius: 10, padding: "10px 20px", fontSize: 18, cursor: idx === 0 ? "default" : "pointer",
            opacity: idx === 0 ? 0.3 : 1,
          }}>←</button>
          <button onClick={next} disabled={idx === all.length - 1} style={{
            background: "rgba(255,255,255,0.12)", border: "none", color: C.white,
            borderRadius: 10, padding: "10px 20px", fontSize: 18,
            cursor: idx === all.length - 1 ? "default" : "pointer",
            opacity: idx === all.length - 1 ? 0.3 : 1,
          }}>→</button>
        </div>
      )}

      {/* Thumbnail strip at bottom */}
      {all.length > 1 && (
        <div style={{
          display: "flex", gap: 6, padding: "0 16px 20px",
          overflowX: "auto", justifyContent: "center", flexShrink: 0,
        }}>
          {all.map((m, i) => (
            <div key={m.id || i} onClick={() => onNav(m)} style={{
              width: 48, height: 48, borderRadius: 6, overflow: "hidden",
              border: `2px solid ${i === idx ? C.amber : "transparent"}`,
              cursor: "pointer", flexShrink: 0,
              background: C.inkMid,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {m.mimeType?.startsWith("video/") ? (
                <span style={{ fontSize: 18 }}>▶️</span>
              ) : (
                <img src={m.thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
