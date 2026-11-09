/**
 * ==========================================================================
 * 娜娜問路居 - LINE Pay 成功感謝頁獨立控制腳本核心 (linepay-success.js)
 * 負責功能：還原訂單快照、同步 LINE Pay 交易資料、避免重複寫入
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
    const transactionId = new URLSearchParams(window.location.search).get('transactionId');
    const lastOrderData = localStorage.getItem('last_completed_order');

    if (!lastOrderData) {
        console.info("ℹ️ 查無訂單快照，訂單已處理完成或暫存已過期。");
        return;
    }

    let order;
    try {
        order = JSON.parse(lastOrderData);
    } catch (error) {
        console.error("❌ 讀取 LINE Pay 暫存快照解析失敗:", error);
        return;
    }

    const customer = order.customer && typeof order.customer === 'object'
        ? order.customer
        : {};
    const getString = value => typeof value === 'string' ? value : '';
    const shippingMethod = getString(customer.shipping);
    const deliveryType = shippingMethod === 'delivery'
        ? '宅配'
        : shippingMethod === 'self-kh'
            ? '高雄自取'
            : shippingMethod === 'self-ntpc'
                ? '新北自取'
                : '';

    const displayOrderId = document.getElementById('display-order-id');
    const displayCustomerName = document.getElementById('display-customer-name');
    const displayTotalAmount = document.getElementById('display-total-amount');

    if (displayOrderId) {
        displayOrderId.innerText = getString(order.orderId) || 'MUNA--';
    }
    if (displayCustomerName) {
        displayCustomerName.innerText = getString(customer.name) || '學員';
    }
    if (displayTotalAmount) {
        const totalAmount = Number(order.totalAmount);
        displayTotalAmount.innerText = `NT$ ${Number.isFinite(totalAmount) ? totalAmount.toLocaleString() : '0'}`;
    }

    try {
        await addDoc(collection(db, 'orders'), {
            product_type: getString(order.productType),
            name: getString(customer.name),
            telephone: getString(customer.phone || customer.telephone || customer.tel),
            email: getString(customer.email),
            address: getString(customer.address),
            delivery_type: deliveryType,
            payment_method: 'linepay',
            linepay_transaction_id: transactionId || '',
            status: transactionId ? 'processing' : 'pending',
            created_at: new Date()
        });

        localStorage.removeItem('last_completed_order');
        localStorage.removeItem('checkout_cart_item');
        console.log(transactionId
            ? "🎉 [娜娜問路居] LINE Pay 付款訂單同步成功，暫存已清除。"
            : "🎉 [娜娜問路居] LINE Pay 待收款訂單同步成功，暫存已清除。");
    } catch (error) {
        console.error("❌ 同步 LINE Pay 訂單至 Firestore 失敗:", error);
    }
});