import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import GuestTopbarActions from "./GuestTopbarActions";
import GuestSidebar from "./GuestSidebar";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import { buildGuestNavItems } from "./guestNavItems";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import { backendUrl } from "../api/config";
import { fetchGuestMenuPortal, createGuestRestaurantOrderBackend, fetchGuestMeBackend, fetchBookingsBackend } from "../api/guestApi";
import { getBookingRoomNumber } from "./bookingRoomDisplay";
import {
  isStoredImageRef,
  readImageFileAsDataUrlLimited,
  validateImageFileType,
} from "../utils/s3ImageUpload";
import { formatLocalTodayYmd } from "./roomStayDates";
import { BILLING_CONFIG } from "./billingConfig";
import { StaffSuccessModal } from "../components/StaffSuccessModal";
import "../components/StaffSuccessModal.css";
import "./guest-room.css";
import "./guest-restaurant-menu.css";

const MENU_SYNC_MS = 30000;
const HERO_IMAGE = "/restaurant-hero.png";
const PLACEHOLDER_DISH =
  "https://placehold.co/480x360/f5f0e8/b8922a?text=Abela+Suites";

const GCASH_PAYMENT_QR = "/QR.png";
const GCASH_INFO = {
  accountName: "L** J** P.",
  mobileNo: "093* **** 971",
  userId: "***********Y1JMWN",
};

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const DIETARY_META = {
  vegetarian: { label: "Vegetarian", symbol: "V" },
  vegan: { label: "Vegan", symbol: "VG" },
  halal: { label: "Halal", symbol: "H" },
  "gluten-free": { label: "Gluten-Free", symbol: "GF" },
};

const SPICE_LABELS = ["", "Mild", "Medium", "Hot"];

function formatPeso(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function paymentMethodLabel(method) {
  return method === "gcash" ? "GCash" : "Cash";
}

function resolveImageSrc(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return PLACEHOLDER_DISH;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) return s;
  const path = s.startsWith("/") ? s : `/${s}`;
  return backendUrl(path);
}

function isAvailable(dish) {
  return String(dish?.availability ?? dish?.status ?? "available").toLowerCase() === "available";
}

function computeOrderTotals(lines) {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)
  );
  const serviceCharge =
    BILLING_CONFIG.SERVICE_FEE_RATE > 0
      ? roundMoney(subtotal * BILLING_CONFIG.SERVICE_FEE_RATE)
      : 0;
  const taxable = roundMoney(subtotal + serviceCharge);
  const taxAmount =
    BILLING_CONFIG.VAT_RATE > 0 ? roundMoney(taxable * BILLING_CONFIG.VAT_RATE) : 0;
  const grandTotal = roundMoney(taxable + taxAmount);
  return { subtotal, serviceCharge, taxAmount, grandTotal };
}

function MenuSkeletonCard() {
  return (
    <div className="grm-dish-card grm-skeleton-card" aria-hidden="true">
      <div className="grm-skeleton grm-skeleton-img" />
      <div className="grm-skeleton-body">
        <div className="grm-skeleton grm-skeleton-line grm-skeleton-line--title" />
        <div className="grm-skeleton grm-skeleton-line grm-skeleton-line--desc" />
        <div className="grm-skeleton grm-skeleton-line grm-skeleton-line--price" />
      </div>
    </div>
  );
}

function EmptyMenuState() {
  return (
    <div className="grm-empty-state">
      <div className="grm-empty-illustration" aria-hidden="true">
        <svg viewBox="0 0 120 120" fill="none" width="88" height="88">
          <circle cx="60" cy="60" r="54" stroke="#d4b97a" strokeWidth="2" fill="#faf9f6" />
          <path d="M38 72c8-14 36-14 44 0" stroke="#b8922a" strokeWidth="2" strokeLinecap="round" />
          <circle cx="48" cy="52" r="4" fill="#b8922a" />
          <circle cx="72" cy="52" r="4" fill="#b8922a" />
        </svg>
      </div>
      <h3>No dishes found</h3>
      <p>Try a different search or category, or check back when the kitchen updates the menu.</p>
    </div>
  );
}

function useBodyScrollLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);
}

function deferModalClose(closeFn) {
  window.setTimeout(() => closeFn?.(), 0);
}

function DishMetaTags({ dish }) {
  const tags = Array.isArray(dish.dietaryTags) ? dish.dietaryTags : [];
  const spice = Number(dish.spiceLevel) || 0;
  if (spice <= 0 && tags.length === 0 && !dish.category) return null;

  return (
    <div className="grm-dish-detail-tags">
      {dish.category ? <span className="grm-dish-detail-tag category">{dish.category}</span> : null}
      {spice > 0 ? (
        <span className="grm-dish-detail-tag spice">🌶 {SPICE_LABELS[spice]}</span>
      ) : null}
      {tags.map((tag) => {
        const meta = DIETARY_META[String(tag).toLowerCase()];
        if (!meta) return null;
        return (
          <span key={tag} className="grm-dish-detail-tag" title={meta.label}>
            {meta.symbol} {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function DishDetailModal({ dish, onClose, onAddToOrder }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useBodyScrollLock(Boolean(dish));

  useEffect(() => {
    if (!dish) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dish?.id]);

  if (!dish) return null;

  const available = isAvailable(dish);
  const unitPrice = Number(dish.price) || 0;
  const dishName = dish.name || dish.itemName || "Dish";

  return createPortal(
    <div
      className="modal-backdrop active grm-dish-detail-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        className="modal modal--booking grm-dish-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grm-dish-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grm-dish-detail-hero">
          <img src={resolveImageSrc(dish.imageUrl)} alt="" className="grm-dish-detail-hero-img" />
          <div className="grm-dish-detail-hero-overlay" />
          <button type="button" className="grm-dish-detail-close" onClick={() => onCloseRef.current?.()} aria-label="Close">
            ×
          </button>
          <span className={`grm-dish-detail-avail${available ? " available" : ""}`}>
            {available ? "Available" : "Unavailable"}
          </span>
          <div className="grm-dish-detail-hero-text">
            {dish.category ? <span className="grm-dish-detail-category">{dish.category}</span> : null}
            <h2 id="grm-dish-detail-title" className="grm-dish-detail-title">{dishName}</h2>
            <span className="grm-dish-detail-price">{formatPeso(unitPrice)}</span>
          </div>
        </div>

        <div className="grm-dish-detail-body">
          <section className="grm-dish-detail-section">
            <h3 className="grm-dish-detail-section-label">About this dish</h3>
            <p className="grm-dish-detail-desc">
              {dish.description || "No description provided for this dish yet."}
            </p>
          </section>
          <DishMetaTags dish={dish} />
        </div>

        <div className="grm-dish-detail-footer">
          <button type="button" className="btn-cancel-confirm grm-dish-detail-close-btn" onClick={() => onCloseRef.current?.()}>
            Close
          </button>
          <button
            type="button"
            className="btn-book-now grm-dish-detail-order-btn"
            disabled={!available}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToOrder();
            }}
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AddToOrderModal({ dish, qty, setQty, notes, setNotes, onClose, onConfirm }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useBodyScrollLock(Boolean(dish));

  useEffect(() => {
    if (!dish) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dish?.id]);

  if (!dish) return null;

  const available = isAvailable(dish);
  const unitPrice = Number(dish.price) || 0;
  const lineTotal = roundMoney(unitPrice * qty);
  const dishName = dish.name || dish.itemName || "Dish";

  function handleConfirm(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!available) return;
    onConfirm();
    deferModalClose(onCloseRef.current);
  }

  return createPortal(
    <div
      className="modal-backdrop active grm-add-order-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        className="modal modal--booking grm-add-order-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Add ${dishName} to order`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grm-add-order-top">
          <img src={resolveImageSrc(dish.imageUrl)} alt="" className="grm-add-order-thumb" />
          <div className="grm-add-order-top-info">
            <span className="grm-add-order-top-label">Add to your order</span>
            <h2 className="grm-add-order-top-title">{dishName}</h2>
            <span className="grm-add-order-top-price">{formatPeso(unitPrice)} each</span>
          </div>
          <button type="button" className="grm-add-order-top-close" onClick={() => onCloseRef.current?.()} aria-label="Close">
            ×
          </button>
        </div>

        <div className="grm-add-order-form">
          <div className="grm-add-order-card">
            <div className="grm-add-order-card-head">
              <span className="grm-add-order-card-label">Quantity</span>
              <span className="grm-add-order-card-hint">How many would you like?</span>
            </div>
            <div className="grm-add-order-qty-row">
              <div className="grm-qty-control grm-qty-control--lg grm-add-order-qty">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => q + 1)}
                >
                  +
                </button>
              </div>
              <div className="grm-add-order-line-preview">
                <span>Line total</span>
                <strong>{formatPeso(lineTotal)}</strong>
              </div>
            </div>
          </div>

          <div className="grm-add-order-card grm-add-order-notes-card">
            <label htmlFor="grm-add-order-notes" className="grm-add-order-notes-label">
              <span className="grm-add-order-notes-icon" aria-hidden="true">✎</span>
              Additional requests
              <span className="grm-add-order-notes-optional">Optional</span>
            </label>
            <p className="grm-add-order-notes-hint">
              Allergies, spice preference, or special plating notes for the kitchen.
            </p>
            <textarea
              id="grm-add-order-notes"
              rows={2}
              placeholder="e.g. No onions, extra spicy, serve on the side…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="grm-add-order-footer">
          <button
            type="button"
            className="btn-book-now grm-add-order-submit"
            disabled={!available}
            onClick={handleConfirm}
          >
            <span className="grm-add-order-submit-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </span>
            Confirm — {formatPeso(lineTotal)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function buildOrderSuccessSnapshot(order, { paymentMethod, roomNumber, contactNumber, itemCount, grandTotal }) {
  const id = String(order?.id ?? order?._id ?? "").trim();
  return {
    id,
    totalAmount: Number(order?.totalAmount ?? grandTotal) || 0,
    paymentMethod: String(order?.paymentMethod || paymentMethod || "cash").toLowerCase(),
    roomNumber: String(order?.roomNumber || roomNumber || "").trim(),
    contactNumber: String(order?.guestPhone || order?.contactNumber || contactNumber || "").trim(),
    itemCount: Number(itemCount) || 0,
    transactionId: String(order?.transactionId || "").trim(),
    paymentDate: String(order?.paymentDate || "").trim(),
  };
}

function formatOrderSuccessMessage(snapshot) {
  const ref = snapshot.id ? `RO-${String(snapshot.id).slice(-6).toUpperCase()}` : "—";
  const lines = [
    "Thank you! Your order has been sent to our kitchen and will appear on the cashier dashboard right away.",
    "",
    `Order ref.: ${ref}`,
    `Room: ${snapshot.roomNumber || "—"}`,
    `Items: ${snapshot.itemCount}`,
    `Total: ${formatPeso(snapshot.totalAmount)}`,
    `Payment: ${paymentMethodLabel(snapshot.paymentMethod)}`,
  ];
  if (snapshot.paymentMethod === "gcash" && snapshot.transactionId) {
    lines.push(
      `GCash ref.: ${snapshot.transactionId}${snapshot.paymentDate ? ` · ${snapshot.paymentDate}` : ""}`
    );
  }
  return lines.join("\n");
}

function OrderToast({ message }) {
  if (!message) return null;
  return createPortal(
    <div className="grm-toast grm-toast--global" role="status">
      <span className="grm-toast-icon" aria-hidden="true">
        !
      </span>
      <span>{message}</span>
    </div>,
    document.body
  );
}

function GcashPaymentModal({
  open,
  onClose,
  payForm,
  payErrors,
  proofPreview,
  payQrMissing,
  onPayFormChange,
  onProofUpload,
  onClearForm,
  onSave,
  onQrError,
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop active grm-gcash-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        className="modal payment-modal grm-gcash-payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grm-gcash-payment-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="grm-gcash-payment-title" className="modal-title">
            GCash Payment
          </h2>
          <button type="button" className="modal-close" onClick={() => onCloseRef.current?.()}>
            ✕
          </button>
        </div>
        <div className="modal-body payment-modal-body">
          <p className="payment-modal-lead">
            Scan the QR code, pay the order total, then upload your proof here. Your order is sent only after you tap Confirm Order.
          </p>
          <div className="payment-modal-columns">
            <div className="payment-qr-side">
              <div className="payment-qr-brand">
                <div className={`qr-payment-frame${payQrMissing ? " qr-payment-frame--empty" : ""}`}>
                  {!payQrMissing && (
                    <img
                      src={GCASH_PAYMENT_QR}
                      alt="GCash QR code"
                      className="qr-img qr-img-payment"
                      decoding="async"
                      onError={onQrError}
                    />
                  )}
                  {payQrMissing && (
                    <div className="qr-payment-placeholder" aria-hidden>
                      <span className="qr-payment-placeholder-label">QR code</span>
                    </div>
                  )}
                </div>
                <p className="qr-name">GCash</p>
              </div>
              <p className="qr-handle">@Abela Suites</p>
              <p className="grm-gcash-account">{GCASH_INFO.accountName}</p>
              <p className="grm-gcash-account">Mobile: {GCASH_INFO.mobileNo}</p>
            </div>
            <div className="payment-form-side">
              <h3 className="payment-form-title">Payment details</h3>
              <div className="payment-form-grid">
                <div className="form-group">
                  <label>
                    Amount Paid <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="amount"
                    value={payForm.amount}
                    placeholder="e.g. 130.00"
                    className={payErrors.amount ? "input-error" : ""}
                    onChange={onPayFormChange}
                  />
                  {payErrors.amount ? <span className="field-error">{payErrors.amount}</span> : null}
                </div>
                <div className="form-group">
                  <label>
                    Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={payForm.date}
                    className={payErrors.date ? "input-error" : ""}
                    onChange={onPayFormChange}
                  />
                  {payErrors.date ? <span className="field-error">{payErrors.date}</span> : null}
                </div>
              </div>
              <div className="form-group grm-gcash-form-group">
                <label>
                  Transaction ID <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="txId"
                  value={payForm.txId}
                  placeholder="Enter transaction ID"
                  className={payErrors.txId ? "input-error" : ""}
                  onChange={onPayFormChange}
                />
                {payErrors.txId ? <span className="field-error">{payErrors.txId}</span> : null}
              </div>
              <div className="form-group grm-gcash-form-group">
                <label>
                  Proof of payment <span className="required">*</span>
                </label>
                <label className={`upload-box proof-upload${payErrors.proof ? " box-error" : ""}`}>
                  <input type="file" accept="image/*" onChange={onProofUpload} />
                  {proofPreview ? (
                    <img src={proofPreview} className="upload-preview" alt="Proof preview" />
                  ) : (
                    <div className="upload-placeholder">
                      <UploadIcon />
                      <span>Upload your proof of payment here...</span>
                    </div>
                  )}
                </label>
                {payErrors.proof ? <span className="field-error">{payErrors.proof}</span> : null}
              </div>
              <div className="payment-form-actions">
                <button type="button" className="btn-clear" onClick={onClearForm}>
                  Clear
                </button>
                <button type="button" className="btn-submit-reservation" onClick={onSave}>
                  Save payment details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function GuestRestaurantMenu() {
  const navigate = useNavigate();
  const navItems = useMemo(() => buildGuestNavItems("/restaurant-menu"), []);
  const topbarRef = useRef(null);
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const {
    sidebarCollapsed,
    isMobile,
    mobileSidebarOpen,
    closeMobileSidebar,
    toggleSidebar,
    shellClassName,
    asideStyle,
    mainStyle,
    logoWrapStyle,
    logoImgStyle,
  } = useGuestSidebarLayout();

  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [viewDish, setViewDish] = useState(null);
  const [orderDish, setOrderDish] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [payOpen, setPayOpen] = useState(false);
  const [payQrMissing, setPayQrMissing] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", date: "", txId: "" });
  const [payErrors, setPayErrors] = useState({});
  const [proofPreview, setProofPreview] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [pendingGcash, setPendingGcash] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [orderRoomNumber, setOrderRoomNumber] = useState("");
  const [orderContactNumber, setOrderContactNumber] = useState("");
  const [orderBookingId, setOrderBookingId] = useState("");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  const loadGuestOrderContext = useCallback(async () => {
    try {
      const [me, bookings] = await Promise.all([
        fetchGuestMeBackend().catch(() => null),
        fetchBookingsBackend().catch(() => []),
      ]);
      const profile = me?.guest || me || {};
      const phone = String(profile.phone || me?.phone || "").trim();
      const activeStatuses = new Set(["occupied", "approved", "confirmed", "pending"]);
      const roomBooking = (Array.isArray(bookings) ? bookings : [])
        .filter(
          (b) =>
            String(b?.type || "").toLowerCase() === "room" &&
            activeStatuses.has(String(b?.status || "").toLowerCase()),
        )
        .sort((a, b) => new Date(b?.updatedAt || 0) - new Date(a?.updatedAt || 0))[0];
      const roomNum = roomBooking
        ? getBookingRoomNumber(roomBooking, null) || String(roomBooking.roomNumber || "").trim()
        : "";
      const contact = phone || String(roomBooking?.contactNumber || "").trim();
      setOrderRoomNumber((prev) => prev.trim() || roomNum);
      setOrderContactNumber((prev) => prev.trim() || contact);
      setOrderBookingId(
        roomBooking ? String(roomBooking.id || roomBooking._id || "").trim() : "",
      );
    } catch {
      /* optional prefill */
    }
  }, []);

  const loadMenu = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setCatalogLoading(true);
    try {
      const data = await fetchGuestMenuPortal();
      setMenu(data.menu);
      setCategories(data.categories);
      setCatalogError("");
    } catch (e) {
      if (!silent) setCatalogError(e?.message || "Could not load menu.");
    } finally {
      if (!silent) setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
    const id = window.setInterval(() => loadMenu({ silent: true }), MENU_SYNC_MS);
    return () => window.clearInterval(id);
  }, [loadMenu]);

  useEffect(() => {
    void loadGuestOrderContext();
  }, [loadGuestOrderContext]);

  const categoryOptions = useMemo(() => {
    const fromApi = categories.map((c) => String(c.name || "").trim()).filter(Boolean);
    const fromMenu = [...new Set(menu.map((d) => String(d.category || "").trim()).filter(Boolean))];
    const merged = [...new Set([...fromApi, ...fromMenu])];
    return merged.sort((a, b) => a.localeCompare(b));
  }, [categories, menu]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter((dish) => {
      const cat = String(dish.category || "").trim();
      if (activeCategory !== "all" && cat !== activeCategory) return false;
      if (!q) return true;
      const name = String(dish.name || dish.itemName || "").toLowerCase();
      const desc = String(dish.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.toLowerCase().includes(q);
    });
  }, [menu, search, activeCategory]);

  const cartLines = useMemo(() => {
    return cart.map((line) => {
      const dish = menu.find((d) => String(d.id) === String(line.menuItemId));
      const unitPrice = Number(dish?.price) || 0;
      return {
        ...line,
        dish,
        unitPrice,
        lineTotal: roundMoney(unitPrice * line.quantity),
        unavailable: dish ? !isAvailable(dish) : true,
      };
    });
  }, [cart, menu]);

  const totals = useMemo(
    () =>
      computeOrderTotals(
        cartLines.filter((l) => !l.unavailable).map((l) => ({
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        }))
      ),
    [cartLines]
  );

  function clearPayForm() {
    setPayForm({ amount: "", date: "", txId: "" });
    setProofPreview(null);
    setProofFile(null);
    setPayErrors({});
  }

  function openGcashPaymentModal() {
    const grand = totals.grandTotal;
    setPayForm({
      amount: pendingGcash?.amount || (grand > 0 ? String(grand) : ""),
      date: pendingGcash?.date || formatLocalTodayYmd(),
      txId: pendingGcash?.txId || "",
    });
    setProofPreview(pendingGcash?.proofPreview || null);
    setProofFile(pendingGcash?.proofFile || null);
    setPayErrors({});
    setPayQrMissing(false);
    setPayOpen(true);
  }

  function selectPaymentMethod(method) {
    setPaymentMethod(method);
    if (method === "gcash") {
      openGcashPaymentModal();
    } else {
      setPayOpen(false);
      setPendingGcash(null);
      clearPayForm();
    }
  }

  function closePayModal() {
    setPayOpen(false);
    clearPayForm();
  }

  function handlePayFormChange(e) {
    const { name, value } = e.target;
    setPayForm((f) => ({ ...f, [name]: value }));
    setPayErrors((pe) => ({ ...pe, [name]: false }));
  }

  async function handleProofUpload(e) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    const typeErr = validateImageFileType(file);
    if (typeErr) {
      setProofPreview(null);
      setProofFile(null);
      setPayErrors((pe) => ({ ...pe, proof: typeErr }));
      showToast(typeErr);
      return;
    }
    setProofFile(file);
    setPayErrors((pe) => ({ ...pe, proof: false }));
    try {
      const dataUrl = await readImageFileAsDataUrlLimited(file);
      setProofPreview(dataUrl);
    } catch (err) {
      setProofPreview(null);
      setProofFile(null);
      setPayErrors((pe) => ({ ...pe, proof: err?.message || "Please upload proof of payment." }));
      showToast(err?.message || "Could not read the payment proof image.");
    }
  }

  function saveGcashPaymentDetails() {
    const errs = {};
    if (!payForm.amount.trim()) errs.amount = "Amount paid is required.";
    if (!payForm.date.trim()) errs.date = "Payment date is required.";
    if (!payForm.txId.trim()) errs.txId = "Transaction ID is required.";
    if (!isStoredImageRef(proofPreview)) errs.proof = "Please upload proof of payment.";
    setPayErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const paidNum = roundMoney(parseFloat(String(payForm.amount).replace(/,/g, "")));
    if (!Number.isFinite(paidNum) || paidNum <= 0) {
      setPayErrors((prev) => ({ ...prev, amount: "Enter a valid amount paid." }));
      return;
    }
    if (totals.grandTotal > 0 && paidNum + 1e-6 < totals.grandTotal) {
      setPayErrors((prev) => ({
        ...prev,
        amount: `Amount paid must be at least ${formatPeso(totals.grandTotal)}.`,
      }));
      return;
    }

    setPendingGcash({
      amount: payForm.amount.trim(),
      date: payForm.date.trim(),
      txId: payForm.txId.trim(),
      proofPreview: proofPreview || "",
      proofFile: proofFile || null,
      paidNum,
    });
    setPayOpen(false);
    clearPayForm();
    showToast("GCash payment details saved. Tap Confirm Order when ready.");
  }

  const cartCount = cartLines.reduce((n, l) => n + l.quantity, 0);

  function openDetail(dish) {
    setViewDish(dish);
  }

  function openAddOrder(dish) {
    setOrderDish(dish);
    setOrderQty(1);
    setOrderNotes("");
  }

  function startOrderFromDetail() {
    if (!viewDish) return;
    const dish = viewDish;
    setViewDish(null);
    deferModalClose(() => openAddOrder(dish));
  }

  function addToCart(dish, qty = 1, notes = "", { notify = true } = {}) {
    if (!dish?.id || !isAvailable(dish)) return;
    const id = String(dish.id);
    setCart((prev) => {
      const idx = prev.findIndex((l) => String(l.menuItemId) === id && l.specialInstructions === notes);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { menuItemId: id, quantity: qty, specialInstructions: notes }];
    });
    if (notify) showToast(`${dish.name || "Dish"} added to your order`);
  }

  function updateCartQty(menuItemId, specialInstructions, delta) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (String(l.menuItemId) !== String(menuItemId) || l.specialInstructions !== specialInstructions) {
            return l;
          }
          return { ...l, quantity: l.quantity + delta };
        })
        .filter((l) => l.quantity > 0)
    );
  }

  function removeCartLine(menuItemId, specialInstructions) {
    setCart((prev) =>
      prev.filter(
        (l) => !(String(l.menuItemId) === String(menuItemId) && l.specialInstructions === specialInstructions)
      )
    );
  }

  async function handlePlaceOrder() {
    const validLines = cartLines.filter((l) => !l.unavailable);
    if (validLines.length === 0) {
      showToast("Add at least one available dish to place an order.");
      return;
    }
    if (paymentMethod === "gcash" && !pendingGcash) {
      showToast("Add your GCash payment details and proof before confirming.");
      openGcashPaymentModal();
      return;
    }
    const roomNumber = orderRoomNumber.trim();
    const contactNumber = orderContactNumber.trim();
    if (!roomNumber) {
      showToast("Please enter your room number so the cashier can deliver your order.");
      return;
    }
    if (!contactNumber) {
      showToast("Please enter your contact number.");
      return;
    }
    setPlacingOrder(true);
    try {
      const payload = {
        paymentMethod,
        roomNumber,
        contactNumber,
        items: validLines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          specialInstructions: l.specialInstructions || "",
        })),
      };
      if (orderBookingId) payload.bookingId = orderBookingId;
      if (paymentMethod === "gcash" && pendingGcash) {
        payload.amountPaid = pendingGcash.paidNum;
        payload.transactionId = pendingGcash.txId;
        payload.paymentDate = pendingGcash.date;
        payload.paymentProofData = pendingGcash.proofPreview;
        payload.paymentProofName = "uploaded";
      }
      const order = await createGuestRestaurantOrderBackend(payload);
      const itemCount = validLines.reduce((sum, line) => sum + line.quantity, 0);
      const snapshot = buildOrderSuccessSnapshot(order, {
        paymentMethod,
        roomNumber,
        contactNumber,
        itemCount,
        grandTotal: totals.grandTotal,
      });
      setOrderSuccess(snapshot);
      setCart([]);
      setPendingGcash(null);
      setPaymentMethod("cash");
      setCartOpen(false);
    } catch (e) {
      const msg = String(e?.message || "Could not place order. Please try again.");
      if (e?.code === "NO_TOKEN" || /not signed in/i.test(msg)) {
        showToast("Please log in with your guest account before placing an order.");
      } else {
        showToast(msg);
      }
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <>
      <RailPortalShell
        rootClassName="guest-restaurant-page guest-portal-layout"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%", background: "#f5f0e8" }}
        mainStyle={mainStyle}
        rootProps={{
          onClick: () => topbarRef.current?.closeMenus(),
        }}
        sidebar={
          <GuestSidebar
            navItems={navItems}
            sidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
            mobileSidebarOpen={mobileSidebarOpen}
            closeMobileSidebar={closeMobileSidebar}
            shellClassName={shellClassName}
            asideStyle={asideStyle}
            logoWrapStyle={logoWrapStyle}
            logoImgStyle={logoImgStyle}
          />
        }
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <HousekeepingSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Restaurant Menu</span>
          </div>
          <GuestTopbarActions ref={topbarRef} onRequestLogout={requestLogout} />
        </header>

        <main className="content">
        <div className="grm-page">
          <section className="grm-hero">
            <img src={HERO_IMAGE} alt="Abela Suites restaurant" className="grm-hero-img" />
            <div className="grm-hero-overlay" />
            <div className="grm-hero-content">
              <p className="grm-hero-eyebrow">In-room dining · Abela Suites</p>
              <h1 className="grm-hero-title">The Restaurant</h1>
              <p className="grm-hero-desc">
                Curated dishes from our kitchen, synced live with our cashier system. Order from your suite and
                we&apos;ll prepare it with care.
              </p>
            </div>
          </section>

          <div className="grm-toolbar">
            <div className="grm-search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>
              <input
                type="search"
                className="grm-search-input"
                placeholder="Search dishes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search dishes"
              />
            </div>
            <div className="grm-category-pills" role="tablist" aria-label="Filter by category">
              <button
                type="button"
                className={`grm-pill${activeCategory === "all" ? " active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                All
              </button>
              {categoryOptions.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`grm-pill${activeCategory === cat ? " active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {catalogError && (
            <div className="grm-error-banner" role="alert">
              {catalogError}
              <button type="button" className="grm-retry-btn" onClick={() => loadMenu()}>
                Retry
              </button>
            </div>
          )}

          <div className="grm-layout">
            <div className="grm-menu-main">
              {catalogLoading ? (
                <div className="grm-dish-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <MenuSkeletonCard key={i} />
                  ))}
                </div>
              ) : filteredMenu.length === 0 ? (
                <EmptyMenuState />
              ) : (
                <div className="grm-dish-grid">
                  {filteredMenu.map((dish) => {
                    const available = isAvailable(dish);
                    const tags = Array.isArray(dish.dietaryTags) ? dish.dietaryTags : [];
                    const spice = Number(dish.spiceLevel) || 0;
                    return (
                      <article
                        key={dish.id}
                        className={`grm-dish-card${available ? "" : " unavailable"}`}
                      >
                        <div className="grm-dish-img-wrap">
                          <img
                            src={resolveImageSrc(dish.imageUrl)}
                            alt={dish.name || "Dish"}
                            className="grm-dish-img"
                            loading="lazy"
                          />
                          <span className={`grm-avail-badge${available ? " available" : ""}`}>
                            {available ? "Available" : "Unavailable"}
                          </span>
                        </div>
                        <div className="grm-dish-body">
                          <div className="grm-dish-head">
                            <h3 className="grm-dish-name">{dish.name || dish.itemName}</h3>
                            <span className="grm-dish-price">{formatPeso(dish.price)}</span>
                          </div>
                          {dish.description ? (
                            <p className="grm-dish-desc">{dish.description}</p>
                          ) : null}
                          <div className="grm-dish-meta">
                            {spice > 0 ? (
                              <span className="grm-meta-chip spice" title={`Spice: ${SPICE_LABELS[spice]}`}>
                                🌶 {SPICE_LABELS[spice]}
                              </span>
                            ) : null}
                            {tags.map((tag) => {
                              const meta = DIETARY_META[String(tag).toLowerCase()];
                              if (!meta) return null;
                              return (
                                <span key={tag} className="grm-meta-chip" title={meta.label}>
                                  {meta.symbol}
                                </span>
                              );
                            })}
                            {dish.category ? (
                              <span className="grm-meta-chip category">{dish.category}</span>
                            ) : null}
                          </div>
                          <div className="grm-dish-actions">
                            <button
                              type="button"
                              className="btn-cancel-confirm grm-dish-details-btn"
                              onClick={() => openDetail(dish)}
                            >
                              View Details
                            </button>
                            <button
                              type="button"
                              className="btn-book-now grm-dish-add-btn"
                              disabled={!available}
                              onClick={() => openAddOrder(dish)}
                            >
                              Add to Order
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <aside
              className={`grm-order-panel${cartOpen ? " open" : ""}${cartLines.length > 0 ? " has-items" : ""}`}
              aria-label="Order summary"
            >
              <div className="grm-order-panel-head">
                <h2>Your Order</h2>
                {isMobile && (
                  <button type="button" className="grm-panel-close" onClick={() => setCartOpen(false)}>
                    ×
                  </button>
                )}
              </div>

              {cartLines.length === 0 ? (
                <div className="grm-cart-empty">
                  <p>Your order is empty.</p>
                  <span>Browse the menu and add dishes to begin.</span>
                </div>
              ) : (
                <>
                  <div className="grm-order-panel-body">
                  <ul className="grm-cart-list">
                    {cartLines.map((line) => (
                      <li
                        key={`${line.menuItemId}-${line.specialInstructions}`}
                        className={`grm-cart-line${line.unavailable ? " unavailable" : ""}`}
                      >
                        <div className="grm-cart-line-info">
                          <strong>{line.dish?.name || "Dish"}</strong>
                          {line.specialInstructions ? (
                            <span className="grm-cart-notes">{line.specialInstructions}</span>
                          ) : null}
                          {line.unavailable ? (
                            <span className="grm-cart-warn">No longer available — remove to continue</span>
                          ) : null}
                          <span className="grm-cart-unit">{formatPeso(line.unitPrice)} each</span>
                        </div>
                        <div className="grm-cart-line-controls">
                          <div className="grm-qty-control">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() =>
                                updateCartQty(line.menuItemId, line.specialInstructions, -1)
                              }
                            >
                              −
                            </button>
                            <span>{line.quantity}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              disabled={line.unavailable}
                              onClick={() =>
                                updateCartQty(line.menuItemId, line.specialInstructions, 1)
                              }
                            >
                              +
                            </button>
                          </div>
                          <span className="grm-cart-line-total">{formatPeso(line.lineTotal)}</span>
                          <button
                            type="button"
                            className="grm-cart-remove"
                            aria-label="Remove item"
                            onClick={() => removeCartLine(line.menuItemId, line.specialInstructions)}
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="grm-guest-order-fields">
                    <label className="grm-guest-order-field">
                      <span className="grm-guest-order-field__label">Room Number</span>
                      <input
                        type="text"
                        className="grm-guest-order-field__input"
                        placeholder="e.g. 101"
                        value={orderRoomNumber}
                        onChange={(e) => setOrderRoomNumber(e.target.value)}
                        autoComplete="off"
                      />
                    </label>
                    <label className="grm-guest-order-field">
                      <span className="grm-guest-order-field__label">Contact Number</span>
                      <input
                        type="tel"
                        className="grm-guest-order-field__input"
                        placeholder="e.g. 09171234567"
                        value={orderContactNumber}
                        onChange={(e) => setOrderContactNumber(e.target.value)}
                        autoComplete="tel"
                      />
                    </label>
                  </div>

                  <div className="grm-payment-section">
                    <span className="grm-payment-label">Payment Method</span>
                    <div className="grm-payment-methods" role="group" aria-label="Select payment method">
                      <button
                        type="button"
                        className={`grm-pay-btn${paymentMethod === "cash" ? " active" : ""}`}
                        onClick={() => selectPaymentMethod("cash")}
                      >
                        <span className="grm-pay-icon" aria-hidden="true">₱</span>
                        Cash
                      </button>
                      <button
                        type="button"
                        className={`grm-pay-btn${paymentMethod === "gcash" ? " active" : ""}`}
                        onClick={() => selectPaymentMethod("gcash")}
                      >
                        <span className="grm-pay-icon grm-pay-icon--gcash" aria-hidden="true">G</span>
                        GCash
                      </button>
                    </div>
                    <p className="grm-payment-selected">
                      Selected: <strong>{paymentMethodLabel(paymentMethod)}</strong>
                    </p>
                    {paymentMethod === "gcash" && pendingGcash ? (
                      <p className="grm-gcash-draft-note" role="status">
                        GCash {formatPeso(pendingGcash.paidNum)} on {pendingGcash.date} · Ref. {pendingGcash.txId}
                        {pendingGcash.proofPreview ? " · Proof attached" : ""}
                        {" · "}
                        <button type="button" className="grm-gcash-edit-link" onClick={openGcashPaymentModal}>
                          Edit
                        </button>
                      </p>
                    ) : paymentMethod === "gcash" ? (
                      <p className="grm-gcash-draft-note" role="status">
                        Scan the QR code and upload your GCash proof before confirming.
                      </p>
                    ) : null}
                  </div>
                  </div>

                  <div className="grm-order-panel-foot">
                    <div className="grm-totals">
                      <div className="grm-total-row">
                        <span>Subtotal</span>
                        <span>{formatPeso(totals.subtotal)}</span>
                      </div>
                      {totals.serviceCharge > 0 ? (
                        <div className="grm-total-row">
                          <span>Service charge</span>
                          <span>{formatPeso(totals.serviceCharge)}</span>
                        </div>
                      ) : null}
                      {totals.taxAmount > 0 ? (
                        <div className="grm-total-row">
                          <span>Tax</span>
                          <span>{formatPeso(totals.taxAmount)}</span>
                        </div>
                      ) : null}
                      <div className="grm-total-row grm-total-row--grand">
                        <span>Grand Total</span>
                        <span>{formatPeso(totals.grandTotal)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-book-now grm-btn-place-order"
                      disabled={placingOrder || cartLines.some((l) => l.unavailable) || cartLines.length === 0}
                      onClick={handlePlaceOrder}
                    >
                      {placingOrder ? "Confirming…" : "Confirm Order"}
                    </button>
                  </div>
                </>
              )}
            </aside>
          </div>
        </div>
        </main>

        {isMobile && (
          <button
            type="button"
            className="grm-floating-cart"
            onClick={() => setCartOpen(true)}
            aria-label={`View order, ${cartCount} items`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 ? <span className="grm-floating-badge">{cartCount}</span> : null}
          </button>
        )}

        {isMobile && cartOpen && (
          <div className="grm-cart-backdrop" onClick={() => setCartOpen(false)} aria-hidden="true" />
        )}
      </RailPortalShell>

      {viewDish && (
        <DishDetailModal
          dish={viewDish}
          onClose={() => setViewDish(null)}
          onAddToOrder={startOrderFromDetail}
        />
      )}

      {orderDish && (
        <AddToOrderModal
          dish={orderDish}
          qty={orderQty}
          setQty={setOrderQty}
          notes={orderNotes}
          setNotes={setOrderNotes}
          onClose={() => setOrderDish(null)}
          onConfirm={() => addToCart(orderDish, orderQty, orderNotes.trim(), { notify: true })}
        />
      )}

      <StaffSuccessModal
        open={!!orderSuccess}
        onClose={() => setOrderSuccess(null)}
        title="Order Placed Successfully!"
        message={orderSuccess ? formatOrderSuccessMessage(orderSuccess) : ""}
        confirmLabel="Continue Browsing"
        autoCloseMs={0}
        overlayClassName="grm-order-success-modal-overlay"
        panelClassName="staff-success-modal grm-order-success-modal"
      />

      <OrderToast message={toast} />

      <GcashPaymentModal
        open={payOpen}
        onClose={closePayModal}
        payForm={payForm}
        payErrors={payErrors}
        proofPreview={proofPreview}
        payQrMissing={payQrMissing}
        onPayFormChange={handlePayFormChange}
        onProofUpload={handleProofUpload}
        onClearForm={clearPayForm}
        onSave={saveGcashPaymentDetails}
        onQrError={() => setPayQrMissing(true)}
      />

      <LogoutConfirmModal
        open={logoutModalOpen}
        onCancel={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}
