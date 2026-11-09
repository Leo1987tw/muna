import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp, 
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// 1. Firebase 初始化設定
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

// 2. 本地開發環境放行旗標定義
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
let isAuthResolving = true;

// 3. 身分驗證安全防火牆
onAuthStateChanged(auth, (user) => {
    const isCurrentAdminProductPage = window.location.pathname.includes("admin-product.html");

    if (isLocalhost) {
        console.log("🛠️ 本機維修模式：已自動放行商品管理員驗證，直接啟動資料庫。");
        if (isCurrentAdminProductPage) initializeProductManagement();
        return;
    }

    if (user) {
        console.log("🌐 線上管理員身份驗證成功！", user.email);
        isAuthResolving = false;
        if (isCurrentAdminProductPage) initializeProductManagement();
    } else {
        if (isAuthResolving) {
            setTimeout(() => {
                if (isAuthResolving && !auth.currentUser) {
                    isAuthResolving = false;
                    alert("偵測到未授權存取，請先登入管理員帳號。");
                    window.location.replace("../front/login.html");
                }
            }, 400);
            return;
        }
        alert("偵測到未授權存取，請先登入管理員帳號。");
        window.location.replace("../front/login.html");
        return;
    }
});

// 4. 商品管理核心業務工廠方法
function initializeProductManagement() {
    console.log("🚀 Firebase 商品資料庫核心開始初始化...");
    const db = getFirestore(app);

    // 精確綁定 HTML 所有元件節點
    const productNameInput = document.getElementById("productNameInput");
    const productImageInput = document.getElementById("productImageInput");
    const productImageInput2 = document.getElementById("productImageInput2");
    const productCategoryInput = document.getElementById("productCategoryInput");
    const productTagsInput = document.getElementById("productTagsInput");
    const productPriceInput = document.getElementById("productPriceInput");
    const productSalePriceInput = document.getElementById("productSalePriceInput");
    const productDescriptionInput = document.getElementById("productDescriptionInput");
    const btnUploadProduct = document.getElementById("btnUploadProduct");
    const btnCancelProductEdit = document.getElementById("btnCancelProductEdit");
    const btnNewProduct = document.getElementById("btnNewProduct");
    const productFormTitle = document.getElementById("productFormTitle");
    const productContainer = document.getElementById("productContainer");
    const productIntentsContainer = document.getElementById("productIntentsContainer");
    const btnAddIntent = document.getElementById("btnAddIntent");
    const productFormSection = document.querySelector(".product-form-section");
    const productImageLabel = document.querySelector('label[for="productImageInput"]');
    let editingProductId = null;
    let editingProductImages = [];

    function addIntentRow(intent = {}) {
        const intentRow = document.createElement("div");
        intentRow.className = "product-intent-row";
        intentRow.innerHTML = `
            <div class="product-intent-row-heading">
                <strong>選項</strong>
                <button type="button" class="btn-remove-intent" aria-label="移除此選項">移除</button>
            </div>
            <div class="admin-input-group">
                <label>標題</label>
                <input type="text" class="admin-form-input intent-title-input" maxlength="80" placeholder="例如：安定">
            </div>
            <div class="admin-input-group">
                <label>簡短說明</label>
                <input type="text" class="admin-form-input intent-desc-input" maxlength="200" placeholder="例如：我想讓心安定下來">
            </div>
            <div class="admin-input-group">
                <label>詳細內容（點擊前端卡片後顯示）</label>
                <textarea class="admin-form-input intent-detail-input" rows="3" placeholder="請輸入此選項的詳細說明"></textarea>
            </div>
        `;
        intentRow.querySelector(".intent-title-input").value = typeof intent.title === "string" ? intent.title : "";
        intentRow.querySelector(".intent-desc-input").value = typeof intent.desc === "string" ? intent.desc : "";
        intentRow.querySelector(".intent-detail-input").value = typeof intent.detail === "string" ? intent.detail : "";
        productIntentsContainer.appendChild(intentRow);
    }

    function getProductIntents() {
        const intents = [];
        for (const row of productIntentsContainer.querySelectorAll(".product-intent-row")) {
            const title = row.querySelector(".intent-title-input").value.trim();
            const desc = row.querySelector(".intent-desc-input").value.trim();
            const detail = row.querySelector(".intent-detail-input").value.trim();
            if (!title && !desc && !detail) continue;
            if (!title) {
                alert("每個選項都必須填寫標題，或將該選項內容清空。");
                return null;
            }
            intents.push({ title, desc, detail });
        }
        return intents;
    }

    function resetProductForm() {
        editingProductId = null;
        editingProductImages = [];
        productNameInput.value = "";
        productImageInput.value = "";
        if (productImageInput2) productImageInput2.value = "";
        if (productImageLabel) productImageLabel.textContent = "選擇商品照片檔案 (系統會自動轉為 Base64)";
        productDescriptionInput.value = "";
        if (productCategoryInput) productCategoryInput.value = "";
        if (productTagsInput) productTagsInput.value = "";
        if (productPriceInput) productPriceInput.value = "";
        if (productSalePriceInput) productSalePriceInput.value = "0";
        productIntentsContainer.replaceChildren();
        btnUploadProduct.innerText = "發佈商品至前台";
        if (productFormTitle) productFormTitle.textContent = "✨ 新增商品課程";
        if (btnCancelProductEdit) btnCancelProductEdit.hidden = true;
    }

    btnCancelProductEdit?.addEventListener("click", resetProductForm);
    btnNewProduct?.addEventListener("click", () => {
        if (editingProductId && !confirm("切換新增商品將清除目前尚未儲存的編輯內容，確定繼續嗎？")) return;
        resetProductForm();
        productFormSection?.scrollIntoView({ behavior: "smooth", block: "start" });
        productNameInput.focus();
    });
    btnAddIntent?.addEventListener("click", () => addIntentRow());
    productIntentsContainer?.addEventListener("click", (event) => {
        const removeButton = event.target.closest(".btn-remove-intent");
        if (removeButton) removeButton.closest(".product-intent-row").remove();
    });

    // 🔄 核心魔術：在後台將實體檔案自動轉成 Base64 字串的工具
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    // ==========================================
    // A. 商品新增 / 發佈邏輯 (自動轉 Base64 塞入後端)
    // ==========================================
    if (productNameInput && productImageInput && productDescriptionInput && btnUploadProduct) {
        btnUploadProduct.addEventListener("click", async () => {
            const name = productNameInput.value.trim();
            const description = productDescriptionInput.value.trim();
            const category = productCategoryInput ? productCategoryInput.value.trim() : "";
            const price = productPriceInput ? parseInt(productPriceInput.value) || 0 : 0;
            const salePrice = productSalePriceInput ? parseInt(productSalePriceInput.value) || 0 : 0;

            // 獲取使用者選擇的實體圖片檔案
            const files = [
                productImageInput.files ? productImageInput.files[0] : null,
                productImageInput2?.files ? productImageInput2.files[0] : null
            ];

            // 編輯時可保留原圖；新增商品仍必須選擇第一張照片。
            if (!name || (!editingProductId && !files[0]) || !description) {
                alert(editingProductId
                    ? "請填寫商品名稱並填寫介紹文案！"
                    : "請填寫商品名稱、選擇第一張照片並填寫介紹文案！");
                return;
            }

            // Firestore 單筆文件上限為 1 MiB，單張檔案仍限制 700 KB。
            const oversizedFile = files.find((file) => file && file.size > 700 * 1024);
            if (oversizedFile) {
                alert(`圖片檔案太大了 (${(oversizedFile.size / 1024).toFixed(1)}KB)！請將每張圖片控制在 700KB 以下再行上架。`);
                return;
            }

            // 🛠️ 解析標籤字串：將「新品,免運」轉換成陣列 `["新品", "免運"]`
            let tagsArray = [];
            if (productTagsInput && productTagsInput.value.trim() !== "") {
                tagsArray = productTagsInput.value
                    .replace(/，/g, ",")
                    .split(",")
                    .map(tag => tag.trim())
                    .filter(tag => tag !== "");
            }
            const intents = getProductIntents();
            if (!intents) return;

            const productIdToUpdate = editingProductId;
            btnUploadProduct.innerText = productIdToUpdate ? "商品資料更新中..." : "圖片轉碼與同步中...";
            btnUploadProduct.disabled = true;

            try {
                const productData = {
                    name: name,
                    description: description,
                    category: category,
                    price: price,
                    sale_price: salePrice,
                    tags: tagsArray,
                    intents: intents,
                    updated_at: serverTimestamp()
                };

                const uploadedImages = await Promise.all(files.map((file) => (
                    file ? convertFileToBase64(file) : null
                )));
                const hasUploadedImages = uploadedImages.some(Boolean);
                if (hasUploadedImages || !productIdToUpdate) {
                    const images = editingProductImages.slice(0, 2);
                    uploadedImages.forEach((image, index) => {
                        if (image) images[index] = image;
                    });
                    productData.images = images.filter((image) => typeof image === "string" && image);
                    const totalImageDataSize = productData.images.reduce((total, image) => total + image.length, 0);
                    if (totalImageDataSize > 950 * 1024) {
                        throw new Error("照片轉碼後總容量過大，請縮小圖片後再上傳（合計需低於 950 KB）。");
                    }
                }

                if (productIdToUpdate) {
                    await updateDoc(doc(db, "products", productIdToUpdate), productData);
                    alert("✨ 商品資料已成功更新！");
                } else {
                    await addDoc(collection(db, "products"), {
                        ...productData,
                        status: "active",
                        created_at: serverTimestamp()
                    });
                    alert("✨ 商品成功上架並同步至雲端資料庫！");
                }

                resetProductForm();

            } catch (error) {
                console.error(productIdToUpdate ? "更新商品錯誤：" : "上架錯誤：", error);
                alert((productIdToUpdate ? "更新商品失敗: " : "上架失敗，錯誤訊息: ") + error.message);
            } finally {
                if (editingProductId === productIdToUpdate) {
                    btnUploadProduct.innerText = productIdToUpdate ? "儲存商品修改" : "發佈商品至前台";
                }
                btnUploadProduct.disabled = false;
            }
        });
    }

    // ==========================================
    // B. 商品即時動態監聽與【新版右側垂直列列表渲染】(含即時連後端上下架)
    // ==========================================
    if (productContainer) {
        const productQuery = query(collection(db, "products"), orderBy("created_at", "desc"));

        onSnapshot(productQuery, (snapshot) => {
            productContainer.innerHTML = "";

            if (snapshot.empty) {
                productContainer.innerHTML = '<div style="text-align:center; color:#9e847a; padding:20px;">目前後台沒有任何上架商品</div>';
                return;
            }

            snapshot.forEach((snapshotDoc) => {
                const data = snapshotDoc.data();
                const id = snapshotDoc.id;
                
                let displayImage = 'https://placehold.co';
                if (data.images && Array.isArray(data.images) && data.images.length > 0) {
                    displayImage = data.images[0];
                }

                let tagsHtml = "";
                if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
                    tagsHtml = data.tags.map(tag => `<span class="product-tag-badge">#${tag}</span>`).join("");
                }

                // 💰 配合垂直排列微調價格視覺
                let priceHtml = `<span class="product-price-original">原價: $${data.price || 0}</span>`;
                if (data.sale_price && parseInt(data.sale_price) > 0) {
                    priceHtml = `
                        <span class="product-price-line-through">原價: $${data.price || 0}</span>
                        <span class="product-price-sale">特價 $${data.sale_price}</span>
                    `;
                }

                const isActive = data.status !== "inactive";
                const statusBtnText = isActive ? "上架" : "下架";
                const statusBtnClass = isActive ? "active" : "inactive";

                // 🔥 精確還原最新草圖：區分為【左圖】、【中主文字區】與【右垂直操控列】三大核心區塊
                const itemHtml = `
                    <div class="product-list-item" id="product-${id}">
                        <!-- 1. 左側：直式大圖 -->
                        <img src="${displayImage}" class="product-item-thumb" alt="${data.name || ''}" onerror="this.src='https://placehold.co'">
                        
                        <!-- 2. 中間：主文字描述大框區 -->
                        <div class="product-item-center-block">
                            <div class="product-row-top">
                                <h4 class="product-item-title">${data.name || '未命名商品'}</h4>
                                <span class="product-meta-category">分類: ${data.category || '未分類'}</span>
                                <div class="product-tags-wrapper">${tagsHtml}</div>
                            </div>
                            <p class="product-item-desc">${data.description || '暫無描述'}</p>
                        </div>
                        
                        <!-- 3. 右側：垂直操控控制列 (包含價錢、特價、雙按鈕由上到下垂直排列) -->
                        <div class="product-item-right-block">
                            <div class="product-price-wrapper">
                                ${priceHtml}
                            </div>
                            
                            <div class="product-item-actions">
                                <button class="btn-product-edit" data-id="${id}">編輯商品</button>
                                <div class="product-status-delete-actions">
                                <button class="btn-status-toggle ${statusBtnClass}" data-id="${id}" data-status="${data.status || 'active'}">
                                    ${statusBtnText}
                                </button>
                                <button class="btn-delete" data-id="${id}">刪除</button>
                                </div>
                            </div>
                        </div>

                    </div>
                `;
                productContainer.insertAdjacentHTML("beforeend", itemHtml);
            });

            productContainer.querySelectorAll(".btn-product-edit").forEach((button) => {
                button.addEventListener("click", (event) => {
                    const id = event.currentTarget.getAttribute("data-id");
                    const productSnapshot = snapshot.docs.find((productDoc) => productDoc.id === id);
                    if (!productSnapshot) {
                        alert("找不到要編輯的商品，請重新整理後再試。");
                        return;
                    }

                    const data = productSnapshot.data();
                    editingProductId = id;
                    editingProductImages = Array.isArray(data.images)
                        ? data.images.filter((image) => typeof image === "string")
                        : (typeof data.images === "string" && data.images ? [data.images] : []);
                    productNameInput.value = data.name || "";
                    productImageInput.value = "";
                    if (productImageInput2) productImageInput2.value = "";
                    if (productImageLabel) productImageLabel.textContent = `選擇新商品照片（不選則保留現有照片，目前 ${editingProductImages.length} 張）`;
                    productCategoryInput.value = data.category || "";
                    productTagsInput.value = Array.isArray(data.tags) ? data.tags.join(", ") : "";
                    productPriceInput.value = data.price ?? "";
                    productSalePriceInput.value = data.sale_price ?? 0;
                    productDescriptionInput.value = data.description || "";
                    productIntentsContainer.replaceChildren();
                    if (Array.isArray(data.intents)) {
                        data.intents.forEach((intent) => addIntentRow(intent));
                    }
                    btnUploadProduct.innerText = "儲存商品修改";
                    if (productFormTitle) productFormTitle.textContent = "✨ 編輯商品課程";
                    if (btnCancelProductEdit) btnCancelProductEdit.hidden = false;
                    productFormSection?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
            });

            // 🟢 🛠️ 監聽並實作「直接點擊切換上下架狀態（即時修改後端）」
            productContainer.querySelectorAll(".btn-status-toggle").forEach((button) => {
                button.addEventListener("click", async (event) => {
                    const id = event.currentTarget.getAttribute("data-id");
                    const currentStatus = event.currentTarget.getAttribute("data-status");
                    
                    const newStatus = currentStatus === "inactive" ? "active" : "inactive";
                    const confirmMsg = newStatus === "active" ? "確定要重新上架此商品，使其在前台公開顯示嗎？" : "確定要下架此商品，使其在前台隱藏嗎？";
                    
                    if (!confirm(confirmMsg)) return;

                    try {
                        const productRef = doc(db, "products", id);
                        await updateDoc(productRef, {
                            status: newStatus,
                            updated_at: serverTimestamp()
                        });
                        alert("✨ 後端狀態切換成功！");
                    } catch (error) {
                        console.error("切換狀態錯誤：", error);
                        alert("切換失敗: " + error.message);
                    }
                });
            });

            // 🗑️ 刪除按鈕事件監聽
            productContainer.querySelectorAll(".btn-delete").forEach((button) => {
                button.addEventListener("click", async (event) => {
                    const id = event.currentTarget.getAttribute("data-id");
                    if (!confirm("確定要將此商品從雲端資料庫中永久下架刪除嗎？")) return;

                    try {
                        await deleteDoc(doc(db, "products", id)); 
                        if (editingProductId === id) resetProductForm();
                        alert("該商品已順利從雲端資料庫下架移除！");
                    } catch (error) {
                        console.error("刪除錯誤：", error);
                        alert("刪除失敗: " + error.message);
                    }
                });
            });
        });
    }
}