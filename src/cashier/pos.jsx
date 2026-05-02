import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { TopbarUserIcon } from "../frontdesks/frontdeskTopbarIcons";
import { TOPBAR } from "../topbar/roleTopbarData";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { useCashierSidebarLayout } from "./useCashierSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import CashierSidebarToggle from "./CashierSidebarToggle";
import "./pos.css";
import "./cashier-sidebar-shared.css";
// ── Dish Data ──────────────────────────────────────────────────────────
const allDishes = [
  { id:1,  name:"Tinolang Isda",      price:350, category:"Main Course", img:"https://i.ytimg.com/vi/vS_Z-pCJCEA/maxresdefault.jpg",        desc:"A comforting Filipino fish soup with ginger, green papaya, and malunggay in a light savory broth." },
  { id:2,  name:"Tinolang Manok",     price:350, category:"Main Course", img:"https://pilipinasrecipes.com/wp-content/uploads/2018/05/Tinolang-Manok-Recipe.jpg",           desc:"A comforting Filipino chicken soup with ginger, green papaya, and malunggay in a light savory broth." },
  { id:3,  name:"Sinigang na Bangus", price:250, category:"Main Course", img:"https://yummykitchentv.com/wp-content/uploads/2023/06/sinigang-1024x576.jpg",        desc:"A sour and savory Filipino milkfish soup in a tangy tamarind broth." },
  { id:4,  name:"Sinigang na Baboy",  price:350, category:"Main Course", img:"https://speedyrecipe.com/wp-content/uploads/2022/09/how-to-cook-sinigang-na-baboy.jpg",      desc:"A hearty Filipino pork soup in a sour and savory tamarind broth with fresh vegetables." },
  { id:5,  name:"Kare-Kare",          price:380, category:"Main Course", img:"https://kusinasecrets.com/wp-content/uploads/2024/10/u3317447599_httpss.mj_.run55FtooqGilE_A_bowl_of_Filipino_Kare__7c52f987-0437-4353-aa87-807beddfe0e4_1.webp",              desc:"Rich oxtail and tripe stew in a creamy peanut sauce, served with bagoong." },
  { id:6,  name:"Lechon Kawali",      price:320, category:"Main Course", img:"https://www.seriouseats.com/thmb/4wkT0wFghCvD6DK8HQRbtt6ubko=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/__opt__aboutcom__coeus__resources__content_migration__serious_eats__seriouseats.com__images__2015__01__20150102-lechon-kawali-first-finished-joshua-bousel-ad06cbac80af4886a6183f9041a61d9e.jpg",          desc:"Crispy deep-fried pork belly served with liver sauce or vinegar dip." },
  { id:7,  name:"Steamed Rice",       price:50,  category:"Side Dish",   img:"https://maeservesyoufood.com/wp-content/uploads/2023/04/sinangag-rice.jpeg",                   desc:"Perfectly cooked plain white steamed rice." },
  { id:8,  name:"Ensaladang Talong",  price:80,  category:"Side Dish",   img:"https://i.pinimg.com/736x/98/79/56/9879564e17cd0c7d396cdc0b675d34e7.jpg",     desc:"Grilled eggplant salad with tomatoes, onions, and salted eggs." },
  { id:9,  name:"Pickled Papaya",     price:60,  category:"Side Dish",   img:"https://tse1.mm.bing.net/th/id/OIP.MZAgZdTK07SM2HtR66DNngAAAA?pid=Api&P=0&h=180",         desc:"Sweet and tangy achara made from shredded green papaya." },
  { id:10, name:"Buko Juice",         price:80,  category:"Beverages",   img:"https://www.willflyforfood.net/wp-content/uploads/2021/12/filipino-fruits-buko.jpg.webp",                   desc:"Fresh young coconut juice, naturally sweet and refreshing." },
  { id:11, name:"Sago't Gulaman",     price:60,  category:"Beverages",   img:"https://www.pinoyrecipe.net/wp-content/uploads/2023/12/Creamy-Buko-Sago-Gulaman-Salad-1024x683.jpg",                desc:"A classic Filipino drink with sago pearls, gulaman jelly, and brown sugar syrup." },
  { id:12, name:"Pineapple Juice",    price:70,  category:"Beverages",   img:"https://thewoodenskillet.com/wp-content/uploads/2022/07/smoked-pineapple-recipe-2-1067x1600.jpg",              desc:"Freshly squeezed pineapple juice, chilled and served cold." },
  { id:13, name:"Bulalo",             price:420, category:"Soup",        img:"http://4.bp.blogspot.com/-CeXdekRHDKk/TkAPhgbYCdI/AAAAAAAAAOE/IqRF9DFV08c/s1600/bulalo+recipe.jpg",                 desc:"Rich and hearty beef bone marrow soup slow-cooked with vegetables." },
  { id:14, name:"Nilaga",             price:300, category:"Soup",        img:"https://www.kawalingpinoy.com/wp-content/uploads/2013/01/sinigang-baboy-7-1152x1536.jpg",                 desc:"Classic Filipino boiled beef or pork soup with potatoes and cabbage." },
  { id:15, name:"Fresh Mango",        price:120, category:"Fruits",      img:"https://img.freepik.com/premium-photo/sliced-mango-plate_156352-921.jpg",                  desc:"Sweet and ripe Philippine carabao mangoes, served chilled." },
  { id:16, name:"Watermelon Slice",   price:90,  category:"Fruits",      img:"https://barefeetinthekitchen.com/wp-content/uploads/2021/06/Watermelon-3-1-of-1.jpg",      desc:"Cold and refreshing watermelon slices, perfect for the Philippine heat." },
];

const CATEGORIES    = ["Main Course", "Side Dish", "Beverages", "Soup", "Fruits"];
const ITEMS_PER_PAGE = 6;

const GCASH_INFO = {
  accountName: "L** J** P.",
  mobileNo:    "093* **** 971",
  userId:      "***********Y1JMWN",
  qrImageSrc:  "/QR.png",
};

const HOTEL_INFO = {
  name:    "Abela Suites",
  address: "123 Main Street, Springfield, USA",
  logoSrc: "/logo.png",
};

const GCASH_BTN_ICON = "/Gcash.png";

// ── Icons ──────────────────────────────────────────────────────────────
const POSIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5.82 6h14.18l-1.5 7H7.5L5.82 6zM3 2H1v2h2l3.6 7.59-1.36 2.45C5.09 14.66 5 15.07 5 15.5 5 16.88 6.12 18 7.5 18h13v-2H7.83c-.17 0-.3-.13-.3-.3l.03-.12.9-1.58H18c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 22.5 5H5.21L4.27 3H1v2h2l3.6 7.59z"/>
  </svg>
);
const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const BillingNavIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);
const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const SearchIcon = () => (
  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const PrintIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);
const CashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <rect x="2" y="7" width="20" height="14" rx="2"/><circle cx="12" cy="14" r="2"/>
  </svg>
);
// ── Helpers ────────────────────────────────────────────────────────────
function generateInvoiceNumber() {
  const now  = new Date();
  const pad  = n => (n < 10 ? "0" + n : "" + n);
  const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).substr(2,4).toUpperCase();
  return `IVN-${date}-${time}-${rand}`;
}
const fmt = n => "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2 });

// ── GCash Modal ────────────────────────────────────────────────────────
function GcashModal({ onClose }) {
  return (
    <div className="gcash-modal-backdrop active" onClick={onClose}>
      <div className="gcash-modal" onClick={e => e.stopPropagation()}>
        <div className="gcash-modal-header">
          <h2 className="gcash-modal-title">GCash QR</h2>
          <button className="gcash-modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="gcash-qr-wrap">
          <img src={GCASH_INFO.qrImageSrc} alt="GCash QR Code" className="gcash-qr-img"
            onError={e => { e.target.style.display = "none"; }}/>
        </div>
        <p className="gcash-fee-note">Transfer fees may apply.</p>
        <p className="gcash-name">{GCASH_INFO.accountName}</p>
        <p className="gcash-detail">Mobile No.: {GCASH_INFO.mobileNo}</p>
        <p className="gcash-detail">User ID: {GCASH_INFO.userId}</p>
      </div>
    </div>
  );
}

// ── Order Bill Modal ───────────────────────────────────────────────────
function OrderBillModal({ orderedItems, discountRate, discountLabel, paymentMethod, cashierName, onClose }) {
  const subtotal    = orderedItems.reduce((s, i) => s + i.dish.price * i.qty, 0);
  const discountAmt = subtotal * discountRate;
  const total       = subtotal - discountAmt;
  const invoiceNo   = generateInvoiceNumber();
  const now         = new Date();
  const dateStr     = now.toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
  const timeStr     = now.toLocaleTimeString("en-PH", { hour:"2-digit", minute:"2-digit" });

  return (
    <div className="abela-overlay" onClick={onClose}>
      <div className="abela-modal" onClick={e => e.stopPropagation()}>
        <button className="abela-modal-close" onClick={onClose}>&#x2715;</button>

        {/* Header */}
        <div className="bill-header">
          <img src={HOTEL_INFO.logoSrc} alt={HOTEL_INFO.name} className="bill-logo"
            onError={e => { e.target.style.display="none"; }}/>
          <p className="bill-hotel-name">{HOTEL_INFO.name}</p>
          <p className="bill-hotel-addr">{HOTEL_INFO.address}</p>
          <div className="bill-official">Official Order Bill</div>
        </div>

        {/* Meta */}
        <div className="bill-meta">
          {[
            ["Invoice Number", invoiceNo],
            ["Date & Time",    `${dateStr} at ${timeStr}`],
            ["Customer",       "Guest"],
            ["Cashier",        cashierName],
            ["Payment Method", paymentMethod],
            ["Discount",       discountLabel],
          ].map(([label, value]) => (
            <div key={label} className="bill-meta-block">
              <div className="bill-meta-label">{label}</div>
              <div className="bill-meta-value">{value}</div>
            </div>
          ))}
        </div>

        {/* Items table */}
        <table className="bill-table">
          <thead>
            <tr>
              <th>#</th><th>Description</th>
              <th className="right">QTY</th>
              <th className="right">Unit Price</th>
              <th className="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {orderedItems.map((it, i) => (
              <tr key={it.dish.id}>
                <td>{i+1}</td>
                <td><strong>{it.dish.name}</strong></td>
                <td className="right">{it.qty}</td>
                <td className="right">{fmt(it.dish.price)}</td>
                <td className="right">{fmt(it.dish.price * it.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <table className="bill-totals" style={{ marginLeft:"auto", width:"240px" }}>
          <tbody>
            <tr><td className="lbl">Subtotal</td><td className="amt">{fmt(subtotal)}</td></tr>
            <tr><td className="lbl">Discount</td><td className="amt">{fmt(discountAmt)}</td></tr>
            <tr>
              <td className="lbl bill-total-due-lbl">Total Due</td>
              <td className="amt bill-total-due-amt">{fmt(total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="bill-footer">Thank you for dining with us</div>
      </div>
    </div>
  );
}

/** Mobile drawer is portaled to `document.body` so it is not covered by the main flex column. */
function CashierPosAside({
  shellClassName,
  asideStyle,
  logoWrapStyle,
  logoImgStyle,
  isMobile: isMobileShell,
  closeMobileSidebar,
}) {
  return (
    <aside className={`sidebar ${shellClassName}`} style={asideStyle}>
      {isMobileShell ? (
        <button
          type="button"
          className="cashier-mobile-close-btn"
          onClick={closeMobileSidebar}
          aria-label="Close menu"
        >
          ×
        </button>
      ) : null}
      <div className="sidebar-logo" style={logoWrapStyle}>
        <img
          src="/logo.png"
          alt="Abela Suites Logo"
          className="sidebar-logo-img"
          style={logoImgStyle}
        />
      </div>
      <nav className="sidebar-nav">
        <NavLink
          to="/cashier-billing"
          onClick={() => { if (isMobileShell) closeMobileSidebar(); }}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="nav-icon">
            <BillingNavIcon />
          </span>
          <span>Guest billing</span>
        </NavLink>
        <NavLink
          to="/cashier"
          end
          onClick={() => { if (isMobileShell) closeMobileSidebar(); }}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="nav-icon">
            <POSIcon />
          </span>
          <span>POS</span>
        </NavLink>
        <NavLink
          to="/order-history"
          end
          onClick={() => { if (isMobileShell) closeMobileSidebar(); }}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="nav-icon">
            <HistoryIcon />
          </span>
          <span>Order History</span>
        </NavLink>
        <NavLink
          to="/cashier-settings"
          end
          onClick={() => { if (isMobileShell) closeMobileSidebar(); }}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="nav-icon">
            <SettingsIcon />
          </span>
          <span>Settings</span>
        </NavLink>
      </nav>
    </aside>
  );
}

// ── Main POS Component ─────────────────────────────────────────────────
export default function POS() {
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { topbarProfile } = useTopbarUserProfile("cashier");
  const [category,     setCategory]     = useState("Main Course");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchInput,  setSearchInput]  = useState("");
  const [orderedItems, setOrderedItems] = useState([]);
  const [discountRate, setDiscountRate] = useState(0);
  const [paymentMethod,setPaymentMethod]= useState("Cash");
  const [amountGiven,  setAmountGiven]  = useState("");
  const [showGcash,    setShowGcash]    = useState(false);
  const [showBill,     setShowBill]     = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [userOpen,     setUserOpen]     = useState(false);
  const {
    collapsed: sidebarCollapsed,
    isMobile,
    mobileSidebarOpen,
    closeMobileSidebar,
    toggleSidebar,
    shellClassName,
    asideStyle,
    mainStyle,
    logoWrapStyle,
    logoImgStyle,
  } = useCashierSidebarLayout();
  const notifRef = useRef(null);
  const userRef  = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Filtered dishes ──
  const filtered = allDishes.filter(d =>
    d.category === category &&
    (searchQuery === "" || d.name.toLowerCase().includes(searchQuery))
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const page       = Math.min(currentPage, totalPages);
  const paged      = filtered.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);

  function handleSearch() {
    setSearchQuery(searchInput.trim().toLowerCase());
    setCurrentPage(1);
  }

  function handleCategoryChange(cat) {
    setCategory(cat);
    setCurrentPage(1);
    setSearchQuery("");
    setSearchInput("");
  }

  // ── Cart logic ──
  function addToOrder(dish) {
    setOrderedItems(prev => {
      const existing = prev.find(i => i.dish.id === dish.id);
      if (existing) return prev.map(i => i.dish.id === dish.id ? { ...i, qty: i.qty+1 } : i);
      return [...prev, { dish, qty: 1 }];
    });
  }
  function changeQty(dishId, delta) {
    setOrderedItems(prev => {
      const updated = prev.map(i => i.dish.id === dishId ? { ...i, qty: i.qty + delta } : i);
      return updated.filter(i => i.qty > 0);
    });
  }
  function removeItem(dishId) {
    setOrderedItems(prev => prev.filter(i => i.dish.id !== dishId));
  }

  // ── Summary ──
  const subtotal    = orderedItems.reduce((s, i) => s + i.dish.price * i.qty, 0);
  const discountAmt = subtotal * discountRate;
  const total       = subtotal - discountAmt;
  const given       = parseFloat(amountGiven) || 0;
  const change      = given - total;

  const discountOptions = [
    { value: 0,    label: "No Discount" },
    { value: 0.20, label: "Senior / PWD (20%)" },
    { value: 0.10, label: "Employee (10%)" },
    { value: 0.05, label: "Promo (5%)" },
  ];
  const discountLabel = discountOptions.find(o => o.value === discountRate)?.label || "No Discount";

  function handlePaymentMethod(method) {
    setPaymentMethod(method);
    if (method === "GCash") {
      setAmountGiven("");
      setShowGcash(true);
    }
  }

  function handleSendToBill() {
    if (orderedItems.length === 0) { alert("Please select at least one dish before sending to bill."); return; }
    setShowBill(true);
  }
  function handlePrintReceipt() {
    if (orderedItems.length === 0) { alert("No items to print. Please add dishes first."); return; }
    setShowBill(true);
  }
  const isSelected = (dish) => orderedItems.some(i => i.dish.id === dish.id);

  const asideProps = {
    shellClassName,
    asideStyle,
    logoWrapStyle,
    logoImgStyle,
    closeMobileSidebar,
  };

  return (
    <>
      {isMobile
        ? createPortal(
            <>
              {mobileSidebarOpen ? (
                <div
                  className="cashier-mobile-backdrop"
                  onClick={closeMobileSidebar}
                  aria-hidden
                />
              ) : null}
              <CashierPosAside {...asideProps} isMobile />
            </>,
            document.body
          )
        : null}
      <RailPortalShell
        rootClassName="cashier-pos-page"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%" }}
        mainStyle={mainStyle}
        sidebar={!isMobile ? <CashierPosAside {...asideProps} isMobile={false} /> : null}
      >
        {/* ── TOPBAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <CashierSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Point of Sales</span>
          </div>
          <div className="topbar-actions">

            {/* Bell */}
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={(e) => {
                e.stopPropagation();
                setNotifOpen((v) => !v);
                setUserOpen(false);
              }}
              notifications={TOPBAR.cashier.notifications}
              bellIconClassName="topbar-icon"
              dot="muted"
            />

            {/* User */}
            <div
              className="icon-btn"
              ref={userRef}
              onClick={(e) => {
                e.stopPropagation();
                setUserOpen((v) => !v);
                setNotifOpen(false);
              }}
            >
              <TopbarUserIcon className="topbar-icon" />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                &#9662;
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={topbarProfile}
                profilePath={TOPBAR.cashier.profilePath}
                onCloseMenus={() => { setNotifOpen(false); setUserOpen(false); }}
                onLogout={() => { setNotifOpen(false); setUserOpen(false); requestLogout(); }}
              />
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">
          <div className="pos-layout">

            {/* ── LEFT: Menu Panel ── */}
            <div className="menu-panel">
              {/* Search */}
              <div className="search-bar-wrap">
                <div className="search-input-wrap">
                  <SearchIcon />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search dishes..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <button className="search-btn" onClick={handleSearch}>Search</button>
              </div>

              {/* Category Tabs */}
              <div className="category-tabs">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`cat-tab${category === cat ? " active" : ""}`}
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Dish Grid */}
              <div className="dish-grid">
                {paged.length === 0 ? (
                  <p className="no-results">No dishes found.</p>
                ) : paged.map(dish => (
                  <div
                    key={dish.id}
                    className={`dish-card${isSelected(dish) ? " selected" : ""}`}
                    onClick={() => addToOrder(dish)}
                  >
                    <img
                      className="dish-img"
                      src={dish.img}
                      alt={dish.name}
                      onError={e => { e.target.src = "image/placeholder.jpg"; }}
                    />
                    <div className="dish-info">
                      <div className="dish-name">{dish.name}</div>
                      <div className="dish-price">₱{dish.price}</div>
                      <div className="dish-desc">{dish.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={page === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                >Previous</button>
                <div className="page-numbers">
                  {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
                    <button
                      key={p}
                      className={`page-num${p === page ? " active" : ""}`}
                      onClick={() => setCurrentPage(p)}
                    >{p}</button>
                  ))}
                </div>
                <button
                  className="page-btn"
                  disabled={page === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                >Next</button>
              </div>
            </div>

            {/* ── RIGHT: Order Panel ── */}
            <div className="order-panel">
              <h2 className="order-title">Order</h2>

              {/* Cashier Name */}
              <div className="order-field">
                <label className="order-label">Cashier Name</label>
                <input type="text" className="order-input" value={TOPBAR.cashier.profile.name} readOnly/>
              </div>

              {/* Ordered Dishes */}
              <div className="order-field">
                <label className="order-label gold">Ordered Dishes</label>
                <div className="ordered-dishes">
                  {orderedItems.length === 0 ? (
                    <p className="no-dishes-msg">No dishes selected</p>
                  ) : orderedItems.map(item => (
                    <div key={item.dish.id} className="ordered-item">
                      <span className="ordered-item-name">{item.dish.name}</span>
                      <div className="ordered-item-controls">
                        <button className="qty-btn" onClick={() => changeQty(item.dish.id, -1)}>-</button>
                        <span className="qty-value">{item.qty}</span>
                        <button className="qty-btn" onClick={() => changeQty(item.dish.id, 1)}>+</button>
                        <span className="item-price">{fmt(item.dish.price * item.qty)}</span>
                        <button className="remove-btn" onClick={() => removeItem(item.dish.id)}>x</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div className="order-field">
                <label className="order-label">Discount Type</label>
                <div className="select-wrap">
                  <select
                    className="order-select"
                    value={discountRate}
                    onChange={e => setDiscountRate(parseFloat(e.target.value))}
                  >
                    {discountOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method */}
              <div className="order-field">
                <label className="order-label">Payment Method</label>
                <div className="payment-methods">
                  <button
                    className={`pay-btn${paymentMethod === "Cash" ? " active" : ""}`}
                    onClick={() => handlePaymentMethod("Cash")}
                  >
                    <CashIcon /> Cash
                  </button>
                  <button
                    className={`pay-btn${paymentMethod === "GCash" ? " active" : ""}`}
                    onClick={() => handlePaymentMethod("GCash")}
                  >
                    <img src={GCASH_BTN_ICON} alt="" className="pay-btn-gcash-icon" width={18} height={18} decoding="async" />
                    GCash
                  </button>
                </div>
              </div>

              {/* Amount Given (Cash only) */}
              {paymentMethod === "Cash" && (
                <div className="order-field">
                  <label className="order-label">Amount Given</label>
                  <input
                    type="number"
                    className="order-input"
                    placeholder="0"
                    min="0"
                    value={amountGiven}
                    onChange={e => setAmountGiven(e.target.value)}
                  />
                </div>
              )}

              {/* Summary */}
              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>{discountRate > 0 ? `Discount(${Math.round(discountRate*100)}%)` : "Discount(none)"}</span>
                  <span>{fmt(discountAmt)}</span>
                </div>
                <div className="summary-row total-row">
                  <span>Total</span>
                  <span>{fmt(total)}</span>
                </div>
                {paymentMethod === "Cash" && given > 0 && (
                  <div className="summary-row change-row" style={{ display:"flex" }}>
                    <span>Change</span>
                    <span style={{ color: change >= 0 ? "var(--gold)" : "#e74c3c" }}>
                      {fmt(change >= 0 ? change : 0)}
                    </span>
                  </div>
                )}
              </div>

              <button className="send-to-bill-btn" onClick={handleSendToBill}>
                <SendIcon /> Send to Bill
              </button>
              <button className="print-receipt-btn" onClick={handlePrintReceipt}>
                <PrintIcon /> Print Receipt
              </button>
            </div>

          </div>
        </main>
      </RailPortalShell>

      {/* ── MODALS ── */}
      {showGcash && <GcashModal onClose={() => setShowGcash(false)} />}
      {showBill  && (
        <OrderBillModal
          orderedItems={orderedItems}
          discountRate={discountRate}
          discountLabel={discountLabel}
          paymentMethod={paymentMethod}
          cashierName={TOPBAR.cashier.profile.name}
          onClose={() => setShowBill(false)}
        />
      )}

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />

    </>
  );
}
