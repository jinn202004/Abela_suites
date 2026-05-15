import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { fetchBookingsBackend, HOUSEKEEPING_TASKS_REFRESH_EVENT } from "../api/guestApi";
import {
  adminBookingStatusBadgeClass,
  adminVenueOpsBadgeClass,
  formatAdminBookingStatusLabel,
  resolveBookingRawStatus,
} from "./adminBookingStatusDisplay";
import {
  fetchEventVenuesAdmin,
  createEventVenueAdmin,
  updateEventVenueAdmin,
  deleteEventVenueAdmin,
  EVENT_VENUE_STATUSES,
} from "../api/eventManagementApi";
import "./event-management.css";

/** Event admin tables: rows per page (client-side only; APIs unchanged). */
const EM_TABLE_PAGE_SIZE = 10;

/* ── ICONS ── */
const Icon = {
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  Staff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Booking: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Room: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/>
    </svg>
  ),
  Event: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
      <path d="M5.8 11.3 2 22l10.7-3.79"/>
      <path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/>
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/>
      <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/>
      <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/>
      <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z"/>
    </svg>
  ),
  Inventory: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  Restaurant: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </svg>
  ),
  Bills: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="16" height="16">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Delete: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="1.5" width="36" height="36">
      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
    </svg>
  ),
  Image: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="1.5" width="20" height="20">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Doc: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  Checkout: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Dollar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
};

function fmtPeso(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `₱${x.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function todayIsoDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** Title-case venue operational status for catalog table (never empty). */
function formatCatalogVenueStatus(raw) {
  const t = String(raw ?? "").trim().toLowerCase();
  if (!t) return "Available";
  return formatAdminBookingStatusLabel(t);
}

/** @param {Record<string, unknown>} b — API booking */
/** @param {Record<string, unknown> | null | undefined} venueDoc — matched catalog row */
function mapEventBookingToStatusRow(b, venueDoc) {
  const venueLabel = venueDoc
    ? String(venueDoc.venueName || venueDoc.name || venueDoc.package || "").trim()
    : String(b.venueName || b.eventTitle || "").trim() || "Event";
  const rawStatus = resolveBookingRawStatus(b);
  return {
    id: String(b.id || ""),
    type: venueLabel || "Event",
    date: String(b.eventDate || "—").trim(),
    time: String(b.timeSlot || "—").trim(),
    guest: b.expectedPax != null ? String(b.expectedPax) : String(b.customerName || "—"),
    total: String(b.totalAmount || b.venuePrice || "—").trim(),
    downpayment: String(b.paymentAmount || "—").trim(),
    status: formatAdminBookingStatusLabel(rawStatus),
    badgeClass: adminBookingStatusBadgeClass(rawStatus),
    rawDate: String(b.eventDate || "").trim().slice(0, 10),
    rawStatus,
  };
}

const EMPTY_FORM = {
  package: "",
  limit: "",
  price: "",
  status: "available",
  eventNum: "",
  featSound: false,
  featStage: false,
  featAv: false,
  featCatering: false,
  featOther: "",
  description: "",
  image: "",
};

/** Derive numeric capacity for API from limit text (e.g. "30", "20-30 guests"). */
function capacityFromLimitText(limitStr) {
  const s = String(limitStr || "").trim();
  const nums = [...s.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10)).filter((n) => Number.isInteger(n) && n > 0);
  if (nums.length === 0) return NaN;
  return Math.max(...nums);
}

function featuresFromVenueForm(form) {
  const parts = [
    form.featSound && "Sound system",
    form.featStage && "Stage & seating area",
    form.featAv && "AV & projector",
    form.featCatering && "Catering access",
  ].filter(Boolean);
  const other = String(form.featOther || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return [...parts, ...other];
}

function matchedSound(x) {
  const l = String(x).toLowerCase();
  return l.includes("sound") || l.includes("speaker");
}
function matchedStage(x) {
  const l = String(x).toLowerCase();
  return l.includes("stage") || l.includes("chair") || l.includes("seating");
}
function matchedAv(x) {
  const l = String(x).toLowerCase();
  return l.includes("projector") || l.includes("tv") || /\bav\b/.test(l);
}
function matchedCatering(x) {
  const l = String(x).toLowerCase();
  return l.includes("catering") || l.includes("kitchen");
}

function mapVenueFeaturesToForm(features) {
  const raw = Array.isArray(features) ? features.map((x) => String(x).trim()).filter(Boolean) : [];
  const featSound = raw.some(matchedSound);
  const featStage = raw.some(matchedStage);
  const featAv = raw.some(matchedAv);
  const featCatering = raw.some(matchedCatering);
  const other = raw.filter(
    (x) => !matchedSound(x) && !matchedStage(x) && !matchedAv(x) && !matchedCatering(x),
  );
  return {
    featSound,
    featStage,
    featAv,
    featCatering,
    featOther: other.join(", "),
  };
}

const IconCheckToast = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

/* ── VENUE MODAL (layout mirrors room-management add/edit room) ── */
function VenueModal({ visible, isEdit, form, setForm, formErr, saving, onClose, onSave, onClear }) {
  if (!visible) return null;

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="rm-modal-backdrop active" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="rm-modal">
        <div className="rm-modal-header">
          <h2 className="rm-modal-title">{isEdit ? "Edit Event Venue" : "Add New Event Venue"}</h2>
          <button type="button" className="rm-modal-close" onClick={onClose} disabled={saving}>
            &#x2715;
          </button>
        </div>
        <div className="rm-modal-body">
          <div className="rm-form-row">
            <div className="rm-form-group rm-form-group--full">
              <label>Package</label>
              <input
                type="text"
                className="rm-input"
                placeholder="e.g. Grand Ballroom, Wedding package, Half-day"
                value={form.package}
                onChange={(e) => setForm((f) => ({ ...f, package: e.target.value }))}
              />
            </div>
          </div>

          <div className="rm-form-row">
            <div className="rm-form-group">
              <label>Limit (guests)</label>
              <input
                type="text"
                className="rm-input"
                placeholder="e.g. 300 or 200-300 guests"
                value={form.limit}
                onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))}
              />
            </div>
            <div className="rm-form-group">
              <label>Price</label>
              <input
                type="text"
                className="rm-input"
                placeholder="15000 or ₱15,000"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
          </div>

          <div className="rm-form-row">
            <div className="rm-form-group">
              <label>Status</label>
              <select
                className="rm-input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {EVENT_VENUE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="rm-form-group">
              <label>Event number (optional)</label>
              <input
                type="text"
                className="rm-input"
                placeholder="Leave blank to auto-generate"
                value={form.eventNum}
                onChange={(e) => setForm((f) => ({ ...f, eventNum: e.target.value }))}
              />
            </div>
          </div>

          <div className="rm-form-row">
            <div className="rm-form-group rm-form-group--full">
              <label>Features</label>
              <div className="rm-checkbox-group">
                {[
                  { id: "featSound", label: "Sound system" },
                  { id: "featStage", label: "Stage & seating area" },
                  { id: "featAv", label: "AV & projector" },
                  { id: "featCatering", label: "Catering access" },
                ].map((f) => (
                  <label key={f.id} className="rm-checkbox-item">
                    <input
                      type="checkbox"
                      checked={Boolean(form[f.id])}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.id]: e.target.checked }))}
                    />
                    {f.label}
                  </label>
                ))}
                <div className="rm-other-wrap">
                  <span className="rm-other-label">Other</span>
                  <input
                    type="text"
                    className="rm-input rm-other-input"
                    placeholder="Other features..."
                    value={form.featOther}
                    onChange={(e) => setForm((f) => ({ ...f, featOther: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rm-form-group">
            <label>Description</label>
            <textarea
              className="rm-textarea"
              placeholder="Write something here..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="rm-form-group">
            <label>Upload Image</label>
            <div className="rm-upload-area" onClick={() => !saving && document.getElementById("evVenueImage")?.click()}>
              <input
                id="evVenueImage"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImage}
              />
              <div className="rm-upload-content">
                {form.image ? (
                  <img src={form.image} style={{ maxHeight: 110, borderRadius: 6, objectFit: "contain" }} alt="preview" />
                ) : (
                  <>
                    <span className="rm-upload-text">Upload your venue image here...</span>
                    <Icon.Upload />
                  </>
                )}
              </div>
            </div>
          </div>

          {formErr ? <span className="rm-err">{formErr}</span> : null}

          <div className="rm-modal-actions">
            <button type="button" className="rm-btn-clear" onClick={onClear} disabled={saving}>
              Clear
            </button>
            <button type="button" className="rm-btn-save" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Venue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const StatIconCal = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" aria-hidden>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const StatIconDoc = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const StatIconCheckout = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" aria-hidden>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const StatIconDollar = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" aria-hidden>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconSearchField = () => (
  <svg className="rm-search-icon" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="16" height="16" aria-hidden>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
/* ── MAIN COMPONENT ── */
export default function EventManage() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [tab, setTab] = useState("status");
  const [eventBookingsRaw, setEventBookingsRaw] = useState([]);
  const [bookingsLoadErr, setBookingsLoadErr] = useState("");
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venuesError, setVenuesError] = useState("");

  const [statusSearch, setStatusSearch] = useState("");
  const [venueSearch, setVenueSearch] = useState("");
  const [statusPage, setStatusPage] = useState(1);
  const [venuePage, setVenuePage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState(null);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));
  const [formErr, setFormErr] = useState("");
  const [savingVenue, setSavingVenue] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState({ visible: false, msg: "" });

  const loadVenues = useCallback(async () => {
    setVenuesError("");
    setVenuesLoading(true);
    try {
      const rows = await fetchEventVenuesAdmin();
      setVenues(Array.isArray(rows) ? rows : []);
    } catch (e) {
      const msg =
        e.code === "NO_TOKEN"
          ? "Sign in as admin to manage event venues."
          : e.status === 403
            ? "Admin access required for /api/eventvenues."
            : e.message || "Could not load event venues.";
      setVenuesError(msg);
      setVenues([]);
    } finally {
      setVenuesLoading(false);
    }
  }, []);

  const loadEventBookings = useCallback(async () => {
    setBookingsLoadErr("");
    setBookingsLoading(true);
    try {
      const list = await fetchBookingsBackend();
      const events = (Array.isArray(list) ? list : []).filter(
        (b) => String(b.type || "").toLowerCase() === "event",
      );
      setEventBookingsRaw(events);
    } catch (e) {
      setBookingsLoadErr(e.message || "Could not load event bookings.");
      setEventBookingsRaw([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const statuses = useMemo(() => {
    const normId = (id) => String(id ?? "").trim().toLowerCase();
    const byId = new Map(
      venues
        .map((v) => {
          const k = normId(v.id);
          return k ? [k, v] : null;
        })
        .filter(Boolean),
    );
    return eventBookingsRaw
      .filter((b) => {
        const vid = normId(b.eventVenueId);
        if (!vid) return false;
        return byId.has(vid);
      })
      .map((b) => mapEventBookingToStatusRow(b, byId.get(normId(b.eventVenueId))));
  }, [eventBookingsRaw, venues]);

  useEffect(() => {
    void loadVenues();
    void loadEventBookings();
  }, [loadVenues, loadEventBookings]);

  useEffect(() => {
    const onHk = () => {
      void loadVenues();
      void loadEventBookings();
    };
    window.addEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHk);
    const poll = window.setInterval(() => {
      void loadVenues();
      void loadEventBookings();
    }, 25_000);
    return () => {
      window.removeEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHk);
      window.clearInterval(poll);
    };
  }, [loadVenues, loadEventBookings]);

  const todayIso = todayIsoDate();
  const statToday = statuses.filter((s) => s.rawDate && s.rawDate.slice(0, 10) === todayIso).length;
  const pendingLike = statuses.filter((s) => s.rawStatus === "pending").length;
  const statusDataLoading = bookingsLoading || venuesLoading;

  const showToast = (msg) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: "" }), 3000);
  };

  const filteredStatuses = useMemo(() => {
    const q = statusSearch.toLowerCase();
    return statuses.filter(
      (s) =>
        s.type.toLowerCase().includes(q) ||
        s.date.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q) ||
        String(s.guest).includes(q),
    );
  }, [statuses, statusSearch]);

  const filteredVenues = useMemo(() => {
    const vq = venueSearch.toLowerCase();
    return venues.filter((v) => {
      const name = String(v.venueName || v.name || v.package || "").toLowerCase();
      const pkg = String(v.package || "").toLowerCase();
      const en = String(v.eventNum || "").toLowerCase();
      const lim = String(v.limit || "").toLowerCase();
      const st = String(v.status || "").toLowerCase();
      return name.includes(vq) || pkg.includes(vq) || en.includes(vq) || lim.includes(vq) || st.includes(vq);
    });
  }, [venues, venueSearch]);

  const statusTotalPages = Math.max(1, Math.ceil(filteredStatuses.length / EM_TABLE_PAGE_SIZE));
  const statusCurrentPage = Math.min(Math.max(1, statusPage), statusTotalPages);
  const statusPageStart = (statusCurrentPage - 1) * EM_TABLE_PAGE_SIZE;
  const pagedStatuses = filteredStatuses.slice(statusPageStart, statusPageStart + EM_TABLE_PAGE_SIZE);
  const statusRangeFrom = filteredStatuses.length === 0 ? 0 : statusPageStart + 1;
  const statusRangeTo = filteredStatuses.length === 0 ? 0 : statusPageStart + pagedStatuses.length;

  const venueTotalPages = Math.max(1, Math.ceil(filteredVenues.length / EM_TABLE_PAGE_SIZE));
  const venueCurrentPage = Math.min(Math.max(1, venuePage), venueTotalPages);
  const venuePageStart = (venueCurrentPage - 1) * EM_TABLE_PAGE_SIZE;
  const pagedVenues = filteredVenues.slice(venuePageStart, venuePageStart + EM_TABLE_PAGE_SIZE);
  const venueRangeFrom = filteredVenues.length === 0 ? 0 : venuePageStart + 1;
  const venueRangeTo = filteredVenues.length === 0 ? 0 : venuePageStart + pagedVenues.length;

  useEffect(() => {
    setStatusPage(1);
  }, [statusSearch]);

  useEffect(() => {
    setVenuePage(1);
  }, [venueSearch]);

  useEffect(() => {
    setStatusPage((p) => Math.min(Math.max(1, p), statusTotalPages));
  }, [statusTotalPages]);

  useEffect(() => {
    setVenuePage((p) => Math.min(Math.max(1, p), venueTotalPages));
  }, [venueTotalPages]);

  const openAdd = () => {
    setFormErr("");
    setEditingVenueId(null);
    setForm({ ...EMPTY_FORM });
    setModalVisible(true);
  };

  const openEdit = (v) => {
    if (!v?.id) return;
    setFormErr("");
    setEditingVenueId(String(v.id));
    const feat = mapVenueFeaturesToForm(v.features);
    setForm({
      package: String(v.package || v.venueName || v.name || "").trim(),
      limit: String(v.limit || (v.capacity != null ? `${v.capacity} guests` : "")),
      price: v.price != null && Number.isFinite(Number(v.price)) ? String(v.price) : "",
      status: EVENT_VENUE_STATUSES.includes(String(v.status)) ? String(v.status) : "available",
      eventNum: String(v.eventNum || ""),
      featSound: feat.featSound,
      featStage: feat.featStage,
      featAv: feat.featAv,
      featCatering: feat.featCatering,
      featOther: feat.featOther,
      description: String(v.description || ""),
      image: String(v.imageUrl || v.image || ""),
    });
    setModalVisible(true);
  };

  const saveVenue = async () => {
    setFormErr("");
    const pkg = String(form.package || "").trim();
    const cap = capacityFromLimitText(form.limit);
    if (!pkg) {
      setFormErr("Package is required.");
      return;
    }
    if (!Number.isInteger(cap) || cap < 1) {
      setFormErr('Limit (guests): include a number (e.g. "300" or "200-300 guests").');
      return;
    }
    const priceRaw = String(form.price || "").trim();
    if (!priceRaw) {
      setFormErr("Price is required.");
      return;
    }

    const payload = {
      venueName: pkg,
      package: pkg,
      capacity: cap,
      price: priceRaw,
      status: form.status,
      description: String(form.description || "").trim(),
      imageUrl: String(form.image || "").trim(),
      features: featuresFromVenueForm(form),
    };
    if (String(form.eventNum || "").trim()) payload.eventNum = String(form.eventNum).trim();
    const lim = String(form.limit || "").trim();
    if (lim) payload.limit = lim;

    setSavingVenue(true);
    try {
      if (editingVenueId) {
        await updateEventVenueAdmin(editingVenueId, payload);
        showToast("Venue updated.");
      } else {
        await createEventVenueAdmin(payload);
        showToast("Venue created.");
      }
      setModalVisible(false);
      setEditingVenueId(null);
      setForm({ ...EMPTY_FORM });
      await loadVenues();
    } catch (e) {
      setFormErr(e.message || "Save failed.");
    } finally {
      setSavingVenue(false);
    }
  };

  const closeDelete = () => setDeleteTarget(null);

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteEventVenueAdmin(deleteTarget.id);
      showToast("Venue deleted.");
      closeDelete();
      await loadVenues();
    } catch (e) {
      window.alert(e.message || "Delete failed.");
    }
  };

  const STATS = [
    { label: "Event bookings today", StatI: StatIconCal, value: statusDataLoading ? "…" : statToday },
    { label: "Total event bookings", StatI: StatIconDoc, value: statusDataLoading ? "…" : statuses.length },
    { label: "Pending / review", StatI: StatIconCheckout, value: statusDataLoading ? "…" : pendingLike },
    { label: "Venues in catalog", StatI: StatIconDollar, value: venuesLoading ? "…" : venues.length },
  ];

  return (
    <>
      <RailPortalShell
        rootClassName="app-layout admin-app-layout rm-app em-event"
        mainStyle={mainStyle}
        sidebar={<AdminSidebarNav logoSrc="/public/logo.png" />}
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <Link to="/admin-dashboard" className="breadcrumb-title em-event-breadcrumb-link">
              Dashboard
            </Link>
          </div>
          <AdminTopbarActions
            notifications={[
              {
                id: "ev-1",
                msg: "Venues: GET/POST/PUT/DELETE /api/eventvenues (admin). Catalog for staff remains GET /api/event-venues.",
                time: "Admin",
                read: true,
              },
            ]}
            onRequestLogout={requestLogout}
          />
        </header>

        <main className="content">
          <div className="rm-dashboard-header">
            <div className="rm-dashboard-title">Event Management Dashboard</div>
            <div className="rm-dashboard-sub">
              Event venues are stored in MongoDB collection <code>eventvenues</code>. Reservations list loads from
              bookings (type event).
            </div>
          </div>

          <div className="rm-stats-row rm-stats-row--events">
            {STATS.map(({ label, StatI, value }) => (
              <div key={label} className="rm-stat-card">
                <div className="rm-stat-top">
                  <StatI className="rm-stat-card__icon" />
                  <span className="rm-stat-name">{label}</span>
                </div>
                <div className="rm-stat-value">{value}</div>
              </div>
            ))}
          </div>

          <div className="rm-room-switch" role="tablist" aria-label="Event views">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "status"}
              className={`rm-room-switch__btn${tab === "status" ? " rm-room-switch__btn--active" : ""}`}
              onClick={() => setTab("status")}
            >
              Event Status
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "venue"}
              className={`rm-room-switch__btn${tab === "venue" ? " rm-room-switch__btn--active" : ""}`}
              onClick={() => setTab("venue")}
            >
              Event Venue
            </button>
          </div>

          {tab === "status" && (
            <div id="panelEventStatus" className="rm-panel">
              {bookingsLoadErr ? <p className="rm-empty" style={{ marginBottom: 12 }}>{bookingsLoadErr}</p> : null}
              <div className="rm-top-row">
                <div className="rm-search-wrap">
                  <IconSearchField />
                  <input
                    type="text"
                    className="rm-search-input"
                    placeholder="Search reservations..."
                    value={statusSearch}
                    onChange={(e) => setStatusSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="rm-section-label">Event Reservations</div>
              <div className="rm-table-wrap">
                <table className="rm-table">
                  <thead>
                    <tr>
                      <th>Venue / title</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Guests</th>
                      <th>Total</th>
                      <th>Downpayment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusDataLoading ? (
                      <tr>
                        <td colSpan={7} className="rm-empty">
                          Loading event bookings…
                        </td>
                      </tr>
                    ) : filteredStatuses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="rm-empty">
                          No event status records found.
                        </td>
                      </tr>
                    ) : (
                      pagedStatuses.map((s) => (
                        <tr key={s.id || `${s.type}-${s.date}`}>
                          <td>{s.type}</td>
                          <td>{s.date}</td>
                          <td>{s.time}</td>
                          <td>{s.guest}</td>
                          <td>{s.total}</td>
                          <td>{s.downpayment}</td>
                          <td>
                            <span className={`rm-badge ${s.badgeClass}`}>{s.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {!statusDataLoading && filteredStatuses.length > 0 ? (
                  <div className="rm-pagination-bar" aria-label="Event reservation pages">
                    <span className="rm-pagination-info">
                      Showing {statusRangeFrom}–{statusRangeTo} of {filteredStatuses.length}
                    </span>
                    <div className="rm-pagination-btns">
                      <button
                        type="button"
                        className="rm-page-btn"
                        disabled={statusCurrentPage <= 1}
                        onClick={() => setStatusPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="rm-pagination-pages">
                        Page {statusCurrentPage} of {statusTotalPages}
                      </span>
                      <button
                        type="button"
                        className="rm-page-btn"
                        disabled={statusCurrentPage >= statusTotalPages}
                        onClick={() => setStatusPage((p) => Math.min(statusTotalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {tab === "venue" && (
            <div id="panelEventVenue" className="rm-panel">
              {venuesError ? <p className="rm-empty" style={{ marginBottom: 12 }}>{venuesError}</p> : null}
              <div className="rm-top-row">
                <div className="rm-search-wrap">
                  <IconSearchField />
                  <input
                    type="text"
                    className="rm-search-input"
                    placeholder="Search venues…"
                    value={venueSearch}
                    onChange={(e) => setVenueSearch(e.target.value)}
                  />
                </div>
                <button type="button" className="rm-add-btn" onClick={openAdd} disabled={venuesLoading}>
                  <Icon.Plus /> Add Event Venue
                </button>
              </div>
              <div className="rm-section-label">Manage Event Venues (database)</div>
              <div className="rm-table-wrap">
                <table className="rm-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Venue</th>
                      <th>Capacity</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Reserved</th>
                      <th className="rm-th-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {venuesLoading ? (
                      <tr>
                        <td colSpan={7} className="rm-empty">
                          Loading venues…
                        </td>
                      </tr>
                    ) : filteredVenues.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="rm-empty">
                          No venues found.
                        </td>
                      </tr>
                    ) : (
                      pagedVenues.map((v) => {
                        const img = v.imageUrl || v.image;
                        const label = v.venueName || v.name || v.package || "—";
                        return (
                          <tr key={String(v.id)}>
                            <td>
                              {img ? (
                                <img src={img} className="rm-thumb" alt="" />
                              ) : (
                                <div className="rm-thumb-empty">
                                  <Icon.Image />
                                </div>
                              )}
                            </td>
                            <td>{label}</td>
                            <td>{v.capacity != null ? v.capacity : "—"}</td>
                            <td>{fmtPeso(v.price)}</td>
                            <td>
                              <span className={`rm-badge ${adminVenueOpsBadgeClass(v.status)}`}>
                                {formatCatalogVenueStatus(v.status)}
                              </span>
                            </td>
                            <td>{v.reserved != null ? v.reserved : 0}</td>
                            <td className="action-cell rm-td-action">
                              <span className="rm-action-btns">
                                <button type="button" className="icon-action edit-btn" title="Edit" onClick={() => openEdit(v)}>
                                  <Icon.Edit />
                                </button>
                                <button
                                  type="button"
                                  className="icon-action delete-btn"
                                  title="Delete"
                                  onClick={() => setDeleteTarget(v)}
                                >
                                  <Icon.Delete />
                                </button>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                {!venuesLoading && filteredVenues.length > 0 ? (
                  <div className="rm-pagination-bar" aria-label="Event venue pages">
                    <span className="rm-pagination-info">
                      Showing {venueRangeFrom}–{venueRangeTo} of {filteredVenues.length}
                    </span>
                    <div className="rm-pagination-btns">
                      <button
                        type="button"
                        className="rm-page-btn"
                        disabled={venueCurrentPage <= 1}
                        onClick={() => setVenuePage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="rm-pagination-pages">
                        Page {venueCurrentPage} of {venueTotalPages}
                      </span>
                      <button
                        type="button"
                        className="rm-page-btn"
                        disabled={venueCurrentPage >= venueTotalPages}
                        onClick={() => setVenuePage((p) => Math.min(venueTotalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </main>
      </RailPortalShell>

      <VenueModal
        visible={modalVisible}
        isEdit={Boolean(editingVenueId)}
        form={form}
        setForm={setForm}
        formErr={formErr}
        saving={savingVenue}
        onClose={() => {
          if (savingVenue) return;
          setModalVisible(false);
          setEditingVenueId(null);
          setForm({ ...EMPTY_FORM });
        }}
        onSave={saveVenue}
        onClear={() => setForm({ ...EMPTY_FORM })}
      />

      {deleteTarget ? (
        <div
          className="rm-confirm-backdrop active"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDelete();
          }}
        >
          <div className="rm-confirm-dialog">
            <div className="rm-confirm-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="rm-confirm-exclaim">!</span>
            </div>
            <h3 className="rm-confirm-title">Delete event venue?</h3>
            <p className="rm-confirm-sub">
              Delete <strong>{deleteTarget.venueName || deleteTarget.name || deleteTarget.package}</strong>? Cannot delete if reserved slots
              &gt; 0.
            </p>
            <div className="rm-confirm-btns">
              <button type="button" className="rm-btn-cancel-confirm" onClick={closeDelete}>
                Cancel
              </button>
              <button type="button" className="rm-btn-delete-confirm" onClick={() => void confirmDelete()}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast.visible && (
        <div className="rm-toast active">
          <IconCheckToast />
          <span>{toast.msg}</span>
        </div>
      )}

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}