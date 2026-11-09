import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

// 拼湊字串寫法（保證網址字字完整，絕對能成功向 Google 伺服器下載資料庫模組）
import { getFirestore, collection, getDocs, addDoc, doc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

let currentSelectedCourse = "";
let isCourseRegistrationMode = false;

const firebaseConfig = {
    apiKey: "AIzaSyDOzzPZRJe0Qxvb5RH9pA1SbxSMWt-551s",
    authDomain: "munayu.firebaseapp.com",
    projectId: "munayu",
    storageBucket: "munayu.firebasestorage.app",
    messagingSenderId: "435609048625",
    appId: "1:435609048625:web:26e2b4fd7f9d4b2eef2710",
    measurementId: "G-ZEERMHK8WQ"
};

const app = initializeApp(firebaseConfig, "bookingApp");
const db = getFirestore(app);

function isCourseBooking() {
    return isCourseRegistrationMode;
}

function updateBookingMode() {
    const isCourse = isCourseBooking();
    const consultationMessage = document.getElementById("booking-message");
    const messageGroup = consultationMessage?.closest(".form-group");
    const selectedSlot = document.getElementById("selected-slot-id")?.value || "";
    const submitButton = document.getElementById("submit-btn");
    const cardLabel = document.querySelector(".card-label");

    document.body.classList.toggle("booking-course", isCourse);
    if (!isCourse) return;

    if (cardLabel) cardLabel.textContent = "光的課程意願登記表";

    const slotsSection = document.querySelector(".time-slots-section");
    if (slotsSection) slotsSection.style.display = "none";
    document.getElementById("selected-slot-id")?.removeAttribute("required");

    if (consultationMessage) {
        const messageLabel = messageGroup?.querySelector(".form-label");
        if (messageLabel) messageLabel.textContent = "方便上課的有空時段";
        consultationMessage.placeholder = "請填寫您方便上課的時間，例如：\n1. 每週六下午 14:00 - 16:00\n2. 平日一到五的晚上 19:30 以後\n3. 只要是週末下午皆可";

        let availabilityHint = messageGroup?.querySelector(".availability-hint");
        if (!availabilityHint) {
            availabilityHint = document.createElement("p");
            availabilityHint.className = "availability-hint";
            availabilityHint.textContent = "提交後，Muna 將在開課前優先與您聯繫";
            consultationMessage.insertAdjacentElement("afterend", availabilityHint);
        }
    }

    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "送出意願登記";
    }

    const authStatusDiv = document.getElementById("auth-status");
    if (authStatusDiv) {
        authStatusDiv.textContent = "✨ 歡迎填寫光的課程學習意願，留下方便上課的時段，Muna 將於開課前優先與您聯繫。";
    }
}

// 初始化提示：免登入訪客模式
function initStatusMessage() {
    const authStatusDiv = document.getElementById("auth-status");
    if (!authStatusDiv) return;
    authStatusDiv.className = "status-box status-success";
    updateBookingMode();
}

// 撈取並動態渲染可預約時段
async function loadTimeSlots() {
    const slotsContainer = document.getElementById("slots-container");
    if (!slotsContainer) return;

    try {
        // 從資料庫撈取您建立的 time_slots 集合
        const querySnapshot = await getDocs(collection(db, "time_slots"));
        slotsContainer.innerHTML = "";

        if (querySnapshot.empty) {
            slotsContainer.innerHTML = `<p class="slots-loading-text">目前沒有開放任何可預約時段。</p>`;
            return;
        }

        querySnapshot.forEach((slotDoc) => {
            const slotId = slotDoc.id;
            const slotData = slotDoc.data();
            const date = slotData.date || "未定日期";
            const time = slotData.start_time || "未定時間";
            const maxCapacity = slotData.max_capacity || 1;
            const bookedCount = slotData.booked_count || 0;
            const remaining = maxCapacity - bookedCount;

            // 建立時段按鈕
            const slotCard = document.createElement("button");
            slotCard.type = "button"; // 防止觸發表單自帶的 submit 
            slotCard.setAttribute("data-slot-id", slotId);

            if (remaining <= 0) {
                slotCard.className = "time-slot-btn disabled";
                slotCard.disabled = true;
                slotCard.innerHTML = `
                    <div class="slot-date">${date}</div>
                    <div class="slot-time">${time} (滿)</div>
                `;
            } else {
                slotCard.className = "time-slot-btn";
                slotCard.innerHTML = `
                    <div class="slot-date">${date}</div>
                    <div class="slot-time">${time} (餘 ${remaining})</div>
                `;

                // 點擊事件：切換選取狀態，將時段 ID 寫入隱藏輸入框
                slotCard.addEventListener("click", () => {
                    document.querySelectorAll(".time-slot-btn").forEach(btn => btn.classList.remove("active"));
                    slotCard.classList.add("active");

                    const hiddenInput = document.getElementById("selected-slot-id");
                    if (hiddenInput) {
                        hiddenInput.value = slotId;
                    }

                    const submitBtn = document.getElementById("submit-btn");
                    if (submitBtn) {
                        updateBookingMode();
                    }
                });
            }
            slotsContainer.appendChild(slotCard);
        });
    } catch (error) {
        console.error("載入時段發生錯誤：", error);
        slotsContainer.innerHTML = `<p class="slots-loading-text" style="color:red;">資料載入失敗，請檢查網路或確認資料庫權限。</p>`;
    }
}

// 串接表單提交：正式執行 Transaction 安全預約並寫入聯絡資料
function setupFormSubmit() {
    const bookingForm = document.querySelector(".booking-form");
    if (!bookingForm) return;

    bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // 阻止網頁刷新跳轉

        // 精準抓取您的 HTML 欄位 ID
        const slotId = document.getElementById("selected-slot-id")?.value || "";
        const name = (document.getElementById("booking-name")?.value || "").trim();
        const email = (document.getElementById("booking-email")?.value || "").trim();
        const tel = (document.getElementById("booking-tel")?.value || "").trim();
        const isCourse = isCourseBooking();
        const message = (document.getElementById("booking-message")?.value || "").trim();

        if (!isCourse && !slotId) {
            alert("請先在上方選擇一個預約時段！");
            return;
        }

        if (!confirm(isCourse ? "確定要送出光的課程意願登記嗎？" : "確定要預約此時段並送出申請嗎？")) return;

        const submitBtn = document.getElementById("submit-btn");
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = isCourse ? "正在送出課程意願..." : "正在安全處理預約名額...";
        }

        const newBookingRef = doc(collection(db, "bookings")); // 自動生成隨機預約單 ID 到複數的 bookings 集合

        try {
            const bookingData = {
                user_id: "visitor",
                name: name,
                email: email,
                tel: tel,
                message: message,
                slot_id: slotId,
                availability: isCourse ? message : "",
                booking_type: isCourse ? "course" : "consultation",
                status: isCourse ? "pending" : "confirmed",
                created_at: serverTimestamp()
            };
            if (isCourse && currentSelectedCourse) {
                bookingData.course = currentSelectedCourse;
            }

            if (isCourse) {
                await addDoc(collection(db, "bookings"), bookingData);
            } else {
                const slotRef = doc(db, "time_slots", slotId);
                await runTransaction(db, async (transaction) => {
                const slotDoc = await transaction.get(slotRef);
                if (!slotDoc.exists()) throw "您選擇的時段已不存在！";

                const currentBooked = slotDoc.data().booked_count || 0;
                const maxCapacity = slotDoc.data().max_capacity || 1;

                if (currentBooked >= maxCapacity) throw "非常抱歉！該時段剛剛好被其他人搶先一步預約滿了。";

                // A. 更新 time_slots 集合：使該時段的預約人數 +1
                transaction.update(slotRef, { booked_count: currentBooked + 1 });

                // B. 寫入 bookings 集合：將訪客填寫的真實資料與選中時段做綁定
                    transaction.set(newBookingRef, bookingData);
                });
            }

            // 預約完成，重置表單與按鈕
            alert(isCourse
                ? `🎉 課程意願已送出！謝謝您，${name}。Muna 將在開課前優先與您聯繫 ✨`
                : `🎉 預約成功！謝謝您的申請，${name}。已經為您成功保留名額，請靜候 Muna 的聯絡郵件 ✨`);
            bookingForm.reset();

            updateBookingMode();

            // 重新載入最新時段名額
            if (!isCourseBooking()) await loadTimeSlots();

        } catch (error) {
            console.error(isCourse ? "課程意願送出失敗：" : "預約程序失敗：", error);
            alert((isCourse ? "❌ 課程意願送出失敗: " : "❌ 預約失敗: ") + error);
            updateBookingMode();
        }
    });
}

// 頁面加載完成後啟動
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") || "";
    const courseParam = params.get("course") || "";
    isCourseRegistrationMode = tabParam === "course" || tabParam.startsWith("course");
    currentSelectedCourse = isCourseRegistrationMode
        ? courseParam || (tabParam !== "course" ? tabParam : "")
        : "";

    initStatusMessage();
    updateBookingMode();
    if (!isCourseBooking()) loadTimeSlots();
    setupFormSubmit();
});