import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import firebaseConfig from "./fb-env.js";
const app=initializeApp(firebaseConfig);
export {app};
export default app;