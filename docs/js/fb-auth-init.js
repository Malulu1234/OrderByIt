import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
// import firebaseConfig from "./fb-env.js";
const app=initializeApp({
    apiKey: "AIzaSyAy0z3s7EfbcE7kWfcHWbYKGEt2CH4DY3Y",
    authDomain: "orderbyit.firebaseapp.com",
    projectId: "orderbyit",
    storageBucket: "orderbyit.appspot.com",
    messagingSenderId: "818501790937",
    appId: "1:818501790937:web:44199c85834466471ba2c8",
    measurementId: "G-MT9GP9DDLY"
});
export {app};
export default app;