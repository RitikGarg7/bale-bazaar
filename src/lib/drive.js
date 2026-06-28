/**
 * Google Drive integration
 * Uses the user's own Drive — files stored in "Bale Bazaar" folder
 * Scope: drive.file (only files created by this app)
 */

const DRIVE_SCOPE  = "https://www.googleapis.com/auth/drive.file";
const FOLDER_NAME  = "Bale Bazaar";

let accessToken = null;

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function getDriveToken() {
  if (accessToken) return accessToken;

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) return reject(response.error);
        accessToken = response.access_token;
        resolve(accessToken);
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

// ── Ensure "Bale Bazaar" folder exists ───────────────────────────────────────
async function getOrCreateFolder(token) {
  // Search for existing folder
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await search.json();
  if (data.files && data.files.length > 0) return data.files[0].id;

  // Create folder
  const create = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const folder = await create.json();
  return folder.id;
}

// ── Upload file ───────────────────────────────────────────────────────────────
export async function uploadToDrive(file, onProgress) {
  const token    = await getDriveToken();
  const folderId = await getOrCreateFolder(token);

  const metadata = {
    name: `${Date.now()}_${file.name}`,
    parents: [folderId],
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        const fileData = JSON.parse(xhr.responseText);
        // Make file publicly readable so anyone with link can view
        await makePublic(token, fileData.id);
        resolve({
          id:            fileData.id,
          name:          fileData.name,
          mimeType:      fileData.mimeType,
          webViewLink:   fileData.webViewLink,
          // Direct embed URLs
          embedUrl:      getEmbedUrl(fileData.id, fileData.mimeType),
          thumbnailUrl:  `https://drive.google.com/thumbnail?id=${fileData.id}&sz=w400`,
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

// ── Delete file ───────────────────────────────────────────────────────────────
export async function deleteFromDrive(fileId) {
  const token = await getDriveToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
