// VETJOD — Firebase config + team passcode.
// This file is loaded as a plain <script> (not a module) so its two constants are
// available as globals to app.js. See README.md for the exact setup steps.
//
// The Firebase web config below is NOT a secret — Google's docs explicitly say it's safe
// to ship in client code (https://firebase.google.com/docs/projects/api-keys). Access
// control is enforced by the Firestore security rules (see README.md), not by hiding
// these values.

// EDIT ME — paste the config object from
// Firebase Console > Project settings > General > Your apps > SDK setup and configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD6uypUIYp76iOSRyHhhM5FaIsgHv1C7Bg",
  authDomain: "vetjod.firebaseapp.com",
  projectId: "vetjod",
  storageBucket: "vetjod.firebasestorage.app",
  messagingSenderId: "694262152806",
  appId: "1:694262152806:web:d91f21b7e29ebd6538f7a7",
  measurementId: "G-3NMZ1QT5BN"
};

// EDIT ME — shared passcode the vet team types once per device before using VETJOD.
// This is a soft gate only (it lives in this public JS file, same as any client-side
// check) — it keeps casual link visitors out, it does not provide real security.
// Change it any time by editing this line and redeploying.
const TEAM_PASSCODE = "vetjod2026";
