import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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
const form = document.getElementById("course1Form");
const formFields = document.getElementById("course1FormFields");
const editorContainer = document.getElementById("course1Editor");
const saveButton = document.getElementById("saveCourse1Button");
const statusMessage = document.getElementById("course1Status");
const courseSelect = document.getElementById("courseSelect");
const standardEditor = document.getElementById("courseStandardEditor");
const editorPanel = document.getElementById("course1EditorPanel");
const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const maxImageSize = 300 * 1024;
const maxImageDataSize = 800 * 1024;

const sections = [
    {
        title: "頁面標題與服務介紹",
        fields: [
            { key: "pageLabel", label: "頁面標籤", value: "課程與服務", type: "text" },
            { key: "service1Title", label: "第一項服務標題", value: "一對一心靈陪伴與傾聽", type: "text" },
            { key: "service1Text", label: "第一項服務介紹", value: "這裡填寫第一個服務的核心介紹。在漫長的人生旅途中，我們總會遇到需要停下腳步、撥開迷霧的時刻。這裡提供一個完全安全、不具批判性的神聖空間。\n\n透過專業的內在對話引導與正念傾聽，Muna 將陪伴您梳理混亂的情緒，看見困境背後的本質，重新找回核心的內在力量與平靜。", type: "textarea" },
            { key: "service2Title", label: "第二項服務標題", value: "正念靜心與能量引導課", type: "text" },
            { key: "service2Text", label: "第二項服務介紹", value: "這裡填寫第二個服務的深度介紹。現代生活充滿喧囂，頭腦的思緒往往過於喧鬧。本課程專為渴望釋放壓力、清理緊繃能量場的您所設計。\n\n透過呼吸覺察、脈輪靜心與精微能量的溫柔引導，協助您在日常中建立穩固的靜心習慣，讓疲憊的身心重新回到和諧與豐盛的呼吸頻率。", type: "textarea" },
            { key: "plansLinkText", label: "查看開課連結文字", value: "查看目前開課", type: "text" }
        ],
        images: [
            { key: "service1Image", label: "第一項服務圖片", placeholder: "尚未設定服務圖片" },
            { key: "service2Image", label: "第二項服務圖片", placeholder: "尚未設定服務圖片" }
        ]
    },
    {
        title: "光的課程理念",
        fields: [
            { key: "conceptTitle", label: "理念標題", value: "光的課程理念", type: "text" },
            { key: "conceptText", label: "理念介紹", value: "此處預留課程理念介紹，將分享光的課程如何陪伴學習者認識自己、深化內在覺察，並在生活中實踐所學。", type: "textarea" }
        ],
        images: [
            { key: "featureImage", label: "課程理念圖片", placeholder: "尚未設定理念圖片" }
        ]
    },
    {
        title: "學習旅程",
        fields: [
            { key: "journeyTitle", label: "區塊標題", value: "學習旅程", type: "text" }
        ],
        images: [
            { key: "journeyImage1", label: "初階圖片", value: "../images/course1-1.jpg" },
            { key: "journeyImage2", label: "行星圖片", value: "../images/course1-2.jpg" },
            { key: "journeyImage3", label: "天使圖片", value: "../images/course1-3.jpg" },
            { key: "journeyImage4", label: "單元級次圖片", value: "../images/course1-4.jpg" }
        ]
    },
    {
        title: "目前開課計畫",
        fields: [
            { key: "plansTitle", label: "區塊標題", value: "目前開課計畫", type: "text" },
            { key: "plan1Title", label: "班別一標題", value: "班別一｜初階課程", type: "text" },
            { key: "plan1Description", label: "班別一介紹", value: "開課時間與課程內容資訊預留中。", type: "textarea" },
            { key: "plan1Button", label: "班別一按鈕文字", value: "我要報名", type: "text" },
            { key: "plan2Title", label: "班別二標題", value: "班別二｜行星課程", type: "text" },
            { key: "plan2Description", label: "班別二介紹", value: "開課時間與課程內容資訊預留中。", type: "textarea" },
            { key: "plan2Button", label: "班別二按鈕文字", value: "登記學習意願", type: "text" },
            { key: "plan3Title", label: "班別三標題", value: "班別三｜天使與單元課程", type: "text" },
            { key: "plan3Description", label: "班別三介紹", value: "開課時間與課程內容資訊預留中。", type: "textarea" },
            { key: "plan3Button", label: "班別三按鈕文字", value: "登記學習意願", type: "text" }
        ],
        images: [
            { key: "planImage1", label: "班別一圖片", value: "../images/course1-5.jpg" },
            { key: "planImage2", label: "班別二圖片", value: "../images/course1-6.jpg" },
            { key: "planImage3", label: "班別三圖片", value: "../images/course1-7.jpg" }
        ]
    }
];

const textInputs = new Map();
const imageEditors = new Map();
const defaultTextValues = new Map(
    sections.flatMap((section) => section.fields.map((field) => [field.key, field.value]))
);
let isInitialized = false;
let previewObjectUrls = [];
let isDirty = false;
let isCourse1Active = false;

function setStatus(message, state = "success") {
    statusMessage.textContent = message;
    statusMessage.dataset.state = state;
}

function createInputGroup(labelText, key, value, type) {
    const group = document.createElement("div");
    group.className = "admin-input-group";

    const label = document.createElement("label");
    label.htmlFor = `course1-${key}`;
    label.textContent = labelText;

    const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    input.id = `course1-${key}`;
    input.className = "admin-form-input";
    input.dataset.textKey = key;
    input.value = value;
    if (type === "textarea") {
        input.rows = 4;
        input.maxLength = 6000;
    } else {
        input.type = "text";
        input.maxLength = 500;
    }
    group.append(label, input);
    if (type === "textarea") {
        const hint = document.createElement("p");
        hint.className = "course1-admin-hint";
        hint.textContent = "段落之間空一行，前台會分段顯示。";
        group.appendChild(hint);
    }
    textInputs.set(key, input);
    return group;
}

function createImageEditor(config) {
    const wrapper = document.createElement("div");
    wrapper.className = "course1-admin-image";
    wrapper.dataset.imageEditor = config.key;

    const preview = document.createElement("div");
    preview.className = "course1-admin-image-preview";
    preview.setAttribute("aria-live", "polite");

    const urlGroup = document.createElement("div");
    urlGroup.className = "admin-input-group";
    const urlLabel = document.createElement("label");
    urlLabel.htmlFor = `course1-${config.key}-url`;
    urlLabel.textContent = `${config.label}網址`;
    const urlInput = document.createElement("input");
    urlInput.type = "text";
    urlInput.id = `course1-${config.key}-url`;
    urlInput.className = "admin-form-input";
    urlInput.placeholder = "https://... 或 ../images/...";
    urlGroup.append(urlLabel, urlInput);

    const fileGroup = document.createElement("label");
    fileGroup.className = "admin-input-group";
    fileGroup.htmlFor = `course1-${config.key}-file`;
    const fileLabel = document.createElement("span");
    fileLabel.textContent = `或上傳${config.label}`;
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = `course1-${config.key}-file`;
    fileInput.className = "admin-form-input";
    fileInput.accept = "image/*";
    fileGroup.append(fileLabel, fileInput);

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "course1-admin-clear-image";
    clearButton.textContent = "移除圖片";

    const hint = document.createElement("p");
    hint.className = "course1-admin-hint";
    hint.textContent = "支援 JPG、PNG、WebP，每張不超過 300KB；網址與上傳擇一。";

    wrapper.append(preview, urlGroup, fileGroup, clearButton, hint);
    const editor = { ...config, wrapper, preview, urlInput, fileInput, value: config.value || "" };
    imageEditors.set(config.key, editor);

    urlInput.addEventListener("input", () => {
        fileInput.value = "";
        showImagePreview(editor, urlInput.value.trim() || editor.value);
        markDirty();
    });

    fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (!file) {
            showImagePreview(editor, urlInput.value.trim() || editor.value);
            return;
        }
        if (!file.type.startsWith("image/")) {
            fileInput.value = "";
            setStatus("請選擇有效的圖片檔案。", "error");
            return;
        }
        if (file.size > maxImageSize) {
            fileInput.value = "";
            setStatus(`圖片大小為 ${(file.size / 1024).toFixed(1)}KB，請壓縮至 300KB 以下。`, "error");
            return;
        }
        urlInput.value = "";
        const previewUrl = URL.createObjectURL(file);
        previewObjectUrls.push(previewUrl);
        showImagePreview(editor, previewUrl);
        markDirty();
    });

    clearButton.addEventListener("click", () => {
        urlInput.value = "";
        fileInput.value = "";
        editor.value = "";
        showImagePreview(editor, "");
        markDirty();
    });

    return wrapper;
}

function showImagePreview(editor, source) {
    editor.preview.replaceChildren();
    if (!source) {
        const message = document.createElement("p");
        message.textContent = editor.placeholder || "尚未設定圖片";
        editor.preview.appendChild(message);
        return;
    }
    const image = document.createElement("img");
    image.src = source;
    image.alt = `${editor.label}預覽`;
    image.addEventListener("error", () => {
        editor.preview.replaceChildren();
        const message = document.createElement("p");
        message.textContent = "圖片無法載入，請確認網址或重新選擇圖片。";
        editor.preview.appendChild(message);
    }, { once: true });
    editor.preview.appendChild(image);
}

function renderEditor() {
    sections.forEach((section) => {
        const sectionElement = document.createElement("section");
        sectionElement.className = "course1-admin-section";
        const heading = document.createElement("h2");
        heading.textContent = section.title;
        sectionElement.appendChild(heading);

        section.fields.forEach((field) => {
            sectionElement.appendChild(createInputGroup(field.label, field.key, field.value, field.type));
        });

        if (section.images.length) {
            const imageGrid = document.createElement("div");
            imageGrid.className = "course1-admin-image-grid";
            section.images.forEach((image) => imageGrid.appendChild(createImageEditor(image)));
            sectionElement.appendChild(imageGrid);
        }
        editorContainer.appendChild(sectionElement);
    });
}

function markDirty() {
    isDirty = true;
    setStatus("有尚未儲存的變更。");
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

function isValidImageUrl(value) {
    if (!value) return true;
    try {
        const url = new URL(value, window.location.href);
        return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
        return false;
    }
}

async function loadCourse1() {
    formFields.disabled = true;
    saveButton.disabled = true;
    setStatus("正在載入光的課程內容...");

    try {
        const snapshot = await getDoc(doc(db, "courses", "course1"));
        const data = snapshot.exists() ? snapshot.data() : {};
        textInputs.forEach((input, key) => {
            input.value = typeof data[key] === "string" ? data[key] : defaultTextValues.get(key) || "";
        });
        imageEditors.forEach((editor, key) => {
            editor.value = typeof data[key] === "string" ? data[key] : editor.value;
            editor.urlInput.value = editor.value.startsWith("data:image/") ? "" : editor.value;
            editor.fileInput.value = "";
            showImagePreview(editor, editor.value);
        });
        isDirty = false;
        formFields.disabled = false;
        saveButton.disabled = false;
        setStatus(snapshot.exists()
            ? "內容已載入。修改完成後按下「儲存光的課程內容」。"
            : "尚未有自訂內容，已載入目前前台預設文字與圖片。");
    } catch (error) {
        console.error("載入光的課程內容失敗：", error);
        const permissionHint = error.code === "permission-denied"
            ? "請確認管理員已登入，且 Firestore Rules 允許讀取 courses 集合。"
            : error.message || "請稍後再試。";
        setStatus(`載入失敗：${permissionHint}`, "error");
    }
}

renderEditor();
textInputs.forEach((input) => input.addEventListener("input", markDirty));

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saveValues = {};
    formFields.disabled = true;
    saveButton.disabled = true;
    setStatus("正在儲存光的課程內容...");
    try {
        for (const [key, editor] of imageEditors) {
            if (!isValidImageUrl(editor.urlInput.value.trim())) {
                setStatus(`${editor.label}網址格式無效。`, "error");
                editor.urlInput.focus();
                return;
            }
            const file = editor.fileInput.files?.[0];
            saveValues[key] = file
                ? await convertFileToDataUrl(file)
                : editor.urlInput.value.trim() || editor.value;
        }

        const totalImageDataSize = Array.from(imageEditors.keys())
            .map((key) => saveValues[key])
            .filter((value) => value.startsWith("data:image/"))
            .reduce((total, value) => total + value.length, 0);
        if (totalImageDataSize > maxImageDataSize) {
            throw new Error("所有 Base64 圖片合計超過 800KB，請縮小或移除部分圖片後再儲存。");
        }

        textInputs.forEach((input, key) => {
            saveValues[key] = input.value.trim();
        });
        await setDoc(doc(db, "courses", "course1"), {
            ...saveValues,
            updatedAt: serverTimestamp()
        }, { merge: true });

        imageEditors.forEach((editor, key) => {
            editor.value = saveValues[key];
            editor.urlInput.value = editor.value.startsWith("data:image/") ? "" : editor.value;
            editor.fileInput.value = "";
            showImagePreview(editor, editor.value);
        });
        isDirty = false;
        setStatus("光的課程內容已儲存，前台將自動同步更新。");
    } catch (error) {
        console.error("儲存光的課程內容失敗：", error);
        const permissionHint = error.code === "permission-denied"
            ? "請確認管理員已登入，且 Firestore Rules 允許寫入 courses 集合。"
            : error.message || "請稍後再試。";
        setStatus(`儲存失敗：${permissionHint}`, "error");
    } finally {
        formFields.disabled = false;
        saveButton.disabled = false;
        previewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
        previewObjectUrls = [];
    }
});

courseSelect.addEventListener("change", async () => {
    if (courseSelect.value !== "course1") {
        if (isCourse1Active && isDirty && !window.confirm("目前光的課程有尚未儲存的變更，要捨棄並切換課程嗎？")) {
            courseSelect.value = "course1";
            courseSelect.dataset.current = "course1";
            standardEditor.hidden = true;
            editorPanel.hidden = false;
            return;
        }
        isCourse1Active = false;
        editorPanel.hidden = true;
        standardEditor.hidden = false;
        return;
    }

    isCourse1Active = true;
    courseSelect.dataset.current = "course1";
    standardEditor.hidden = true;
    editorPanel.hidden = false;
    await loadCourse1();
});

onAuthStateChanged(auth, (user) => {
    if (isInitialized) return;
    if (isLocalhost || user) {
        isInitialized = true;
        if (courseSelect.value === "course1") {
            isCourse1Active = true;
            editorPanel.hidden = false;
            standardEditor.hidden = true;
            loadCourse1();
        }
        return;
    }
    setTimeout(() => {
        if (!auth.currentUser) {
            window.location.replace("../front/login.html");
        }
    }, 400);
});
