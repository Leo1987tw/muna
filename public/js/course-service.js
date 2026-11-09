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
let activeFeedbackImageIndex = 0;

const services = {
    course2: {
        name: "預見未來的自己",
        english: "Meet Your Future Self",
        symbol: "✧",
        subtitle: "看見方向，從現在開始走向想成為的自己。",
        intro: "透過引導式探索與對話，整理此刻的狀態、期待與在意的選擇。從未來想像回看現在，讓模糊的願望逐漸形成可以思考與實踐的方向。",
        points: [
            "梳理目前的生活狀態與真正重視的目標。",
            "透過情境想像，看見不同選擇可能帶來的方向。",
            "整理成適合自己的下一步，而不是替你決定答案。"
        ],
        audience: [
            "正處於人生轉換期，想重新確認方向。",
            "心中有期待，卻還不確定如何開始。",
            "希望更清楚地理解自己想成為的樣子。"
        ],
        format: "依當期課程與預約方案安排；服務方式、時間與費用請洽詢確認。",
        bookingText: "歡迎填寫預約與洽詢表單，確認課程內容、參與方式與當期方案。"
    },
    course3: {
        name: "舞台之美",
        english: "The Beauty of Your Stage",
        symbol: "◇",
        subtitle: "找到自己的位置，練習自在展現。",
        intro: "每個人都有屬於自己的舞台。透過課程中的引導與練習，探索表達、呈現與自我認識，讓你逐步找到適合自己的方式，在生活與工作中展現個人特色。",
        points: [
            "覺察自己的特質與想傳達的核心訊息。",
            "練習表達與呈現，建立更自在的節奏。",
            "將課堂中的發現帶回日常情境持續練習。"
        ],
        audience: [
            "想提升表達與呈現能力的人。",
            "準備分享作品、理念或專業服務的人。",
            "想探索個人特色並練習自在展現的人。"
        ],
        format: "課程形式、上課時間與費用依當期開課公告為準，歡迎預約洽詢。",
        bookingText: "歡迎填寫預約與洽詢表單，確認課程內容、參與方式與當期方案。"
    },
    course4: {
        name: "蓮花天堂事業指引工作坊",
        english: "Lotus Business Guidance",
        symbol: "❀",
        subtitle: "陪伴你發展屬於自己的事業。",
        intro: "當你有想提供的服務，也有想實現的事業願景，卻不確定目前的方向是否適合自己，或下一步應該先做什麼，工作坊將陪伴你整理事業核心、檢視現況，並探索當下值得投入的方向。",
        points: [
            "月前一對一交流：透過視訊整理當前的事業處境與想探索的問題。",
            "確認事業核心與服務方向：探索重視的事業核心，與目前提供的服務是否一致。",
            "覺察與調整卡點：針對服務或事業發展中的停滯，探索可以調整的地方。",
            "月內持續指引：依當月事業主題提供指引與行動方向，實際頻率依當期方案公告。"
        ],
        audience: [
            "正在起步，想將天賦與想法發展成服務。",
            "已有服務，想確認定位與發展方向。",
            "同時有許多想法，需要整理優先順序。",
            "在事業發展中遇到卡點，希望獲得持續陪伴。",
            "願意將每月的探索轉化成實際行動。"
        ],
        format: "團體陪伴，結合月前一對一視訊｜NT$2,000／月",
        bookingText: "歡迎填寫預約與洽詢表單，確認課程內容、參與方式與當期方案。"
    },
    course5: {
        name: "身體風水 / 空間風水",
        english: "Body & Space Feng Shui",
        symbol: "⌂",
        subtitle: "從身體感受與生活空間，重新觀察自己的狀態。",
        intro: "身體與空間承載著日常生活的經驗。本服務透過對話與觀察，陪伴你整理身體感受、生活習慣與空間使用方式，從中探索值得留意與調整的方向。",
        points: [
            "從日常感受出發，觀察身體與生活節奏。",
            "梳理空間使用習慣及其帶來的感受。",
            "整理可在生活中嘗試的調整方式與觀察方向。"
        ],
        audience: [
            "希望重新整理生活節奏與居住空間的人。",
            "對身體感受與空間之間的關係感到好奇的人。",
            "想透過引導為日常生活帶來新的觀察角度。"
        ],
        format: "服務形式、適用範圍與費用依個別需求及當期方案洽詢確認。",
        bookingText: "歡迎填寫預約與洽詢表單，確認服務方式、適用範圍與當期方案。"
    },
    course6: {
        name: "建立黃金世紀自然法則",
        english: "Natural Principles",
        symbol: "☼",
        subtitle: "將理解帶回生活，練習建立內在秩序。",
        intro: "透過課程主題與生活實踐，認識自然法則所帶來的觀察角度，並思考如何運用在日常選擇、人際互動與自我整理之中。課程著重理解與練習，逐步建立適合自己的生活方式。",
        points: [
            "認識課程所談的自然法則與核心觀念。",
            "連結日常經驗，練習觀察自己的選擇與反應。",
            "整理可持續實踐的方向，逐步建立生活秩序。"
        ],
        audience: [
            "對自然法則與生活實踐有興趣的人。",
            "希望整理內在想法與日常選擇的人。",
            "願意透過持續學習深化自我認識的人。"
        ],
        format: "課程內容、開課時間及費用依當期公告為準，請洽詢最新資訊。",
        bookingText: "歡迎填寫預約與洽詢表單，確認課程內容、參與方式與當期方案。"
    },
    course7: {
        name: "天啓道鎖工作坊",
        english: "Tianqi Daosuo Workshop",
        symbol: "✦",
        subtitle: "在工作坊中探索課程主題，整理個人學習方向。",
        intro: "工作坊提供一段專注學習與交流的時間，透過主題引導、練習與分享，陪伴參與者認識課程內容，並依照自身經驗整理後續可以持續探索的方向。",
        points: [
            "認識工作坊主題與學習內容。",
            "透過引導與練習，整理個人的觀察與收穫。",
            "在交流中深化理解，帶回適合自己的練習方向。"
        ],
        audience: [
            "對天啓道鎖工作坊主題有興趣的人。",
            "希望透過課程引導與練習探索新觀點的人。",
            "願意參與交流並持續整理學習收穫的人。"
        ],
        format: "工作坊日期、內容與費用依當期開課公告為準。",
        bookingText: "歡迎填寫預約與洽詢表單，確認工作坊日期、內容與當期方案。"
    },
    course8: {
        name: "神聖數字排列",
        english: "Sacred Number Arrangement",
        symbol: "◎",
        subtitle: "從數字排列出發，開啟自我觀察與探索。",
        intro: "課程以數字排列作為探索與對話的媒介，陪伴你從不同角度觀察自身經驗，整理當下關注的主題。內容著重於個人感受與反思，協助你形成自己的理解。",
        points: [
            "認識課程中使用的數字排列方式與操作流程。",
            "透過引導探索當下關注的主題與個人感受。",
            "將課程中的觀察整理為後續可以思考的問題。"
        ],
        audience: [
            "對神聖數字排列及其學習方式有興趣的人。",
            "希望透過新的媒介進行自我觀察的人。",
            "願意以開放態度參與課程練習與交流的人。"
        ],
        format: "課程形式、開課時間與費用依當期公告為準，歡迎預約洽詢。",
        bookingText: "歡迎填寫預約與洽詢表單，確認課程內容、參與方式與當期方案。"
    },
    course9: {
        name: "企業卜卦督導",
        english: "Business I Ching Consultation",
        symbol: "☯",
        subtitle: "以不同視角檢視議題，梳理可思考的方向。",
        intro: "透過易經卜卦與引導式討論，陪伴企業或團隊重新檢視目前關注的議題、現況與可能選項，整理值得進一步思考的方向，作為團隊討論與規劃的參考。",
        points: [
            "聚焦團隊當前面對的問題與討論目標。",
            "以卜卦與對話方式探索不同觀察角度。",
            "整理討論重點，供後續評估與規劃參考。"
        ],
        audience: [
            "需要共同梳理議題的企業或團隊。",
            "希望為計畫、合作或發展方向增加討論視角的人。",
            "期待透過引導式討論整理團隊共識的人。"
        ],
        format: "服務方式、時間與費用依議題及需求洽詢確認；卜卦內容作為討論參考，不取代專業決策。",
        bookingText: "歡迎填寫預約與洽詢表單，說明團隊需求與希望討論的議題。"
    }
};

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[character]);
}

function getYouTubeVideoId(value) {
    const input = typeof value === "string" ? value.trim() : "";
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    if (!input) return "";

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

function getText(data, key, fallback) {
    return typeof data[key] === "string" && data[key].trim() ? data[key].trim() : fallback;
}

function getParagraphs(data, key, fallback) {
    const value = data[key];
    const paragraphs = Array.isArray(value)
        ? value.filter((paragraph) => typeof paragraph === "string")
        : typeof value === "string"
            ? value.split(/\r?\n\s*\r?\n/)
            : [];
    const cleanedParagraphs = paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean);
    return cleanedParagraphs.length ? cleanedParagraphs : [fallback];
}

function getList(data, key, fallback) {
    if (!Array.isArray(data[key])) return fallback;
    const values = data[key].filter((value) => typeof value === "string" && value.trim());
    return values.length ? values : fallback;
}

function getImageList(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((image) => {
        if (typeof image !== "string") return false;
        if (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(image)) return true;
        try {
            const url = new URL(image, window.location.href);
            return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
        } catch {
            return false;
        }
    });
}

function createYouTubeFrame(videoId, title) {
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
    frame.title = title;
    frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    return frame;
}

function renderServicePage(defaultService, data = {}) {
    const service = {
        ...defaultService,
        english: getText(data, "english", defaultService.english),
        subtitle: getText(data, "subtitle", defaultService.subtitle),
        intro: getParagraphs(data, "intro", defaultService.intro),
        points: getList(data, "points", defaultService.points),
        audience: getList(data, "audience", defaultService.audience),
        format: getText(data, "format", defaultService.format),
        feedbackImages: getImageList(data.feedbackImages),
        bookingText: getText(data, "bookingText", defaultService.bookingText),
        heroImage: getText(data, "heroImage", ""),
        introImage: getText(data, "introImage", ""),
        videoUrl: getText(data, "videoUrl", "")
    };

    const container = document.getElementById("serviceCourseContent");
    if (!container) return;

    const courseIndex = Number(document.body.dataset.course.replace("course", ""));
    const bookingUrl = `./booking.html?tab=course${courseIndex}`;
    const renderList = (items) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const videoId = getYouTubeVideoId(service.videoUrl);
    activeFeedbackImageIndex = service.feedbackImages.length
        ? activeFeedbackImageIndex % service.feedbackImages.length
        : 0;
    const feedbackSlides = service.feedbackImages.map((image, index) => `
        <div class="service-course-feedback-slide${index === activeFeedbackImageIndex ? " is-active" : ""}" data-feedback-slide="${index}" aria-hidden="${index !== activeFeedbackImageIndex}">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(service.name)}學員回饋照片 ${index + 1}">
        </div>
    `).join("");
    const feedbackControls = service.feedbackImages.length > 1 ? `
        <div class="service-course-feedback-controls">
            <button type="button" class="service-course-feedback-arrow" data-feedback-direction="-1" aria-label="上一張學員回饋照片">‹</button>
            <div class="service-course-feedback-dots" aria-label="選擇學員回饋照片">
                ${service.feedbackImages.map((_, index) => `
                    <button type="button" class="service-course-feedback-dot${index === activeFeedbackImageIndex ? " is-active" : ""}" data-feedback-index="${index}" aria-label="第 ${index + 1} 張照片" aria-pressed="${index === activeFeedbackImageIndex}"></button>
                `).join("")}
            </div>
            <button type="button" class="service-course-feedback-arrow" data-feedback-direction="1" aria-label="下一張學員回饋照片">›</button>
        </div>
    ` : "";

    container.innerHTML = `
        <div class="service-course-layout">
            <header class="service-course-hero">
                <div class="service-course-art${service.heroImage ? " has-image" : ""}" role="img" aria-label="${escapeHtml(service.name)}主視覺"${service.heroImage ? ` style="--course-art-image: url('${escapeHtml(service.heroImage)}')"` : ""}>
                    ${service.heroImage ? "" : `<span aria-hidden="true">${escapeHtml(service.symbol)}</span>`}
                </div>
                <div class="service-course-hero-copy">
                    <p class="service-course-kicker">${escapeHtml(service.english)}</p>
                    <h1 class="service-course-title">${escapeHtml(service.name)}</h1>
                    <p class="service-course-subtitle">${escapeHtml(service.subtitle)}</p>
                </div>
            </header>

            <section class="service-course-section service-course-intro" aria-labelledby="serviceIntroTitle">
                <div class="service-course-intro-copy">
                    <h2 id="serviceIntroTitle">服務介紹</h2>
                    ${service.intro.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                </div>
                <div class="service-course-side-art${service.introImage ? " has-image" : ""}"${service.introImage ? ` role="img" aria-label="${escapeHtml(service.name)}服務圖片" style="--course-art-image: url('${escapeHtml(service.introImage)}')"` : ' aria-hidden="true"'}>
                    ${service.introImage ? "" : `<span>${escapeHtml(service.symbol)}</span>`}
                </div>
            </section>

            <section class="service-course-section" aria-labelledby="serviceVideoTitle">
                <h2 id="serviceVideoTitle">短影片介紹</h2>
                <div class="service-course-video${videoId ? " has-video" : ""}"${videoId ? "" : ' role="img" aria-label="服務短影片預留區，尚未加入影片"'}>
                    ${videoId
            ? ""
            : '<span class="service-course-video-icon" aria-hidden="true">▷</span><strong>服務短影片區</strong><span>排版預留位置・尚未加入影片</span>'}
                </div>
            </section>

            <section class="service-course-section" aria-labelledby="serviceContentTitle">
                <h2 id="serviceContentTitle">服務內容</h2>
                <ul class="service-course-list">${renderList(service.points)}</ul>
            </section>

            <section class="service-course-section" aria-labelledby="serviceAudienceTitle">
                <h2 id="serviceAudienceTitle">適用對象</h2>
                <ul class="service-course-list">${renderList(service.audience)}</ul>
            </section>

            <section class="service-course-section" aria-labelledby="serviceFormatTitle">
                <h2 id="serviceFormatTitle">服務方式與價格</h2>
                <div class="service-course-callout">${escapeHtml(service.format)}</div>
            </section>

            <section class="service-course-section service-course-feedback-section"${service.feedbackImages.length ? "" : " hidden"} aria-labelledby="serviceFeedbackTitle">
                <h2 id="serviceFeedbackTitle">學員回饋</h2>
                <div class="service-course-feedback-carousel" aria-live="polite">
                    <div class="service-course-feedback-track">${feedbackSlides}</div>
                    ${feedbackControls}
                </div>
            </section>

            <section class="service-course-section service-course-booking" aria-labelledby="serviceBookingTitle">
                <h2 id="serviceBookingTitle">預約方式</h2>
                <p>${escapeHtml(service.bookingText)}</p>
                <a href="${bookingUrl}" class="signup-btn not-found-link">預約與洽詢 →</a>
            </section>

            <div class="page-footer">
                <a href="../index.html" class="back-home-link">← 返回網頁首頁</a>
            </div>
        </div>
    `;

    if (videoId) {
        container.querySelector(".service-course-video").appendChild(createYouTubeFrame(videoId, `${service.name}短影片介紹`));
    }

    const feedbackCarousel = container.querySelector(".service-course-feedback-carousel");
    if (feedbackCarousel && service.feedbackImages.length > 1) {
        const updateFeedbackCarousel = (nextIndex) => {
            const slideCount = service.feedbackImages.length;
            activeFeedbackImageIndex = (nextIndex + slideCount) % slideCount;
            feedbackCarousel.querySelectorAll("[data-feedback-slide]").forEach((slide, index) => {
                const isActive = index === activeFeedbackImageIndex;
                slide.classList.toggle("is-active", isActive);
                slide.setAttribute("aria-hidden", String(!isActive));
            });
            feedbackCarousel.querySelectorAll("[data-feedback-index]").forEach((dot, index) => {
                const isActive = index === activeFeedbackImageIndex;
                dot.classList.toggle("is-active", isActive);
                dot.setAttribute("aria-pressed", String(isActive));
            });
        };
        feedbackCarousel.querySelectorAll("[data-feedback-direction]").forEach((button) => {
            button.addEventListener("click", () => {
                updateFeedbackCarousel(activeFeedbackImageIndex + Number(button.dataset.feedbackDirection));
            });
        });
        feedbackCarousel.querySelectorAll("[data-feedback-index]").forEach((button) => {
            button.addEventListener("click", () => updateFeedbackCarousel(Number(button.dataset.feedbackIndex)));
        });
    }
}

const courseKey = document.body.dataset.course;
const service = services[courseKey];

if (service) {
    document.title = `${service.name} - 娜娜問路居`;
    const titleElement = document.getElementById("serviceCourseTitle");
    if (titleElement) titleElement.textContent = service.name;
    renderServicePage(service);
    onSnapshot(doc(db, "courses", courseKey), (snapshot) => {
        renderServicePage(service, snapshot.exists() ? snapshot.data() : {});
    }, (error) => {
        console.error(`載入${service.name}頁面設定失敗：`, error);
    });
} else {
    const container = document.getElementById("serviceCourseContent");
    if (container) container.textContent = "目前無法載入此課程資訊，請返回課程與服務選單。";
}
