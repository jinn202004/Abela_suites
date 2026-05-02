import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import "./event-management.css";

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

/* ── INITIAL DATA ── */
const INIT_STATUSES = [
  { type: "Mini Sky Bar",  date: "22-02-2026", time: "7:00 PM", guest: 20, total: "₱1,148",  downpayment: "₱803",   status: "Approved" },
  { type: "Function Hall", date: "26-02-2026", time: "5:00 PM", guest: 20, total: "₱2,205",  downpayment: "₱1,543", status: "Approved" },
  { type: "Mini Sky Bar",  date: "22-02-2026", time: "7:00 PM", guest: 20, total: "₱1,148",  downpayment: "₱803",   status: "Approved" },
  { type: "Function Hall", date: "26-02-2026", time: "5:00 PM", guest: 20, total: "₱2,205",  downpayment: "₱1,543", status: "Approved" },
  { type: "Mini Sky Bar",  date: "22-02-2026", time: "7:00 PM", guest: 20, total: "₱1,148",  downpayment: "₱803",   status: "Approved" },
];

const INIT_VENUES = [
  { eventNum: "1", package: "Mini Sky Bar",  type: "Event", limit: "30-40 guest", price: "₱1,148", features: [], housekeeping: [], description: "", image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEjZeJklcJbVFcVdSM8sdqr48JKS8n7HgBrhyB6tr9auSs1p2-jgzQc-9jc4a3QPapgkhol-VyuGqWJtTKV2LLB72OXatunkcoY9pPU4vaAzQPZ1cDGHKclK3Zv4RTuzCUSBPdxTsr22l4aCNfENcwnzf6Y-LOd8Yr5djvoj0tWT9JrhL6mlrTnrZl4LgPc/s1500/17-AngKaladkarin-Straight%20Up%20Seda%20North%20(3).jpg" },
  { eventNum: "2", package: "Function Hall", type: "Event", limit: "20-30 guest", price: "₱2,205", features: [], housekeeping: [], description: "", image: "/venue-function-hall.png" },
];

const EMPTY_FORM = {
  eventNum: "", package: "", limit: "", price: "", description: "",
  featSpeaker: false, featChairs: false, featTv: false, featOther: "",
  hkJanah: false, hkJujenn: false, hkJoanah: false, image: "",
};

const IconCheckToast = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

/* ── VENUE MODAL ── */
function VenueModal({ visible, editIdx, form, setForm, onClose, onSave, onClear }) {
  const fileRef = useRef(null);
  const isEdit = editIdx > -1;

  if (!visible) return null;

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div className="rm-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rm-modal">
        <div className="rm-modal-header">
          <h2 className="rm-modal-title">{isEdit ? "Edit Event Venue" : "Add New Event Venue"}</h2>
          <button type="button" className="rm-modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="rm-modal-body">

          <div className="rm-form-row">
            <div className="rm-form-group">
              <label>Event Number</label>
              <input className="rm-input" placeholder="e.g. 4" value={form.eventNum}
                onChange={(e) => setForm((f) => ({ ...f, eventNum: e.target.value }))}/>
            </div>
            <div className="rm-form-group">
              <label>Package</label>
              <input className="rm-input" placeholder="e.g. Function Hall 2" value={form.package}
                onChange={(e) => setForm((f) => ({ ...f, package: e.target.value }))}/>
            </div>
          </div>

          <div className="rm-form-row">
            <div className="rm-form-group">
              <label>Limit</label>
              <input className="rm-input" placeholder="e.g. 30-40" value={form.limit}
                onChange={(e) => setForm((f) => ({ ...f, limit: e.target.value }))}/>
            </div>
            <div className="rm-form-group">
              <label>Price</label>
              <input className="rm-input" placeholder="₱1,148" value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}/>
            </div>
          </div>

          <div className="rm-form-row">
            <div className="rm-form-group">
              <label>Features</label>
              <div className="rm-checkbox-group">
                {[["featSpeaker", "Speaker"], ["featChairs", "30 Chairs"], ["featTv", "Smart TV"]].map(([key, label]) => (
                  <label key={key} className="rm-checkbox-item">
                    <input type="checkbox" checked={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}/>
                    {label}
                  </label>
                ))}
                <div className="rm-other-wrap">
                  <span className="rm-other-label">Other</span>
                  <input className="rm-input rm-other-input" placeholder="Other features..." value={form.featOther}
                    onChange={(e) => setForm((f) => ({ ...f, featOther: e.target.value }))}/>
                </div>
              </div>
            </div>
            <div className="rm-form-group">
              <label>Housekeeping</label>
              <div className="rm-checkbox-group">
                {[["hkJanah", "Janah Cultura"], ["hkJujenn", "Jujenn Nabo"], ["hkJoanah", "Joanah Cultura"]].map(([key, label]) => (
                  <label key={key} className="rm-checkbox-item">
                    <input type="checkbox" checked={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}/>
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="rm-form-group">
            <label>Description</label>
            <textarea className="rm-textarea" placeholder="Write something here..." value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}/>
          </div>

          <div className="rm-form-group">
            <label>Upload Image</label>
            <div className="rm-upload-area" onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImage}/>
              {form.image
                ? <img src={form.image} style={{ maxHeight: 110, borderRadius: 6, objectFit: "contain" }} alt="preview"/>
                : <div className="rm-upload-content">
                    <span className="rm-upload-text">Upload your venue image here...</span>
                    <Icon.Upload/>
                  </div>
              }
            </div>
          </div>

          <div className="rm-modal-actions">
            <button type="button" className="rm-btn-clear" onClick={onClear}>Clear</button>
            <button type="button" className="rm-btn-save" onClick={onSave}>{isEdit ? "Save Changes" : "Add Event"}</button>
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
  const [tab, setTab]           = useState("status");
  const [statuses]              = useState(INIT_STATUSES);
  const [venues, setVenues]     = useState(INIT_VENUES);
  const [statusSearch, setStatusSearch] = useState("");
  const [venueSearch, setVenueSearch]   = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editIdx, setEditIdx]           = useState(-1);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [deleteIdx, setDeleteIdx]       = useState(-1);
  const [toast, setToast]               = useState({ visible: false, msg: "" });
  /* stats */
  const today = (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
  })();
  const statToday = statuses.filter(s => s.date === today).length;

  /* toast */
  const showToast = (msg) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: "" }), 3000);
  };

  /* filtered */
  const q = statusSearch.toLowerCase();
  const filteredStatuses = statuses.filter(s =>
    s.type.toLowerCase().includes(q) || s.date.toLowerCase().includes(q) ||
    s.status.toLowerCase().includes(q) || String(s.guest).includes(q)
  );
  const vq = venueSearch.toLowerCase();
  const filteredVenues = venues.filter(v =>
    v.eventNum.toLowerCase().includes(vq) || v.package.toLowerCase().includes(vq) ||
    v.type.toLowerCase().includes(vq) || v.limit.toLowerCase().includes(vq)
  );

  /* modal handlers */
  const openAdd = () => {
    setEditIdx(-1);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };
  const openEdit = (idx) => {
    const v = venues[idx];
    setEditIdx(idx);
    setForm({
      eventNum: v.eventNum, package: v.package, limit: v.limit,
      price: v.price.replace("₱", ""), description: v.description || "",
      featSpeaker: v.features.includes("Speaker"),
      featChairs: v.features.includes("30 Chairs"),
      featTv: v.features.includes("Smart TV"),
      featOther: v.features.filter(f => !["Speaker","30 Chairs","Smart TV"].includes(f)).join(", "),
      hkJanah: v.housekeeping.includes("Janah Cultura"),
      hkJujenn: v.housekeeping.includes("Jujenn Nabo"),
      hkJoanah: v.housekeeping.includes("Joanah Cultura"),
      image: v.image || "",
    });
    setModalVisible(true);
  };
  const saveVenue = () => {
    if (!form.eventNum || !form.package || !form.limit || !form.price) return;
    const features = [
      form.featSpeaker && "Speaker",
      form.featChairs  && "30 Chairs",
      form.featTv      && "Smart TV",
      form.featOther   && form.featOther,
    ].filter(Boolean);
    const housekeeping = [
      form.hkJanah  && "Janah Cultura",
      form.hkJujenn && "Jujenn Nabo",
      form.hkJoanah && "Joanah Cultura",
    ].filter(Boolean);
    const priceStr = form.price.startsWith("₱") ? form.price : `₱${form.price}`;
    const rec = { eventNum: form.eventNum, package: form.package, type: "Event",
      limit: form.limit, price: priceStr, features, housekeeping,
      description: form.description, image: form.image };
    if (editIdx === -1) {
      setVenues(v => [...v, rec]);
      showToast("Event venue added successfully!");
    } else {
      setVenues(v => v.map((item, i) => i === editIdx ? rec : item));
      showToast("Event venue updated successfully!");
    }
    setModalVisible(false);
  };

  /* delete */
  const closeDelete = () => setDeleteIdx(-1);
  const confirmDelete = () => {
    setVenues(v => v.filter((_, i) => i !== deleteIdx));
    closeDelete();
    showToast("Event venue deleted.");
  };

  const STATS = [
    { label: "Reservation for Today", StatI: StatIconCal, value: statToday },
    { label: "Total Reservations", StatI: StatIconDoc, value: statuses.length },
    { label: "Check-outs Today", StatI: StatIconCheckout, value: 0 },
    { label: "Balance", StatI: StatIconDollar, value: 0 },
  ];

  return (
    <>
      <RailPortalShell
        rootClassName="rm-app em-event"
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
              { id: "ev-1", msg: "Event venues sync from the API when MongoDB is connected.", time: "Admin", read: true },
            ]}
            onRequestLogout={requestLogout}
          />
        </header>

        <main className="content">
          <div className="rm-dashboard-header">
            <div className="rm-dashboard-title">Event Management Dashboard</div>
            <div className="rm-dashboard-sub">Manage your hotel events, reservations, and availability.</div>
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
                      <th>Type</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Guest</th>
                      <th>Total Amount</th>
                      <th>Downpayment</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStatuses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="rm-empty">No reservations found.</td>
                      </tr>
                    ) : (
                      filteredStatuses.map((s, i) => (
                        <tr key={i}>
                          <td>{s.type}</td>
                          <td>{s.date}</td>
                          <td>{s.time}</td>
                          <td>{s.guest}</td>
                          <td>{s.total}</td>
                          <td>{s.downpayment}</td>
                          <td>
                            <span className={`rm-badge badge-${s.status.toLowerCase()}`}>{s.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "venue" && (
            <div id="panelEventVenue" className="rm-panel">
              <div className="rm-top-row">
                <div className="rm-search-wrap">
                  <IconSearchField />
                  <input
                    type="text"
                    className="rm-search-input"
                    placeholder="Search event venue..."
                    value={venueSearch}
                    onChange={(e) => setVenueSearch(e.target.value)}
                  />
                </div>
                <button type="button" className="rm-add-btn" onClick={openAdd}>
                  <Icon.Plus /> Add Event Venue
                </button>
              </div>
              <div className="rm-section-label">Manage Event Venues</div>
              <div className="rm-table-wrap">
                <table className="rm-table">
                  <colgroup>
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                    <col className="rm-col--action" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Number</th>
                      <th>Package</th>
                      <th>Type</th>
                      <th>Limit</th>
                      <th>Price</th>
                      <th className="rm-th-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVenues.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="rm-empty">No venues found.</td>
                      </tr>
                    ) : (
                      filteredVenues.map((v) => {
                        const idx = venues.indexOf(v);
                        return (
                          <tr key={idx}>
                            <td>
                              {v.image ? (
                                <img src={v.image} className="rm-thumb" alt={v.package} />
                              ) : (
                                <div className="rm-thumb-empty">
                                  <Icon.Image />
                                </div>
                              )}
                            </td>
                            <td>{v.eventNum}</td>
                            <td>{v.package}</td>
                            <td>{v.type}</td>
                            <td>{v.limit}</td>
                            <td>{v.price}</td>
                            <td className="action-cell rm-td-action">
                              <span className="rm-action-btns">
                                <button type="button" className="icon-action edit-btn" title="Edit" onClick={() => openEdit(idx)}>
                                  <Icon.Edit />
                                </button>
                                <button type="button" className="icon-action delete-btn" title="Delete" onClick={() => setDeleteIdx(idx)}>
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
              </div>
            </div>
          )}
        </main>
      </RailPortalShell>

      <VenueModal
        visible={modalVisible}
        editIdx={editIdx}
        form={form}
        setForm={setForm}
        onClose={() => setModalVisible(false)}
        onSave={saveVenue}
        onClear={() => setForm(EMPTY_FORM)}
      />

      {deleteIdx > -1 && (
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
            <h3 className="rm-confirm-title">Delete Event Venue?</h3>
            <p className="rm-confirm-sub">This action cannot be undone.</p>
            <div className="rm-confirm-btns">
              <button type="button" className="rm-btn-cancel-confirm" onClick={closeDelete}>
                Cancel
              </button>
              <button type="button" className="rm-btn-delete-confirm" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="rm-toast active">
          <IconCheckToast />
          <span>{toast.msg}</span>
        </div>
      )}

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}