/**
 * Google Drive integration
 * Folder hierarchy: Bale Bazaar > {Country} > {Brand} > files
 * Scope: drive.file (only files created by this app)
 */

const DRIVE_SCOPE   = "https://www.googleapis.com/auth/drive.file";
const ROOT_FOLDER   = "Bale Bazaar";
const CLIENT_ID     = import.meta.env.VITE_GOOGLE_CLIENT_ID || "498474421999-6eoj03p66na5homksk23gmqbggt4emi5.apps.googleusercontent.com";

let accessToken = null;

// ── Token cache ───────────────────────────────────────────────────────────────
function getSavedToken() {
  try { return sessionStorage.getItem("drive_token"); } catch { return null; }
}
function saveToken(t) {
  try { sessionStorage.setItem("drive_token", t); } catch {}
}
export function clearDriveToken() {
  accessToken = null;
  try { sessionStorage.removeItem("drive_token"); } catch {}
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function getDriveToken() {
  if (accessToken) return accessToken;
  const saved = getSavedToken();
  if (saved) { accessToken = saved; return accessToken; }

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) return reject(new Error(response.error));
        accessToken = response.access_token;
        saveToken(accessToken);
        resolve(accessToken);
      },
      error_callback: (err) => reject(new Error(err.message || "Auth failed")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}

// ── Folder helpers ────────────────────────────────────────────────────────────
// In-memory folder ID cache so we don't re-query Drive on every upload
const folderCache = {};

async function findOrCreateFolder(token, name, parentId = null) {
  const cacheKey = `${parentId || "root"}::${name}`;
  if (folderCache[cacheKey]) return folderCache[cacheKey];

  // Search for existing folder under parent
  const parentQuery = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentQuery}`;
  const res  = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();

  if (data.files && data.files.length > 0) {
    folderCache[cacheKey] = data.files[0].id;
    return data.files[0].id;
  }

  // Create folder
  const body = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) body.parents = [parentId];
  const create = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const folder = await create.json();
  folderCache[cacheKey] = folder.id;
  return folder.id;
}

/**
 * Get or create: Bale Bazaar / {country} / {brand}
 * e.g. Bale Bazaar / Korea / MSM
 */
async function getBaleFolder(token, country, brand) {
  const rootId    = await findOrCreateFolder(token, ROOT_FOLDER);
  const countryId = await findOrCreateFolder(token, country, rootId);
  const brandId   = await findOrCreateFolder(token, brand,   countryId);
  return brandId;
}

// ── Upload ────────────────────────────────────────────────────────────────────
export async function uploadToDrive(file, country, brand, onProgress) {
  const token    = await getDriveToken();
  const folderId = await getBaleFolder(token, country, brand);

  const metadata = {
    name:    `${Date.now()}_${file.name}`,
    parents: [folderId],
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink"
    );
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        const f = JSON.parse(xhr.responseText);
        await makePublic(token, f.id);
        resolve({
          id:           f.id,
          name:         f.name,
          mimeType:     f.mimeType,
          webViewLink:  f.webViewLink,
          embedUrl:     getEmbedUrl(f.id, f.mimeType),
          thumbnailUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
        });
      } else {
        reject(new Error("Upload failed: " + xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

async function makePublic(token, fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
}

function getEmbedUrl(id, mimeType) {
  if (mimeType && mimeType.startsWith("video/")) {
    return `https://drive.google.com/file/d/${id}/preview`;
  }
  return `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
}

// ── Delete ────────────────────────────────────────────────────────────────────
export async function deleteFromDrive(fileId) {
  const token = await getDriveToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
