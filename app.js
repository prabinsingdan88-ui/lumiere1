import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBFYubxSUHpP6g5Vvwt65gsWXDr5Ux535o",
    authDomain: "lumiere-erp.firebaseapp.com",
    projectId: "lumiere-erp",
    databaseURL: "https://lumiere-erp-default-rtdb.firebaseio.com",
    storageBucket: "lumiere-erp.firebasestorage.app",
    appId: "1:78622005633:web:c231e3862e13787686b080"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.MENU = [
    { id: 1, name: "Chicken Momo", price: 150 },
    { id: 2, name: "Veg Momo", price: 120 },
    { id: 3, name: "Buff Choila", price: 200 },
    { id: 4, name: "Cold Beer", price: 550 },
    { id: 5, name: "Coke", price: 60 },
    { id: 6, name: "Iced Tea", price: 80 }
];

let state = { tables: [], activeId: null };

onValue(ref(db, 'lumiere_final/tables'), (snap) => {
    const data = snap.val();
    state.tables = data || Array.from({length: 50}, (_, i) => ({ 
        id: i+1, status: 'empty', orders: [], isVIP: false 
    }));
    renderAll();
});

function renderAll() {
    renderTables();
    renderKitchen();
    renderAdmin();
    if(state.activeId) renderCart();
}

function renderTables() {
    const grid = document.getElementById('table-grid');
    grid.innerHTML = state.tables.map(t => `
        <div class="table-card ${t.status} ${t.isVIP ? 'vip' : ''}" onclick="window.openDrawer(${t.id})">
            <strong>${t.id}</strong>
            ${t.isVIP ? '<div class="vip-tag">★ VIP</div>' : ''}
        </div>
    `).join('');
}

window.openDrawer = (id) => {
    state.activeId = id;
    document.getElementById('table-title').innerText = "Table " + id;
    document.getElementById('drawer').classList.add('active');
    renderMenu();
    renderCart();
};

function renderMenu() {
    document.getElementById('menu-grid').innerHTML = window.MENU.map(m => `
        <button onclick="window.addItem(${m.id})">${m.name}<br>Rs.${m.price}</button>
    `).join('');
}

window.addItem = (mid) => {
    const item = window.MENU.find(m => m.id === mid);
    const table = state.tables[state.activeId - 1];
    if (!table.orders) table.orders = [];
    table.orders.push({ ...item, ts: Date.now() });
    table.status = 'ordering';
    save();
};

window.fireOrder = () => {
    const table = state.tables[state.activeId - 1];
    if (!table.orders || table.orders.length === 0) return alert("Empty order!");
    table.status = 'cooking';
    save();
    window.closeDrawer();
};

window.toggleVIP = () => {
    state.tables[state.activeId - 1].isVIP = !state.tables[state.activeId - 1].isVIP;
    save();
};

function renderKitchen() {
    const list = document.getElementById('kitchen-list');
    const cooking = state.tables.filter(t => t.status === 'cooking');
    list.innerHTML = cooking.map(t => `
        <div class="kds-card">
            <h3>Table ${t.id}</h3>
            <ul>${t.orders.map(o => `<li>${o.name}</li>`).join('')}</ul>
            <button onclick="window.markServed(${t.id})">READY TO SERVE</button>
        </div>
    `).join('');
}

window.markServed = (id) => {
    state.tables[id - 1].status = 'served';
    save();
};

function renderAdmin() {
    const list = document.getElementById('settle-list');
    const active = state.tables.filter(t => t.orders && t.orders.length > 0);
    list.innerHTML = active.map(t => {
        const total = t.orders.reduce((sum, o) => sum + o.price, 0);
        return `
            <div class="admin-row">
                <span>Table ${t.id} - <b>Rs. ${total}</b></span>
                <button onclick="window.settleBill(${t.id})">SETTLE BILL</button>
            </div>`;
    }).join('');
}

window.settleBill = (id) => {
    if(confirm(`Table ${id} has paid?`)) {
        state.tables[id - 1] = { id, status: 'empty', orders: [], isVIP: false };
        save();
    }
};

const save = () => set(ref(db, 'lumiere_final/tables'), state.tables);
window.closeDrawer = () => { document.getElementById('drawer').classList.remove('active'); state.activeId = null; };
function renderCart() {
    const table = state.tables[state.activeId - 1];
    document.getElementById('cart-items').innerHTML = table.orders?.map(o => `<div>• ${o.name}</div>`).join('') || "Empty";
}