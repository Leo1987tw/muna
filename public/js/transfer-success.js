/**
 * ==========================================================================
 * 娜娜問路居 - 銀行轉帳成功感謝頁獨立控制腳本核心 (transfer-success.js)
 * 負責功能：快照數據還原渲染、寫入 Firebase 訂單、二重銷毀防重新整理洗單機制
 * ==========================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

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

document.addEventListener('DOMContentLoaded', async function () {
    // 1. 從 LocalStorage 讀取上一頁 cart.js 下單成功時存下來的最終訂單資訊
    const lastOrderData = localStorage.getItem('last_completed_order');

    // 2. 如果存在訂單快照，開始進行前台文字動態渲染
    if (lastOrderData) {
        try {
            const order = JSON.parse(lastOrderData);
            
            // 擷取畫面上對應的 HTML 欄位節點
            const displayOrderId = document.getElementById('display-order-id');
            const displayCustomerName = document.getElementById('display-customer-name');
            const displayTotalAmount = document.getElementById('display-total-amount');

            // 安全地將資料包內部的數值填入畫面
            if (displayOrderId) {
                displayOrderId.innerText = order.orderId || 'MUNA--';
            }
            if (displayCustomerName) {
                displayCustomerName.innerText = (order.customer && order.customer.name) ? order.customer.name : '學員';
            }
            if (displayTotalAmount) {
                displayTotalAmount.innerText = `NT$ ${(order.totalAmount || 0).toLocaleString()}`;
            }

            // ==========================================================================
            // 🔥【新增功能：正式寫入 Firebase Firestore orders 集合】
            // ==========================================================================
            try {
                const customerInfo = order.customer && typeof order.customer === 'object'
                    ? order.customer
                    : {};
                const getString = value => typeof value === 'string' ? value : '';
                const shippingMethod = getString(customerInfo.shipping);
                const deliveryType = shippingMethod === 'delivery'
                    ? '宅配'
                    : shippingMethod === 'self-kh'
                        ? '高雄自取'
                        : shippingMethod === 'self-ntpc'
                            ? '新北自取'
                            : '';

                await addDoc(collection(db, 'orders'), {
                    product_type: getString(order.productType),
                    name: getString(customerInfo.name),
                    telephone: getString(customerInfo.phone || customerInfo.telephone || customerInfo.tel),
                    email: getString(customerInfo.email),
                    address: getString(customerInfo.address),
                    delivery_type: deliveryType,
                    status: 'pending',
                    created_at: new Date()
                });

                console.log("💾 [娜娜問路居] 訂單資料已成功同步儲存至 Firebase Firestore。");
            } catch (firebaseError) {
                // 如果 Firebase 寫入失敗，至少先記錄下來，不阻斷下方銷毀暫存的防洗單流程
                console.error("❌ 同步至 Firebase 發生錯誤:", firebaseError);
            }
            // ==========================================================================
            
            // 3. 🔥【二重銷毀安全鎖】：呈現完資訊且寫入 Firebase 後，立刻將此暫存抹除
            // 這樣可以 100% 防止使用者在按重新整理 (F5) 時，造成頁面邏輯錯亂或重複對資料庫洗單
            localStorage.removeItem('last_completed_order');

            // 4. 加強防禦：確保前台舊有的購物車暫存緩存也被徹底抹除乾淨
            localStorage.removeItem('checkout_cart_item');

            console.log("🎉 [娜娜問路居] 訂單畫面資訊渲染成功，安全鎖已同步啟動銷毀暫存。");

        } catch (error) {
            console.error("❌ 擷取訂單暫存快照解析失敗:", error);
        }
    } else {
        // 如果使用者是直接手打網址進來，或是已經重新整理過網頁，則給予溫和的預設防呆提示
        console.log("ℹ️ 訂單資訊已安全銷毀或查無今日暫存快照。");
    }
});