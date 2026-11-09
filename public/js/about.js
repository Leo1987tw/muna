import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { collection, getFirestore, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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
const db = getFirestore(app);

const sectionTexts = [
    document.getElementById("aboutSection1Text"),
    document.getElementById("aboutSection2Text")
];
const sectionImages = [
    document.getElementById("aboutSection1Image"),
    document.getElementById("aboutSection2Image")
];

onSnapshot(collection(db, "about"), (snapshot) => {
    const aboutDocument = snapshot.docs[0];
    if (!aboutDocument) return;
    const data = aboutDocument.data();

    sectionTexts.forEach((container, index) => {
        if (!container || typeof data.statements?.[index] !== "string") return;
        const paragraphs = data.statements[index]
            .split(/\r?\n/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean);
        container.replaceChildren(...paragraphs.map((paragraph) => {
            const element = document.createElement("p");
            element.textContent = paragraph;
            return element;
        }));
    });

    sectionImages.forEach((image, index) => {
        if (image && typeof data.images?.[index] === "string" && data.images[index]) {
            image.src = data.images[index];
        }
    });
}, (error) => {
    console.error("讀取「關於我」內容失敗：", error);
});
