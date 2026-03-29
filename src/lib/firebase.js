import firebase from 'firebase/app';
import 'firebase/auth';

let initialized = false;

function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getFirebaseApp() {
  if (initialized && firebase.apps.length) return firebase.app();

  const config = {
    apiKey: required('REACT_APP_FIREBASE_API_KEY'),
    authDomain: required('REACT_APP_FIREBASE_AUTH_DOMAIN'),
    projectId: required('REACT_APP_FIREBASE_PROJECT_ID'),
    appId: required('REACT_APP_FIREBASE_APP_ID'),
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  };

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }
  initialized = true;
  return firebase.app();
}

export function getFirebaseAuth() {
  getFirebaseApp();
  return firebase.auth();
}
