import { app } from './fb-auth-init.js'
import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-auth.js'
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js'
const auth = getAuth()
const db = getFirestore(app);

document.getElementById('logOut').addEventListener("click", ()=>signOut(auth))

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // alert("you've been logged out, please reconnect");
        location = location.href.slice(0, location.href.lastIndexOf("/")) + "/login.html"
    }
})