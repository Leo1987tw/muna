/* ==========================================================================
   🌸 預約管理專區（admin-booking.html）- Firebase Firestore 雙表動態連動
   ========================================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyDOzzPZRJe0Qxvb5RH9pA1SbxSMWt-551s",
    authDomain: "munayu.firebaseapp.com",
    projectId: "munayu",
    storageBucket: "munayu.firebasestorage.app",
    messagingSenderId: "435609048625",
    appId: "1:435609048625:web:26e2b4fd7f9d4b2eef2710",
    measurementId: "G-ZEERMHK8WQ"
};

// ⭐ 補齊引入：addDoc (用於新增), deleteDoc (用於刪除), updateDoc (用於一鍵切換狀態)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    query,
    orderBy,
    addDoc,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// 🛠️ 修正 1：對齊前端 booking.js 的執行個體命名，確保同瀏覽器本地測試時絕對暢通不衝突
const app = initializeApp(firebaseConfig, "adminBookingApp");
const db = getFirestore(app);

const bookingsCollectionRef = collection(db, "bookings");
const bookingListContainer = document.getElementById('bookingList');
const totalBookingCountSpan = document.getElementById('totalBookingCount');

function formatTaiwanTime(firebaseTimestamp) {
    if (!firebaseTimestamp) return "未提供填單時間";
    let date = typeof firebaseTimestamp.toDate === 'function' ? firebaseTimestamp.toDate() : new Date(firebaseTimestamp);
    if (isNaN(date.getTime())) return "時間格式錯誤";
    return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 3. 核心功能：從 Firebase 撈取所有客戶預約並渲染為精緻卡片
async function loadCustomerBookings() {
    try {
        const q = query(bookingsCollectionRef, orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);

        const totalCount = querySnapshot.size;
        totalBookingCountSpan.textContent = totalCount;
        bookingListContainer.innerHTML = '';

        if (totalCount === 0) {
            bookingListContainer.innerHTML = '<div class="booking-loading-text">目前尚無 any 諮詢預約單。</div>';
            return;
        }

        // 開始遍歷每一筆預約文件
        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const docId = docSnap.id; // ⭐ 抓取文件 ID

            const name = data.name || "未留姓名";
            const tel = data.tel || data.phone || "未留電話"; // 相容電話欄位名稱
            const email = data.email || "未留 Email";
            const message = data.message || "（該客戶未填寫諮詢留言內容）";
            const status = data.status || "pending";
            const slotId = data.slot_id || ""; // 抓取對接前端的 slot_id
            const createdAtFormatted = formatTaiwanTime(data.created_at || data.createdAt);

            // 🛠️ 修正 2【雙表連動】：動態去 time_slots 集合，幫管理員把該客人選中的「日期與時段時間」撈出來
            let appointmentTimeInfo = "未指定預約時段";
            if (slotId) {
                try {
                    const slotDocSnap = await getDoc(doc(db, "time_slots", slotId));
                    if (slotDocSnap.exists()) {
                        const slotData = slotDocSnap.data();
                        appointmentTimeInfo = `📅 ${slotData.date || ""} 的 ${slotData.start_time || ""}`;
                    } else {
                        appointmentTimeInfo = "⚠️ 該預約時段已被管理員手動移除";
                    }
                } catch (slotError) {
                    console.error(`讀取時段 ${slotId} 失敗:`, slotError);
                    appointmentTimeInfo = "時段資料讀取異常";
                }
            }

            // ⭐ 核心更動 1：將靜態 span 改為可點擊切換的 button 結構，並掛載 data- 狀態與 ID
            let statusText = "待處理";
            let statusClass = "pending";
            if (status === "confirmed" || status === "已確認") {
                statusText = "已確認";
                statusClass = "confirmed";
            }

            // 🌟 依照 about.html 高級美學規格，動態打造一塊一塊精緻的客戶資訊大卡片
            const cardHtml = `
                <div class="customer-booking-card" id="booking-${docId}">
                    <div class="card-header-row" style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="customer-name">✨ 預約人：${name}</span>
                        <div>
                            <!-- 🔥 狀態按鈕：一鍵切換狀態功能（待處理 ↔ 已確認） -->
                            <button class="status-toggle-btn ${statusClass}" data-id="${docId}" data-status="${status}" style="border: none; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; letter-spacing: 1px; cursor: pointer; font-family: inherit; transition: all 0.2s ease;">
                                ${statusText}
                            </button>
                            <button class="btn-delete" data-id="${docId}" style="margin-left: 10px; background: #a05e5e; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px;">刪除</button>
                        </div>
                    </div>
                    <div class="card-info-grid">
                        <div class="info-item"><b>聯絡電話:</b> ${tel}</div>
                        <div class="info-item"><b>電子信箱:</b> ${email}</div>
                        <div class="info-item" style="grid-column: span 2; color: #a05e5e; font-weight: bold; font-size: 15px;">
                            <b>📌 選定諮詢時段:</b> ${appointmentTimeInfo}
                        </div>
                        <div class="info-item" style="grid-column: span 2;"><b>填單時間:</b> ${createdAtFormatted}</div>
                    </div>
                    <div class="customer-message-box">
                        <b>💬 諮詢需求留言：</b><br>
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;

            bookingListContainer.innerHTML += cardHtml;
        }

        // 🎯 ⭐ 渲染完畢後，綁定剛產生的所有刪除按鈕與一鍵切換狀態按鈕點擊事件
        bindDeleteEvents();
        bindStatusToggleEvents();

        console.log(`🔥 成功從 Firebase 同步載入 ${totalCount} 筆最新預約名單！`);

    } catch (error) {
        console.error("❌ 載入預約名單失敗：", error);
        bookingListContainer.innerHTML = `
            <div class="booking-loading-text" style="color: #a05e5e;">
                載入失敗。請檢查您的 Firebase Firestore Rules 權限設定是否已開啟。
            </div>
        `;
    }
}

// 🎯 ⭐ 刪除事件
function bindDeleteEvents() {
    document.querySelectorAll(".btn-delete").forEach((button) => {
        button.addEventListener("click", async (event) => {
            const docId = event.currentTarget.getAttribute("data-id");
            if (!confirm("確定要將這筆諮詢預約單從資料庫中永久刪除嗎？（此動作無法復原）")) return;

            try {
                await deleteDoc(doc(db, "bookings", docId));
                alert("預約單已成功刪除！");
                loadCustomerBookings(); // 重新整理名單
            } catch (error) {
                alert("刪除失敗: " + error.message);
            }
        });
    });
}

// 🎯 ⭐ 核心功能：綁定狀態一鍵切換按鈕（點擊直接在 pending 與 confirmed 之間反轉）
function bindStatusToggleEvents() {
    document.querySelectorAll(".status-toggle-btn").forEach((button) => {
        button.addEventListener("click", async (event) => {
            const btn = event.currentTarget;
            const docId = btn.getAttribute("data-id");
            const currentStatus = btn.getAttribute("data-status");

            // 狀態反轉判定
            const newStatus = (currentStatus === "pending" || currentStatus === "待處理") ? "confirmed" : "pending";

            btn.disabled = true;
            btn.innerText = "同步中...";

            try {
                // 🚀 發送 updateDoc 指令更新線上的 status 欄位
                await updateDoc(doc(db, "bookings", docId), { status: newStatus });
                console.log(`☁️ 狀態變更成功：文件 ${docId} 已改為 ${newStatus}`);
                loadCustomerBookings(); // 重新載入列表以更新色彩外觀與文字
            } catch (error) {
                alert("狀態切換失敗，請確認安全規則權限設定：\n" + error.message);
                loadCustomerBookings();
            }
        });
    });
}

// 📅 ⭐ 補齊功能：從 time_slots 集合中讀取時段並生成卡片按鈕
async function renderSelectableTimeSlots() {
    const slotsContainer = document.getElementById("slots-container");
    const hiddenInput = document.getElementById("selected-slot-id");
    const submitBtn = document.getElementById("submit-btn");

    if (!slotsContainer || !hiddenInput) return;

    try {
        const querySnapshot = await getDocs(collection(db, "time_slots"));
        const allSlots = [];

        querySnapshot.forEach((docSnap) => {
            allSlots.push({ id: docSnap.id, ...docSnap.data() });
        });

        // 依照日期與時間排序（由早到晚）
        allSlots.sort((a, b) => {
            const dateCompare = String(a.date).localeCompare(String(b.date));
            if (dateCompare !== 0) return dateCompare;
            return String(a.start_time).localeCompare(String(b.start_time));
        });

        slotsContainer.innerHTML = ""; // 移除載入中文字

        if (allSlots.length === 0) {
            slotsContainer.innerHTML = '<p class="slots-loading-text">📅 目前行事曆無任何開放時段。</p>';
            return;
        }

        allSlots.forEach((slot) => {
            const dateStr = slot.date || "";
            const timeStr = slot.start_time || "";
            const maxCap = slot.capacity || slot.max_capacity || 2;
            const booked = slot.booked_count || 0;
            const remaining = maxCap - booked;
            const isFull = remaining <= 0;

            const slotBtn = document.createElement("button");
            slotBtn.type = "button";
            slotBtn.className = isFull ? "time-slot-btn disabled" : "time-slot-btn";

            slotBtn.innerHTML = `
                <div class="slot-date">${dateStr}</div>
                <div class="slot-time">${timeStr} <span style="font-size: 11px;">(餘 ${isFull ? '0' : remaining})</span></div>
            `;

            if (!isFull) {
                slotBtn.addEventListener("click", () => {
                    slotsContainer.querySelectorAll(".time-slot-btn").forEach(btn => {
                        btn.classList.remove("active");
                    });
                    slotBtn.classList.add("active");
                    hiddenInput.value = slot.id; // 精確記錄這張卡片的實體文件 ID
                    if (submitBtn) {
                        submitBtn.innerText = "確認手動新增此預約單";
                        submitBtn.disabled = false; // 解鎖送出按鈕
                    }
                });
            } else {
                slotBtn.disabled = true;
            }
            slotsContainer.appendChild(slotBtn);
        });
    } catch (error) {
        console.error("❌ 載入預約時段卡片失敗：", error);
        slotsContainer.innerHTML = '時段卡片加載失敗，請檢查網路連線。';
    }
}
// ➕ ⭐ 補齊功能：手動補單新增表單監聽與欄位資料對接上傳
const bookingForm = document.querySelector(".booking-form");
if (bookingForm) {
    bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const slotId = document.getElementById("selected-slot-id").value;
        const name = document.getElementById("booking-name").value.trim();
        const email = document.getElementById("booking-email").value.trim();
        const tel = document.getElementById("booking-tel").value.trim();
        const message = document.getElementById("booking-message").value.trim();
        const btnSubmit = document.getElementById("submit-btn");
        if (!slotId) {
            alert("請先在上方點選一個您欲綁定的預約時段卡片！");
            return;
        }
        if (btnSubmit) {
            btnSubmit.innerText = "寫入中...";
            btnSubmit.disabled = true;
        }
        try {
            // 🚀 正式寫入全新資料到雲端 bookings 集合中
            await addDoc(collection(db, "bookings"), {
                name: name,
                tel: tel,
                email: email,
                slot_id: slotId,       // ⭐ 對接雙表關聯的時段 ID
                message: message,
                status: "pending",     // 預設填單為待處理
                created_at: Date.now()
            });
            alert("🎉 諮詢預約單已成功建立並同步至雲端資料庫！");
            bookingForm.reset();
            if (btnSubmit) {
                btnSubmit.innerText = "請先選擇上方時段";
            }
            renderSelectableTimeSlots(); // 刷新時段列表
            loadCustomerBookings();      // 即時重新整理名單
        } catch (error) {
            alert("❌ 新增失敗，請確認資料庫權限 Rules：" + error.message);
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false;
            }
        }
    });
}
// 執行初次加載
loadCustomerBookings();
renderSelectableTimeSlots();