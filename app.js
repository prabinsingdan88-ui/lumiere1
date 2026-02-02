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

window.MENU = [
    { id: 1, name: "Wild Mushroom Arancini", price: 450, cat: "Starters" },
    { id: 2, name: "Wagyu Beef Burger", price: 1250, cat: "Mains" },
    { id: 3, name: "Truffle Tagliatelle", price: 950, cat: "Mains" },
    { id: 4, name: "Vintage Chardonnay", price: 1550, cat: "Drinks" },
    { id: 5, name: "Espresso Martini", price: 750, cat: "Drinks" },
    { id: 6, name: "Chicken Momo", price: 150, cat: "Starters" }
];

let state = { tables: [], activeId: null, sales: [] };
let previousCookingCount = 0;

window.checkLogin = () => {
    if(document.getElementById('staff-pin').value === "1234") {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
    } else { alert("INVALID STAFF PIN"); }
};

onValue(ref(db, 'lumiere_industrial_final'), (snap) => {
    const data = snap.val() || {};
    state.tables = data.tables || Array.from({length: 50}, (_, i) => ({ id: i+1, status: 'available', cart: [], isVIP: false }));
    state.sales = data.sales || [];

    // ALARM LOGIC: Trigger if a new table enters "cooking" status
    const currentCookingCount = state.tables.filter(t => t.status === 'cooking').length;
    if (currentCookingCount > previousCookingCount) {
        const sound = document.getElementById('order-sound');
        sound.play().catch(() => console.log("Sound muted by browser - Click anywhere to enable"));
    }
    previousCookingCount = currentCookingCount;

    render();
});

function render() {
    renderTables();
    renderKDS();
    renderAccounting();
    if(state.activeId) renderCart();
}

function renderTables() {
    const grid = document.getElementById('table-grid');
    grid.innerHTML = state.tables.map(t => `
        <div class="table-card ${t.status} ${t.isVIP ? 'vip' : ''}" onclick="window.openTable(${t.id})">
            <span class="table-num">${t.id}</span>
        </div>
    `).join('');
}

window.openTable = (id) => {
    state.activeId = id;
    document.getElementById('table-title').innerText = `TABLE ${id}`;
    document.getElementById('drawer').classList.add('active');
    window.filterMenu('Starters');
};

window.filterMenu = (cat) => {
    const items = window.MENU.filter(m => m.cat === cat);
    document.getElementById('menu-items').innerHTML = items.map(m => `
        <div class="menu-item">
            <div class="item-info">
                <strong>${m.name}</strong>
                <span class="gold-text">Rs. ${m.price}</span>
            </div>
            <button class="add-btn" onclick="window.updateCart(${m.id}, 1)">ADD TO CHECK</button>
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
    table.status = table.cart.length > 0 ? 'ordering' : 'available';
    save();
};

window.fireOrder = () => {
    const table = state.tables[state.activeId - 1];
    if(table.cart.length === 0) return alert("Add items first!");
    table.status = 'cooking';
    save();
    window.closeDrawer();
};

window.toggleVIP = () => {
    state.tables[state.activeId - 1].isVIP = !state.tables[state.activeId - 1].isVIP;
    save();
};

function renderCart() {
    const table = state.tables[state.activeId - 1];
    let total = 0;
    document.getElementById('cart-list').innerHTML = table.cart.map(i => {
        total += (i.price * i.qty);
        return `
            <div class="cart-row">
                <span>${i.name}</span>
                <div class="qty-ctrl">
                    <button onclick="window.updateCart(${i.id}, -1)">-</button>
                    <b>${i.qty}</b>
                    <button onclick="window.updateCart(${i.id}, 1)">+</button>
                </div>
            </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = `Rs. ${total}`;
}

function renderKDS() {
    const list = document.getElementById('kds-list');
    const cooking = state.tables.filter(t => t.status === 'cooking');
    list.innerHTML = cooking.length ? cooking.map(t => `
        <div class="kds-card">
            <h4>TABLE ${t.id}</h4>
            <div class="kds-items">
                ${t.cart.map(i => `<div>• ${i.name} (${i.qty})</div>`).join('')}
            </div>
            <button class="serve-btn" onclick="window.serve(${t.id})">MARK SERVED</button>
        </div>
    `).join('') : '<p style="color:#444">No pending orders.</p>';
}

window.serve = (id) => {
    state.tables[id-1].status = 'served';
    save();
};

function renderAccounting() {
    const list = document.getElementById('active-bills');
    const occupied = state.tables.filter(t => t.cart.length > 0);
    list.innerHTML = occupied.map(t => {
        const total = t.cart.reduce((s, i) => s + (i.price * i.qty), 0);
        return `
            <div class="bill-card">
                <span>T${t.id}: <b>Rs. ${total}</b></span>
                <button onclick="window.settle(${t.id}, ${total})">SETTLE</button>
            </div>`;
    }).join('');
    const revenue = state.sales.reduce((sum, s) => sum + s.total, 0);
    document.getElementById('rev-total').innerText = `Rs. ${revenue}`;
}

window.settle = (id, total) => {
    if(confirm(`Settle Table ${id} for Rs. ${total}?`)) {
        state.sales.push({ total, ts: Date.now() });
        state.tables[id-1] = { id, status: 'available', cart: [], isVIP: false };
        save();
    }
};

const save = () => set(ref(db, 'lumiere_industrial_final'), state);
window.closeDrawer = () => { document.getElementById('drawer').classList.remove('active'); state.activeId = null; };
window.showModule = (mod, btn) => {
    document.querySelectorAll('.module-view').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(mod + '-mod').style.display = 'block';
    btn.classList.add('active');
};
