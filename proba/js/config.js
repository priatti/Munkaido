// Firebase konfigurációs adatok a te projektedből.
// Ezek a kulcsok publikusak, a biztonságot a Firebase szabályok garantálják.
const firebaseConfig = {
  apiKey: "AIzaSyDGgG3y0ppl4639bzjzKA7Yq8BmSkhR-LU",
  authDomain: "munkaido-3cc44.firebaseapp.com",
  projectId: "munkaido-3cc44",
  storageBucket: "munkaido-3cc44.appspot.com",
  messagingSenderId: "706081294435",
  appId: "1:706081294435:web:c8ae57cbe45477de415056"
};

// Firebase app inicializálása a konfigurációval
firebase.initializeApp(firebaseConfig);

// A két legfontosabb Firebase szolgáltatás exportálása,
// hogy a többi modul is használhassa őket.
export const auth = firebase.auth();
export const db = firebase.firestore();