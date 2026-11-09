import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getFirestore,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// 1. Firebase 初始化設定 (沿用 munayu 專案專屬金鑰)
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

// 2. 本地開發環境放行旗標
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
let isAuthResolving = true;

// 3. 全局管理員安全防火牆 (同時支持有 s 與沒有 s 的檔名路徑)
onAuthStateChanged(auth, (user) => {
    const isCurrentAdminPhotoPage = window.location.pathname.includes("admin-photo.html") || window.location.pathname.includes("admin-photos.html");

    if (isLocalhost) {
        console.log("🛠️ 本機維修模式：已自動放行相簿管理員驗證，直接啟動資料庫。");
        if (isCurrentAdminPhotoPage) initializePhotoManagement();
        return;
    }

    if (user) {
        console.log("🌐 線上相簿管理員身份驗證成功！", user.email);
        isAuthResolving = false;
        if (isCurrentAdminPhotoPage) initializePhotoManagement();
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

// 4. 相簿管理核心業務方法
function initializePhotoManagement() {
    console.log("🚀 Firebase 相簿資料庫核心開始初始化...");
    const db = getFirestore(app);

    // 綁定 HTML DOM 節點
    const photoFileInput = document.getElementById("photoFileInput");
    const photoAltInput = document.getElementById("photoAltInput");
    const btnUploadPhoto = document.getElementById("btnUploadPhoto");
    const btnNewPhoto = document.getElementById("btnNewPhoto");
    const btnCancelPhotoEdit = document.getElementById("btnCancelPhotoEdit");
    const photoGridContainer = document.getElementById("photoGridContainer");
    const photoImageLabel = document.getElementById("photoImageLabel");
    const photoFormSection = document.querySelector(".photo-form-section");
    const photoFormTitle = document.getElementById("photoFormTitle");
    const photoStatusSelect = document.getElementById("photoStatusSelect");
    let nextPhotoSort = 1;
    let currentPhotoDocs = [];
    let editingPhotoId = null;

    // 🔄 Base64 轉碼工具
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    // 表單清空重設
    function resetPhotoForm() {
        editingPhotoId = null;
        if (photoFileInput) photoFileInput.value = "";
        if (photoAltInput) photoAltInput.value = "";
        if (photoStatusSelect) photoStatusSelect.value = "active";
        if (photoImageLabel) photoImageLabel.textContent = "選擇照片檔案 (系統會自動轉為 Base64，限制 700KB 以下)";
        if (photoFormTitle) photoFormTitle.textContent = "✨ 新增精彩照片";
        if (btnUploadPhoto) btnUploadPhoto.textContent = "上傳照片至精選相簿";
        if (btnCancelPhotoEdit) btnCancelPhotoEdit.hidden = true;
        if (photoFormSection) photoFormSection.hidden = true;
    }

    btnNewPhoto?.addEventListener("click", () => {
        if (editingPhotoId && !confirm("切換新增照片會清除尚未儲存的修改，確定繼續嗎？")) return;
        resetPhotoForm();
        photoFormSection.hidden = false;
        photoFormSection.scrollIntoView({ behavior: "smooth", block: "start" });
        photoFileInput?.focus();
    });
    btnCancelPhotoEdit?.addEventListener("click", resetPhotoForm);

    // ==========================================
    // A. 照片轉換與上架儲存邏輯 (全包覆無死角防呆版)
    // ==========================================
    if (btnUploadPhoto) {
        const activeBtn = btnUploadPhoto;

        activeBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            console.log("👉 偵測到點擊儲存按鈕！正在執行驗證程序...");

            try {
                if (!photoFileInput || !photoAltInput) {
                    alert("❌ 網頁核心欄位元件綁定失敗，請確認 HTML 中的輸入框 ID 是否正確！");
                    return;
                }

                const altText = photoAltInput.value.trim();
                const file = photoFileInput.files ? photoFileInput.files[0] : null; // ⭕ 已修正：精確取得單一檔案物件
                const photoIdToUpdate = editingPhotoId;

                const statusValue = photoStatusSelect ? photoStatusSelect.value.trim() : "active";

                if ((!photoIdToUpdate && !file) || !altText) {
                    alert(photoIdToUpdate
                        ? "請填寫圖片替代文字。"
                        : "請填寫圖片替代文字，並選擇要上傳的照片檔案！");
                    return;
                }

                if (file && file.size > 700 * 1024) {
                    alert(`⚠️ 這張照片容量過大 (${(file.size / 1024).toFixed(1)}KB)！請壓縮控制在 700KB 以下再行上傳。`);
                    return;
                }

                activeBtn.innerText = photoIdToUpdate ? "照片更新中..." : "圖片解碼與同步中...";
                activeBtn.disabled = true;

                const photoData = {
                    alt: altText,
                    status: statusValue || "active",
                    updated_at: serverTimestamp()
                };

                if (file) photoData.images = await convertFileToBase64(file);

                if (photoIdToUpdate) {
                    await updateDoc(doc(db, "photos", photoIdToUpdate), photoData);
                    alert("照片修改已儲存。");
                } else {
                    await Promise.all(currentPhotoDocs.map((photo, index) => {
                        if ((Number(photo.data().sort) || 1) === index + 1) return Promise.resolve();
                        return updateDoc(doc(db, "photos", photo.id), { sort: index + 1 });
                    }));
                    await addDoc(collection(db, "photos"), {
                        ...photoData,
                        created_at: serverTimestamp(),
                        sort: nextPhotoSort
                    });
                    alert("✨ 精選照片已成功上傳並排在最後！");
                }
                resetPhotoForm();

            } catch (error) {
                console.error("❌ 儲存時程式核心發生崩潰錯誤：", error);
                alert("❌ 儲存失敗！錯誤核心原因: " + error.message);
            } finally {
                activeBtn.innerText = editingPhotoId ? "儲存修改" : "上傳照片至精選相簿";
                activeBtn.disabled = false;
            }
        });
    } else {
        console.error("❌ 網頁中找不到 id='btnUploadPhoto' 的按鈕物件，無法綁定功能。");
    }

    // ==========================================
    // B. 照片藝廊實時即時監聽與網格渲染 (修正欄位讀取)
    // ==========================================
    if (photoGridContainer) {
        // 由前端排序，避免 Firestore 複合排序需要額外索引。
        const photoQuery = query(collection(db, "photos"));

        onSnapshot(photoQuery, (snapshot) => {
            photoGridContainer.innerHTML = "";

            if (snapshot.empty) {
                nextPhotoSort = 1;
                currentPhotoDocs = [];
                photoGridContainer.innerHTML = '<div style="text-align:center; color:#9e847a; padding:20px; grid-column: 1/-1;">目前相簿內沒有任何精彩照片。</div>';
                return;
            }

            const sortedPhotos = snapshot.docs.slice().sort((leftDoc, rightDoc) => {
                const leftData = leftDoc.data();
                const rightData = rightDoc.data();
                const sortDifference = (Number(leftData.sort) || 1) - (Number(rightData.sort) || 1);
                if (sortDifference !== 0) return sortDifference;

                const leftCreatedAt = leftData.created_at?.toMillis?.() || 0;
                const rightCreatedAt = rightData.created_at?.toMillis?.() || 0;
                return rightCreatedAt - leftCreatedAt;
            });
            nextPhotoSort = sortedPhotos.length + 1;
            currentPhotoDocs = sortedPhotos;

            sortedPhotos.forEach((docSnap, index) => {
                const data = docSnap.data();
                const id = docSnap.id;
                const status = data.status === "inactive" ? "inactive" : "active";
                const sort = index + 1;

                // 💡 讀取修正：採用新資料結構的 data.images 欄位
                const displayImg = data.images || 'https://placehold.co';

                const photoCardHtml = `
                    <div class="photo-card-item" id="photo-${id}">
                        <img src="${displayImg}" class="photo-card-thumb" alt="${data.alt || ''}" onerror="this.src='https://placehold.co'">
                        <div class="photo-card-body">
                            <p class="photo-card-alt">${data.alt || '暫無替代描述文字'}</p>
                            <span class="photo-card-status">${status === "inactive" ? "前台隱藏" : "前台顯示"} · 順序 ${sort}</span>
                            <div class="photo-card-actions">
                                <button type="button" class="btn-photo-move" data-id="${id}" data-direction="-1" aria-label="往前移動" title="往前移動" ${index === 0 ? "disabled" : ""}>↑</button>
                                <button type="button" class="btn-photo-move" data-id="${id}" data-direction="1" aria-label="往後移動" title="往後移動" ${index === sortedPhotos.length - 1 ? "disabled" : ""}>↓</button>
                                <button type="button" class="btn-photo-edit" data-id="${id}">編輯</button>
                                <button type="button" class="btn-photo-delete" data-id="${id}">移除</button>
                            </div>
                        </div>
                    </div>
                `;
                photoGridContainer.insertAdjacentHTML("beforeend", photoCardHtml);
            });

            photoGridContainer.querySelectorAll(".btn-photo-edit").forEach((button) => {
                button.addEventListener("click", async (event) => {
                    const id = event.currentTarget.getAttribute("data-id");
                    const photoSnapshot = sortedPhotos.find((photo) => photo.id === id);
                    if (!photoSnapshot) return;

                    const data = photoSnapshot.data();
                    if (editingPhotoId && editingPhotoId !== id && !confirm("切換編輯照片會清除尚未儲存的修改，確定繼續嗎？")) return;
                    editingPhotoId = id;
                    photoAltInput.value = data.alt || "";
                    photoFileInput.value = "";
                    photoStatusSelect.value = data.status === "inactive" ? "inactive" : "active";
                    photoImageLabel.textContent = "選擇新照片（不選則保留目前照片）";
                    photoFormTitle.textContent = "✨ 編輯精選照片";
                    btnUploadPhoto.textContent = "編輯照片";
                    btnCancelPhotoEdit.hidden = false;
                    photoFormSection.hidden = false;
                    photoFormSection.scrollIntoView({ behavior: "smooth", block: "start" });
                    photoAltInput.focus();
                });
            });

            photoGridContainer.querySelectorAll(".btn-photo-move").forEach((button) => {
                button.addEventListener("click", async (event) => {
                    const id = event.currentTarget.getAttribute("data-id");
                    const currentIndex = sortedPhotos.findIndex((photo) => photo.id === id);
                    const targetIndex = currentIndex + Number(event.currentTarget.getAttribute("data-direction"));
                    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedPhotos.length) return;

                    const batch = writeBatch(db);
                    batch.update(doc(db, "photos", sortedPhotos[currentIndex].id), { sort: targetIndex + 1 });
                    batch.update(doc(db, "photos", sortedPhotos[targetIndex].id), { sort: currentIndex + 1 });
                    event.currentTarget.disabled = true;

                    try {
                        await batch.commit();
                    } catch (error) {
                        console.error("調整照片順序失敗：", error);
                        alert("調整順序失敗：" + error.message);
                    }
                });
            });

            // 🗑️ 點擊移除相本照片功能
            photoGridContainer.querySelectorAll(".btn-photo-delete").forEach((button) => {
                button.addEventListener("click", async (event) => {
                    const id = event.currentTarget.getAttribute("data-id");
                    if (!confirm("確定要將這張精選照片從資料庫永久移除嗎？")) return;

                    try {
                        const batch = writeBatch(db);
                        batch.delete(doc(db, "photos", id));
                        sortedPhotos
                            .filter((photo) => photo.id !== id)
                            .forEach((photo, index) => batch.update(doc(db, "photos", photo.id), { sort: index + 1 }));
                        await batch.commit();
                        if (editingPhotoId === id) resetPhotoForm();
                        alert("該照片已成功從雲端相簿移除！");
                    } catch (error) {
                        console.error("相簿移除照片錯誤：", error);
                        alert("移除照片失敗: " + error.message);
                    }
                });
            });

        }, (error) => {
            console.error("❌ 實時監聽相簿發生失敗，可能規則尚未發布完成：", error);
            photoGridContainer.innerHTML = '<div style="text-align:center; color:#b85c4c; padding:20px;">照片讀取失敗，請檢查 Firebase 權限或網路連線。</div>';
        });
    }
}