import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { collection, doc, getDocs, getFirestore, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDOzzPZRJe0Qxvb5RH9pA1SbxSMWt-551s",
    authDomain: "munayu.firebaseapp.com",
    projectId: "munayu",
    storageBucket: "munayu.firebasestorage.app",
    messagingSenderId: "435609048625",
    appId: "1:435609048625:web:26e2b4fd7f9d4b2eef2710",
    measurementId: "G-ZEERMHK8WQ"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const form = document.getElementById("aboutForm");
const formFields = document.getElementById("aboutFormFields");
const saveButton = document.getElementById("btnSaveAbout");
const statusMessage = document.getElementById("aboutStatus");

const sections = [
    {
        description: document.getElementById("aboutDescription1"),
        imageInput: document.getElementById("aboutImageInput1"),
        preview: document.getElementById("aboutImagePreview1"),
        defaultImage: "../images/about1.jpg",
        defaultDescription: "這裡填寫您的第一段故事。例如：傾聽內心的聲音，尋找生命的方向。我是 Muna，一位熱愛靈性療癒與心靈陪伴的問路人。\n在娜娜問路居，我們不只探討方向，更希望陪伴你在日常的喧囂中，重新找回靈魂最真實的溫度與平靜。"
    },
    {
        description: document.getElementById("aboutDescription2"),
        imageInput: document.getElementById("aboutImageInput2"),
        preview: document.getElementById("aboutImagePreview2"),
        defaultImage: "../images/about2.jpg",
        defaultDescription: "這裡填寫您的第二段介紹。例如：我們提供的服務涵蓋正念靜心引導、心靈諮詢以及各式靈性療癒課程。這裡是一個完全安全、包容且充滿正能量的隱密空間。\n不論你正面臨人生的十字路口，或是純粹想給疲憊的自己一段靜心的時光，這裡永遠為你點著一盞燈。"
    }
];

let currentImages = sections.map((section) => section.defaultImage);
let isInitialized = false;
let aboutDocumentRef = null;

function setStatus(message, state = "success") {
    statusMessage.textContent = message;
    statusMessage.dataset.state = state;
}

function setPreview(section, source) {
    if (section.preview.src.startsWith("blob:")) {
        URL.revokeObjectURL(section.preview.src);
    }
    section.preview.src = source;
}

function convertFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== "string") {
                reject(new Error("圖片讀取結果格式不正確。"));
                return;
            }
            resolve(reader.result);
        };
        reader.onerror = () => reject(reader.error || new Error("無法讀取所選圖片。"));
        reader.readAsDataURL(file);
    });
}

async function initializeAboutEditor() {
    const aboutSnapshot = await getDocs(collection(db, "about"));
    aboutDocumentRef = aboutSnapshot.docs[0]?.ref || doc(collection(db, "about"));
    const aboutData = aboutSnapshot.docs[0]?.data();
    const savedImages = Array.isArray(aboutData?.images) ? aboutData.images : [];
    const savedStatements = Array.isArray(aboutData?.statements) ? aboutData.statements : [];

    sections.forEach((section, index) => {
        section.description.value = typeof savedStatements[index] === "string" && savedStatements[index]
            ? savedStatements[index]
            : section.defaultDescription;
        currentImages[index] = typeof savedImages[index] === "string" && savedImages[index]
            ? savedImages[index]
            : section.defaultImage;
        setPreview(section, currentImages[index]);
    });

    formFields.disabled = false;
    setStatus("內容已載入。修改完成後按下「儲存關於我內容」。");

    sections.forEach((section, index) => {
        section.imageInput.addEventListener("change", () => {
            const file = section.imageInput.files?.[0];
            if (!file) {
                setPreview(section, currentImages[index]);
                return;
            }
            if (!file.type.startsWith("image/")) {
                section.imageInput.value = "";
                section.preview.src = currentImages[index];
                setStatus("請選擇有效的圖片檔案。", "error");
                return;
            }
            if (file.size > 300 * 1024) {
                section.imageInput.value = "";
                section.preview.src = currentImages[index];
                setStatus(`圖片大小為 ${(file.size / 1024).toFixed(1)}KB，請壓縮至 300KB 以下。`, "error");
                return;
            }
            setPreview(section, URL.createObjectURL(file));
            setStatus("照片預覽已更新，按下儲存後才會套用到前台。");
        });
    });
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (sections.some((section) => !section.description.value.trim())) {
        setStatus("兩段文字描述都必須填寫。", "error");
        return;
    }

    saveButton.disabled = true;
    setStatus("正在儲存關於我內容...");

    try {
        const updatedImages = await Promise.all(sections.map(async (section, index) => {
            const selectedFile = section.imageInput.files?.[0];
            return selectedFile ? convertFileToDataUrl(selectedFile) : currentImages[index];
        }));
        const statements = sections.map((section) => section.description.value.trim());
        await setDoc(aboutDocumentRef, {
            images: updatedImages,
            statements,
            updatedAt: serverTimestamp()
        }, { merge: true });
        currentImages = updatedImages;
        sections.forEach((section, index) => {
            section.imageInput.value = "";
            setPreview(section, currentImages[index]);
        });
        setStatus("關於我內容已儲存，前台將同步更新。");
    } catch (error) {
        console.error("儲存關於我內容失敗：", error);
        setStatus(`儲存失敗：${error.message || "請稍後再試。"}`, "error");
    } finally {
        saveButton.disabled = false;
    }
});

onAuthStateChanged(auth, (user) => {
    if (isInitialized) return;
    if (isLocalhost || user) {
        isInitialized = true;
        initializeAboutEditor().catch((error) => {
            console.error("載入關於我內容失敗：", error);
            setStatus(`載入失敗：${error.message || "請重新整理頁面再試。"}`, "error");
        });
        return;
    }
    setTimeout(() => {
        if (!auth.currentUser) {
            window.location.replace("../front/login.html");
        }
    }, 400);
});
