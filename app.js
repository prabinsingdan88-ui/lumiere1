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

let state = { tables: [], sales: [], inventory: [] };
let prevCookCount = 0;

onValue(ref(db, 'lumiere_v5_final'), (snap) => {
    const data = snap.val() || {};
    state.tables = data.tables || Array.from({length: 50}, (_, i) => ({ id: i+1, status: 'available', cart: [] }));
    state.inventory = data.inventory || [
        { id: 1, name: "Wild Mushroom Arancini", price: 450, cost: 120, cat: "Starters", stock: 100 },
        { id: 2, name: "Wagyu Beef Burger", price: 1250, cost: 450, cat: "Mains", stock: 50 },
        { id: 3, name: "Vintage Chardonnay", price: 1550, cost: 600, cat: "Drinks", stock: 24 }
    ];
    render();
});

function render() {
    renderTables();
    renderKDS();
    renderInventory();
    renderAccounting();
    if(state.activeId) renderCart();
}

// QUANTITY +/- LOGIC
window.updateCart = (mId, change) => {
    const table = state.tables[state.activeId - 1];
    const item = state.inventory.find(i => i.id === mId);
    let entry = table.cart.find(c => c.id === mId);

    if (entry) {
        entry.qty += change;
        if(entry.qty <= 0) table.cart = table.cart.filter(c => c.id !== mId);
    } else if (change > 0) {
        table.cart.push({ ...item, qty: 1 });
    }
    
    table.status = table.cart.length > 0 ? 'ordering' : 'available';
    renderCart(); 
    save();
};

window.fireOrder = () => {
    const table = state.tables[state.activeId - 1];
    if(table.cart.length === 0) return;

    table.status = 'cooking';
    table.orderMeta = {
        orderNo: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString()
    };
    save();
    window.closeDrawer();
};

function renderCart() {
    const table = state.tables[state.activeId - 1];
    let total = 0;
    document.getElementById('cart-list').innerHTML = table.cart.map(i => {
        total += (i.price * i.qty);
        return `
            <div class="cart-row">
                <div class="item-meta"><strong>${i.name}</strong><br><small>Rs. ${i.price * i.qty}</small></div>
                <div class="qty-control">
                    <button onclick="window.updateCart(${i.id}, -1)">-</button>
                    <span>${i.qty}</span>
                    <button onclick="window.updateCart(${i.id}, 1)">+</button>
                </div>
            </div>`;
    }).join('');
    document.getElementById('cart-total').innerText = `Rs. ${total}`;
}

function renderKDS() {
    const cooking = state.tables.filter(t => t.status === 'cooking');
    document.getElementById('kds-list').innerHTML = cooking.map(t => `
        <div class="kds-card">
            <div class="kds-badge">TABLE ${t.id}</div>
            <div class="kds-meta">#${t.orderMeta.orderNo} | ${t.orderMeta.time}</div>
            <div class="kds-items">
                ${t.cart.map(i => `<div>• ${i.qty}x ${i.name}</div>`).join('')}
            </div>
            <button class="serve-btn" onclick="window.serve(${t.id})">MARK READY</button>
        </div>
    `).join('');
}

const save = () => set(ref(db, 'lumiere_v5_final'), state);
window.serve = (id) => { state.tables[id-1].status = 'served'; save(); };
window.openTable = (id) => { state.activeId = id; document.getElementById('table-title').innerText = `TABLE ${id}`; document.getElementById('drawer').classList.add('active'); renderMenu(); renderCart(); };
window.closeDrawer = () => { document.getElementById('drawer').classList.remove('active'); state.activeId = null; };
window.showModule = (mod, btn) => {
    document.querySelectorAll('.module-view').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(mod + '-mod').style.display = 'block';
    btn.classList.add('active');
};
window.filterMenu = (cat) => {
    const items = state.inventory.filter(i => i.cat === cat);
    document.getElementById('menu-items').innerHTML = items.map(i => `
        <div class="menu-item" onclick="window.updateCart(${i.id}, 1)">
            <strong>${i.name}</strong><br><span>Rs. ${i.price}</span>
        </div>`).join('');
};
function renderTables() { document.getElementById('table-grid').innerHTML = state.tables.map(t => `<div class="table-card ${t.status}" onclick="window.openTable(${t.id})"><strong>${t.id}</strong></div>`).join(''); }
function renderInventory() { document.getElementById('inv-body').innerHTML = state.inventory.map(i => `<tr><td>${i.name}</td><td>${i.stock}</td><td>${i.price}</td></tr>`).join(''); }
function renderAccounting() {
    const occupied = state.tables.filter(t => t.cart.length > 0);
    document.getElementById('active-bills-list').innerHTML = occupied.map(t => `
        <div class="bill-card"><span>Table ${t.id}</span><button onclick="window.generateInvoice(${t.id})">SETTLE</button></div>`).join('');
}
function renderMenu() { 
    const cats = [...new Set(state.inventory.map(i => i.cat))]; 
    document.getElementById('cat-bar').innerHTML = cats.map(c => `<button onclick="window.filterMenu('${c}')">${c}</button>`).join(''); 
    window.filterMenu(cats[0]); 
}
