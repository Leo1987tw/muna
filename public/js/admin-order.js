import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { collection, deleteDoc, doc, getFirestore, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDOzzPZRJe0Qxvb5RH9pA1SbxSMWt-551s",
    authDomain: "munayu.firebaseapp.com",
    projectId: "munayu",
    storageBucket: "munayu.firebasestorage.app",
    messagingSenderId: "435609048625",
    appId: "1:435609048625:web:26e2b4fd7f9d4b2eef2710",
    measurementId: "G-ZEERMHK8WQ"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const tableBody = document.getElementById('orders-table-body');
const ordersCount = document.getElementById('orders-count');
const feedback = document.getElementById('orders-feedback');
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
let unsubscribeOrders = null;

const statusLabels = {
    pending: '待處理',
    pending_transfer: '待轉帳',
    pending_linepay: '待付款',
    processing: '處理中',
    shipped: '已出貨',
    completed: '已完成',
    cancelled: '已取消'
};
const editableStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

function setFeedback(message, isError = false) {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.toggle('is-error', isError);
    feedback.classList.toggle('is-visible', Boolean(message));
}

function showMessage(message, className = 'orders-placeholder') {
    if (!tableBody) return;
    const row = document.createElement('tr');
    row.className = className === 'orders-error' ? 'order-error-row' : 'order-placeholder-row';
    const cell = document.createElement('td');
    cell.colSpan = 9;
    cell.className = className;
    cell.textContent = message;
    row.append(cell);
    tableBody.replaceChildren(row);
}

function formatTime(value) {
    if (!value) return '未提供';
    const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '時間格式錯誤';
    return new Intl.DateTimeFormat('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(date);
}

function getOrderValues(snapshot) {
    const data = snapshot.data();
    const customer = data.customer && typeof data.customer === 'object' ? data.customer : {};
    return {
        docId: snapshot.id,
        id: data.orderId || data.local_order_id || snapshot.id,
        name: customer.name || data.name || '未提供',
        telephone: customer.phone || customer.telephone || customer.tel || data.telephone || data.phone || data.tel || '未提供',
        address: customer.address || data.address || '未提供',
        deliveryType: data.delivery_type || customer.shipping || customer.deliveryType || '未提供',
        paymentMethod: data.payment_method || data.paymentMethod || '未提供',
        status: data.status || 'pending',
        createdAt: data.created_at || data.createdAt
    };
}

function makeCell(value) {
    const cell = document.createElement('td');
    cell.textContent = String(value);
    return cell;
}

function formatStatus(status) {
    return statusLabels[status] || status;
}

function formatPaymentMethod(method) {
    const labels = {
        Transfer: '銀行轉帳',
        LINEPay: 'LINE Pay',
        linepay: 'LINE Pay',
        transfer: '銀行轉帳'
    };
    return labels[method] || method;
}

function formatDeliveryType(type) {
    const labels = {
        delivery: '宅配',
        'self-kh': '高雄自取',
        'self-ntpc': '新北自取',
        '高雄自取': '高雄自取',
        '新北自取': '新北自取'
    };
    return labels[type] || type;
}

function createStatusControl(order) {
    const wrapper = document.createElement('div');
    wrapper.className = 'order-status-control';

    const badge = document.createElement('span');
    const statusTone = ['completed', 'shipped'].includes(order.status)
        ? 'status-completed'
        : order.status === 'cancelled'
            ? 'status-cancelled'
            : order.status === 'processing'
                ? 'status-processing'
                : 'status-pending';
    badge.className = `order-status-badge ${statusTone}`;
    badge.textContent = formatStatus(order.status);

    const select = document.createElement('select');
    select.className = 'order-status-select';
    select.setAttribute('aria-label', `變更訂單 ${order.id} 狀態`);

    const statuses = [...editableStatuses];
    if (order.status && !statuses.includes(order.status)) {
        statuses.unshift(order.status);
    }
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = formatStatus(status);
        option.selected = status === order.status;
        select.append(option);
    });

    select.addEventListener('change', async () => {
        const newStatus = select.value;
        select.disabled = true;
        setFeedback(`正在更新訂單 ${order.id} 狀態...`);
        try {
            await updateDoc(doc(db, 'orders', order.docId), { status: newStatus });
            setFeedback(`訂單 ${order.id} 已更新為「${formatStatus(newStatus)}」。`);
        } catch (error) {
            console.error(`❌ 更新訂單 ${order.docId} 狀態失敗:`, error);
            setFeedback(`狀態更新失敗：${error.message || '請確認 Firestore 寫入權限。'}`, true);
            select.disabled = false;
        }
    });

    wrapper.append(badge, select);
    return wrapper;
}

function createDeleteButton(order) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'order-delete-button';
    button.textContent = '刪除';
    button.setAttribute('aria-label', `刪除訂單 ${order.id}`);
    button.addEventListener('click', async () => {
        if (!window.confirm(`確定永久刪除訂單「${order.id}」？此操作無法復原。`)) return;

        button.disabled = true;
        setFeedback(`正在刪除訂單 ${order.id}...`);
        try {
            await deleteDoc(doc(db, 'orders', order.docId));
            setFeedback(`訂單 ${order.id} 已刪除。`);
        } catch (error) {
            console.error(`❌ 刪除訂單 ${order.docId} 失敗:`, error);
            setFeedback(`刪除失敗：${error.message || '請確認 Firestore 寫入權限。'}`, true);
            button.disabled = false;
        }
    });
    return button;
}

function renderOrders(snapshot) {
    if (!tableBody) return;
    if (ordersCount) ordersCount.textContent = `共 ${snapshot.size} 筆訂單`;
    if (snapshot.empty) {
        showMessage('目前尚無訂單資料。');
        return;
    }

    const orders = snapshot.docs
        .map(docSnapshot => getOrderValues(docSnapshot))
        .sort((a, b) => {
            const dateA = a.createdAt && typeof a.createdAt.toDate === 'function'
                ? a.createdAt.toDate().getTime()
                : new Date(a.createdAt || 0).getTime();
            const dateB = b.createdAt && typeof b.createdAt.toDate === 'function'
                ? b.createdAt.toDate().getTime()
                : new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });

    const rows = orders.map(order => {
        const row = document.createElement('tr');
        row.className = 'order-row';
        const idCell = makeCell(order.id);
        idCell.className = 'order-id-cell';
        row.append(
            idCell,
            makeCell(order.name),
            makeCell(order.telephone),
            makeCell(order.address),
            makeCell(formatDeliveryType(order.deliveryType)),
            makeCell(formatPaymentMethod(order.paymentMethod))
        );
        [
            '訂單編號',
            '顧客姓名',
            '聯絡電話',
            '配送地址',
            '配送方式',
            '付款方式'
        ].forEach((label, index) => {
            row.children[index].dataset.label = label;
        });

        const statusCell = document.createElement('td');
        statusCell.dataset.label = '訂單狀態';
        statusCell.append(createStatusControl(order));
        const createdAtCell = makeCell(formatTime(order.createdAt));
        createdAtCell.dataset.label = '建立時間';
        row.append(statusCell, createdAtCell);
        const actionCell = document.createElement('td');
        actionCell.className = 'order-actions-cell';
        actionCell.dataset.label = '操作';
        actionCell.append(createDeleteButton(order));
        row.append(actionCell);
        return row;
    });

    tableBody.replaceChildren(...rows);
}

function startOrdersListener() {
    if (unsubscribeOrders) unsubscribeOrders();
    showMessage('正在載入訂單資料...');
    unsubscribeOrders = onSnapshot(collection(db, 'orders'), renderOrders, error => {
        console.error('❌ 讀取 Firestore 訂單失敗:', error);
        showMessage(`訂單載入失敗：${error.message || '請確認登入狀態與 Firestore 權限。'}`, 'orders-error');
    });
}

onAuthStateChanged(auth, user => {
    if (isLocalhost || user) {
        startOrdersListener();
    } else {
        if (unsubscribeOrders) {
            unsubscribeOrders();
            unsubscribeOrders = null;
        }
        showMessage('請先登入管理員帳號以檢視訂單。', 'orders-error');
    }
});
