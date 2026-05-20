import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import StaffTopbarActions from "../topbar/StaffTopbarActions";
import { useFrontdeskPendingNotifications } from "./useFrontdeskPendingNotifications";
import { Modal } from "../components/Modal";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useFrontdeskShell } from "./FrontdeskShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import FrontdeskSidebarToggle from "./FrontdeskSidebarToggle";
import FrontdeskSidebar from "./FrontdeskSidebar";
import { StaffNotificationDetailModal, useStaffNotificationDetail } from "./StaffNotificationDetailModal";
import {
  fetchAllBillingRecordsBackend,
  fetchBookingsBackend,
  fetchFrontdeskBookingDetailsBackend,
  updateBillingPaymentBackend,
  approveBookingBackend,
  rejectBookingBackend,
  dispatchGuestBookingsRefreshPing,
  dispatchHousekeepingInboxRefresh,
  dispatchHousekeepingTasksRefresh,
} from "../api/guestApi";
import { getSessionRole, getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { pdfSafeText, openPdfPrintOrDownload } from "../utils/pdfClientExport";
import {
  bookingTypeLabel,
  displayLedgerDate,
  formatPrintMonthLabel,
  frontdeskBillRowToLedgerRow,
  paymentMethodLabel,
  paymentStatusLabel,
  rowInSelectedMonthFrontdesk,
} from "../utils/billingLedgerReport";
import BillsPrintModal from "../components/BillsPrintModal";
import "../admin_1/bills.css";
import "./frontdesk-bills.css";

const BillIcons = {
  Room: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden>
      <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Print: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="14" height="14">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
};

function BillsStatCards({ totalItems, pageCount }) {
  return (
    <div className="bills-stats-row">
      <div className="bills-stat-card">
        <div className="bills-stat-label">
          <BillIcons.Room />
          Billing records
        </div>
        <div className="bills-stat-value">{totalItems}</div>
      </div>
      <div className="bills-stat-card">
        <div className="bills-stat-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          On this page
        </div>
        <div className="bills-stat-value">{pageCount}</div>
      </div>
    </div>
  );
}

function billContextLabel(b) {
  const pkg = String(b?.package || "").trim();
  const room = String(b?.room || "").trim();
  if (pkg && room && room !== "—") return `${pkg} (${room})`;
  if (pkg) return pkg;
  if (room && room !== "—") return room;
  return "—";
}

function fmtPeso(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "₱0";
  return `₱${v.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function isoToDisplayDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-PH");
}

function toMoneyNum(v) {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** e.g. "Single Suite (101)" → "101" */
function roomNumberFromCombinedLabel(label) {
  const s = String(label || "").trim();
  const m = s.match(/\(\s*([^)]+?)\s*\)\s*$/);
  return m ? String(m[1]).trim() : "";
}

function billRoomColumnFromBooking(booking) {
  const bk = booking || {};
  const t = String(bk.type || "").toLowerCase();
  const combined = String(bk.room || "").trim();
  if (t === "event") {
    const v = String(bk.venueName || bk.eventTitle || combined || "").trim();
    return v || "—";
  }
  const num = String(bk.roomNumber || "").trim();
  if (num) return num;
  const fromParen = roomNumberFromCombinedLabel(combined);
  if (fromParen) return fromParen;
  const rid = String(bk.roomId || "").trim();
  if (rid) return rid;
  const title = String(bk.roomTitle || "").trim();
  if (title) return title;
  if (combined) return combined;
  return "—";
}

function billPackageColumnFromBooking(booking) {
  const bk = booking || {};
  const t = String(bk.type || "").toLowerCase();
  const combined = String(bk.room || "").trim();
  if (t === "event") {
    return String(bk.eventTitle || bk.venueName || combined || "Event Booking").trim() || "Event Booking";
  }
  const title = String(bk.roomTitle || "").trim();
  if (title) return title;
  return combined.replace(/\s*\([^)]*\)\s*$/, "").trim() || combined || "Room Booking";
}

function bookingFallbackRoomColumn(b) {
  const t = String(b?.type || "").toLowerCase();
  if (t === "event") {
    return String(b?.venueName || b?.eventTitle || "").trim() || "—";
  }
  const num = String(b?.roomNumber || "").trim();
  if (num) return num;
  const title = String(b?.roomTitle || "").trim();
  const synthetic = title && num ? `${title} (${num})` : title || num;
  const fromParen = roomNumberFromCombinedLabel(synthetic);
  if (fromParen) return fromParen;
  const rid = String(b?.roomId || "").trim();
  if (rid) return rid;
  if (title) return title;
  return "—";
}

function bookingFallbackPackageColumn(b) {
  const t = String(b?.type || "").toLowerCase();
  if (t === "event") {
    return String(b?.eventTitle || b?.venueName || "Event booking").trim() || "Event booking";
  }
  return String(b?.roomTitle || b?.roomNumber || "Room reservation").trim() || "Room reservation";
}

/** Bill activity / last update time for toolbar date range (prefer billing timestamps). */
function msFromIsoFields(...candidates) {
  for (const v of candidates) {
    if (v == null || v === "") continue;
    const t = new Date(v).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

function billRowFilterTimeMs(row) {
  if (row?.filterAtMs != null && Number.isFinite(row.filterAtMs)) return row.filterAtMs;
  const ci = String(row?.checkin || "").trim();
  if (ci && ci !== "—") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(ci)) {
      const t = new Date(`${ci}T12:00:00`).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }
  return null;
}

function startOfLocalDayMs(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** @param {string} filterLabel @param {number|null} ms */
function billPassesTimeFilter(filterLabel, ms) {
  if (filterLabel === "All Time") return true;
  if (ms == null || !Number.isFinite(ms)) return true;
  const now = new Date();
  const startToday = startOfLocalDayMs(now);
  const endToday = startToday + 86400000;
  if (filterLabel === "Today") return ms >= startToday && ms < endToday;
  if (filterLabel === "Last 7 Days") {
    const start = startToday - 6 * 86400000;
    return ms >= start && ms < endToday;
  }
  if (filterLabel === "Last 30 Days") {
    const start = startToday - 29 * 86400000;
    return ms >= start && ms < endToday;
  }
  return true;
}

/** Compact page list for client-side table paging (same idea as admin bills). */
function visibleClientPageNumbers(currentPage, totalPages) {
  const t = Math.max(1, Math.min(5000, Number(totalPages) || 1));
  const c = Math.min(Math.max(1, Number(currentPage) || 1), t);
  if (t <= 9) return Array.from({ length: t }, (_, i) => i + 1);
  const set = new Set([1, t, c, c - 1, c + 1]);
  return [...set].filter((p) => p >= 1 && p <= t).sort((a, b) => a - b);
}

function fmtPdfMoney(n) {
  return `PHP ${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Check-in or event date on a bill row (ISO or localized string). */
function parsePrimaryBillDate(raw) {
  const s = String(raw || "").trim();
  if (!s || s === "—") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const t = new Date(`${s.slice(0, 10)}T12:00:00`);
    return Number.isNaN(t.getTime()) ? null : t;
  }
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : t;
}

/** @param {string} monthYm `YYYY-MM` from `<input type="month" />`, or "" for all */
function rowMatchesReportMonth(row, monthYm) {
  if (!monthYm) return true;
  const d = parsePrimaryBillDate(row.checkin);
  if (!d) return false;
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return ym === monthYm;
}

/**
 * @param {object} row - mapped bill row from `loadBillingRows`
 * @param {object|null} details - optional payload from `fetchFrontdeskBookingDetailsBackend`
 */
function downloadFrontdeskBillPdf(row, details) {
  const bk = details?.booking || {};
  const bill = details?.billing || {};
  const guest = details?.guest || {};

  const totalAmount = Number(
    bill.totalAmount != null ? bill.totalAmount : row.amount ?? 0,
  );
  const amountPaid = Number(
    bill.amountPaid != null ? bill.amountPaid : row.totalPaid ?? 0,
  );
  const balance = Number(
    bill.balance != null ? bill.balance : Math.max(0, totalAmount - amountPaid),
  );
  const paymentStatus = String(
    bill.paymentStatus || row.paymentStatus || "—",
  );

  const customer = pdfSafeText(
    bk.customerName || guest?.name || row.customer || "Guest",
    120,
  );
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("ABELA SUITES", margin, y);
  y += 7;
  doc.setFontSize(12);
  doc.text("Guest bill / statement", margin, y);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(pdfSafeText(`Generated: ${new Date().toLocaleString("en-PH")}`, 80), margin, y);
  y += 6;

  const payMethod = paymentMethodLabel(
    bill.paymentMethod || bk.paymentMethod || row.paymentMethod || "—",
  );
  const txRef = String(bill.transactionId || bk.transactionId || "—").trim() || "—";

  const isEventBill =
    String(row?.bookingType || bk?.bookingType || bk?.type || "").toLowerCase() === "event";
  const startLabel = isEventBill ? "Event date" : "Check-in";
  const endLabel = isEventBill ? "End date" : "Check-out";
  const startDate = displayLedgerDate(
    row.eventDate || row.checkin || bk.eventDate || bk.checkIn || "",
  );
  const endDate = displayLedgerDate(
    row.eventEndDate || row.checkout || bk.eventEndDate || bk.checkOut || "",
  );

  const infoBody = [
    ["Display bill #", pdfSafeText(row.id ?? "—", 40)],
    ["Transaction / billing ref", pdfSafeText(row.billId || bill.id || row.bookingId || "—", 48)],
    ["Booking ID", pdfSafeText(row.bookingId || bk.id || "—", 48)],
    ["Customer", customer],
    ["Room / venue", pdfSafeText(row.room || "—", 80)],
    ["Package / event", pdfSafeText(row.package || "—", 80)],
    [startLabel, pdfSafeText(startDate, 40)],
    [endLabel, pdfSafeText(endDate, 40)],
    ["Bill activity date", pdfSafeText(row.date || "—", 40)],
    ["Payment method", pdfSafeText(payMethod, 32)],
    ["Payment status", pdfSafeText(paymentStatusLabel(paymentStatus), 32)],
    ["Transaction ID", pdfSafeText(txRef, 48)],
    ["Booking status", pdfSafeText(bk.status || "—", 32)],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body: infoBody,
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: [92, 74, 54], textColor: 255 },
    columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 124 } },
    margin: { left: margin, right: margin },
    theme: "grid",
  });

  y = (doc.lastAutoTable?.finalY || y) + 6;

  autoTable(doc, {
    startY: y,
    head: [["Summary", "Amount"]],
    body: [
      ["Total amount", fmtPdfMoney(totalAmount)],
      ["Down payment / amount paid", fmtPdfMoney(amountPaid)],
      ["Remaining balance", fmtPdfMoney(balance)],
    ],
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [184, 146, 42], textColor: 255 },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 66, halign: "right" } },
    margin: { left: margin, right: margin },
    theme: "striped",
  });

  y = (doc.lastAutoTable?.finalY || y) + 8;
  doc.setFontSize(9);
  doc.setTextColor(100, 80, 60);
  doc.text("Thank you for staying with Abela Suites.", margin, y);

  const stamp = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}_${String(new Date().getHours()).padStart(2, "0")}${String(new Date().getMinutes()).padStart(2, "0")}${String(new Date().getSeconds()).padStart(2, "0")}`;
  const safeId = String(row.bookingId || row.billId || row.id || "bill")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 48);
  const fname = `Abela_Bill_${safeId}_${stamp}.pdf`;
  openPdfPrintOrDownload(doc, fname);
}

function billingLoadErrorMessage(err) {
  const code = err && err.code;
  const msg = err && err.message ? String(err.message) : String(err || "Unknown error");
  if (code === "NO_TOKEN" || /not signed in/i.test(msg)) {
    return "You are not signed in. Log in at /login with a front desk or admin account to load bills from the database.";
  }
  if (
    msg === "Failed to fetch" ||
    msg === "Load failed" ||
    /networkerror|load failed|fetch/i.test(msg)
  ) {
    return "Could not reach the API. Start the backend (be/abela-be: npm run dev on port 5000) so /api/billing can load from MongoDB.";
  }
  return msg;
}

export default function BillsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { pendingCount, displayNotifications, markStaffNotificationsSeen } = useFrontdeskPendingNotifications({
    bookingType: "all",
  });
  const staffTopbarRef = useRef(null);

  const [search, setSearch]             = useState("");
  /** "" = all, "room" | "event" — matches admin billing tabs. */
  const [billingTab, setBillingTab]   = useState("");
  /** `YYYY-MM` or "" = all time for print report. */
  const [reportMonth, setReportMonth]   = useState("");
  const [printOpen, setPrintOpen]       = useState(false);
  const [printVariant, setPrintVariant] = useState("all");
  const [billRows, setBillRows]         = useState([]);
  /** Start true so we never flash sample rows; cleared in `loadBillingRows` `finally`. */
  const [rowsLoading, setRowsLoading]   = useState(true);
  /** Set when API fails so we do not look like a “dead DB” with a blank table. */
  const [rowsError, setRowsError]       = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState("");
  /** Client-side table pagination only (full list still loaded once; PDFs & stats use full filtered set). */
  const [billsPage, setBillsPage] = useState(1);
  const [billsPageSize, setBillsPageSize] = useState(10);
  const { staffNotification, openStaffNotification, closeStaffNotification } = useStaffNotificationDetail();

  const loadBillingRows = useCallback(async () => {
    setRowsLoading(true);
    setRowsError(null);
    try {
      if (!getStoredAuthToken()) {
        setRowsError(billingLoadErrorMessage({ code: "NO_TOKEN", message: "Not signed in" }));
        setBillRows([]);
        return;
      }
      const records = await fetchAllBillingRecordsBackend();
      const mapped = (Array.isArray(records) ? records : []).map((r, idx) => {
        const bid = r?.booking?.id || "";
        const rid = r?.id || "";
        const bookingType = String(r?.booking?.type || "").toLowerCase();
        const bk = r?.booking;
        const roomOrEvent = String(bk?.room || "").trim();
        const roomCell = billRoomColumnFromBooking(bk);
        const packageCell = billPackageColumnFromBooking(bk);
        const bill = r?.billing || {};
        const filterAtMs = msFromIsoFields(bk?.updatedAt, bill.updatedAt, bill.createdAt);
        return {
          id: idx + 1,
          billId: rid,
          bookingId: bid,
          bookingType,
          customer: String(r?.guest?.name || "Guest"),
          room: roomCell,
          package: packageCell || (bookingType === "event" ? "Event Booking" : "Room Booking"),
          checkin:
            r?.booking?.checkIn ||
            r?.booking?.eventDate ||
            "",
          checkout:
            r?.booking?.checkOut ||
            r?.booking?.eventEndDate ||
            "",
          eventDate: r?.booking?.eventDate || "",
          eventEndDate: r?.booking?.eventEndDate || "",
          amount: Number(r?.billing?.totalAmount || 0),
          roomType: roomOrEvent || packageCell || "—",
          date: isoToDisplayDate(r?.billing?.updatedAt || r?.billing?.createdAt),
          filterAtMs,
          addGuest: 0,
          totalPaid: Number(r?.billing?.amountPaid || 0),
          balance: Number(r?.billing?.balance || 0),
          paymentStatus: String(r?.billing?.paymentStatus || "unpaid"),
          paymentMethod: String(bk?.paymentMethod || r?.billing?.paymentMethod || ""),
        };
      });

      if (mapped.length > 0) {
        setBillRows(mapped);
        return;
      }

      /** No billing rows yet: show recent DB bookings so frontdesk still sees live guest booking data. */
      const bookings = await fetchBookingsBackend().catch(() => []);
      const bookingRows = (Array.isArray(bookings) ? bookings : [])
        .sort((a, b) => {
          const ta = msFromIsoFields(a?.updatedAt, a?.createdAt) ?? 0;
          const tb = msFromIsoFields(b?.updatedAt, b?.createdAt) ?? 0;
          return tb - ta;
        })
        .slice(0, 50)
        .map((b, idx) => {
          const total = toMoneyNum(b?.totalAmount || b?.venuePrice || 0);
          const paid = toMoneyNum(b?.paymentAmount || 0);
          const balance = Math.max(0, total - paid);
          const roomCell = bookingFallbackRoomColumn(b);
          const packageCell = bookingFallbackPackageColumn(b);
          const roomOrEvent = String(
            b?.type === "event"
              ? b?.venueName || b?.eventTitle || "Event booking"
              : b?.roomTitle || b?.roomNumber || "Room reservation"
          );
          return {
            id: idx + 1,
            billId: "",
            bookingId: String(b?.id || ""),
            bookingType: String(b?.type || ""),
            customer: String(b?.customerName || b?.guest?.displayName || "Guest"),
            room: roomCell,
            package: packageCell,
            checkin: b?.checkIn || b?.eventDate || "",
            checkout: b?.checkOut || b?.eventEndDate || "",
            eventDate: b?.eventDate || "",
            eventEndDate: b?.eventEndDate || "",
            amount: total,
            roomType: roomOrEvent,
            date: isoToDisplayDate(b?.createdAt || b?.updatedAt),
            filterAtMs: msFromIsoFields(b?.updatedAt, b?.createdAt),
            addGuest: Number(b?.additionalGuests || 0),
            totalPaid: paid,
            balance,
            paymentStatus: balance <= 0 && total > 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
            paymentMethod: String(b?.paymentMethod || "—"),
          };
        });
      setBillRows(bookingRows);
    } catch (e) {
      setRowsError(billingLoadErrorMessage(e));
      setBillRows([]);
    } finally {
      setRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBillingRows();
  }, [loadBillingRows]);

  useEffect(() => {
    const onAuth = () => void loadBillingRows();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
  }, [loadBillingRows]);

  async function openBillDetails(row) {
    setSelectedBill(row);
    setDetailsLoading(true);
    setSelectedDetails(null);
    try {
      if (row?.bookingId) {
        const details = await fetchFrontdeskBookingDetailsBackend(row.bookingId);
        setSelectedDetails(details);
        setPaymentDraft(String(Number(details?.billing?.amountPaid || 0)));
      }
    } catch {
      setSelectedDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function refreshSelectedDetails() {
    if (!selectedBill?.bookingId) return;
    await openBillDetails(selectedBill);
    await loadBillingRows();
  }

  async function printBillRowToPdf(row) {
    try {
      let details = null;
      if (row?.bookingId) {
        try {
          details = await fetchFrontdeskBookingDetailsBackend(row.bookingId);
        } catch {
          details = null;
        }
      }
      downloadFrontdeskBillPdf(row, details);
    } catch (e) {
      console.error("[frontdesk-bills] PDF error", e);
      window.alert(
        String(
          e?.message ||
            "Could not open or save the PDF. Allow pop-ups for this site, or check download permissions.",
        ),
      );
    }
  }

  const openBookingFromBillNotification = useCallback(
    async (notif) => {
      const bookingId = String(notif?.bookingId || "").trim();
      if (!bookingId) return;
      const bookingType = String(notif?.bookingType || "").toLowerCase();
      const notifText = `${String(notif?.msg || "")} ${String(notif?.detail || "")}`.toLowerCase();
      const isEventNotif = bookingType === "event" || notifText.includes("event") || notifText.includes("venue");
      staffTopbarRef.current?.hideMenusOnly?.();
      const row = billRows.find((x) => String(x.bookingId || "") === bookingId);
      if (row) {
        await openBillDetails(row);
        return;
      }
      navigate(
        isEventNotif
          ? `/frontdesk-events?bookingId=${encodeURIComponent(bookingId)}`
          : `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`
      );
    },
    [billRows, navigate],
  );

  const tabFilteredRows = useMemo(() => {
    if (billingTab === "room") return billRows.filter((b) => String(b.bookingType).toLowerCase() !== "event");
    if (billingTab === "event") return billRows.filter((b) => String(b.bookingType).toLowerCase() === "event");
    return billRows;
  }, [billRows, billingTab]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tabFilteredRows.filter(
      (b) =>
        b.customer.toLowerCase().includes(q) ||
        b.package.toLowerCase().includes(q) ||
        b.room.toString().includes(q) ||
        b.id.toString().includes(q),
    );
  }, [tabFilteredRows, search]);

  const printMonthLabel = useMemo(() => formatPrintMonthLabel(reportMonth), [reportMonth]);

  const printRowsFiltered = useMemo(() => {
    const ledger = filtered.map(frontdeskBillRowToLedgerRow);
    return ledger.filter((r) => rowInSelectedMonthFrontdesk(r, reportMonth));
  }, [filtered, reportMonth]);

  const openBillsPrint = useCallback(() => {
    const variant = billingTab === "event" ? "event" : billingTab === "room" ? "room" : "all";
    setPrintVariant(variant);
    setPrintOpen(true);
  }, [billingTab]);

  const billsPageSizeSafe = Math.min(100, Math.max(5, Number(billsPageSize) || 10));
  const billsTotalPages = Math.max(1, Math.ceil(filtered.length / billsPageSizeSafe));
  const billsPageSafe = Math.min(Math.max(1, billsPage), billsTotalPages);

  const pagedBills = useMemo(() => {
    const start = (billsPageSafe - 1) * billsPageSizeSafe;
    return filtered.slice(start, start + billsPageSizeSafe);
  }, [filtered, billsPageSafe, billsPageSizeSafe]);

  useEffect(() => {
    setBillsPage(1);
  }, [search, billingTab, billRows.length]);

  useEffect(() => {
    setBillsPage((p) => Math.min(Math.max(1, p), billsTotalPages));
  }, [billsTotalPages]);

  function closeAll() {
    staffTopbarRef.current?.hideMenusOnly?.();
  }

  const { mainStyle } = useFrontdeskShell();
  const staffRole = getSessionRole();
  const canRecordPayment =
    staffRole === "cashier" || staffRole === "admin" || staffRole === "superadmin";
  const totalItems = filtered.length;
  const billsSliceFrom = pagedBills.length > 0 ? (billsPageSafe - 1) * billsPageSizeSafe + 1 : 0;
  const billsSliceTo =
    pagedBills.length > 0 ? (billsPageSafe - 1) * billsPageSizeSafe + pagedBills.length : 0;

  const navItems = [
    { label: "Dashboard",           path: "/frontdesk-dashboard",              icon: "grid"               },
    { label: "Rooms",               path: "/frontdesk-rooms",        icon: "bed"                },
    { label: "Events",              path: "/frontdesk-events",       icon: "star"               },
    { label: "Housekeeping",        path: "/frontdesk-housekeeping", icon: "home"               },
    { label: "Bills",               path: "/frontdesk-bills",        icon: "card"               },
    { label: "Reservation History", path: "/frontdesk-history",  icon: "clock"              },
    { label: "Settings",            path: "/frontdesk-settings",      icon: "gear"               },
  ];

  return (
    <>
      <RailPortalShell
        rootClassName="frontdesk-app fd-bills-page bills-page"
        mainStyle={mainStyle}
        rootProps={{ onClick: closeAll }}
        sidebar={
          <FrontdeskSidebar
            navItems={navItems.map((item) => ({
              label: item.label,
              href: item.path,
              icon: <NavIcon type={item.icon} />,
            }))}
            logoSrc="/public/logo.png"
          />
        }
      >
        {/* ── TOP BAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <FrontdeskSidebarToggle />
            <span className="breadcrumb-title">Bills and Invoices</span>
          </div>
          <StaffTopbarActions
            ref={staffTopbarRef}
            roleKey="frontdesk"
            notifications={displayNotifications}
            dot={pendingCount > 0 ? "active" : null}
            dotTitle="Pending or unread alerts"
            onMenusClosedExtra={closeAll}
            onNotificationsPanelOpen={() => void markStaffNotificationsSeen()}
            onNotificationItemClick={(n) => {
              openStaffNotification(n);
            }}
            onRequestLogout={requestLogout}
          />
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">

          <div>
            <div className="bills-title">Billings management</div>
            <div className="bills-sub">
              Paginated ledger from MongoDB — cashiers and admins can record payments; front desk can view balances.
            </div>
          </div>

          <BillsStatCards totalItems={totalItems} pageCount={pagedBills.length} />

          <div className="bills-tabs">
            <button
              type="button"
              className={`bills-tab${billingTab === "" ? " active" : ""}`}
              onClick={() => setBillingTab("")}
            >
              All billing
            </button>
            <button
              type="button"
              className={`bills-tab${billingTab === "room" ? " active" : ""}`}
              onClick={() => setBillingTab("room")}
            >
              Room bills
            </button>
            <button
              type="button"
              className={`bills-tab${billingTab === "event" ? " active" : ""}`}
              onClick={() => setBillingTab("event")}
            >
              Event bills
            </button>
          </div>

          <div className="bm-main-toolbar">
            <div className="bm-toolbar-search-col">
              <div className="bm-toolbar-search-wrap">
                <span className="bm-toolbar-search-icon" aria-hidden>
                  <BillIcons.Search />
                </span>
                <input
                  type="search"
                  className="bm-toolbar-search-input"
                  placeholder="Search guest name or email (server-side)…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Search billing records"
                />
              </div>
            </div>
            <div className="bm-toolbar-month-col">
              <div className="bm-toolbar-month-head">
                <span className="bm-toolbar-month-label">Select month</span>
                {reportMonth ? (
                  <button
                    type="button"
                    className="bm-toolbar-month-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReportMonth("");
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="bm-toolbar-month-input-wrap">
                <input
                  type="month"
                  className="bm-toolbar-month-input"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Select month for billing report"
                />
              </div>
            </div>
            <div className="bm-toolbar-print-col">
              <button
                type="button"
                className="bm-toolbar-print-btn"
                onClick={openBillsPrint}
                title="Open printable billing summary for the current tab and selected month (or all time if empty)."
              >
                <svg
                  className="bm-toolbar-print-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="18"
                  height="18"
                  aria-hidden
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print
              </button>
            </div>
          </div>

          <div className="bm-toolbar-subrow bills-toolbar-subrow">
            {!canRecordPayment && staffRole === "frontdesk" ? (
              <span className="bills-role-hint">Front desk: view-only · Payments require cashier or admin</span>
            ) : null}
            <p className="bm-toolbar-hint">
              Leave empty to include all billing rows. Month filter uses the billing record created date.
            </p>
          </div>

          {rowsError ? (
            <div className="bills-load-notice">
              <strong>Could not load bills.</strong> {rowsError}{" "}
              <button
                type="button"
                className="icon-action view-btn"
                style={{ marginTop: 8, marginLeft: 0 }}
                disabled={rowsLoading}
                onClick={() => void loadBillingRows()}
              >
                {rowsLoading ? "Retrying…" : "Retry"}
              </button>
              {/not signed in/i.test(rowsError) ? (
                <>
                  {" "}
                  <Link to="/login" style={{ marginLeft: 8, fontWeight: 600 }}>
                    Go to login
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="bills-section-label">Billing records</div>

          {/* Table */}
          <div className="bills-table-wrap">
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Type</th>
                  <th>Booking</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rowsLoading ? (
                  <tr>
                    <td colSpan={8} className="bills-empty">
                      Loading billing…
                    </td>
                  </tr>
                ) : pagedBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="bills-empty">
                      No billing records match this view.
                    </td>
                  </tr>
                ) : (
                  pagedBills.map((b) => (
                    <tr key={String(b.bookingId || b.billId || b.id)}>
                      <td>{String(b.customer || "").trim() || "—"}</td>
                      <td>{bookingTypeLabel(b.bookingType)}</td>
                      <td>{billContextLabel(b)}</td>
                      <td>{fmtPeso(b.amount)}</td>
                      <td>{fmtPeso(b.totalPaid)}</td>
                      <td>{fmtPeso(b.balance)}</td>
                      <td>
                        <span
                          className={`bills-pay-badge bills-pay-badge--${String(b.paymentStatus || "unpaid").toLowerCase()}`}
                        >
                          {paymentStatusLabel(b.paymentStatus)}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button
                          type="button"
                          className="icon-action view-btn"
                          title="View details"
                          onClick={() => void openBillDetails(b)}
                        >
                          <BillIcons.Eye />
                        </button>
                        <button
                          type="button"
                          className="icon-action print-btn"
                          title="Open bill PDF (read-only)"
                          onClick={() => void printBillRowToPdf(b)}
                        >
                          <BillIcons.Print />
                        </button>
                        {canRecordPayment ? (
                          <button
                            type="button"
                            className="icon-action bills-pay-btn"
                            title="Record payment"
                            onClick={() => void openBillDetails(b)}
                          >
                            Pay
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!rowsLoading && (
            <div className="rm-pagination-row">
              <div className="rm-pagination-meta">
                <span className="rm-pagination-count">
                  {pagedBills.length > 0 ? (
                    <>
                      Showing {billsSliceFrom}–{billsSliceTo} of {totalItems} · Page {billsPageSafe} of {billsTotalPages}
                    </>
                  ) : (
                    <>
                      {totalItems} record{totalItems === 1 ? "" : "s"} · Page {billsPageSafe} of {billsTotalPages}
                    </>
                  )}
                </span>
                <label className="rm-pagination-limit">
                  <span>Per page</span>
                  <select
                    className="rm-pagination-select"
                    value={billsPageSizeSafe}
                    onChange={(e) => {
                      setBillsPageSize(Number(e.target.value));
                      setBillsPage(1);
                    }}
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
                  disabled={billsPageSafe <= 1}
                  onClick={() => setBillsPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {visibleClientPageNumbers(billsPageSafe, billsTotalPages).map((pNum, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev != null && pNum - prev > 1;
                  return (
                    <span key={pNum} className="rm-page-btn-wrap">
                      {showEllipsis ? <span className="rm-page-ellipsis">…</span> : null}
                      <button
                        type="button"
                        className={`rm-page-btn${pNum === billsPageSafe ? " rm-page-btn--active" : ""}`}
                        onClick={() => setBillsPage(pNum)}
                      >
                        {pNum}
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  className="rm-page-btn"
                  disabled={billsPageSafe >= billsTotalPages}
                  onClick={() => setBillsPage((p) => Math.min(billsTotalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </main>
      </RailPortalShell>

      {/* ── BILL DETAILS MODAL ── */}
      <Modal
        open={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        placement="top"
        contentOnly
        shellStyle={false}
        panelClassName="bill-modal-box"
        size="lg"
        ariaLabel="Bill details"
      >
          {selectedBill ? (
            <>
              <button className="bill-modal-close" onClick={() => setSelectedBill(null)}>×</button>
              <h3 className="bill-modal-title">Bill Details</h3>
              <hr className="bill-modal-hr" />
              <div className="bill-modal-info">
                <p><strong>Bill #:</strong> {selectedBill.id}</p>
                <p><strong>Customer:</strong> {selectedBill.customer}</p>
                <p><strong>Room:</strong> {selectedBill.room}</p>
                <p><strong>Room Type:</strong> {selectedBill.roomType}</p>
                <p><strong>Date:</strong> {selectedBill.date}</p>
                <p><strong>Additional Guest:</strong> {selectedBill.addGuest}</p>
              </div>
              <div className="bill-modal-summary">
                <div className="bms-row"><span>Total Amount:</span>     <span className="bms-red">{fmtPeso(selectedBill.amount)}</span></div>
                <div className="bms-row"><span>Total Paid:</span>       <span className="bms-green">{fmtPeso(selectedBill.totalPaid)}</span></div>
                <div className="bms-row"><span>Remaining Balance:</span><span className="bms-red">{fmtPeso(selectedBill.balance)}</span></div>
              </div>

              {detailsLoading ? (
                <p style={{ marginTop: 10, color: "#8b6e53" }}>Loading bill details…</p>
              ) : selectedDetails ? (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {selectedDetails.billing?.id ? (
                    (() => {
                      const r = getSessionRole();
                      const canPay = r === "admin" || r === "cashier";
                      return canPay ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={paymentDraft}
                            onChange={(e) => setPaymentDraft(e.target.value)}
                            style={{ padding: "7px 10px", border: "1px solid #d8c6ad", borderRadius: 8, minWidth: 150 }}
                          />
                          <button
                            type="button"
                            className="action-btn view-btn"
                            disabled={detailsBusy}
                            onClick={async () => {
                              const amount = Number(paymentDraft);
                              if (!Number.isFinite(amount) || amount < 0) {
                                window.alert("Enter a valid payment amount.");
                                return;
                              }
                              setDetailsBusy(true);
                              try {
                                await updateBillingPaymentBackend(selectedDetails.billing.id, { amountPaid: amount });
                                await refreshSelectedDetails();
                              } catch (e) {
                                window.alert(e?.message || "Payment update failed.");
                              } finally {
                                setDetailsBusy(false);
                              }
                            }}
                          >
                            {detailsBusy ? "Saving..." : "Update Payment"}
                          </button>
                        </div>
                      ) : (
                        <p style={{ marginTop: 8, fontSize: 13, color: "#7a5c3e" }}>
                          Payments are recorded by Cashier or Admin. Front desk can view this bill only.
                        </p>
                      );
                    })()
                  ) : null}

                  {String(selectedDetails.booking?.status || "").toLowerCase() === "pending" ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        className="action-btn view-btn"
                        disabled={detailsBusy}
                        onClick={async () => {
                          setDetailsBusy(true);
                          try {
                            await approveBookingBackend(selectedDetails.booking.id);
                            dispatchHousekeepingTasksRefresh();
                            dispatchHousekeepingInboxRefresh();
                            dispatchGuestBookingsRefreshPing();
                            await refreshSelectedDetails();
                          } catch (e) {
                            window.alert(e?.message || "Approve failed.");
                          } finally {
                            setDetailsBusy(false);
                          }
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="bill-modal-reject-btn"
                        disabled={detailsBusy}
                        onClick={async () => {
                          const reason = window.prompt("Reject reason (optional):", "") ?? "";
                          setDetailsBusy(true);
                          try {
                            await rejectBookingBackend(selectedDetails.booking.id, reason);
                            dispatchGuestBookingsRefreshPing();
                            await refreshSelectedDetails();
                          } catch (e) {
                            window.alert(e?.message || "Reject failed.");
                          } finally {
                            setDetailsBusy(false);
                          }
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p style={{ marginTop: 10, color: "#8b6e53" }}>
                  No integrated details found for this row.
                </p>
              )}
            </>
          ) : null}
      </Modal>

      <StaffNotificationDetailModal
        notification={staffNotification}
        onClose={closeStaffNotification}
        onOpenReservation={(n) => {
          void openBookingFromBillNotification(n);
          closeStaffNotification();
        }}
      />

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />

      <BillsPrintModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        monthLabel={printMonthLabel}
        variant={printVariant}
        rows={printRowsFiltered}
        printMonthKey={reportMonth}
        rootClass="bills-page"
        note="Leave month empty to include all billing rows in the print preview. Use the row print icon for a single guest bill."
      />
    </>
  );
}

/* ── SIDEBAR ICON HELPER ── */
function NavIcon({ type }) {
  const p = { fill: "none", stroke: "white", strokeWidth: 2, width: 22, height: 22 };
  switch (type) {
    case "grid": return (
      <svg viewBox="0 0 24 24" {...p}>
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    );
    case "bed": return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
        <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/>
      </svg>
    );
    case "star": return (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="22" height="22">
        <path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/>
        <path d="M15 2h.01"/><path d="M22 20h.01"/>
        <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/>
        <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/>
        <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/>
        <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z"/>
      </svg>
    );
    case "home": return (
      <svg viewBox="0 0 24 24" {...p}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <path d="M9 22V12h6v10"/>
      </svg>
    );
    case "card": return (
      <svg viewBox="0 0 24 24" {...p}>
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    );
    case "clock": return (
      <svg viewBox="0 0 24 24" {...p}>
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    );
    case "gear": return (
      <svg viewBox="0 0 24 24" {...p}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    );
    default: return null;
  }
}