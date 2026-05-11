import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
import { fetchMenuPageBackend, fetchCategoriesBackend, fetchMenuItemByIdBackend } from "../api/menuApi";
import {
  createRestaurantOrderBackend,
  patchRestaurantOrderPaymentBackend,
  patchRestaurantOrderStatusBackend,
} from "../api/restaurantOrdersApi";
import { AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import "./pos.css";
import "./cashier-sidebar-shared.css";
import { useCashierUnifiedBell } from "./useCashierUnifiedBell";
import { getPosWalkInGuestEmail } from "./posWalkInGuest";

/** Preferred tab order (matches admin seed categories); extras are appended alphabetically. */
const DEFAULT_CATEGORY_ORDER = ["Main Course", "Side Dish", "Beverages", "Soup", "Fruits"];
const MENU_AUTO_REFRESH_MS = 10000;

/** Same windowed page numbers as Restaurant Menu (`resto.jsx`). */
function visibleMenuPageNumbers(currentPage, totalPages) {
  const t = Math.max(1, Math.min(5000, Number(totalPages) || 1));
  const c = Math.min(Math.max(1, Number(currentPage) || 1), t);
  if (t <= 9) return Array.from({ length: t }, (_, i) => i + 1);
  const set = new Set([1, t, c, c - 1, c + 1]);
  return [...set].filter((p) => p >= 1 && p <= t).sort((a, b) => a - b);
}

/** Category id from API row (`id` or legacy `_id`) — same as Restaurant Menu. */
function categoryRowId(row) {
  const v = row?.id ?? row?._id;
  if (v == null || String(v).trim() === "") return undefined;
  return String(v).trim();
}

/** Tab order: seed order first, then remaining API names — mirrors `resto.jsx` `orderCategoryNames`. */
function orderCategoryNamesFromApi(rows = []) {
  const names = Array.isArray(rows) ? rows.map((c) => String(c?.name || "").trim()).filter(Boolean) : [];
  const seen = new Set();
  const ordered = [];
  for (const n of DEFAULT_CATEGORY_ORDER) {
    if (names.includes(n) && !seen.has(n)) {
      seen.add(n);
      ordered.push(n);
    }
  }
  for (const n of names.sort((a, b) => a.localeCompare(b))) {
    if (!seen.has(n)) {
      seen.add(n);
      ordered.push(n);
    }
  }
  return ordered.length > 0 ? ordered : [...DEFAULT_CATEGORY_ORDER];
}

/** Map GET /api/menu row → POS card shape (same category resolution idea as Restaurant Menu). */
function menuItemToPosDish(m, categoriesRows = []) {
  const rawId = m.id ?? m._id;
  const id = rawId != null ? String(rawId) : "";
  const price = Number(m.price);
  const categoryNameFromPayload =
    typeof m.category === "string"
      ? m.category.trim()
      : m.category && typeof m.category === "object" && m.category.name
        ? String(m.category.name).trim()
        : "";
  const categoryRefId = String(m.categoryRef ?? m.categoryId ?? "").trim();
  const categoryNameFromRef =
    categoryRefId && Array.isArray(categoriesRows)
      ? String(
          categoriesRows.find((c) => String(categoryRowId(c) ?? "") === categoryRefId)?.name || "",
        ).trim()
      : "";
  let categoryName =
    categoryNameFromPayload ||
    categoryNameFromRef ||
    (categoriesRows[0]?.name ? String(categoriesRows[0].name).trim() : "") ||
    DEFAULT_CATEGORY_ORDER[0];
  if (!categoryName || categoryName.toLowerCase() === "uncategorized") {
    categoryName = DEFAULT_CATEGORY_ORDER[0];
  }
  const name = String(m.itemName ?? m.name ?? "").trim();
  return {
    id,
    name,
    price: Number.isFinite(price) ? price : 0,
    category: categoryName,
    img: m.imageUrl || "",
    desc: m.description || "",
    availability: m.availability,
  };
}

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

function downloadPosReceiptPdf({ orderedItems, discountRate, discountLabel, paymentMethod, cashierName }) {
  const rows = Array.isArray(orderedItems) ? orderedItems : [];
  const subtotal = rows.reduce((s, i) => s + Number(i?.dish?.price || 0) * Number(i?.qty || 0), 0);
  const safeDiscount = Number(discountRate) || 0;
  const discountAmt = subtotal * safeDiscount;
  const total = subtotal - discountAmt;
  const fmtPdf = (n) =>
    `PHP ${Number(n || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = 14;
  const now = new Date();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ABELA SUITES - RECEIPT", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date: ${now.toLocaleDateString("en-PH")} ${now.toLocaleTimeString("en-PH")}`, margin, y);
  y += 5;
  doc.text(`Cashier: ${cashierName || "Cashier"}`, margin, y);
  y += 5;
  doc.text(`Payment Method: ${paymentMethod || "Cash"}`, margin, y);
  y += 8;

  const body =
    rows.length > 0
      ? rows.map((line) => {
          const name = String(line?.dish?.name || "Item");
          const qty = Number(line?.qty || 0);
          const unitPrice = Number(line?.dish?.price || 0);
          const lineTotal = unitPrice * qty;
          return [
            `${name} x${qty}`,
            fmtPdf(unitPrice),
            fmtPdf(lineTotal),
          ];
        })
      : [["No items", "", ""]];

  autoTable(doc, {
    startY: y,
    head: [["Item", "Unit Price", "Subtotal"]],
    body,
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [184, 146, 42], textColor: 255 },
    margin: { left: margin, right: margin },
    theme: "striped",
  });

  y = (doc.lastAutoTable?.finalY || y) + 8;
  doc.setFontSize(11);
  doc.text(`Subtotal: ${fmtPdf(subtotal)}`, margin, y);
  y += 6;
  doc.text(`Discount (${discountLabel || "No Discount"}): ${fmtPdf(discountAmt)}`, margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${fmtPdf(total)}`, margin, y);

  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  doc.save(`Abela_POS_Receipt_${stamp}.pdf`);
}

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

function PosPromptModal({ message, onClose }) {
  return (
    <div className="abela-overlay" onClick={onClose}>
      <div className="abela-modal pos-notice-modal" onClick={(e) => e.stopPropagation()}>
        <button className="abela-modal-close" onClick={onClose} aria-label="Close message">
          &#x2715;
        </button>
        <div className="pos-notice-header">
          <h2 className="pos-notice-title">Notice</h2>
        </div>
        <p className="pos-notice-message">{message}</p>
        <div className="pos-notice-actions">
          <button type="button" className="pos-notice-ok-btn" onClick={onClose}>
            OK
          </button>
        </div>
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
              <tr key={`${it.dish.id}-${i}`}>
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
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { topbarProfile } = useTopbarUserProfile("cashier");
  const [menuDishes, setMenuDishes] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const categoryTabNames = useMemo(() => orderCategoryNamesFromApi(menuCategories), [menuCategories]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");
  const [category, setCategory] = useState("Main Course");
  const [currentPage, setCurrentPage] = useState(1);
  /** Matches ADMIN_1 Restaurant Menu pagination options (page size). */
  const [menuLimit, setMenuLimit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalMenuItems, setTotalMenuItems] = useState(0);
  const [orderedItems, setOrderedItems] = useState([]);
  const [discountRate, setDiscountRate] = useState(0);
  const [paymentMethod,setPaymentMethod]= useState("Cash");
  const [amountGiven,  setAmountGiven]  = useState("");
  const [showGcash,    setShowGcash]    = useState(false);
  const [showBill,     setShowBill]     = useState(false);
  /** After checkout, cart is cleared but the bill modal still needs the saved lines. */
  const [receiptSnapshot, setReceiptSnapshot] = useState(null);
  /** Keep last successful receipt so Print Receipt can reopen it later. */
  const [lastReceiptSnapshot, setLastReceiptSnapshot] = useState(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [promptMessage, setPromptMessage] = useState("");
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
  const userRef = useRef(null);
  const menuPageFetchGenRef = useRef(0);

  /** Loads category tabs from API (and optional focus dish). Dish rows load via paginated GET /api/menu when category changes — same pattern as Restaurant Menu. */
  const loadPosMenu = useCallback(async (focusMenuItemId = "", opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) {
      setMenuLoading(true);
      setMenuError("");
    }
    try {
      const cats = await fetchCategoriesBackend().catch(() => []);
      const rows = Array.isArray(cats) ? cats : [];
      setMenuCategories(rows);

      if (focusMenuItemId) {
        try {
          const item = await fetchMenuItemByIdBackend(String(focusMenuItemId));
          const mapped = menuItemToPosDish(item, rows);
          setCategory(mapped.category);
          setCurrentPage(1);
          setSearchInput("");
          setDebouncedSearch("");
        } catch {
          /* focus item missing — keep current category */
        }
      }
    } catch (e) {
      if (!silent) {
        setMenuCategories([]);
        setMenuError(
          e?.code === "NO_TOKEN"
            ? "Sign in as cashier to load the restaurant menu."
            : e?.message || "Could not load menu.",
        );
      }
    } finally {
      if (!silent) setMenuLoading(false);
    }
  }, []);

  const { bellNotifications, hasUnreadBell, handleNotifItemClick, reloadRestaurantOrders } = useCashierUnifiedBell({
    displayName: topbarProfile?.name || TOPBAR.cashier.profile.name,
    onMenuNotificationRead: (n) => void loadPosMenu(n?.menuItemId || ""),
    onOrderNotificationClick: (n) =>
      navigate("/order-history", { state: { focusOrderId: n.orderId, fromNotification: true } }),
  });

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (menuLoading) return undefined;

    const catRow = menuCategories.find((c) => String(c?.name ?? "").trim() === String(category ?? "").trim());
    const categoryId = categoryRowId(catRow);

    let cancelled = false;
    const ac = new AbortController();
    const gen = ++menuPageFetchGenRef.current;

    setMenuError("");

    void (async () => {
      try {
        const result = await fetchMenuPageBackend(
          currentPage,
          menuLimit,
          {
            categoryId,
            availability: "available",
            search: debouncedSearch || undefined,
          },
          { signal: ac.signal },
        );
        if (cancelled || gen !== menuPageFetchGenRef.current) return;
        const rows = Array.isArray(result?.data) ? result.data : [];
        if (rows.length === 0 && (Number(result?.totalItems) || 0) > 0 && currentPage > 1) {
          setCurrentPage((p) => Math.max(1, p - 1));
          return;
        }
        const tp = Number(result?.totalPages);
        const ti = Number(result?.totalItems);
        setTotalPages(Number.isFinite(tp) && tp >= 1 ? Math.min(9999, tp) : 1);
        setTotalMenuItems(Number.isFinite(ti) && ti >= 0 ? ti : rows.length);
        setMenuDishes(rows.map((m) => menuItemToPosDish(m, menuCategories)));
      } catch (e) {
        if (cancelled || gen !== menuPageFetchGenRef.current || e?.name === "AbortError") return;
        setMenuDishes([]);
        setTotalMenuItems(0);
        setTotalPages(1);
        setMenuError(e?.message || "Could not load dishes for this category.");
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [menuLoading, menuCategories, category, currentPage, menuLimit, debouncedSearch]);

  useEffect(() => {
    void loadPosMenu();
  }, [loadPosMenu]);

  useEffect(() => {
    const onTok = () => void loadPosMenu();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
  }, [loadPosMenu]);

  useEffect(() => {
    const id = window.setInterval(() => void loadPosMenu("", { silent: true }), MENU_AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [loadPosMenu]);

  useEffect(() => {
    const focusMenuItemId = location.state?.focusMenuItemId;
    if (!focusMenuItemId) return;
    void loadPosMenu(String(focusMenuItemId));
    navigate("/cashier", { replace: true, state: {} });
  }, [location.state, loadPosMenu, navigate]);

  useEffect(() => {
    if (categoryTabNames.length === 0) return;
    if (!categoryTabNames.includes(category)) {
      setCategory(categoryTabNames[0]);
      setCurrentPage(1);
    }
  }, [categoryTabNames, category]);

  useEffect(() => {
    setCurrentPage(1);
  }, [menuLimit]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  function handleSearch() {
    setDebouncedSearch(searchInput.trim());
    setCurrentPage(1);
  }

  function handleCategoryChange(cat) {
    setCategory(cat);
    setCurrentPage(1);
    setSearchInput("");
    setDebouncedSearch("");
  }

  // ── Cart logic ──
  function addToOrder(dish) {
    if (!dish.id) return;
    setOrderedItems((prev) => {
      const existing = prev.find((i) => String(i.dish.id) === String(dish.id));
      if (existing) {
        return prev.map((i) =>
          String(i.dish.id) === String(dish.id) ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { dish, qty: 1 }];
    });
  }
  function changeQty(dishId, delta) {
    setOrderedItems((prev) => {
      const updated = prev.map((i) =>
        String(i.dish.id) === String(dishId) ? { ...i, qty: i.qty + delta } : i,
      );
      return updated.filter((i) => i.qty > 0);
    });
  }
  function removeItem(dishId) {
    setOrderedItems((prev) => prev.filter((i) => String(i.dish.id) !== String(dishId)));
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

  const openPrompt = useCallback((msg) => {
    setPromptMessage(String(msg || "Please review your input."));
  }, []);

  async function handleSendToBill() {
    if (orderedItems.length === 0) {
      openPrompt("Please select at least one dish before sending to bill.");
      return;
    }
    if (paymentMethod === "Cash" && given + 1e-6 < total) {
      openPrompt("Amount given is less than the total. Enter enough cash to complete the sale.");
      return;
    }
    const badLine = orderedItems.find((i) => !i.dish?.id);
    if (badLine) {
      openPrompt("Cart has an item without a menu id. Reload the menu and try again.");
      return;
    }

    const roundedTotal = Math.round(total * 100) / 100;
    const guestEmail = getPosWalkInGuestEmail();
    const items = orderedItems.map((i) => ({
      menuItemId: String(i.dish.id),
      quantity: i.qty,
    }));

    setCheckoutBusy(true);
    try {
      const created = await createRestaurantOrderBackend({
        guestEmail,
        items,
        totalAmount: roundedTotal,
      });
      const orderId = created?.id;
      if (!orderId) throw new Error("Order was created but no id was returned.");

      const pm = paymentMethod === "GCash" ? "gcash" : "cash";
      await patchRestaurantOrderPaymentBackend(orderId, {
        amountPaid: roundedTotal,
        paymentMethod: pm,
      });
      await patchRestaurantOrderStatusBackend(orderId, "completed");

      await reloadRestaurantOrders();

      const snapshot = {
        orderedItems: orderedItems.map((i) => ({
          dish: { ...i.dish },
          qty: i.qty,
        })),
        discountRate,
        discountLabel,
        paymentMethod,
      };
      setReceiptSnapshot(snapshot);
      setLastReceiptSnapshot(snapshot);
      setOrderedItems([]);
      setDiscountRate(0);
      setPaymentMethod("Cash");
      setAmountGiven("");
      setShowBill(true);
    } catch (e) {
      openPrompt(e?.message || "Could not save this order. Check that a guest user exists for walk-in sales.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  function handlePrintReceipt() {
    const printable = orderedItems.length > 0
      ? { orderedItems, discountRate, discountLabel, paymentMethod }
      : lastReceiptSnapshot;
    if (!printable || !Array.isArray(printable.orderedItems) || printable.orderedItems.length === 0) {
      openPrompt("No receipt available yet. Complete an order first.");
      return;
    }
    downloadPosReceiptPdf({
      ...printable,
      cashierName: TOPBAR.cashier.profile.name,
    });
  }
  const isSelected = (dish) => orderedItems.some((i) => String(i.dish.id) === String(dish.id));

  const billSource = receiptSnapshot || {
    orderedItems,
    discountRate,
    discountLabel,
    paymentMethod,
  };

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
              onItemClick={handleNotifItemClick}
              notifications={bellNotifications}
              bellIconClassName="topbar-icon"
              dot={hasUnreadBell ? "active" : "muted"}
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
              {menuError ? (
                <p className="pos-menu-banner pos-menu-banner--err" role="status">
                  {menuError}
                </p>
              ) : null}
              {menuLoading ? (
                <p className="pos-menu-banner" role="status">
                  Loading menu…
                </p>
              ) : null}
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

              {/* Category Tabs — labels from MongoDB via /api/menu */}
              <div className="category-tabs">
                {categoryTabNames.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-tab${category === cat ? " active" : ""}`}
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Dish Grid */}
              <div className="dish-grid">
                {menuDishes.length === 0 ? (
                  <p className="no-results">No dishes found.</p>
                ) : (
                  menuDishes.map((dish) => (
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
                        <div className="dish-price">
                          ₱
                          {Number.isInteger(dish.price)
                            ? dish.price
                            : dish.price.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="dish-desc">{dish.desc}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination — same structure as Restaurant Menu (`rm-pagination-*`) */}
              {!menuLoading && !menuError ? (
                <div className="rm-pagination-row pos-menu-pagination">
                  <div className="rm-pagination-meta">
                    <span className="rm-pagination-count">
                      {totalMenuItems} dish{totalMenuItems === 1 ? "" : "es"} · Page {safePage} of {totalPages}
                    </span>
                    <label className="rm-pagination-limit">
                      <span>Per page</span>
                      <select
                        className="rm-pagination-select"
                        value={menuLimit}
                        onChange={(e) => setMenuLimit(Number(e.target.value))}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                  </div>
                  <div className="rm-pagination-btns">
                    <button
                      type="button"
                      className="rm-page-btn"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    {visibleMenuPageNumbers(safePage, totalPages).map((pNum, idx, arr) => {
                      const prevNum = arr[idx - 1];
                      const showEllipsis = prevNum && pNum - prevNum > 1;
                      return (
                        <span key={pNum} className="rm-page-btn-wrap">
                          {showEllipsis ? <span className="rm-page-ellipsis">…</span> : null}
                          <button
                            type="button"
                            className={`rm-page-btn${pNum === safePage ? " rm-page-btn--active" : ""}`}
                            onClick={() => setCurrentPage(pNum)}
                          >
                            {pNum}
                          </button>
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      className="rm-page-btn"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
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
                    <div key={String(item.dish.id)} className="ordered-item">
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

              <button
                type="button"
                className="send-to-bill-btn"
                disabled={checkoutBusy || orderedItems.length === 0}
                onClick={() => void handleSendToBill()}
              >
                <SendIcon /> {checkoutBusy ? "Saving…" : "Send to Bill"}
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
      {showBill && (
        <OrderBillModal
          orderedItems={billSource.orderedItems}
          discountRate={billSource.discountRate}
          discountLabel={billSource.discountLabel}
          paymentMethod={billSource.paymentMethod}
          cashierName={TOPBAR.cashier.profile.name}
          onClose={() => {
            setShowBill(false);
            if (receiptSnapshot) setLastReceiptSnapshot(receiptSnapshot);
            setReceiptSnapshot(null);
          }}
        />
      )}
      {promptMessage ? <PosPromptModal message={promptMessage} onClose={() => setPromptMessage("")} /> : null}

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />

    </>
  );
}
