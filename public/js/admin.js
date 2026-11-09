import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
// ⭕ 正式引入安全登出所需的 signOut 模組
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDOzzPZRJe0Qxvb5RH9pA1SbxSMWt-551s",
    authDomain: "munayu.firebaseapp.com", // ⭕ 修正：補齊先前不小心刪壞的真實雲端安全網域
    projectId: "munayu",
    storageBucket: "munayu.firebasestorage.app",
    messagingSenderId: "435609048625",
    appId: "1:435609048625:web:26e2b4fd7f9d4b2eef2710",
    measurementId: "G-ZEERMHK8WQ"
};

// 歸預設 [DEFAULT] 實例，前台 login.js 的登入狀態才能順利共用
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 判斷是否為本機維修環境 (localhost 或 127.0.0.1)
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// 🌟 終極統一防護：使用明確的身分加載審查旗標，徹底解決 Firebase 多次重複觸發空狀態的時間差誤判
let isAuthResolving = true; 

onAuthStateChanged(auth, (user) => {
    const isCurrentAdminPage = window.location.pathname.includes("admin.html");

    // 🛠️ 1. 本機維修模式：如果是本地開發環境，直接強制放行
    if (isLocalhost) {
        console.log("🛠️ 本機維修模式：已自動放行管理員驗證，直接啟動資料庫。");
        if (isCurrentAdminPage) initializeDashboardTools();
        return; 
    }

    // 🌐 2. 線上正式環境身分防火牆
    if (user) {
        // ⭕ 成功確認已登入（包含瀏覽器記住的連線狀態）
        console.log("🌐 線上管理員身份驗證成功！", user.email);
        isAuthResolving = false; // 審查結束，成功通關
        if (isCurrentAdminPage) initializeDashboardTools();
    } else {
        // ⏳ 終極防打架：網頁剛打開的頭 400 毫秒內，不論醒它連續觸發幾次空狀態，
        // 只要 Google 還沒完全確認結果，一律當作「背景連線中」默默 return 放行，不噴 Alert、不踢人。
        if (isAuthResolving) {
            console.log("⏳ Firebase 背景安全通道建立中，暫緩威脅攔截...");
            
            // 🌟 設定安全倒數計時：給予背景連線 400 毫秒的寬限期。400 毫秒一到，若真的沒登入才執行強退
            setTimeout(() => {
                // 如果 400 毫秒後，其他併發的 onAuthStateChanged 依然沒有拿到 user，代表真的沒登入
                if (isAuthResolving && !auth.currentUser) {
                    isAuthResolving = false; // 審查終結
                    alert("偵測到未授權存取，請先登入管理員帳號。");
                    window.location.replace("../front/login.html"); 
                }
            }, 400);
            
            return; // 退出，繼續在背景等 Google 連線
        }

        // 🚨 只有當 400 毫秒寬限期完全結束，且「確定當前訪客完全沒有登入憑證」時，才執行強制驅逐
        alert("偵測到未授權存取，請先登入管理員帳號。");
        window.location.replace("../front/login.html"); 
        return;
    }
});

// 資料庫後台工廠方法模組
function initializeDashboardTools() {
    console.log("🚀 Firebase 資料庫工具開始初始化...");
    const db = getFirestore(app);

    const todayBookingCount = document.getElementById("todayBookingCount");
    if (todayBookingCount) {
        let bookings = [];
        let slotsById = new Map();
        let hasBookings = false;
        let hasSlots = false;

        const getTaiwanToday = () => {
            const parts = new Intl.DateTimeFormat("en-US", {
                timeZone: "Asia/Taipei",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).formatToParts(new Date());
            const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
            return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
        };

        const renderTodayPendingCount = () => {
            if (!hasBookings || !hasSlots) return;
            const today = getTaiwanToday();
            const count = bookings.filter((booking) => {
                const status = booking.status || "pending";
                if (status !== "pending" && status !== "待處理") return false;
                const slot = slotsById.get(booking.slot_id);
                return slot?.date === today;
            }).length;
            todayBookingCount.textContent = String(count);
            todayBookingCount.removeAttribute("title");
        };

        const handleCountError = (error) => {
            console.error("讀取今日待處理預約筆數失敗：", error);
            todayBookingCount.textContent = "--";
            todayBookingCount.title = "預約資料讀取失敗，請檢查 Firestore 權限。";
        };

        onSnapshot(collection(db, "bookings"), (snapshot) => {
            bookings = snapshot.docs.map((bookingDoc) => bookingDoc.data());
            hasBookings = true;
            renderTodayPendingCount();
        }, handleCountError);

        onSnapshot(collection(db, "time_slots"), (snapshot) => {
            slotsById = new Map(snapshot.docs.map((slotDoc) => [slotDoc.id, slotDoc.data()]));
            hasSlots = true;
            renderTodayPendingCount();
        }, handleCountError);
    }
    
    // ==========================================
    // 1. YouTube 影片設定同步區塊
    // ==========================================
    const videoUrlInput = document.getElementById("videoUrlInput");
    const updateVideoButton = document.getElementById("btnUpdateVideo");

    if (videoUrlInput && updateVideoButton) {
        const videoDocRef = doc(db, "site_settings", "youtube_video");
        getDoc(videoDocRef).then((docSnap) => {
            if (docSnap.exists()) {
                videoUrlInput.value = docSnap.data().url || "";
                console.log("✅ 成功連線線上資料庫並填入 YouTube 網址");
            }
        }).catch(err => {
            console.error("❌ 無法讀取線上資料，可能 Firestore 規則未開放：", err.message);
        });

        updateVideoButton.addEventListener("click", async () => {
            const videoUrl = videoUrlInput.value.trim();
            if (!videoUrl) {
                alert("請輸入 YouTube 影片網址！");
                return;
            }

            updateVideoButton.innerText = "儲存中...";
            updateVideoButton.disabled = true;
            try {
                await setDoc(videoDocRef, { url: videoUrl, updatedAt: Date.now() });
                alert("YouTube 影片設定已成功儲存！");
            } catch (error) {
                alert("儲存失敗: " + error.message);
            } finally {
                updateVideoButton.innerText = "儲存影片設定";
                updateVideoButton.disabled = false;
            }
        });
    }

    // ==========================================
    // 2. 照片紀錄新增區塊
    // ==========================================
    const albumCategorySelect = document.getElementById("albumCategorySelect");
    const albumTitleInput = document.getElementById("albumTitleInput");
    const albumFileNameInput = document.getElementById("albumFileNameInput");
    const uploadAlbumButton = document.getElementById("btnUploadAlbum");

    if (albumCategorySelect && albumTitleInput && albumFileNameInput && uploadAlbumButton) {
        uploadAlbumButton.addEventListener("click", async () => {
            const title = albumTitleInput.value.trim();
            const fileName = albumFileNameInput.value.trim();

            if (!title || !fileName) {
                alert("請輸入照片標題與完整檔案名稱！");
                return;
            }

            uploadAlbumButton.innerText = "儲存中...";
            uploadAlbumButton.disabled = true;
            try {
                await addDoc(collection(db, "my_albums"), {
                    title,
                    category: albumCategorySelect.value,
                    imageUrl: `../upload/${fileName}`,
                    createdAt: Date.now()
                });
                alert("照片紀錄成功儲存至相簿資料庫！");
                albumTitleInput.value = "";
                albumFileNameInput.value = "";
            } catch (error) {
                alert("儲存失敗: " + error.message);
            } finally {
                uploadAlbumButton.innerText = "新增照片至相簿";
                uploadAlbumButton.disabled = false;
            }
        });
    }

    // ==========================================
    // 3. 即時監聽與動態渲染相簿區塊
    // ==========================================
    const albumContainer = document.getElementById("albumContainer");
    if (!albumContainer) return;

    const albumQuery = query(collection(db, "my_albums"), orderBy("createdAt", "desc"));
    onSnapshot(albumQuery, (snapshot) => {
        albumContainer.innerHTML = "";

        if (snapshot.empty) {
            albumContainer.innerHTML = '<div style="text-align:center;color:#9e847a;padding:20px;">目前相簿內沒有照片</div>';
            return;
        }

        snapshot.forEach((snapshotDoc) => {
            const data = snapshotDoc.data();
            const itemHtml = `
                <div class="album-item" id="item-${snapshotDoc.id}">
                    <div class="album-item-info">
                        <img src="${data.imageUrl}" class="album-item-thumb" alt="縮圖" onerror="this.src='https://placehold.co'">
                        <div>
                            <div style="font-weight: 500; font-size: 14px;">${data.title}</div>
                            <div style="font-size: 12px; color: #9e847a;">路徑：${data.imageUrl}</div>
                        </div>
                    </div>
                    <button class="btn-delete" data-id="${snapshotDoc.id}">刪除</button>
                </div>
            `;
            albumContainer.insertAdjacentHTML("beforeend", itemHtml);
        });

        albumContainer.querySelectorAll(".btn-delete").forEach((button) => {
            button.addEventListener("click", async (event) => {
                const id = event.currentTarget.getAttribute("data-id");
                if (!confirm("確定要將這張照片從資料庫中永久刪除嗎？（註：本機 upload/ 內的實體檔案需手動刪除）")) return;

                try {
                    await deleteDoc(doc(db, "my_albums", id));
                    alert("照片已成功從相簿刪除！");
                } catch (error) {
                    alert("刪除失敗: " + error.message);
                }
            });
        });
    });
}

// ==========================================
// 4. 管理者快捷入口：點擊左上角 Logo 直接跳轉後台
// ==========================================
window.triggerAdminLogin = function() {
    window.location.href = "../back/admin.html"; 
};