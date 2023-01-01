import { app } from './fb-auth-init.js'
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.14.0/firebase-auth.js'
const auth = getAuth()

const loginBtn=document.getElementById("loginBtn")

loginBtn.addEventListener("click", login)
document.addEventListener("keydown", (e)=>{
    if (e.key=='Enter') loginBtn.click()
})

async function login(e) {
    const uName = document.querySelector("input[name='userEmail']")
    const uPass = document.querySelector("input[name='userPass']")
    if (!(uName.reportValidity() && uPass.reportValidity())) return
    try{
        await signInWithEmailAndPassword(auth, uName.value, uPass.value)
    }catch{
        document.querySelector(".error").innerHTML='email or password are incorrect'
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        location = location.href.slice(0, location.href.lastIndexOf("/")) + "/index.html"
    }
})