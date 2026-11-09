import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { addDoc, collection, doc, getDocs, getFirestore, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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
const db = getFirestore(app);
const videoCollection = collection(db, "video");
const videoUrlInput = document.getElementById("videoUrlInput");
const updateVideoButton = document.getElementById("btnUpdateVideo");
const previewFrame = document.getElementById("videoPreviewFrame");
const formMessage = document.getElementById("videoFormMessage");
const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
let currentVideoDocId = null;

function getYouTubeVideoId(value) {
    const input = value.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

    try {
        const url = new URL(input);
        const host = url.hostname.toLowerCase().replace(/^www\./, "");
        let videoId = "";

        if (host === "youtu.be") {
            videoId = url.pathname.split("/").filter(Boolean)[0] || "";
        } else if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
            if (url.pathname === "/watch") {
                videoId = url.searchParams.get("v") || "";
            } else {
                videoId = url.pathname.split("/").filter(Boolean)[1] || "";
            }
        }

        return /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : "";
    } catch {
        return "";
    }
}

function showPreview(videoId) {
    previewFrame.replaceChildren();
    if (!videoId) {
        const message = document.createElement("p");
        message.textContent = "輸入有效的 YouTube 網址即可預覽影片。";
        previewFrame.appendChild(message);
        return;
    }

    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
    iframe.title = "YouTube 影片預覽";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    previewFrame.appendChild(iframe);
}

function setMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.dataset.error = String(isError);
}

videoUrlInput.addEventListener("input", () => {
    const input = videoUrlInput.value.trim();
    const videoId = getYouTubeVideoId(input);
    showPreview(videoId);
    setMessage(input && !videoId ? "網址格式無效，請確認 YouTube 影片網址或影片 ID。" : "", Boolean(input && !videoId));
});

updateVideoButton.addEventListener("click", async () => {
    const url = videoUrlInput.value.trim();
    const videoId = getYouTubeVideoId(url);

    if (!videoId) {
        setMessage("請輸入有效的 YouTube 影片或 Shorts 網址。", true);
        videoUrlInput.focus();
        return;
    }

    updateVideoButton.disabled = true;
    updateVideoButton.textContent = "儲存中...";
    setMessage("");

    try {
        const videoData = {
            src: url,
            created_at: serverTimestamp()
        };
        if (currentVideoDocId) {
            await updateDoc(doc(db, "video", currentVideoDocId), videoData);
        } else {
            const newVideoDoc = await addDoc(videoCollection, {
                ...videoData
            });
            currentVideoDocId = newVideoDoc.id;
        }
        setMessage("影片設定已儲存，首頁已同步更新。");
    } catch (error) {
        console.error("儲存 YouTube 影片設定失敗：", error);
        const permissionHint = error.code === "permission-denied"
            ? "請確認已登入管理員帳號，且 Firestore Rules 允許管理員寫入 video 集合。"
            : error.message;
        setMessage(`儲存失敗：${permissionHint}`, true);
    } finally {
        updateVideoButton.disabled = false;
        updateVideoButton.textContent = "儲存影片設定";
    }
});

async function loadVideoSetting() {
    try {
        const snapshot = await getDocs(videoCollection);
        const videos = snapshot.docs.slice().sort((left, right) => {
            const leftCreated = left.data().created_at?.toMillis?.() || 0;
            const rightCreated = right.data().created_at?.toMillis?.() || 0;
            return rightCreated - leftCreated;
        });
        const currentVideo = videos[0];
        if (!currentVideo) {
            updateVideoButton.disabled = false;
            return;
        }

        currentVideoDocId = currentVideo.id;
        const data = currentVideo.data();
        videoUrlInput.value = data.src || "";
        showPreview(data.videoId || getYouTubeVideoId(videoUrlInput.value));
        updateVideoButton.disabled = false;
    } catch (error) {
        console.error("讀取 YouTube 影片設定失敗：", error);
        const permissionHint = error.code === "permission-denied"
            ? "請確認已登入管理員帳號，且 Firestore Rules 允許管理員讀取 video 集合。"
            : error.message;
        setMessage(`無法讀取目前影片設定：${permissionHint}`, true);
    }
}

onAuthStateChanged(auth, (user) => {
    if (isLocalhost || user) {
        loadVideoSetting();
        return;
    }

    window.location.replace("../front/login.html");
});
