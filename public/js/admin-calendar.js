/* ==========================================================================
   📅 空閒日期設置（admin-calendar.html）- 自動識別忙碌客滿極簡控制腳本
   ========================================================================== */

// 1. 填入您的 Firebase 專案金鑰配置
const firebaseConfig = {
    apiKey: "AIzaSyDOzzPZRJe0Qxvb5RH9pA1SbxSMWt-551s",
    authDomain: "munayu.firebaseapp.com",
    projectId: "munayu",
    storageBucket: "munayu.firebasestorage.app",
    messagingSenderId: "435609048625",
    appId: "1:435609048625:web:26e2b4fd7f9d4b2eef2710",
    measurementId: "G-ZEERMHK8WQ"
};

// 2. 引入並初始化 Firebase (使用官方 12.19.0 健全模組)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    updateDoc, 
    collection, 
    getDocs,
    addDoc,
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig, "adminCalendarToastApp");
const db = getFirestore(app);
const timeSlotsCollectionRef = collection(db, "time_slots");

// 3. 取得網頁上的 DOM 節點
const monthTitle = document.getElementById('calendarMonthTitle');
const calendarGrid = document.getElementById('calendarGrid');
const prevBtn = document.getElementById('prevMonthBtn');
const nextBtn = document.getElementById('nextMonthBtn');

// 取得下展 Toast 面板與內容節點
const toastPanel = document.getElementById('toastPanel');
const toastActiveContent = document.getElementById('toastActiveContent');
const toastDateTitle = document.getElementById('toastDateTitle');
const toastSlotsList = document.getElementById('toastSlotsList');
const toastAddSlotForm = document.getElementById('toastAddSlotForm');

// 4. 全域初始化日期（以您截圖中的 2026 年 10 月為基準）
let currentDate = new Date(2026, 9, 1); // 註：9 代表 10 月
let activeTargetDateStr = ""; // 當前管理員點選的日期字串 (YYYY-MM-DD)

// 🌟 核心升級功能：【非同步預載】動態拉取整月數據並建構帶有狀態提示的日曆網格
async function renderAdminCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    monthTitle.textContent = `${year} 年 ${month + 1} 月`;

    // 清空舊的日期網格，保留 7 個星期標籤
    const labels = document.querySelectorAll('.weekday-label');
    calendarGrid.innerHTML = '';
    labels.forEach(label => calendarGrid.appendChild(label));

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // A. 生成月初之前的空網格 (.empty)
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDiv);
    }

    // 🚀 核心優化：渲染格子前，先一口氣向 Firebase 撈取全資料庫的 time_slots（不再等點擊才抓）
    let allSlotsSnapshot = null;
    try {
        allSlotsSnapshot = await getDocs(timeSlotsCollectionRef);
    } catch (err) {
        console.error("❌ 預載月曆時段數據失敗：", err);
    }

    // B. 依序生成日期數字格子，並在生成時即時進行「忙碌/客滿」精準比對
    for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day;

        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 🎯 執行背景資料比對：計算該日期在資料庫內的所有時段統計
        if (allSlotsSnapshot) {
            let totalSlotsCount = 0;   // 當天總共開放了幾個時段
            let fullSlotsCount = 0;    // 當天有幾個時段已經客滿
            let totalBookedCount = 0;  // 當天總預約人數

            allSlotsSnapshot.forEach((docSnap) => {
                const slot = docSnap.data();
                if (slot.date === dateString) {
                    totalSlotsCount++;
                    const booked = slot.booked_count || 0;
                    const max = slot.capacity || slot.max_capacity || 2;
                    totalBookedCount += booked;
                    if (booked >= max) {
                        fullSlotsCount++;
                    }
                }
            });

            // 🎨 依據統計結果，動態為格子掛上對應的 CSS 狀態類別
            if (totalSlotsCount > 0) {
                if (fullSlotsCount === totalSlotsCount) {
                    // 🔴 狀況一：開放的時段全部約滿了 -> 判定為「完全客滿」
                    dayDiv.classList.add('is-full');
                    dayDiv.setAttribute('title', '今日所有時段皆已客滿');
                } else if (totalBookedCount > 0) {
                    // 🟡 狀況二：有人預約但還沒全滿 -> 判定為「比較忙碌」
                    dayDiv.classList.add('is-busy');
                    dayDiv.setAttribute('title', `今日已有 ${totalBookedCount} 人預約`);
                } else {
                    // 🟢 狀況三：有開時段但目前0人預約 -> 判定為「全新有空」
                    dayDiv.classList.add('is-available');
                    dayDiv.setAttribute('title', '今日尚有空閒時段');
                }
            }
        }

        // 監聽點擊日期格
        dayDiv.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected-day'));
            dayDiv.classList.add('selected-day');
            
            // 點擊當下開窗並拉取詳細數據
            openToastManagementPanel(dateString);
        });

        calendarGrid.appendChild(dayDiv);
    }
}

// 🛠️ 點擊才觸發連線：動態渲染下方當日「所有時段」與「新增時間表單」
async function openToastManagementPanel(dateString) {
    activeTargetDateStr = dateString;
    toastDateTitle.textContent = `📅 ${dateString} 開放時間設定`;
    
    // 讓原本隱藏的 Toast 面板在月曆正下方現形
    const placeholder = document.getElementById('toastDefaultPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    toastActiveContent.style.display = 'block';
    toastPanel.style.display = 'block';
    
    toastSlotsList.innerHTML = '<div style="font-size:13px; color:#9ca3af; text-align:center; padding:10px 0;">正在連網抓取時段名額...</div>';

    try {
        // 🎯 發起 getDocs 請求，向 Firebase 讀取最即時的 time_slots 集合
        const querySnapshot = await getDocs(timeSlotsCollectionRef);
        const daySlots = [];
        
        querySnapshot.forEach((docSnap) => {
            const slot = docSnap.data();
            if (slot.date === dateString) {
                daySlots.push({ id: docSnap.id, ...slot });
            }
        });
        
        // 依據時間由早到晚自動排序
        daySlots.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
        toastSlotsList.innerHTML = '';

        if (daySlots.length === 0) {
            toastSlotsList.innerHTML = `<div style="font-size:13px; color:#9ca3af; text-align:center; padding:15px 0;">（${dateString} 目前在資料庫中沒有設定任何開放時間）</div>`;
            return;
        }

        daySlots.forEach((slot) => {
            const slotId = slot.id;
            const startTime = slot.start_time || "未定時間";
            const booked = slot.booked_count || 0;
            const max = slot.capacity || slot.max_capacity || 2; 
            const isFull = booked >= max; 

            const slotItem = document.createElement('div');
            slotItem.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#faf9f6; padding:10px 14px; border-radius:10px; border:1px solid rgba(191, 163, 122, 0.15); font-size:13px; margin-bottom:8px;";
            
            slotItem.innerHTML = `
                <div>
                    <b style="color:#a05e5e; font-size:14px;">⏰ ${startTime}</b> 
                    <span style="margin-left:6px; color:#9ca3af; font-family:sans-serif;">(目前預約: ${booked}/${max}人)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn-toggle" style="padding:4px 12px; font-size:12px; font-weight:bold; border-radius:6px; background:${isFull ? '#fef7e0' : '#ffffff'}; border: 1px solid ${isFull ? '#b06000' : 'rgba(90,75,92,0.15)'}; color:${isFull ? '#b06000' : '#5a4b5c'}; cursor:pointer;">
                        ${isFull ? '設為有空' : '手動填滿'}
                    </button>
                    <button class="btn-delete" style="padding:4px 12px; font-size:12px; font-weight:bold; border-radius:6px; background:#a05e5e; border:none; color:#ffffff; cursor:pointer;">
                        刪除
                    </button>
                </div>
            `;

            // 1. 一鍵切換額滿狀態監聽
            const toggleBtn = slotItem.querySelector('.btn-toggle');
            toggleBtn.addEventListener('click', async () => {
                toggleBtn.disabled = true;
                toggleBtn.textContent = "同步中...";
                const slotDocRef = doc(db, "time_slots", slotId);
                const newBookedCount = isFull ? 0 : max;
                
                try {
                    await updateDoc(slotDocRef, { booked_count: newBookedCount });
                    // 同步完畢後，除了重新渲染右側面板，也要同步重新渲染左側月曆的最新顏色狀態
                    await renderAdminCalendar();
                    openToastManagementPanel(dateString); 
                } catch (err) {
                    console.error("❌ 更新資料庫人數失敗：", err);
                    openToastManagementPanel(dateString); 
                }
            });

            // 2. 一鍵刪除此預約時段監聽
            const deleteBtn = slotItem.querySelector('.btn-delete');
            deleteBtn.addEventListener('click', async () => {
                if (!confirm(`確定要永久刪除 ${dateString} 的 ${startTime} 開放時段嗎？`)) return;
                deleteBtn.disabled = true;
                deleteBtn.textContent = "刪除中...";
                
                try {
                    await deleteDoc(doc(db, "time_slots", slotId));
                    await renderAdminCalendar(); // 刪除時段後，同步更新月曆顏色狀態
                    openToastManagementPanel(dateString); 
                } catch (err) {
                    alert("刪除失敗：" + err.message);
                    openToastManagementPanel(dateString);
                }
            });

            toastSlotsList.appendChild(slotItem);
        });

    } catch (err) {
        console.error("❌ 讀取時段發生錯誤：", err);
        toastSlotsList.innerHTML = '<div style="text-align:center; color:red; padding:10px 0;">連線資料庫失敗，請確認權限規則。</div>';
    }
}

// 🛠️ 增加時間表單提交事件
if (toastAddSlotForm) {
toastAddSlotForm.addEventListener('submit', async (e) => {
e.preventDefault();
const timeInput = document.getElementById('toastNewTime').value.trim();
const capacityInput = parseInt(document.getElementById('toastNewCapacity').value) || 2;
const submitBtn = toastAddSlotForm.querySelector('button[type="submit"]');
if (!timeInput || !activeTargetDateStr) {
alert("請確實填寫欲開放的開始時間！");
return;
}
submitBtn.disabled = true;
submitBtn.innerText = "寫入中...";
try {
await addDoc(collection(db, "time_slots"), {
date: activeTargetDateStr,
start_time: timeInput,
capacity: capacityInput,
booked_count: 0,
created_at: Date.now()
});
document.getElementById('toastNewTime').value = ""; // 清空輸入框
await renderAdminCalendar(); // 新增成功，立即刷新左側月曆格子顏色！
openToastManagementPanel(activeTargetDateStr);
} catch (err) {
alert("❌ 開放時間儲存失敗：" + err.message);
} {
submitBtn.disabled = false;
submitBtn.innerText = "確認新增時間";
}
});
}
// 上下個月切換監聽
if (prevBtn && nextBtn) {
prevBtn.addEventListener('click', () => {
currentDate.setMonth(currentDate.getMonth() - 1);
renderAdminCalendar();
});
nextBtn.addEventListener('click', () => {
currentDate.setMonth(currentDate.getMonth() + 1);
renderAdminCalendar();
});
}
// 關閉窗格
const closeBtn = document.getElementById("closeToastBtn");
if (closeBtn) {
closeBtn.addEventListener("click", () => {
toastPanel.style.display = 'none';
document.querySelectorAll('.calendar-day').forEach(el => el.classList.remove('selected-day'));
});
}
// 預設執行初次日曆渲染
renderAdminCalendar();