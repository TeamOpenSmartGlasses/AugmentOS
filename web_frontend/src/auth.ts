// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app"
import { getAuth, signInWithPopup, onAuthStateChanged, GoogleAuthProvider, is } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { setAuthToken } from "./utils/utils";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAUeuWnv5XBqhlp3SyTvY-kwo7cZkIDbvw",
  authDomain: "alexwearllm.firebaseapp.com",
  projectId: "alexwearllm",
  storageBucket: "alexwearllm.appspot.com",
  messagingSenderId: "668396061442",
  appId: "1:668396061442:web:9148796b76767bfa15781b",
  measurementId: "G-6Q131BK64W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const googleProvider = new GoogleAuthProvider();

const auth = getAuth();

export var isPopupOpen = false;

export const signInWithGoogle = () => {
    isPopupOpen = true;
    signInWithPopup(auth, googleProvider)
        .then((result: any) => {
            const user = result.user;
            auth.currentUser?.getIdToken(true).then((idToken) => {
                console.log("GOT A LOGIN GOOD!!")
                console.log(user)
                setAuthToken(idToken)
            })

            //setAuthToken(token);
            isPopupOpen = false;

        }).catch((error: any) => {
            console.log(error)
            const errorCode = error.code;
            const errorMessage = error.message;
            const email = error.email;
            const credential = error.credential;
            isPopupOpen = false;
        });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        console.log("AUTH STATE GOOD")
    } else {
        // User is signed out
        console.log("AUTH STATE bad")
    }
});