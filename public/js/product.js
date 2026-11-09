import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, orderBy, query } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// 1. Firebase 初始化設定（同步全站實例憑證）
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
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 前台商品型錄大列表陳列核心啟動...");

    const frontProductContainer = document.getElementById("frontProductContainer");
    if (!frontProductContainer) return;

    // 🎯 建立查詢：按建立時間（從舊到新，符合您當初一開始的排列期望）排序
    const productQuery = query(collection(db, "products"), orderBy("created_at", "asc"));

    // 旗標：確保只在第一次載入列表時觸發一次錨點滾動追蹤
    let isFirstLoad = true;

    onSnapshot(productQuery, (snapshot) => {
        frontProductContainer.innerHTML = "";

        if (snapshot.empty) {
            frontProductContainer.innerHTML = '<div style="text-align:center; color:#9e847a; padding:40px;">目前專區項目調整中，敬請期待。</div>';
            return;
        }

        let itemIndex = 1; // 產生商品流水號順序，用來對接您網址尾巴的 #item1、#item2

        snapshot.forEach((snapshotDoc) => {
            const data = snapshotDoc.data();

            // 🛑 安全鎖：下架商品不予顯示
            if (data.status === "inactive") {
                return;
            }

            // A. 實體 Base64 圖片提取還原
            const productImages = Array.isArray(data.images)
                ? data.images.filter((image) => typeof image === "string" && image)
                : (typeof data.images === "string" && data.images ? [data.images] : []);
            const displayImage = productImages[0] || "https://placehold.co";

            // B. 處理多段文案換行分段
            let descParagraphsHtml = "";
            if (data.description && data.description.trim() !== "") {
                descParagraphsHtml = data.description
                    .split("\n")
                    .map(pText => pText.trim() ? `<p>${pText.trim()}</p>` : "")
                    .join("");
            } else {
                descParagraphsHtml = `<p>暫無詳細文案介紹。</p>`;
            }

            // C. 處理動態標籤、分類與價錢視覺（非必填防呆）
            let tagsHtml = "";
            if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
                tagsHtml = data.tags.map(tag => `<span class="product-tag-badge">#${tag}</span>`).join("");
            }
            let categoryHtml = data.category ? `<span class="product-meta-category">分類: ${data.category}</span>` : "";

            let priceHtml = "";
            if (data.price && data.price > 0) {
                if (data.sale_price && parseInt(data.sale_price) > 0) {
                    priceHtml = `
                        <div class="product-price-wrapper">
                            <span class="product-price-line-through">原價: NT$${data.price}</span>
                            <span class="product-price-sale">特價 NT$${data.sale_price}</span>
                        </div>
                    `;
                } else {
                    priceHtml = `
                        <div class="product-price-wrapper">
                            <span class="product-price-original">價錢: NT$${data.price}</span>
                        </div>
                    `;
                }
            }

            // 依照商品型錄草圖將價格放在圖片下方，右側顯示商品資訊。
            const productItemHtml = `
                <article class="product-row" id="item${itemIndex}">
                    <div class="product-media-column">
                        <div class="product-media-box">
                            <div class="product-img-placeholder">
                                <img src="${displayImage}" alt="${data.name || ''}" onerror="this.src='https://placehold.co'">
                            </div>
                        </div>
                        ${priceHtml}
                    </div>

                    <div class="product-text-box">
                        <div class="product-info-header">
                            <h2 class="product-name-title">${data.name || '未命名項目'}</h2>
                            <div class="product-meta-group">
                                ${categoryHtml}
                                <div class="product-tags-wrapper">${tagsHtml}</div>
                            </div>
                        </div>

                        <div class="product-description">
                            ${descParagraphsHtml}
                        </div>
                        <div class="product-action-wrapper">
                            <a href="./product-detail.html?id=${snapshotDoc.id}" class="product-details-link">
                                點擊了解詳情
                            </a>
                        </div>
                    </div>
                </article>
            `;

            frontProductContainer.insertAdjacentHTML("beforeend", productItemHtml);
            itemIndex++; // 序號自動累加
        });

        // 🎯 魔法時刻：如果網址後面帶有標籤（例如 #item1），等資料列表生出來後，自動滑動過去！
        if (isFirstLoad && window.location.hash) {
            isFirstLoad = false;
            setTimeout(() => {
                const targetId = window.location.hash; // 抓取 #item1
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
                    console.log("✨ 已為您自動絲滑定位至標籤區塊:", targetId);
                }
            }, 300); // 給瀏覽器 300 毫秒渲染完畢後精準定位
        }
    });
});