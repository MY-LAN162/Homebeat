// Lớp chuyển đổi Firebase — bản ĐIỆN THOẠI: React Native Firebase, có App Check
// (Play Integrity trên Android, App Attest / DeviceCheck trên iPhone) để máy chủ chỉ nhận yêu cầu từ app thật.
// Cấu hình Firebase lấy từ google-services.json / GoogleService-Info.plist (xem app.config.js, README).
import { getApp, getApps } from '@react-native-firebase/app';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { connectAuthEmulator, getAuth } from '@react-native-firebase/auth';
import { connectFirestoreEmulator, initializeFirestore } from '@react-native-firebase/firestore';

export {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
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
} from '@react-native-firebase/firestore';
export { EmailAuthProvider, linkWithCredential, signInAnonymously, signInWithEmailAndPassword } from '@react-native-firebase/auth';

const EMULATOR_HOST = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
/** Mã debug App Check cho bản development build (thêm mã này trong Firebase console › App Check). */
const DEBUG_TOKEN = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN;

let ready: { auth: ReturnType<typeof getAuth>; db: ReturnType<typeof initializeFirestore> } | undefined;

/** Khởi tạo Firebase (kèm App Check). undefined nếu bản cài chưa có file cấu hình Firebase (app chạy một máy). */
export function initFirebase() {
  if (ready) return ready;
  if (getApps().length === 0) return undefined;
  const app = getApp();
  if (!EMULATOR_HOST) {
    // Bản phát hành: chứng thực bằng Play Integrity / App Attest. Bản thử nghiệm (__DEV__): dùng mã debug.
    const provider = new ReactNativeFirebaseAppCheckProvider();
    provider.configure({
      android: { provider: __DEV__ ? 'debug' : 'playIntegrity', debugToken: DEBUG_TOKEN },
      apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback', debugToken: DEBUG_TOKEN },
    });
    initializeAppCheck(app, { provider, isTokenAutoRefreshEnabled: true });
  }
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  if (EMULATOR_HOST) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`);
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
  }
  ready = { auth, db };
  return ready;
}
