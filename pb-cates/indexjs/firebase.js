/* ══════════════════════════════════════════════════════════════════
   FIREBASE — Initialisation lazy et mise en cache des instances
   Auth et Firestore. Lit window.FIREBASE_CONFIG défini en inline
   dans index.html (doit rester là pour que le SDK le trouve au boot).
══════════════════════════════════════════════════════════════════ */

let _fbAuth   = null;
let _fbDb     = null;
let _fsModule = null;

export async function getFbAuth() {
  if (_fbAuth) return _fbAuth;
  const [{ getApps, getApp, initializeApp }, { getAuth }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js')
  ]);
  const app = getApps().length ? getApp() : initializeApp(window.FIREBASE_CONFIG);
  _fbAuth   = getAuth(app);
  return _fbAuth;
}

export async function getFbDb() {
  if (_fbDb) return _fbDb;
  const [{ getApps, getApp, initializeApp }, fs] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')
  ]);
  const app  = getApps().length ? getApp() : initializeApp(window.FIREBASE_CONFIG);
  _fbDb      = fs.getFirestore(app);
  _fsModule  = fs;
  fs.enableIndexedDbPersistence(_fbDb).catch(() => {});
  return _fbDb;
}

/** Retourne le module Firestore complet (disponible après le premier getFbDb()). */
export function getFsModule() { return _fsModule; }
