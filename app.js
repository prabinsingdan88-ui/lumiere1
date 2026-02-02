import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBFYubxSUHpP6g5Vvwt65gsWXDr5Ux535o",
    authDomain: "lumiere-erp.firebaseapp.com",
    projectId: "lumiere-erp",
    databaseURL: "https://lumiere-erp-default-rtdb.firebaseio.com",
    appId: "1:78622005633:web:c231e3862e13787686b080"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let state = { tables: [] };
let activeId = null;

// Mock Inventory
const inventory = [
    { id: 1, name: "Mushroom Arancini", price: 450 },
    { id: 2, name: "Wagyu Burger", price: 1250 },
    { id: 3, name: "Truffle Fries", price: 350 },
    { id: 4, name: "Red Wine", price: 1200 }
];

onValue(ref(db, 'lumiere_v7'), (snap) => {
    const data = snap.val() || {};
    state.tables = data.tables || Array.from({length: 50}, (_, i) => ({ id: i+1, status: 'available', cart: [] }));
    render();
});

// Navigation
window.showMod = (mod, btn) => {
    document.querySelectorAll('.module').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(mod + '-mod').style.display = 'block';
    btn.classList.add('active');
};

// Table Management
window.openTable = (id) => {
    activeId = id;
    document.getElementById('active-table-title').innerText = `TABLE ${id}`;
    document.getElementById('drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('open');
    renderMenu();
    renderCart();
};

window.closeDrawer = () => {
    document.getElementById('drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
};

// Quantity +/- Logic
window.updateQty = (itemId, change) => {
    const table = state.tables[activeId - 1];
    const item = inventory.find(i => i.id === itemId);
    let entry = table.cart.find(c => c.id === itemId);

    if (entry) {
        entry.qty += change;
        if (entry.qty <= 0) table.cart = table.cart.filter(c => c.id !== itemId);
    } else if (change > 0) {
        table.cart.push({ ...item, qty: 1 });
    }
    
    table.status = table.cart.length > 0 ? 'ordering' : 'available';
    save();
    renderCart();
};

window.fireOrder = () => {
    const table = state.tables[activeId - 1];
    if (table.cart.length === 0) return alert("Cart is empty");

    table.status = 'cooking';
    table.orderMeta = {
        orderNo: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    save();
    closeDrawer();
};

// Rendering
function render() {
    // Floor
    document.getElementById('grid').innerHTML = state.tables.map(t => `
        <div class="table-card ${t.status}" onclick="openTable(${t.id})">
            <strong>${t.id}</strong>
        </div>`).join('');

    // KDS
    const cooking = state.tables.filter(t => t.status === 'cooking');
    document.getElementById('kds-list').innerHTML = cooking.map(t => `
        <div class="kds-card">
            <div class="kds-header"><b>T-${t.id}</b> <span>${t.orderMeta.orderNo}</span></div>
            <div class="kds-time">${t.orderMeta.time}</div>
            <div class="kds-items">${t.cart.map(i => `<p>${i.qty}x ${i.name}</p>`).join('')}</div>
            <button class="done-btn" onclick="serve(${t.id})">READY</button>
        </div>`).join('');
}

function renderMenu() {
    document.getElementById('menu-items').innerHTML = inventory.map(i => `
        <div class="menu-btn" onclick="updateQty(${i.id}, 1)">
            <span>${i.name}</span>
            <b>Rs. ${i.price}</b>
        </div>`).join('');
}

function renderCart() {
    const table = state.tables[activeId - 1];
    let total = 0;
    document.getElementById('cart-list').innerHTML = table.cart.map(i => {
        total += (i.price * i.qty);
        return `
            <div class="cart-row">
                <span>${i.name}</span>
                <div class="qty-control">
                    <button onclick="updateQty(${i.id}, -1)">-</button>
                    <span>${i.qty}</span>
                    <button onclick="updateQty(${i.id}, 1)">+</button>
                </div>
            </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = `Rs. ${total}`;
}

window.serve = (id) => { state.tables[id-1].status = 'available'; state.tables[id-1].cart = []; save(); };
const save = () => set(ref(db, 'lumiere_v7'), state);
