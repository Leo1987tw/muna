import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

// 🌐 雲端真實專案資料庫組態
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
const auth = getAuth(app);

// 監聽「確定登出」按鈕點擊事件
document.getElementById('executeLogoutBtn').addEventListener('click', () => {
    // 切換 DOM 顯示狀態：隱藏按鈕組，秀出微光加載動畫與說明文字
    document.getElementById('confirmState').style.display = 'none';
    document.getElementById('loadingState').style.display = 'block';

    // 🚀 執行 Firebase 官方登出，抹除瀏覽器的永久/暫存憑證
    signOut(auth)
        .then(() => {
            console.log("【安全通道】憑證已確實清除。");
            // 留 500 毫秒動畫展示，隨即安全強制重定向回到前台首頁
            setTimeout(() => {
                window.location.replace("../index.html");
            }, 500);
        })
        .catch((error) => {
            console.error("Logout Page Redirect Error:", error);
            window.location.replace("../index.html");
        });
});