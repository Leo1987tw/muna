import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// 🌐 雲端專案組態設定
const firebaseConfig = {
    apiKey: "AIzaSyDOzzPZRJe0Qxvb5RH9pA1SbxSMWt-551s",
    authDomain: "munayu.firebaseapp.com",
    projectId: "munayu",
    storageBucket: "munayu.firebasestorage.app",
    messagingSenderId: "435609048625",
    appId: "1:435609048625:web:26e2b4fd7f9d4b2eef2710",
    measurementId: "G-ZEERMHK8WQ"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// 💡 判斷是否為本機維修環境 (localhost 或 127.0.0.1)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 🌟 關鍵新增：手動登入鎖。如果管理員正在點擊按鈕手動登入，先封鎖上面的自動監聽跳轉，避免憑證寫入中斷
let isManualLoggingIn = false;

// 自動檢查登入狀態：一進到 login.html 畫面，立刻執行背景身分審查
onAuthStateChanged(auth, (user) => {
    // 🌟 如果目前是管理員手動輸入帳密登入，直接 return 退出，將跳轉控制權完整交給下方的 submit 事件
    if (isManualLoggingIn) return; 

    if (user) {
        console.log("偵測到管理員已處於登入狀態，正在為您自動導向後台...");
        window.location.href = "../back/admin.html";
    } else {
        console.log("尚未登入，請輸入管理員憑證。");
    }
});

// 監聽表單送出事件（手動輸入帳密登入）
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    // 🌟 啟動登入鎖，告訴網頁此時不要讓 onAuthStateChanged 來插隊打架
    isManualLoggingIn = true; 
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // 🚀 向 Google 線上伺服器驗證帳密
    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            // ⭕ 憑證已安穩核發，彈出提示，按下確認後才執行安全的網頁轉址跳轉
            alert("登入成功！正在前往主控制台...");
            window.location.href = "../back/admin.html"; 
        })
        .catch((error) => {
            isManualLoggingIn = false; // 登入失敗，解開鎖定讓使用者重試
            console.error("Firebase Auth Error:", error.code, error.message);
            
            if (error.code === 'auth/unauthorized-domain') {
                alert("登入失敗：當前本機網域未在 Firebase 授權網域白名單內！\n\n請至 Firebase Console -> Authentication -> 設定 -> 授權網域 補上 127.0.0.1 或 localhost。");
            } else {
                alert("登入失敗：帳號或密碼錯誤。");
            }
        });
});