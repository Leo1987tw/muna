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

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[character]);
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 前台商品型錄大列表陳列核心啟動...");

    const frontProductContainer = document.getElementById("frontProductContainer");
    if (!frontProductContainer) return;
    const intentModal = document.getElementById("intentModal");
    const modalIntentTitle = document.getElementById("modalIntentTitle");
    const modalIntentDetail = document.getElementById("modalIntentDetail");
    const modalCloseButton = intentModal?.querySelector(".intent-modal-close");
    let activeGuideCard = null;

    function closeIntentModal() {
        if (!intentModal) return;
        intentModal.hidden = true;
        activeGuideCard?.focus();
        activeGuideCard = null;
    }

    modalCloseButton?.addEventListener("click", closeIntentModal);
    intentModal?.addEventListener("click", (event) => {
        if (event.target === intentModal) closeIntentModal();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && intentModal && !intentModal.hidden) {
            closeIntentModal();
        }
    });

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
            const displayImage = productImages[1] || productImages[0] || "https://placehold.co";

            // B. 處理多段文案換行分段
            let descParagraphsHtml = "";
            if (typeof data.description === "string" && data.description.trim() !== "") {
                descParagraphsHtml = data.description
                    .split("\n")
                    .map(pText => pText.trim() ? `<p>${escapeHtml(pText.trim())}</p>` : "")
                    .join("");
            } else {
                descParagraphsHtml = `<p>暫無詳細文案介紹。</p>`;
            }

            // C. 處理動態標籤、分類與價錢視覺（非必填防呆）
            let tagsHtml = "";
            if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
                tagsHtml = data.tags.map(tag => `<span class="product-tag-badge">#${escapeHtml(tag)}</span>`).join("");
            }
            const productCategory = typeof data.category === "string" && data.category.trim()
                ? data.category.trim()
                : "未分類";
            let categoryHtml = productCategory !== "未分類"
                ? `<span class="product-meta-category">分類: ${escapeHtml(productCategory)}</span>`
                : "";

            let priceHtml = "";
            const originalPrice = Number(data.price);
            const salePrice = Number(data.sale_price);
            const hasSalePrice = Number.isFinite(salePrice) && salePrice > 0 && salePrice < originalPrice;
            if (Number.isFinite(originalPrice) && originalPrice > 0) {
                if (hasSalePrice) {
                    priceHtml = `
                        <div class="product-price-wrapper">
                            <span class="product-price-line-through">原價: NT$${originalPrice.toLocaleString()}</span>
                            <span class="product-price-sale">特價 NT$${salePrice.toLocaleString()}</span>
                        </div>
                    `;
                } else {
                    priceHtml = `
                        <div class="product-price-wrapper">
                            <span class="product-price-original">價錢: NT$${originalPrice.toLocaleString()}</span>
                        </div>
                    `;
                }
            }

            const activeUnitPrice = hasSalePrice ? salePrice : (Number.isFinite(originalPrice) && originalPrice > 0 ? originalPrice : 0);
            const validIntents = Array.isArray(data.intents)
                ? data.intents
                    .map((intent, idx) => ({ intent, idx }))
                    .filter(({ intent }) => intent && typeof intent === "object" && !Array.isArray(intent) && typeof intent.title === "string" && intent.title.trim())
                : [];
            const guideSectionHtml = validIntents.length > 0
                ? `
                    <section class="product-guide-section">
                        <div class="guide-divider-title">官網商品選購建議</div>
                        <h3 class="guide-subtitle">可以透過以下選項重新認識商品與內在需求：</h3>
                        <div class="guide-cards-grid">
                            ${validIntents.map(({ intent, idx }) => `
                                <button type="button" class="guide-card" data-idx="${idx}">
                                    <h4 class="card-intent">${escapeHtml(intent.title)}</h4>
                                    <p class="card-desc">${escapeHtml(typeof intent.desc === "string" ? intent.desc : "")}</p>
                                </button>
                            `).join("")}
                        </div>
                        <p class="guide-footer-philosophy">
                            先開始覺察自己的需求，呼應娜娜問路居「認識自己、選擇自己、支援自己」的精神。
                        </p>
                    </section>
                `
                : "";
            const controlIdSuffix = itemIndex === 1 ? "" : `-${itemIndex}`;
            const radioName = `orderType-${itemIndex}`;
            const productName = typeof data.name === "string" && data.name.trim() ? data.name.trim() : "未命名項目";

            // 🎯 2. 動態生成上圖文、中六格、下購買的完整架構 HTML
            const productItemHtml = `
                <div class="product-detail-container">
                    <!-- 1. 上方：圖文雙欄區塊 -->
                    <div class="product-detail-main-row">
                        <div class="product-media-column">
                            <div class="product-media-box">
                                <div class="product-img-placeholder">
                                    <img src="${escapeHtml(displayImage)}" alt="${escapeHtml(productName)}" onerror="this.src='https://placehold.co'">
                                </div>
                            </div>
                            ${priceHtml}
                        </div>

                        <div class="product-text-box">
                            <div class="product-info-header">
                                <h2 class="product-name-title">${escapeHtml(productName)}</h2>
                                <div class="product-meta-group">
                                    ${categoryHtml}
                                    <div class="product-tags-wrapper">${tagsHtml}</div>
                                </div>
                            </div>
                            <div class="product-description">
                                ${descParagraphsHtml}
                            </div>
                        </div>
                    </div>

                    ${guideSectionHtml}

                    <!-- 3. 下方：獨立橫向滿版購買面板 -->
                    <div class="purchase-panel">
                        ${validIntents.length > 0 ? `
                        <div class="product-type-section">
                            <label class="section-label" for="productType${controlIdSuffix}">訂購商品種類</label>
                            <select class="product-type-select" id="productType${controlIdSuffix}" required>
                                <option value="">請選擇商品種類</option>
                                ${validIntents.map(({ intent }) => `<option value="${escapeHtml(intent.title.trim())}">${escapeHtml(intent.title.trim())}</option>`).join("")}
                            </select>
                        </div>
                        ` : ""}
                        <div class="quantity-section">
                            <label class="section-label" for="inputQty${controlIdSuffix}">訂購數量</label>
                            <div class="quantity-selector-row">
                                <div class="quantity-counter">
                                    <button type="button" class="btn-qty" id="btnMinus${controlIdSuffix}" aria-label="減少數量">−</button>
                                    <input type="number" id="inputQty${controlIdSuffix}" value="1" min="1" readonly>
                                    <button type="button" class="btn-qty" id="btnPlus${controlIdSuffix}" aria-label="增加數量">+</button>
                                </div>
                                <div class="total-price-display">
                                    NT$<span id="textTotalPrice${controlIdSuffix}">${activeUnitPrice.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        <div class="discount-section">
                            <label class="radio-label-container">
                                <input type="radio" name="${radioName}" value="regular" checked id="radioRegular${controlIdSuffix}">
                                <span class="custom-radio"></span>
                                <span class="radio-text">一般訂購</span>
                                </label>
                            <label class="radio-label-container">
                                <input type="radio" name="${radioName}" value="member" id="radioMember${controlIdSuffix}">
                                <span class="custom-radio"></span>
                                <span class="radio-text">Muna 服務學員 / 課程夥伴（7 折）</span>
                            </label>
                        </div>

                        <div class="action-section">
                            <button type="button" class="btn-copy-order" id="btnCopyOrder${controlIdSuffix}">
                                <svg class="icon-bag" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6zM3 6h18M16 10a4 4 0 01-8 0" />
                                </svg>
                                複製訂購訊息
                            </button>
                            <p class="copy-hint-text">
                                複製訊息後，可貼至娜娜問路居的私訊完成訂購洽詢。金額不含可能產生的運費。
                            </p>
                        </div>
                    </div>
                </div>
            `;

            // 🎯 3. 將生成的 HTML 塞進網頁容器中
            frontProductContainer.insertAdjacentHTML("beforeend", productItemHtml);
            const productRoot = frontProductContainer.lastElementChild;

            // 🎯 4. 安全初始化：綁定剛生出來的數量加減、身分切換與複製按鈕監聽事件
            const inputQty = productRoot.querySelector(`#inputQty${controlIdSuffix}`);
            const btnMinus = productRoot.querySelector(`#btnMinus${controlIdSuffix}`);
            const btnPlus = productRoot.querySelector(`#btnPlus${controlIdSuffix}`);
            const textTotalPrice = productRoot.querySelector(`#textTotalPrice${controlIdSuffix}`);
            const radioRegular = productRoot.querySelector(`#radioRegular${controlIdSuffix}`);
            const radioMember = productRoot.querySelector(`#radioMember${controlIdSuffix}`);
            const productTypeSelect = productRoot.querySelector(`#productType${controlIdSuffix}`);
            const btnCopyOrder = productRoot.querySelector(`#btnCopyOrder${controlIdSuffix}`);

            productRoot.querySelectorAll(".guide-card").forEach((card) => {
                card.addEventListener("click", () => {
                    const idx = Number(card.dataset.idx);
                    const intent = data.intents[idx];
                    if (!intent || !intentModal || !modalIntentTitle || !modalIntentDetail) return;
                    activeGuideCard = card;
                    modalIntentTitle.textContent = intent.title;
                    modalIntentDetail.textContent = typeof intent.detail === "string" ? intent.detail : "";
                    intentModal.hidden = false;
                    modalCloseButton?.focus();
                });
            });

            function updateTotalPrice() {
                if (!inputQty || !textTotalPrice) return;
                const qty = Number.parseInt(inputQty.value, 10) || 1;
                const unitPrice = (radioMember && radioMember.checked) ? Math.round(activeUnitPrice * 0.7) : activeUnitPrice;
                const total = unitPrice * qty;
                textTotalPrice.textContent = total.toLocaleString();
            }

            // 🎯 4. 安全初始化：綁定剛生出來的數量加減、身分切換與【立即購買】按鈕監聽事件
            if (btnPlus) {
                btnPlus.addEventListener("click", () => {
                    inputQty.value = Number.parseInt(inputQty.value, 10) + 1;
                    updateTotalPrice();
                });
            }

            if (btnMinus) {
                btnMinus.addEventListener("click", () => {
                    if (Number.parseInt(inputQty.value, 10) > 1) {
                        inputQty.value = Number.parseInt(inputQty.value, 10) - 1;
                        updateTotalPrice();
                    }
                });
            }

            if (radioRegular) radioRegular.addEventListener("change", updateTotalPrice);
            if (radioMember) radioMember.addEventListener("change", updateTotalPrice);

            // 🔥 核心改造：將原本的「複製訊息」邏輯，無縫改寫為「打包 LocalStorage 並跳轉購物車」
            if (btnCopyOrder) {
                // RWD 體驗優化：將按鈕內部的純文字改為購物意象，保留您原汁原味的 SVG 圖標
                const svgIconHtml = btnCopyOrder.querySelector('svg') ? btnCopyOrder.querySelector('svg').outerHTML : '';
                btnCopyOrder.innerHTML = `${svgIconHtml} 放進去購物車`;

                btnCopyOrder.addEventListener("click", () => {
                    const qty = Number.parseInt(inputQty.value, 10) || 1;
                    const productType = productTypeSelect ? productTypeSelect.value : "";
                    if (productTypeSelect && !productType) {
                        alert("請先選擇訂購商品種類。");
                        productTypeSelect.focus();
                        return;
                    }
                    const isMember = radioMember && radioMember.checked;
                    const identityText = isMember ? "Muna 服務學員 / 課程夥伴 (7折)" : "一般訂購";
                    
                    // 1. 精準計算折減後的實際結帳單價，傳遞給唯讀購物車
                    const finalUnitPrice = isMember ? Math.round(activeUnitPrice * 0.7) : activeUnitPrice;

                    // 2. 打包符合 cart.html 規格的獨立商品購物快照
                    const cartPayload = {
                        name: productName,
                        productType,
                        price: finalUnitPrice,     // 打折後的商品單價
                        quantity: qty,             // 使用者選取的數量
                        discountName: identityText // 折扣身方案名稱字串
                    };

                    try {
                        // 3. 儲存進前端記憶體快照
                        localStorage.setItem("checkout_cart_item", JSON.stringify(cartPayload));

                        // 4. 按鈕互動反饋體驗
                        const originalHTML = btnCopyOrder.innerHTML;
                        btnCopyOrder.style.backgroundColor = "#48533C"; // 切換為網站品牌植物綠
                        btnCopyOrder.textContent = "🔄 正在讀取購物車清單...";
                        btnCopyOrder.disabled = true;

                        // 5. 直接網頁切換至同層 front/ 目錄下的唯讀購物車 cart.html
                        setTimeout(() => {
                            window.location.href = "./cart.html";
                        }, 400);

                    } catch (err) {
                        console.error("購物車暫存失敗:", err);
                        alert("系統連線異常，請稍後再試。");
                        btnCopyOrder.disabled = false;
                        btnCopyOrder.innerHTML = originalHTML;
                    }
                });
            }
            
            itemIndex += 1;
        }); // snapshot.forEach 結尾
    }, (error) => {
        console.error("載入商品資料失敗:", error);
        frontProductContainer.innerHTML = '<div style="text-align:center; color:#9e847a; padding:40px;">商品資料暫時無法載入，請稍後再試。</div>';
    }); // onSnapshot 結尾
}); // DOMContentLoaded 結尾