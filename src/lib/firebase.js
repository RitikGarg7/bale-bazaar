// Firebase client — Auth (Google) + Firestore + Storage
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Fallback to hardcoded config if env vars not set (for quick deploy)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyAWqfvXGAyDqkyvXzl9KiGWSUPWDZgWm04",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "bale-bazaar.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "bale-bazaar",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "bale-bazaar.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "498474421999",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:498474421999:web:efbf0ef93156f66dd2d51a",
};

const app    = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const storage = getStorage(app);
const _db            = getFirestore(app);

export { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup };

// ── Helpers ───────────────────────────────────────────────────────────────────
function userCol(uid, table) {
  return collection(_db, "users", uid, table);
}
function userDoc(uid, table, id) {
  return doc(_db, "users", uid, table, id);
}
function currentUid() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  return user.uid;
}

// ── DB API ────────────────────────────────────────────────────────────────────
export const db = {

  async getAll(table) {
    const uid  = currentUid();
    const q    = query(userCol(uid, table), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async upsert(table, id, data) {
    const uid = currentUid();
    const ref = id ? userDoc(uid, table, id) : doc(userCol(uid, table));
    await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    return ref.id;
  },

  async delete(table, id) {
    const uid = currentUid();
    await deleteDoc(userDoc(uid, table, id));
  },

  async getOne(table, id) {
    const uid  = currentUid();
    const snap = await getDoc(userDoc(uid, table, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },
};
