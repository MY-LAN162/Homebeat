// Lớp chuyển đổi Firebase — bản WEB (trang dùng thử, chạy thử tự động): thư viện Firebase JavaScript.
// Bản điện thoại ở fbsdk.native.ts (React Native Firebase, có App Check bằng Play Integrity / App Attest).
// Hai bản xuất cùng tên hàm, nên firebaseSync.ts dùng chung một mã.
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, initializeFirestore } from 'firebase/firestore';

export {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
export { EmailAuthProvider, linkWithCredential, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';

/** Ví dụ "192.168.1.10" để chạy với Firebase Emulator trên máy tính. */
const EMULATOR_HOST = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
/** reCAPTCHA v3 cho App Check trên web (tùy chọn). */
const RECAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;

/** Cấu hình lấy từ biến môi trường EXPO_PUBLIC_FIREBASE_* (file .env, xem .env.example). */
function webConfig(): FirebaseOptions | undefined {
  // Phải viết đầy đủ process.env.EXPO_PUBLIC_... thì Expo mới nhúng giá trị vào app lúc đóng gói.
  const cfg: FirebaseOptions = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
  return cfg.apiKey && cfg.projectId && cfg.appId ? cfg : undefined;
}

export type FbAuth = ReturnType<typeof getAuth>;
export type FbDb = ReturnType<typeof getFirestore>;

/** Khởi tạo Firebase (kèm App Check). undefined nếu chưa cấu hình (app chạy một máy). */
export function initFirebase(): { auth: FbAuth; db: FbDb } | undefined {
  const cfg = webConfig();
  if (!cfg) return undefined;
  const first = getApps().length === 0;
  const app = first ? initializeApp(cfg) : getApp();
  if (first && RECAPTCHA_SITE_KEY && !EMULATOR_HOST) {
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }
  const auth = getAuth(app);
  const db = first
    ? initializeFirestore(app, { ignoreUndefinedProperties: true, experimentalAutoDetectLongPolling: true })
    : getFirestore(app);
  if (first && EMULATOR_HOST) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
  }
  return { auth, db };
}
