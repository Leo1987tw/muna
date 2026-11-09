import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { deleteField, doc, getDoc, getFirestore, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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
const form = document.getElementById("courseForm");
const formFields = document.getElementById("courseFormFields");
const courseSelect = document.getElementById("courseSelect");
const standardEditor = document.getElementById("courseStandardEditor");
const course1EditorPanel = document.getElementById("course1EditorPanel");
const statusMessage = document.getElementById("courseStatus");
const saveButton = document.getElementById("saveCourseButton");
const videoUrlInput = document.getElementById("videoUrlInput");
const videoPreview = document.getElementById("videoPreview");
const feedbackImagesInput = document.getElementById("feedbackImagesInput");
const feedbackImagesList = document.getElementById("feedbackImagesList");
const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const maxFeedbackImageSize = 300 * 1024;
const maxFeedbackImagesDataSize = 700 * 1024;

const imageEditors = {
    hero: {
        file: document.getElementById("heroImageFile"),
        url: document.getElementById("heroImageUrl"),
        preview: document.getElementById("heroImagePreview"),
        value: ""
    },
    intro: {
        file: document.getElementById("introImageFile"),
        url: document.getElementById("introImageUrl"),
        preview: document.getElementById("introImagePreview"),
        value: ""
    }
};

const textFields = {
    english: document.getElementById("englishInput"),
    subtitle: document.getElementById("subtitleInput"),
    intro: document.getElementById("introInput"),
    points: document.getElementById("pointsInput"),
    audience: document.getElementById("audienceInput"),
    format: document.getElementById("formatInput"),
    bookingText: document.getElementById("bookingTextInput")
};

let isInitialized = false;
let isDirty = false;
let isLoading = false;
let previewObjectUrls = [];
let feedbackImages = [];
let nextFeedbackImageId = 0;

function setStatus(message, state = "success") {
    statusMessage.textContent = message;
    statusMessage.dataset.state = state;
}

function getYouTubeVideoId(value) {
    const input = value.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    if (!input) return "";

    try {
        const url = new URL(input);
        const host = url.hostname.toLowerCase().replace(/^www\./, "");
        let videoId = "";
        if (host === "youtu.be") {
            videoId = url.pathname.split("/").filter(Boolean)[0] || "";
        } else if (["youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com"].includes(host)) {
            videoId = url.pathname === "/watch"
                ? url.searchParams.get("v") || ""
                : url.pathname.split("/").filter(Boolean)[1] || "";
        }
        return /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : "";
    } catch {
        return "";
    }
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

function showVideoPreview(videoId) {
    videoPreview.replaceChildren();
    if (!videoId) {
        const message = document.createElement("p");
        message.textContent = "填入有效的 YouTube 網址後可預覽影片。";
        videoPreview.appendChild(message);
        return;
    }

    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
    frame.title = "課程 YouTube 影片預覽";
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    videoPreview.appendChild(frame);
}

function showImagePreview(editor) {
    editor.preview.replaceChildren();
    const source = editor.url.value.trim() || editor.value;
    if (!source) {
        const message = document.createElement("p");
        message.textContent = "尚未設定圖片";
        editor.preview.appendChild(message);
        return;
    }

    const image = document.createElement("img");
    image.alt = "課程圖片預覽";
    image.src = source;
    image.addEventListener("error", () => {
        editor.preview.replaceChildren();
        const message = document.createElement("p");
        message.textContent = "圖片無法載入，請確認圖片網址或重新選擇圖片。";
        editor.preview.appendChild(message);
    }, { once: true });
    editor.preview.appendChild(image);
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

function getFieldValue(data, key) {
    return typeof data[key] === "string" ? data[key] : "";
}

function createFeedbackImage(value) {
    nextFeedbackImageId += 1;
    return { id: nextFeedbackImageId, value };
}

function setFeedbackImageProcessing(isProcessing) {
    formFields.disabled = isProcessing;
    courseSelect.disabled = isProcessing;
    saveButton.disabled = isProcessing;
}

function renderFeedbackImages() {
    feedbackImagesList.replaceChildren();
    if (!feedbackImages.length) {
        const message = document.createElement("p");
        message.className = "course-admin-feedback-empty";
        message.textContent = "尚未新增學員回饋照片。";
        feedbackImagesList.appendChild(message);
        return;
    }

    feedbackImages.forEach((feedbackImage, index) => {
        const item = document.createElement("div");
        item.className = "course-admin-feedback-item";

        const image = document.createElement("img");
        image.src = feedbackImage.value;
        image.alt = `學員回饋照片 ${index + 1} 預覽`;
        item.appendChild(image);

        const actions = document.createElement("div");
        actions.className = "course-admin-feedback-actions";

        const replaceLabel = document.createElement("label");
        replaceLabel.className = "course-admin-feedback-replace";
        replaceLabel.textContent = "替換照片";

        const replaceInput = document.createElement("input");
        replaceInput.type = "file";
        replaceInput.accept = "image/*";
        replaceInput.setAttribute("aria-label", `替換第 ${index + 1} 張學員回饋照片`);
        replaceInput.addEventListener("change", async () => {
            const file = replaceInput.files?.[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
                setStatus("請選擇有效的圖片檔案。", "error");
                return;
            }
            if (file.size > maxFeedbackImageSize) {
                setStatus(`圖片大小為 ${(file.size / 1024).toFixed(1)}KB，請壓縮至 300KB 以下。`, "error");
                return;
            }

            setFeedbackImageProcessing(true);
            try {
                const value = await convertFileToDataUrl(file);
                const imageIndex = feedbackImages.findIndex((item) => item.id === feedbackImage.id);
                if (imageIndex === -1) return;
                const totalSize = feedbackImages.reduce((total, item, currentIndex) => (
                    total + (currentIndex === imageIndex ? value.length : item.value.length)
                ), 0);
                if (totalSize > maxFeedbackImagesDataSize) {
                    setStatus("所有回饋照片資料總量不可超過 700KB，請先刪除其他照片或縮小圖片。", "error");
                    return;
                }
                feedbackImages[imageIndex].value = value;
                renderFeedbackImages();
                isDirty = true;
                setStatus("照片已替換，儲存後才會套用到前台。");
            } catch (error) {
                console.error("讀取學員回饋照片失敗：", error);
                setStatus(`照片讀取失敗：${error.message || "請重新選擇圖片。"}`, "error");
            } finally {
                setFeedbackImageProcessing(false);
            }
        });
        replaceLabel.appendChild(replaceInput);
        actions.appendChild(replaceLabel);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "course-admin-feedback-remove";
        removeButton.textContent = "刪除照片";
        removeButton.addEventListener("click", () => {
            feedbackImages = feedbackImages.filter((item) => item.id !== feedbackImage.id);
            renderFeedbackImages();
            isDirty = true;
            setStatus("照片已標記刪除，儲存後才會從前台移除。");
        });
        actions.appendChild(removeButton);
        item.appendChild(actions);
        feedbackImagesList.appendChild(item);
    });
}

async function loadCourse(courseId) {
    isLoading = true;
    formFields.disabled = true;
    saveButton.disabled = true;
    setStatus("正在載入課程頁面設定...");

    try {
        const snapshot = await getDoc(doc(db, "courses", courseId));
        const data = snapshot.exists() ? snapshot.data() : {};
        Object.entries(textFields).forEach(([key, field]) => {
            const value = getFieldValue(data, key);
            field.value = Array.isArray(data[key])
                ? data[key].join(key === "intro" ? "\n\n" : "\n")
                : value;
        });

        Object.entries(imageEditors).forEach(([key, editor]) => {
            const savedImage = getFieldValue(data, `${key}Image`);
            editor.value = savedImage;
            editor.url.value = savedImage.startsWith("data:image/") ? "" : savedImage;
            editor.file.value = "";
            showImagePreview(editor);
        });

        feedbackImages = Array.isArray(data.feedbackImages)
            ? data.feedbackImages
                .filter((value) => typeof value === "string" && value.startsWith("data:image/"))
                .map(createFeedbackImage)
            : [];
        feedbackImagesInput.value = "";
        renderFeedbackImages();
        videoUrlInput.value = getFieldValue(data, "videoUrl");
        showVideoPreview(getYouTubeVideoId(videoUrlInput.value));
        isDirty = false;
        formFields.disabled = false;
        saveButton.disabled = false;
        setStatus(snapshot.exists()
            ? "設定已載入。留空的欄位會沿用前台預設內容。"
            : "此課程尚未設定。留空的欄位會沿用前台預設內容。");
    } catch (error) {
        console.error(`讀取 ${courseId} 課程頁面設定失敗：`, error);
        const permissionHint = error.code === "permission-denied"
            ? "請確認管理員已登入，且 Firestore Rules 允許管理員讀取 courses 集合。"
            : error.message || "請稍後再試。";
        setStatus(`載入失敗：${permissionHint}`, "error");
    } finally {
        isLoading = false;
    }
}

courseSelect.addEventListener("change", async () => {
    if (isDirty && !window.confirm("目前有尚未儲存的變更，要捨棄並切換課程嗎？")) {
        courseSelect.value = courseSelect.dataset.current || "course2";
        return;
    }
    courseSelect.dataset.current = courseSelect.value;
    const isCourse1 = courseSelect.value === "course1";
    standardEditor.hidden = isCourse1;
    course1EditorPanel.hidden = !isCourse1;
    if (isCourse1) {
        isDirty = false;
        return;
    }
    await loadCourse(courseSelect.value);
});

form.addEventListener("input", (event) => {
    if (isLoading) return;
    isDirty = true;
    if (event.target === videoUrlInput) {
        const input = videoUrlInput.value.trim();
        const videoId = getYouTubeVideoId(input);
        showVideoPreview(videoId);
        setStatus(input && !videoId ? "YouTube 網址格式無效，請確認網址或影片 ID。" : "");
    } else {
        setStatus("有尚未儲存的變更。");
    }
});

Object.values(imageEditors).forEach((editor) => {
    editor.url.addEventListener("input", () => showImagePreview(editor));
    editor.file.addEventListener("change", () => {
        const file = editor.file.files?.[0];
        if (!file) {
            showImagePreview(editor);
            return;
        }
        if (!file.type.startsWith("image/")) {
            editor.file.value = "";
            showImagePreview(editor);
            setStatus("請選擇有效的圖片檔案。", "error");
            return;
        }
        if (file.size > 300 * 1024) {
            editor.file.value = "";
            showImagePreview(editor);
            setStatus(`圖片大小為 ${(file.size / 1024).toFixed(1)}KB，請壓縮至 300KB 以下。`, "error");
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        previewObjectUrls.push(previewUrl);
        editor.preview.replaceChildren();
        const image = document.createElement("img");
        image.src = previewUrl;
        image.alt = "新上傳課程圖片預覽";
        editor.preview.appendChild(image);
        isDirty = true;
        setStatus("圖片預覽已更新，儲存後才會套用到前台。");
    });
});

feedbackImagesInput.addEventListener("change", async () => {
    const files = Array.from(feedbackImagesInput.files || []);
    feedbackImagesInput.value = "";
    if (!files.length) return;
    const invalidFile = files.find((file) => !file.type.startsWith("image/"));
    if (invalidFile) {
        setStatus(`「${invalidFile.name}」不是有效的圖片檔案。`, "error");
        return;
    }
    const oversizedFile = files.find((file) => file.size > maxFeedbackImageSize);
    if (oversizedFile) {
        setStatus(`「${oversizedFile.name}」超過 300KB，請壓縮後再上傳。`, "error");
        return;
    }

    setFeedbackImageProcessing(true);
    try {
        const newImages = [];
        let totalSize = feedbackImages.reduce((total, image) => total + image.value.length, 0);
        for (const file of files) {
            const value = await convertFileToDataUrl(file);
            totalSize += value.length;
            if (totalSize > maxFeedbackImagesDataSize) {
                setStatus("所有回饋照片資料總量不可超過 700KB，請分批新增或縮小圖片。", "error");
                return;
            }
            newImages.push(createFeedbackImage(value));
        }
        feedbackImages.push(...newImages);
        renderFeedbackImages();
        isDirty = true;
        setStatus(`已新增 ${newImages.length} 張照片，儲存後才會套用到前台。`);
    } catch (error) {
        console.error("讀取學員回饋照片失敗：", error);
        setStatus(`照片讀取失敗：${error.message || "請重新選擇圖片。"}`, "error");
    } finally {
        setFeedbackImageProcessing(false);
    }
});

document.querySelectorAll("[data-clear-image]").forEach((button) => {
    button.addEventListener("click", () => {
        const editor = imageEditors[button.dataset.clearImage];
        if (!editor) return;
        editor.value = "";
        editor.url.value = "";
        editor.file.value = "";
        showImagePreview(editor);
        isDirty = true;
        setStatus("圖片已標記移除，儲存後才會套用到前台。");
    });
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const videoUrl = videoUrlInput.value.trim();
    if (videoUrl && !getYouTubeVideoId(videoUrl)) {
        setStatus("請輸入有效的 YouTube 影片或 Shorts 網址，或清空影片欄位。", "error");
        videoUrlInput.focus();
        return;
    }

    for (const [label, editor] of Object.entries(imageEditors)) {
        if (!isValidImageUrl(editor.url.value.trim())) {
            setStatus(`${label === "hero" ? "主視覺" : "服務"}圖片網址格式無效。`, "error");
            editor.url.focus();
            return;
        }
    }

    saveButton.disabled = true;
    setStatus("正在儲存課程頁面...");

    try {
        const imageValues = {};
        for (const [key, editor] of Object.entries(imageEditors)) {
            const file = editor.file.files?.[0];
            imageValues[`${key}Image`] = file
                ? await convertFileToDataUrl(file)
                : editor.url.value.trim() || editor.value;
        }

        const feedbackImageValues = feedbackImages.map((image) => image.value);
        const totalImageSize = [
            ...Object.values(imageValues),
            ...feedbackImageValues
        ].reduce((total, value) => total + (value.startsWith("data:image/") ? value.length : 0), 0);
        if (totalImageSize > 900 * 1024) {
            throw new Error("所有課程圖片資料總量超過 Firestore 安全容量，請縮小或刪除部分圖片後再儲存。");
        }

        const courseData = {
            ...imageValues,
            english: textFields.english.value.trim(),
            subtitle: textFields.subtitle.value.trim(),
            intro: textFields.intro.value
                .split(/\r?\n\s*\r?\n/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean),
            points: textFields.points.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
            audience: textFields.audience.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
            format: textFields.format.value.trim(),
            feedbackImages: feedbackImages.map((image) => image.value),
            feedback: deleteField(),
            feedbackAuthor: deleteField(),
            bookingText: textFields.bookingText.value.trim(),
            videoUrl,
            updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, "courses", courseSelect.value), courseData, { merge: true });
        Object.entries(imageEditors).forEach(([key, editor]) => {
            editor.value = imageValues[`${key}Image`];
            editor.url.value = editor.value.startsWith("data:image/") ? "" : editor.value;
            editor.file.value = "";
            showImagePreview(editor);
        });
        isDirty = false;
        setStatus("課程頁面已儲存，前台會自動同步更新。");
    } catch (error) {
        console.error("儲存課程頁面設定失敗：", error);
        const permissionHint = error.code === "permission-denied"
            ? "請確認管理員已登入，且 Firestore Rules 允許管理員寫入 courses 集合。"
            : error.message || "請稍後再試。";
        setStatus(`儲存失敗：${permissionHint}`, "error");
    } finally {
        saveButton.disabled = false;
        previewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
        previewObjectUrls = [];
    }
});

onAuthStateChanged(auth, (user) => {
    if (isInitialized) return;
    if (isLocalhost || user) {
        isInitialized = true;
        const requestedCourse = new URLSearchParams(window.location.search).get("course");
        if (requestedCourse && Array.from(courseSelect.options).some((option) => option.value === requestedCourse)) {
            courseSelect.value = requestedCourse;
        }
        courseSelect.dataset.current = courseSelect.value;
        const isCourse1 = courseSelect.value === "course1";
        standardEditor.hidden = isCourse1;
        course1EditorPanel.hidden = !isCourse1;
        if (!isCourse1) loadCourse(courseSelect.value);
        return;
    }
    window.location.replace("../front/login.html");
});
