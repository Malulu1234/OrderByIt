import { app } from './fb-auth-init.js'
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-auth.js'
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js'


const auth = getAuth()
const db = getFirestore(app);
let READY=true;

document.getElementById("registerBtn").addEventListener("click", register)

async function register(e) {
    const uName = document.querySelector("input[name='userEmail']")
    const uPass = document.querySelector("input[name='userPass']")
    if (!(uName.reportValidity() && uPass.reportValidity())) return
    try{
        READY=false
        await createUserWithEmailAndPassword(auth, uName.value, uPass.value)
        const docRef=doc(db, "users", auth.currentUser.uid)
        await setDoc(docRef, {
            mail: uName.value,
            mrps: []
        })
        READY=true
        gotoIndex()
    }catch(e){
        document.querySelector(".error").innerHTML=e.message.slice()
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        gotoIndex()
    }
})
function gotoIndex(){
    if(READY) location = location.href.slice(0, location.href.lastIndexOf("/")) + "/index.html"
}