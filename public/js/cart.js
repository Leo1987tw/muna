/**
 * ==========================================================================
 * 娜娜問路居 - 購物車結帳頁面獨立控制腳本核心 (cart.js)
 * 整合功能：Firebase Firestore 訂單直寫、多據點自取地址動態隱含/展開、付款卡片同步改字
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', function () {
    const listWrapper = document.getElementById('cart-list-wrapper');
    const subtotalDisplay = document.getElementById('summary-subtotal-display');
    const shippingDisplay = document.getElementById('summary-shipping-fee-display');
    const totalDisplay = document.getElementById('cart-total-display');
    const paymentBtn = document.getElementById('submit-to-payment-btn');
    const formFieldsContainer = document.getElementById('form-fields-container');
    const mainForm = document.getElementById('checkout-main-form');

    // 精準拆分對接：高雄自取、新北自取、宅配寄送三個配送實體 Radio 控制項
    const shipSelfKhRadio = document.getElementById('ship-self-kh-radio');
    const shipSelfNtpcRadio = document.getElementById('ship-self-ntpc-radio');
    const shipDeliveryRadio = document.getElementById('ship-delivery-radio');

    // 配送方式對應的動態據點文字與地址輸入框容器
    const noteKh = document.getElementById('note-ship-self-kh');
    const noteNtpc = document.getElementById('note-ship-self-ntpc');
    const addressGroup = document.getElementById('address-input-group');
    const addressInput = document.getElementById('receiver-address');

    // 付款分流動態改字控制項 (對應您的「銀行轉帳」與「LINE Pay」Radio ID)
    const payTransferRadio = document.getElementById('pay-transfer-radio');
    const payLinepayRadio = document.getElementById('pay-linepay-radio');

    // 1. 讀取前台商品詳情頁存入的 LocalStorage 暫存商品快照數據
    const savedData = localStorage.getItem('checkout_cart_item');

    // 檢查購物車內是否有商品，若空則顯示空白提示並隱藏表單欄位
    if (!savedData) {
        if (listWrapper) {
            listWrapper.innerHTML = '<div class="empty-cart-message">您的購物清單目前是空的。</div>';
        }
        if (formFieldsContainer) formFieldsContainer.style.display = 'none';
        const summaryBlock = document.querySelector('.cart-summary-block');
        if (summaryBlock) summaryBlock.style.display = 'none';
        if (paymentBtn) paymentBtn.style.display = 'none';
        return;
    }

    const item = JSON.parse(savedData);
    const subtotal = item.price * item.quantity;

    // 2. 動態渲染唯讀明細清單與基本金額初始化
    if (listWrapper) {
        listWrapper.innerHTML = `
            <div class="cart-item-row">
                <div class="item-main-info">
                    <span class="item-title-text">${escapeHtmlStr(item.name)}</span>
                    <span class="item-spec-text">
                        ${item.productType ? `種類：${escapeHtmlStr(item.productType)} │ ` : ""}
                        方案：${escapeHtmlStr(item.discountName || '一般訂購')} │ 
                        結帳單價：NT$ ${item.price.toLocaleString()} │ 
                        數量：${item.quantity}
                    </span>
                </div>
                <div class="item-price-amount">NT$ ${subtotal.toLocaleString()}</div>
            </div>
        `;
    }

    if (subtotalDisplay) subtotalDisplay.innerText = `NT$ ${subtotal.toLocaleString()}`;
    if (totalDisplay) totalDisplay.innerText = `NT$ ${subtotal.toLocaleString()}`;

    // 🎯 核心連動：底部的確認大按鈕文字跟隨付款狀態動態改字
    function toggleButtonText() {
        if (!paymentBtn) return;

        // 維持鎖頭的 SVG 圖標
        const lockIconHtml = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
        `;

        if (payTransferRadio && payTransferRadio.checked) {
            paymentBtn.innerHTML = `${lockIconHtml} 確認無誤，提交訂單`;
        } else if (payLinepayRadio && payLinepayRadio.checked) {
            paymentBtn.innerHTML = `${lockIconHtml} 確認無誤，提交訂單`;
        }
    }

    // 3. 高級客製化單選卡片（配送與付款）點擊互斥高亮與即時變更聯動機制
    const allRadioCards = document.querySelectorAll('.custom-option-card');
    allRadioCards.forEach(card => {
        const radioInput = card.querySelector('input[type="radio"]');
        if (!radioInput) return;

        card.addEventListener('click', function (e) {
            // 防止點擊大外框與點擊內部 Radio 發生重複事件衝突
            if (e.target !== radioInput) {
                radioInput.checked = true;
                // 強制發出變更通知，確保下方的物流自取地址、運費和按鈕文字能立刻更新連動
                radioInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // 清除同一個群組內其他卡片的 active-selected 高亮狀態
            const groupName = radioInput.getAttribute('name');
            document.querySelectorAll(`input[name="${groupName}"]`).forEach(siblingRadio => {
                const siblingCard = siblingRadio.closest('.custom-option-card');
                if (siblingCard) siblingCard.classList.remove('active-selected');
            });

            // 為目前點選的卡片套用植物綠高亮
            card.classList.add('active-selected');

            // 只要切換付款卡片，立刻重新判定並更改大按鈕字樣
            if (groupName === 'payment-method') {
                toggleButtonText();
            }
        });
    });

    // 4. 🛠️ 物流配送方式變更聯動（三大方案切換、地址與據點文字動態開關）
    function handleShippingChange() {
        // A. 如果勾選【高雄自取】
        if (shipSelfKhRadio && shipSelfKhRadio.checked) {
            if (noteKh) noteKh.style.display = 'block';     // 展開高雄據點地址
            if (noteNtpc) noteNtpc.style.display = 'none'; // 隱藏新北據點地址
            if (addressGroup) addressGroup.style.display = 'none'; // 隱藏宅配收件地址框
            if (addressInput) {
                addressInput.required = false;
                addressInput.value = ''; // 自取時自動清空地址欄位
            }
            if (shippingDisplay) shippingDisplay.innerText = 'NT$ 0';
            if (totalDisplay) totalDisplay.innerText = `NT$ ${subtotal.toLocaleString()}`;
        }
        // B. 如果勾選【新北自取】
        else if (shipSelfNtpcRadio && shipSelfNtpcRadio.checked) {
            if (noteKh) noteKh.style.display = 'none';     // 隱藏高雄據點地址
            if (noteNtpc) noteNtpc.style.display = 'block'; // 展開新北據點地址
            if (addressGroup) addressGroup.style.display = 'none'; // 隱藏宅配收件地址框
            if (addressInput) {
                addressInput.required = false;
                addressInput.value = '';
            }
            if (shippingDisplay) shippingDisplay.innerText = 'NT$ 0';
            if (totalDisplay) totalDisplay.innerText = `NT$ ${subtotal.toLocaleString()}`;
        }
        // C. 如果勾選【宅配寄送】
        else if (shipDeliveryRadio && shipDeliveryRadio.checked) {
            if (noteKh) noteKh.style.display = 'none';     // 隱藏高雄據點地址
            if (noteNtpc) noteNtpc.style.display = 'none'; // 隱藏新北據點地址
            if (addressGroup) addressGroup.style.display = 'flex'; // 動態滑出收件地址輸入框
            if (addressInput) addressInput.required = true; // 轉為強校驗必填
            if (shippingDisplay) shippingDisplay.innerText = 'NT$ 60'; // 加上宅配運費
            if (totalDisplay) totalDisplay.innerText = `NT$ ${(subtotal + 60).toLocaleString()}`;
        }
    }

    // 將聯動功能註冊到三個配送單選鈕的 change 事件中
    shipSelfKhRadio?.addEventListener('change', handleShippingChange);
    shipSelfNtpcRadio?.addEventListener('change', handleShippingChange);
    shipDeliveryRadio?.addEventListener('change', handleShippingChange);

    // 註冊變更事件監聽給付款單選鈕群組
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.addEventListener('change', toggleButtonText);
    });

    // 頁面初始化時，先執行一次確保預設選取的文字與顯示完全正確
    handleShippingChange();
    toggleButtonText();

    // 5. 監聽整個結帳表單提交 (純前端與 Firestore 安全接通，並依切換分流跳轉)
    mainForm?.addEventListener('submit', async function (e) {
        e.preventDefault(); // 攔截瀏覽器預設轉址

        const nameValue = document.getElementById('receiver-name').value.trim();
        const phoneValue = document.getElementById('receiver-phone').value.trim();
        const emailValue = document.getElementById('receiver-email').value.trim();
        const shippingMethod = document.querySelector('input[name="shipping-method"]:checked').value;
        const addressValue = addressInput ? addressInput.value.trim() : '';

        // 重新依配送方式計算最終總額
        const finalTotal = shippingMethod === 'delivery' ? (subtotal + 60) : subtotal;

        // 擷取最新被勾選的付款管道標記
        const selectedPaymentRadio = document.querySelector('input[name="payment-method"]:checked');
        const paymentMethodValue = selectedPaymentRadio ? selectedPaymentRadio.value : 'Transfer';

        // 鎖定提交大按鈕，100% 杜絕多併發重複提交
        if (paymentBtn) {
            paymentBtn.innerHTML = '🔄 正在建立安全連線，請勿關閉...';
            paymentBtn.disabled = true;
        }

        const generatedOrderId = 'MUNA' + Date.now(); // 產生不重複系統編號

        // 計算對應填寫的配送詳細地址字串
        let finalAddressString = '自取據點';
        if (shippingMethod === 'self-kh') {
            finalAddressString = '自取：高雄市新興區自立一路66號';
        } else if (shippingMethod === 'self-ntpc') {
            finalAddressString = '自取：新北市板橋區重慶路21巷4號4樓';
        } else if (shippingMethod === 'delivery') {
            finalAddressString = addressValue;
        }

        // 建立符合雲端資料庫規格的訂單結構
        const orderPayload = {
            orderId: generatedOrderId,
            productName: item.name,
            productType: item.productType || '',
            discountName: item.discountName || '一般訂購',
            unitPrice: item.price,
            quantity: item.quantity,
            totalAmount: finalTotal,
            customer: {
                name: nameValue,
                phone: phoneValue,
                email: emailValue,
                shipping: shippingMethod,
                address: finalAddressString
            },
            paymentMethod: paymentMethodValue,
            status: paymentMethodValue === 'Transfer' ? 'pending_transfer' : 'pending_linepay',
            created_at: new Date()
        };
        console.log("📦 [娜娜問路居] 準備拋出之金流封包驗證紀錄:", orderPayload);
        try {
            // 暫存此張成功建立的訂單，供下一頁感謝頁呈現資訊
            localStorage.setItem('last_completed_order', JSON.stringify(orderPayload));
            // 成功下單後，清除原本商品詳情頁留下來的購物車暫存
            localStorage.removeItem('checkout_cart_item');
            // 【關鍵分流跳轉】：根據買家切換選取的付款方式，精準導向不同的感謝網頁
            if (paymentMethodValue === 'Transfer') {
                window.location.href = './transfer-success.html'; // 導向顯示銀行帳號的感謝頁
            } else {
                window.location.href = './linepay-success.html';  // 導向引導私訊人工收款的感謝頁
            }
        } catch (err) {
            console.error("❌ Firestore 訂單寫入異常:", err);
            alert("建立訂單失敗，請檢查網路狀態或稍後再試。");
            if (paymentBtn) {
                paymentBtn.disabled = false;
                toggleButtonText(); // 發生錯誤時恢復按鈕原本的動態字樣
            }
        }
    });
    // 網頁防禦 HTML 標籤 XSS 注入安全鎖
    function escapeHtmlStr(value) {
        return String(value).replace(/[&<>"']/g, c => ({
            "&": "&amp;", 
            "<": "&lt;", 
            ">": "&gt;", 
            '"': "&quot;", 
            "'": "&#39;"
        })[c]);
    }
});