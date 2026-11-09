/* ==========================================================================
   📅 行事曆專區（calendar.html）專屬核心控制邏輯（乾淨正常版）
   ========================================================================== */

// 1. 取得網頁上的 DOM 節點
const monthTitle = document.getElementById('calendarMonthTitle');
const calendarGrid = document.getElementById('calendarGrid');
const prevBtn = document.getElementById('prevMonthBtn');
const nextBtn = document.getElementById('nextMonthBtn');

// 2. 初始化日期：自動獲取使用者「今天」的真實電腦時間點
let currentDate = new Date(); 

// 🌟 正常版設定：將客滿無法預約的日期庫保持清空。所有日期皆為正常黑色、可自由點擊。
// (未來若要與後端或預約系統連動，再將不可預約的日期字串如 "2026-10-25" 灌入此陣列即可)
const fullDates = [];

// 3. 核心功能：動態計算並渲染日曆網格
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 更新網頁頂部的月份抬頭（例如：2026 年 10 月）
    monthTitle.textContent = `${year} 年 ${month + 1} 月`;

    // 清空舊的日期格子，但「保留」原有的 7 個星期標籤（日一二三四五六）
    const labels = document.querySelectorAll('.weekday-label');
    calendarGrid.innerHTML = '';
    labels.forEach(label => calendarGrid.appendChild(label));

    // 計算當月第一天是星期幾 (0代表星期日 ~ 6代表星期六)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // 計算當月總共有幾天
    const totalDays = new Date(year, month + 1, 0).getDate();

    // A. 生成月初之前的空白格 (.empty)
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyDiv);
    }

    // B. 依序生成當月的所有日期數字格子
    for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day;

        // 將目前迴圈的日期格式化為標準字串 (格式：YYYY-MM-DD)，用來比對是否客滿
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 檢查該日期是否在客滿庫中
        if (fullDates.includes(dateString)) {
            // 若未來有放入客滿日期，會自動套用刪除線樣式並鎖定點擊
            dayDiv.classList.add('full');
        } else {
            // 正常狀態：綁定滑鼠點擊「單選選取」事件
            dayDiv.addEventListener('click', function () {
                // 先清除畫面上所有其他日期的選取狀態
                document.querySelectorAll('.calendar-day.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                // 為當前點擊的日期加上藍紫漸層色圓圈 (.selected)
                this.classList.add('selected');
                
                // 在動態主控台輸出選取結果，方便後續擴充預約功能
                console.log(`已成功選取預約日期：${dateString}`);
            });
        }

        // 將做好的日期格子塞入日曆網格中
        calendarGrid.appendChild(dayDiv);
    }
}

// 4. 綁定按鈕點擊事件：切換上個月 / 下個月
prevBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(); // 重新計算並渲染
});

nextBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(); // 重新計算並渲染
});

// 5. 網頁首次載入時自動執行一次
renderCalendar();