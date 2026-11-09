// 引入 Firebase 核心與實時資料庫模組
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { collection, doc, getFirestore, onSnapshot, query } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const isFrontPage = window.location.pathname.includes("/front/");
const sitePrefix = isFrontPage ? "../" : "./";
const frontPrefix = `${sitePrefix}front/`;
const navbar = document.createElement("nav");
navbar.className = "navbar";
navbar.innerHTML = `
    <input type="checkbox" id="menu-switcher" class="menu-switcher" aria-label="切換導覽選單">
    <a class="nav-logo" href="${sitePrefix}index.html">
        <div>
            <img src="${sitePrefix}images/logo.png" alt="娜娜問路居 Logo" class="logo-img">
            娜娜問路居
        </div>
        <p>Nothing nothing</p>
        <p>where do you come from</p>
    </a>
    <label class="menu-toggle" for="menu-switcher" aria-label="開啟導覽選單">
        <span></span>
        <span></span>
        <span></span>
    </label>
    <div class="nav-links">
        <a class="nav-item" href="${frontPrefix}about.html">關於我</a>
        <div class="nav-dropdown">
            <input type="checkbox" id="submenu-class" class="submenu-switcher">
            <label class="nav-item dropdown-toggle" for="submenu-class">課程與服務 ▾</label>
            <div class="dropdown-menu">
                <a href="${frontPrefix}course1.html">光的課程</a>
                <a href="${frontPrefix}course2.html">預見未來的自己</a>
                <a href="${frontPrefix}course3.html">舞台之美</a>
                <a href="${frontPrefix}course4.html">蓮花天堂事業指引工作坊</a>
                <a href="${frontPrefix}course5.html">身體風水 / 空間風水</a>
                <a href="${frontPrefix}course6.html">建立黃金世紀自然法則</a>
                <a href="${frontPrefix}course7.html">天啓道鎖工作坊</a>
                <a href="${frontPrefix}course8.html">神聖數字排列</a>
                <a href="${frontPrefix}course9.html">企業卜卦督導</a>
            </div>
        </div>
        <div class="nav-dropdown">
            <input type="checkbox" id="submenu-product" class="submenu-switcher">
            <label class="nav-item dropdown-toggle" for="submenu-product">商品專區 ▾</label>
            <div class="dropdown-menu">
                <a href="${frontPrefix}product.html#item1">黃金世紀鹽</a>
            </div>
        </div>
        <a class="nav-item" href="${frontPrefix}calendar.html">行事曆</a>
        <a class="nav-item" href="${sitePrefix}index.html#mapPage">聯絡我們</a>
        <a class="nav-item" href="${frontPrefix}login.html">管理</a>
    </div>
`;
document.body.prepend(navbar);

const floatingPanel = document.createElement("div");
floatingPanel.className = "floating-panel";
floatingPanel.innerHTML = `
    <a class="social-btn" href="https://www.instagram.com/munalightwalker?obrf=MTRnODVxYTgybWc5Nw%3D%3D&amp;utm_source=qr"
        target="_blank" rel="noopener noreferrer" aria-label="Instagram">IG</a>
    <a class="social-btn" href="https://www.facebook.com/share/19YgiiKDYp/?mibextid=wwXIfr"
        target="_blank" rel="noopener noreferrer" aria-label="Facebook">FB</a>
    <button class="pay-btn" type="button">免費諮詢</button>
`;
floatingPanel.querySelector(".pay-btn").addEventListener("click", () => {
    window.location.href = `${frontPrefix}booking.html`;
});
document.body.append(floatingPanel);

// ⚠️ 請務必將此處替換成與 admin.js 完全相同的 Firebase 專案設定資訊
const firebaseConfig = {
    apiKey: "AIzaSyDOzzPZRJe0Qxvb5RH9pA1SbxSMWt-551s",
    authDomain: "munayu.firebaseapp.com",
    projectId: "munayu",
    storageBucket: "munayu.firebasestorage.app",
    messagingSenderId: "435609048625",
    appId: "1:435609048625:web:26e2b4fd7f9d4b2eef2710",
    measurementId: "G-ZEERMHK8WQ"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 1. 動態監聽並更新「靜心影片」區塊
// ==========================================
function getYouTubeVideoId(value) {
    const input = (value || "").trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

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

const videoBox = document.querySelector(".video-box");
if (videoBox) {
    onSnapshot(query(collection(db, "video")), (snapshot) => {
        const latestVideo = snapshot.docs
            .slice()
            .sort((left, right) => {
                const leftCreated = left.data().created_at?.toMillis?.() || 0;
                const rightCreated = right.data().created_at?.toMillis?.() || 0;
                return rightCreated - leftCreated;
            })
            .find((videoDoc) => videoDoc.data().src);
        if (!latestVideo) return;

        const data = latestVideo.data();
        const videoId = data.videoId || getYouTubeVideoId(data.src);
        if (!videoId) return;

        let iframe = videoBox.querySelector("iframe");
        if (!iframe) {
            iframe = document.createElement("iframe");
            iframe.title = "YouTube 影片播放器";
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
            iframe.referrerPolicy = "strict-origin-when-cross-origin";
            iframe.allowFullscreen = true;
            iframe.style.cssText = "width:100%;height:100%;border:0;border-radius:8px;";
            videoBox.replaceChildren(iframe);
        }
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
    }, (error) => {
        console.error("讀取首頁 YouTube 影片設定失敗：", error);
    });
}

// ==========================================
// 2. 全域導覽：點擊選單平滑滾動至目標頁面
// ==========================================
window.scrollToPage = function(pageId) {
    const targetSection = document.getElementById(pageId);
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
};

// ==========================================
// 3. 照片精選：輪播圖切換控制邏輯
// ==========================================
let currentSlideIndex = 0;
let slides = [];
const photoCarouselSlides = document.getElementById("photoCarouselSlides");
const photoCarouselArrows = document.querySelectorAll(".carousel-container .arrow");

window.moveSlide = function(direction) {
    if (slides.length === 0) return;
    
    // 隱藏目前顯示的投影片
    slides[currentSlideIndex].classList.remove('active');
    
    // 計算下一張投影片的索引（配合長度進行循環運算）
    currentSlideIndex = (currentSlideIndex + direction + slides.length) % slides.length;
    
    // 顯示下一張投影片
    slides[currentSlideIndex].classList.add('active');
};

function createPhotoSlide(imageSource, altText) {
    const slide = document.createElement("div");
    slide.className = "carousel-slide";

    const media = document.createElement("div");
    media.className = "media-placeholder";

    if (imageSource) {
        const image = document.createElement("img");
        image.className = "photo-feature-image";
        image.src = imageSource;
        image.alt = altText;
        media.appendChild(image);
    } else {
        media.textContent = altText;
    }

    slide.appendChild(media);
    return slide;
}

if (photoCarouselSlides) {
    onSnapshot(query(collection(db, "photos")), (snapshot) => {
        const photos = snapshot.docs
            .map((photoDoc) => ({ id: photoDoc.id, ...photoDoc.data() }))
            .filter((photo) => photo.status !== "inactive" && (photo.images || (photo.alt && photo.alt.trim())))
            .sort((leftPhoto, rightPhoto) => {
                const sortDifference = (Number(leftPhoto.sort) || 1) - (Number(rightPhoto.sort) || 1);
                if (sortDifference !== 0) return sortDifference;
                const leftCreatedAt = leftPhoto.created_at?.toMillis?.() || 0;
                const rightCreatedAt = rightPhoto.created_at?.toMillis?.() || 0;
                return rightCreatedAt - leftCreatedAt;
            });

        const fragment = document.createDocumentFragment();
        if (photos.length === 0) {
            fragment.appendChild(createPhotoSlide("", "目前沒有上架的精選照片"));
        } else {
            photos.forEach((photo) => {
                const imageSource = Array.isArray(photo.images) ? photo.images[0] : photo.images;
                fragment.appendChild(createPhotoSlide(imageSource || "", photo.alt || "精選照片"));
            });
        }

        photoCarouselSlides.replaceChildren(fragment);
        slides = Array.from(photoCarouselSlides.querySelectorAll(".carousel-slide"));
        currentSlideIndex = 0;
        slides[0]?.classList.add("active");
        photoCarouselArrows.forEach((arrow) => {
            arrow.hidden = slides.length < 2;
        });
    }, (error) => {
        console.error("讀取精選照片失敗：", error);
        photoCarouselSlides.replaceChildren(createPhotoSlide("", "精選照片暫時無法載入"));
        slides = Array.from(photoCarouselSlides.querySelectorAll(".carousel-slide"));
        currentSlideIndex = 0;
        slides[0]?.classList.add("active");
        photoCarouselArrows.forEach((arrow) => {
            arrow.hidden = true;
        });
    });
}

// ==========================================
// 4. 管理者快捷入口：點擊左上角 Logo 直接跳轉後台
// ==========================================
window.triggerAdminLogin = function() {
    window.location.href = "../front/index.html";
};