/* new configuration for firebase */
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database";

const config = {
  apiKey: "AIzaSyD5SfW2WPSzPg-HNASixEeTAyjc32fBesA",
  authDomain: "mineral-bonus-333017.firebaseapp.com",
  projectId: "mineral-bonus-333017",
  storageBucket: "mineral-bonus-333017.appspot.com",
  messagingSenderId: "411980762826",
  appId: "1:411980762826:web:7bf8bbbde9c0bffcfd2e33",
  measurementId: "G-WPCEMF7Z07"
};

// Initialize Firebase

const app = initializeApp(config);
export const database = getDatabase(app);
export const userDataRef = ref(database, 'users');
export const neuroglancerDataRef = ref(database, 'neuroglancer');
// const ref = db.ref('dinosaurs');
export const dbRef = ref(database);
export const cors = require('cors')({origin: true});


