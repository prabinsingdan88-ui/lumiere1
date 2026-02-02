// Add these variables at the top of app.js
let orderCounter = 101; 

// FIXED UPDATE CART FUNCTION
window.updateCart = (mId, change) => {
    const table = state.tables[state.activeId - 1];
    const item = state.inventory.find(i => i.id === mId);
    
    // Find if item already in cart
    let existing = table.cart.find(c => c.id === mId);

    if (existing) {
        existing.qty += change;
        if(existing.qty <= 0) {
            table.cart = table.cart.filter(c => c.id !== mId);
        }
    } else {
        if(change > 0) {
            table.cart.push({ 
                id: item.id, 
                name: item.name, 
                price: item.price, 
                cost: item.cost,
                qty: 1 
            });
        }
    }
    
    table.status = table.cart.length > 0 ? 'ordering' : 'available';
    renderCart(); // Refresh the side panel immediately
    save();
};

// IMPROVED RENDER CART WITH +/- BUTTONS
function renderCart() {
    const table = state.tables[state.activeId - 1];
    let total = 0;
    
    const cartHTML = table.cart.map(i => {
        total += (i.price * i.qty);
        return `
            <div class="cart-row">
                <div class="cart-info">
                    <strong>${i.name}</strong>
                    <span>Rs. ${i.price * i.qty}</span>
                </div>
                <div class="qty-controls">
                    <button onclick="window.updateCart(${i.id}, -1)">-</button>
                    <span class="qty-num">${i.qty}</span>
                    <button onclick="window.updateCart(${i.id}, 1)">+</button>
                </div>
            </div>`;
    }).join('');
    
    document.getElementById('cart-list').innerHTML = cartHTML || '<p style="text-align:center; color:#444; margin-top:20px;">Cart is empty</p>';
    document.getElementById('cart-total').innerText = `Rs. ${total}`;
}

// FIRE ORDER WITH KITCHEN METADATA
window.fireOrder = () => {
    const table = state.tables[state.activeId - 1];
    if(table.cart.length === 0) return alert("Please add items first!");

    const now = new Date();
    table.status = 'cooking';
    table.orderNo = `#ORD-${orderCounter++}`;
    table.orderTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    table.orderDate = now.toLocaleDateString();

    // Deduct Stock
    table.cart.forEach(c => {
        const inv = state.inventory.find(i => i.id === c.id);
        if(inv) inv.stock -= c.qty;
    });

    save();
    window.closeDrawer();
    alert(`Order ${table.orderNo} sent to Kitchen!`);
};

// KITCHEN DISPLAY (KDS) WITH FULL DETAILS
function renderKDS() {
    const cooking = state.tables.filter(t => t.status === 'cooking');
    document.getElementById('kds-list').innerHTML = cooking.map(t => `
        <div class="kds-card">
            <div class="kds-header">
                <strong>${t.orderNo}</strong>
                <span>T-${t.id}</span>
            </div>
            <div class="kds-time">${t.orderDate} | ${t.orderTime}</div>
            <div class="kds-items">
                ${t.cart.map(i => `<div class="kds-item-row"><span>${i.qty}x</span> <span>${i.name}</span></div>`).join('')}
            </div>
            <button class="serve-btn" onclick="window.serve(${t.id})">READY TO SERVE</button>
        </div>
    `).join('');
} 

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

// TAX CONFIGURATION
const TAX_RATE = 0.13; // 13% VAT
const SERVICE_CHARGE = 0.10; // 10% Service Charge

let state = { tables: [], sales: [], inventory: [], staff: [{name: "Admin", pin: "1234"}] };
let prevCookingCount = 0;

window.checkLogin = () => {
    const pin = document.getElementById('staff-pin').value;
    if(state.staff.some(s => s.pin === pin)) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
    } else { alert("INVALID PIN"); }
};

onValue(ref(db, 'lumiere_ultimate_system'), (snap) => {
    const data = snap.val() || {};
    state.tables = data.tables || Array.from({length: 50}, (_, i) => ({ id: i+1, status: 'available', cart: [] }));
    state.sales = data.sales || [];
    state.inventory = data.inventory || [
        { id: 1, name: "Wild Mushroom Arancini", price: 450, cost: 120, cat: "Starters", stock: 100 },
        { id: 2, name: "Wagyu Beef Burger", price: 1250, cost: 450, cat: "Mains", stock: 50 },
        { id: 3, name: "Vintage Chardonnay", price: 1550, cost: 600, cat: "Drinks", stock: 24 }
    ];

    const currentCook = state.tables.filter(t => t.status === 'cooking').length;
    if(currentCook > prevCookingCount) document.getElementById('order-sound').play().catch(()=>{});
    prevCookingCount = currentCook;
    render();
});

function render() {
    renderTables();
    renderKDS();
    renderInventory();
    renderAccounting();
    if(state.activeId) renderCart();
}

function renderTables() {
    document.getElementById('table-grid').innerHTML = state.tables.map(t => `
        <div class="table-card ${t.status}" onclick="window.openTable(${t.id})">
            <strong>${t.id}</strong>
        </div>
    `).join('');
}

window.openTable = (id) => {
    state.activeId = id;
    document.getElementById('table-title').innerText = `TABLE ${id}`;
    document.getElementById('drawer').classList.add('active');
    renderMenu();
};

function renderMenu() {
    const cats = [...new Set(state.inventory.map(i => i.cat))];
    document.getElementById('cat-bar').innerHTML = cats.map(c => `<button onclick="window.filterMenu('${c}')">${c}</button>`).join('');
    window.filterMenu(cats[0]);
}

window.filterMenu = (cat) => {
    const items = state.inventory.filter(i => i.cat === cat);
    document.getElementById('menu-items').innerHTML = items.map(i => `
        <div class="menu-item">
            <b>${i.name}</b>
            <span class="gold-text">Rs. ${i.price} | Stock: ${i.stock}</span>
            <button onclick="window.updateCart(${i.id}, 1)" ${i.stock <= 0 ? 'disabled' : ''}>ADD</button>
        </div>
    `).join('');
};

window.updateCart = (mId, change) => {
    const table = state.tables[state.activeId - 1];
    const item = state.inventory.find(i => i.id === mId);
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
    table.status = 'cooking';
    table.cart.forEach(c => {
        const inv = state.inventory.find(i => i.id === c.id);
        if(inv) inv.stock -= c.qty;
    });
    save(); window.closeDrawer();
};

window.generateInvoice = (id) => {
    const table = state.tables[id - 1];
    const sub = table.cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const svc = sub * SERVICE_CHARGE;
    const tax = (sub + svc) * TAX_RATE;
    const total = sub + svc + tax;

    state.currentInvoice = { id, sub, svc, tax, total, items: [...table.cart] };
    document.getElementById('invoice-content').innerHTML = `
        <div class="inv-row"><span>Subtotal</span> <span>Rs. ${sub.toFixed(2)}</span></div>
        <div class="inv-row"><span>Srv Charge (10%)</span> <span>Rs. ${svc.toFixed(2)}</span></div>
        <div class="inv-row"><span>VAT (13%)</span> <span>Rs. ${tax.toFixed(2)}</span></div>
        <div class="inv-row total"><span>GRAND TOTAL</span> <span>Rs. ${total.toFixed(2)}</span></div>
    `;
    document.getElementById('invoice-preview').style.display = 'block';
};

window.finalizePayment = () => {
    const inv = state.currentInvoice;
    const cost = inv.items.reduce((s, i) => s + (i.cost * i.qty), 0);
    state.sales.push({ total: inv.total, cost, ts: Date.now() });
    state.tables[inv.id - 1] = { id: inv.id, status: 'available', cart: [] };
    document.getElementById('invoice-preview').style.display = 'none';
    save();
};

function renderInventory() {
    document.getElementById('inv-body').innerHTML = state.inventory.map(i => `
        <tr><td>${i.name}</td><td>${i.cat}</td><td>${i.stock}</td><td>${i.cost}</td><td>${i.price}</td></tr>
    `).join('');
}

function renderAccounting() {
    const occupied = state.tables.filter(t => t.cart.length > 0);
    document.getElementById('active-bills-list').innerHTML = occupied.map(t => `
        <div class="bill-card">
            <strong>Table ${t.id}</strong>
            <button onclick="window.generateInvoice(${t.id})">BILLING</button>
        </div>
    `).join('');

    const rev = state.sales.reduce((a, b) => a + b.total, 0);
    const profit = rev - state.sales.reduce((a, b) => a + b.cost, 0);
    document.getElementById('rev-total').innerText = `Rs. ${rev.toLocaleString()}`;
    document.getElementById('profit-total').innerText = `Rs. ${profit.toLocaleString()}`;
}

const save = () => set(ref(db, 'lumiere_ultimate_system'), state);
window.closeDrawer = () => { document.getElementById('drawer').classList.remove('active'); state.activeId = null; };
window.showModule = (mod, btn) => {
    document.querySelectorAll('.module-view').forEach(m => m.style.display = 'none');
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById(mod + '-mod').style.display = 'block';
    btn.classList.add('active');
};
function renderKDS() {
    const cooking = state.tables.filter(t => t.status === 'cooking');
    document.getElementById('kds-list').innerHTML = cooking.map(t => `
        <div class="kds-card"><h4>TABLE ${t.id}</h4>${t.cart.map(i => `<div>${i.name} x${i.qty}</div>`).join('')}
        <button onclick="window.serve(${t.id})">SERVE</button></div>
    `).join('');
}
window.serve = (id) => { state.tables[id-1].status = 'served'; save(); };
function renderCart() {
    const table = state.tables[state.activeId - 1];
    let total = 0;
    document.getElementById('cart-list').innerHTML = table.cart.map(i => {
        total += (i.price * i.qty);
        return `<div class="cart-row"><span>${i.name}</span><span>x${i.qty}</span></div>`;
    }).join('');
    document.getElementById('cart-total').innerText = `Rs. ${total}`;
}

