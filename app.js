import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBFYubxSUHpP6g5Vvwt65gsWXDr5Ux535o",
    authDomain: "lumiere-erp.firebaseapp.com",
    projectId: "lumiere-erp",
    databaseURL: "https://lumiere-erp-default-rtdb.firebaseio.com",
    appId: "1:78622005633:web:c231e3862e13787686b080"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.MENU = [
    { id: 1, name: "Momo", price: 150, cat: "Starters", stock: 100 },
    { id: 2, name: "Steak", price: 850, cat: "Mains", stock: 20 },
    { id: 3, name: "Beer", price: 550, cat: "Drinks", stock: 48 }
];

let state = { tables: [], activeId: null, sales: [] };

// Auth Logic
window.checkLogin = () => {
    if(document.getElementById('staff-pin').value === "1234") {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-content').style.display = 'flex';
    } else { alert("Wrong PIN!"); }
};

// Real-time Sync
onValue(ref(db, 'lumiere_industrial'), (snap) => {
    const data = snap.val() || {};
    state.tables = data.tables || Array.from({length: 50}, (_, i) => ({ id: i+1, status: 'empty', cart: [] }));
    state.sales = data.sales || [];
    render();
});

function render() {
    renderTables();
    renderKDS();
    renderInventory();
    renderAccounting();
}

function renderTables() {
    const grid = document.getElementById('table-grid');
    grid.innerHTML = state.tables.map(t => `
        <div class="table-card ${t.status}" onclick="window.openTable(${t.id})">
            ${t.id}
        </div>
    `).join('');
}

window.openTable = (id) => {
    state.activeId = id;
    document.getElementById('table-title').innerText = `Table ${id}`;
    document.getElementById('drawer').classList.add('active');
    window.filterMenu('Starters');
    renderCart();
};

window.filterMenu = (cat) => {
    const items = window.MENU.filter(m => m.cat === cat);
    document.getElementById('menu-items').innerHTML = items.map(m => `
        <div class="menu-item">
            <span>${m.name} (Rs.${m.price})</span>
            <button onclick="window.updateCart(${m.id}, 1)">+</button>
        </div>
    `).join('');
};

window.updateCart = (mId, change) => {
    const table = state.tables[state.activeId - 1];
    const item = window.MENU.find(m => m.id === mId);
    const existing = table.cart.find(c => c.id === mId);

    if (existing) {
        existing.qty += change;
        if(existing.qty <= 0) table.cart = table.cart.filter(c => c.id !== mId);
    } else {
        table.cart.push({ ...item, qty: 1 });
    }
    table.status = table.cart.length > 0 ? 'ordering' : 'empty';
    save();
};

window.fireOrder = () => {
    state.tables[state.activeId - 1].status = 'cooking';
    save();
    window.closeDrawer();
};

function renderInventory() {
    const body = document.getElementById('inv-body');
    body.innerHTML = window.MENU.map(m => `
        <tr><td>${m.name}</td><td>${m.stock}</td><td><button onclick="adjStock(${m.id})">Restock</button></td></tr>
    `).join('');
}

function renderAccounting() {
    const list = document.getElementById('active-bills');
    const occupied = state.tables.filter(t => t.cart.length > 0);
    list.innerHTML = occupied.map(t => {
        const total = t.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        return `<div class="bill-row">Table ${t.id}: Rs.${total} <button onclick="window.settle(${t.id}, ${total})">PAID & PRINT</button></div>`;
    }).join('');
}

window.settle = (id, total) => {
    const sale = { id: Date.now(), total, items: state.tables[id-1].cart };
    state.sales.push(sale);
    // Deduct stock logic here...
    state.tables[id-1] = { id, status: 'empty', cart: [] };
    save();
    window.printBill(sale);
};

window.printBill = (sale) => {
    let win = window.open('', 'PRINT', 'height=400,width=300');
    win.document.write(`<h1>LUMIÈRE</h1><p>Bill ID: ${sale.id}</p><hr>`);
    sale.items.forEach(i => win.document.write(`<p>${i.name} x ${i.qty}: ${i.price * i.qty}</p>`));
    win.document.write(`<hr><h3>TOTAL: Rs.${sale.total}</h3>`);
    win.print();
    win.close();
};

const save = () => set(ref(db, 'lumiere_industrial'), state);
window.closeDrawer = () => document.getElementById('drawer').classList.remove('active');
window.showModule = (mod) => {
    document.querySelectorAll('.module').forEach(m => m.style.display = 'none');
    document.getElementById(mod + '-mod').style.display = 'block';
};
function renderCart() {
    const table = state.tables[state.activeId - 1];
    document.getElementById('cart-list').innerHTML = table.cart.map(i => `
        <div class="cart-row">
            ${i.name} 
            <button onclick="window.updateCart(${i.id}, -1)">-</button>
            ${i.qty}
            <button onclick="window.updateCart(${i.id}, 1)">+</button>
        </div>
    `).join('');
}
function renderKDS() {
    const list = document.getElementById('kds-list');
    list.innerHTML = state.tables.filter(t => t.status === 'cooking').map(t => `
        <div class="kds-card">Table ${t.id}: ${t.cart.map(i => i.name + 'x' + i.qty).join(', ')}</div>
    `).join('');
}
