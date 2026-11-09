import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { doc, getFirestore, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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

function renderParagraphs(container, value) {
    container.querySelectorAll("p").forEach((paragraph) => paragraph.remove());
    value.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean).forEach((paragraphText) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = paragraphText;
        container.appendChild(paragraph);
    });
}

function imageAltFor(key, data, element) {
    if (key === "service1Image") return data.service1Title || "第一項課程服務";
    if (key === "service2Image") return data.service2Title || "第二項課程服務";
    if (key === "featureImage") return data.conceptTitle || "光的課程理念";
    if (key.startsWith("planImage")) {
        const planNumber = key.slice(-1);
        return data[`plan${planNumber}Title`] || `開課計畫 ${planNumber}`;
    }
    return element.dataset.course1Alt || "光的課程圖片";
}

function renderImage(element, key, source, data) {
    const alt = imageAltFor(key, data, element);
    element.replaceChildren();
    if (source) {
        const image = document.createElement("img");
        image.src = source;
        image.alt = alt;
        element.appendChild(image);
        if (element.getAttribute("role") === "img") {
            element.setAttribute("aria-label", alt);
        }
        return;
    }

    const placeholder = document.createElement("span");
    placeholder.textContent = element.dataset.course1Placeholder || "尚未設定圖片";
    element.appendChild(placeholder);
    if (element.getAttribute("role") === "img") {
        element.setAttribute("aria-label", placeholder.textContent);
    }
}

function renderCourse1(data) {
    document.querySelectorAll("[data-course1-text]").forEach((element) => {
        const key = element.dataset.course1Text;
        if (typeof data[key] === "string") element.textContent = data[key];
    });

    document.querySelectorAll("[data-course1-paragraphs]").forEach((element) => {
        const key = element.dataset.course1Paragraphs;
        if (typeof data[key] === "string") renderParagraphs(element, data[key]);
    });

    document.querySelectorAll("[data-course1-plan]").forEach((element) => {
        const planNumber = element.dataset.course1Plan;
        const title = data[`plan${planNumber}Title`];
        const description = data[`plan${planNumber}Description`];
        const button = data[`plan${planNumber}Button`];
        if (typeof title === "string") element.querySelector("[data-course1-plan-title]").textContent = title;
        if (typeof description === "string") element.querySelector("[data-course1-plan-description]").textContent = description;
        if (typeof button === "string") element.querySelector("[data-course1-plan-button]").textContent = button;
    });

    document.querySelectorAll("[data-course1-image]").forEach((element) => {
        const key = element.dataset.course1Image;
        if (typeof data[key] === "string") renderImage(element, key, data[key], data);
    });
}

function restoreCurrentPlansAnchor() {
    if (window.location.hash !== "#current-plans") return;

    const target = document.getElementById("current-plans");
    if (!target) return;

    const imagesAboveTarget = Array.from(document.images).filter((image) =>
        image.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING
    );
    const imagesLoaded = Promise.all(imagesAboveTarget.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
            if (image.complete) finish();
        });
    }));

    imagesLoaded.then(() => {
        if (window.location.hash === "#current-plans") {
            requestAnimationFrame(() => {
                target.scrollIntoView({ behavior: "instant", block: "start" });
            });
        }
    });
}

let restoredCurrentPlansAnchor = false;
onSnapshot(doc(db, "courses", "course1"), (snapshot) => {
    if (snapshot.exists()) {
        renderCourse1(snapshot.data());
        if (!restoredCurrentPlansAnchor) {
            restoredCurrentPlansAnchor = true;
            restoreCurrentPlansAnchor();
        }
    }
}, (error) => {
    console.error("載入光的課程頁面設定失敗：", error);
});
