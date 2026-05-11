import { useState, useEffect, useRef, useCallback } from "react";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import {
  fetchRoomsCatalog,
  createRoomBackend,
  updateRoomBackend,
  deleteRoomBackend,
} from "../api/guestApi";
import "./room-management.css";

/* ── INITIAL DATA ── */
const INITIAL_STATUSES = [
  { number: 1, housekeeping: "Joanah Cultura", package: "Single Suites",  type: "Room", status: "Available" },
  { number: 2, housekeeping: "Jujenn Nabo",    package: "Twin Bed",        type: "Room", status: "Available" },
  { number: 3, housekeeping: "Jujenn Nabo",    package: "Double Standard", type: "Room", status: "Available" },
  { number: 4, housekeeping: "Jujenn Nabo",    package: "Matrimonial",     type: "Room", status: "Occupied"  },
  { number: 5, housekeeping: "Janah Cultura",  package: "Family",          type: "Room", status: "Occupied"  },
];

/** Map `GET /api/rooms` documents to admin table rows (`be/abela-be/README.md`). */
function mapApiRoomToAdmin(api) {
  const guests = Math.max(1, parseInt(String(api.guests), 10) || 1);
  const priceNum = Number(api.price);
  const priceStr = Number.isFinite(priceNum)
    ? `₱${priceNum.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : "—";
  const pkg =
    String(api.package ?? "").trim() || String(api.title ?? "").trim();
  return {
    apiId: String(api.id ?? ""),
    roomNum: String(api.roomNumber ?? "").trim(),
    packageField: pkg,
    package: pkg || "—",
    type: "Room",
    limit: `${guests} guest${guests > 1 ? "s" : ""}`,
    price: priceStr,
    features: Array.isArray(api.features) ? api.features : [],
    description: String(api.description ?? "").trim(),
    image: String(api.image ?? "").trim() || "",
  };
}

function parseGuestsFromLimit(limitStr) {
  const m = String(limitStr || "").match(/(\d+)/);
  if (!m) return NaN;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 1 ? n : NaN;
}

function stripPriceInput(raw) {
  const n = Number(String(raw ?? "").replace(/[₱,\s]/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

const BLANK_FORM = {
  roomNum: "", package: "", limit: "", price: "", description: "",
  featBreakfast: false, featWifi: false, featTv: false, featBath: false,
  featOther: "",
  image: "",
};

/* ────────────────────────────────────────────────────── */
/*  SVG ICONS                                             */
/* ────────────────────────────────────────────────────── */
const IconSearch = () => (
  <svg className="rm-search-icon" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="16" height="16">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconDelete = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="1.5" width="36" height="36">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);
const IconCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2">
    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);
const IconAvail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </svg>
);
const IconOccupied = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <path d="M8 12h8" />
  </svg>
);
const IconTotal = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconThumb = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="1.5" width="20" height="20">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

/* ────────────────────────────────────────────────────── */
/*  MAIN COMPONENT                                        */
/* ────────────────────────────────────────────────────── */
export default function RoomManagement() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [statuses] = useState(INITIAL_STATUSES);
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);
  const [roomMutating, setRoomMutating] = useState(false);
  const [activeTab, setActiveTab] = useState("status");
  const [statusSearch, setStatusSearch] = useState("");
  const [roomsSearch, setRoomsSearch] = useState("");

  /* modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [form, setForm] = useState(BLANK_FORM);
  const [formErr, setFormErr] = useState("");

  /* delete */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState(-1);

  /* toast */
  const [toast, setToast] = useState({ visible: false, msg: "" });
  const toastTimer = useRef(null);

  /* ── STATS ── */
  const statAvailable = statuses.filter(s => s.status === "Available").length;
  const statOccupied  = statuses.filter(s => s.status === "Occupied").length;
  const statTotal     = rooms.length;

  /* ── FILTERED DATA ── */
  const filteredStatuses = statuses.filter(s => {
    const q = statusSearch.toLowerCase();
    return String(s.number).includes(q)
      || s.housekeeping.toLowerCase().includes(q)
      || s.package.toLowerCase().includes(q)
      || s.type.toLowerCase().includes(q)
      || s.status.toLowerCase().includes(q);
  });

  const filteredRooms = rooms.filter(r => {
    const q = roomsSearch.toLowerCase();
    return r.roomNum.toLowerCase().includes(q)
      || r.package.toLowerCase().includes(q)
      || r.type.toLowerCase().includes(q)
      || r.limit.toLowerCase().includes(q);
  });

  /* ── TOAST ── */
  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, msg });
    toastTimer.current = setTimeout(() => setToast({ visible: false, msg: "" }), 3000);
  }

  /* ── MODAL HELPERS ── */
  function openAdd() {
    setEditIdx(-1);
    setForm(BLANK_FORM);
    setFormErr("");
    setModalOpen(true);
  }

  function openEdit(idx) {
    const r = rooms[idx];
    setEditIdx(idx);
    setForm({
      roomNum:      r.roomNum,
      package:      r.packageField != null ? r.packageField : "",
      limit:        r.limit,
      price:        String(stripPriceInput(r.price) || "").replace(/₱|&#8369;/g, ""),
      description:  r.description || "",
      featBreakfast:(r.features || []).includes("Free Breakfast"),
      featWifi:     (r.features || []).includes("WiFi"),
      featTv:       (r.features || []).includes("TV"),
      featBath:     (r.features || []).includes("Bathroom Amenities"),
      featOther:    (r.features || []).filter(f =>
        !["Free Breakfast","WiFi","TV","Bathroom Amenities"].includes(f)
      ).join(", "),
      image:    r.image || "",
    });
    setFormErr("");
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); }

  function clearForm() { setForm(BLANK_FORM); setFormErr(""); }

  function handleFormChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(prev => ({ ...prev, image: ev.target.result }));
    reader.readAsDataURL(file);
  }

  const refreshRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const list = await fetchRoomsCatalog();
      setRooms(list.map(mapApiRoomToAdmin));
    } catch {
      setRooms([]);
      setRoomsError("Could not load rooms from the API. Check the server and `VITE_API_BASE_URL`.");
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  async function saveRoom() {
    const { roomNum, package: pkg, limit, price } = form;
    if (!roomNum.trim() || !pkg.trim() || !limit.trim() || String(price).trim() === "") {
      setFormErr("Room number, package, limit and price are required.");
      return;
    }
    const guests = parseGuestsFromLimit(limit);
    if (!Number.isFinite(guests)) {
      setFormErr("Limit must include a guest count (e.g. 2 or \"2 guests\").");
      return;
    }
    const priceNum = stripPriceInput(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setFormErr("Enter a valid price.");
      return;
    }

    const features = [];
    if (form.featBreakfast) features.push("Free Breakfast");
    if (form.featWifi)      features.push("WiFi");
    if (form.featTv)        features.push("TV");
    if (form.featBath)      features.push("Bathroom Amenities");
    if (form.featOther.trim()) features.push(form.featOther.trim());

    const payload = {
      roomNumber: roomNum.trim(),
      package: pkg.trim(),
      price: priceNum,
      guests,
      description: (form.description || "").trim(),
      features,
      image: form.image || (editIdx > -1 ? rooms[editIdx].image : "") || "",
    };

    setRoomMutating(true);
    setFormErr("");
    try {
      if (editIdx === -1) {
        await createRoomBackend(payload);
        showToast("Room added successfully!");
      } else {
        const row = rooms[editIdx];
        if (!row.apiId) {
          setFormErr("This room is not linked to the server. Refresh the page.");
          return;
        }
        await updateRoomBackend(row.apiId, payload);
        showToast("Room updated successfully!");
      }
      await refreshRooms();
      closeModal();
    } catch (e) {
      const msg =
        e && e.code === "NO_TOKEN"
          ? "No API session. Log in with an admin email/password that exists in the backend (JWT required). Demo-only login does not receive a token."
          : e.message || "Request failed";
      setFormErr(msg);
    } finally {
      setRoomMutating(false);
    }
  }

  /* ── DELETE ── */
  function openDelete(idx) { setDeletingIdx(idx); setDeleteOpen(true); }
  function closeDelete()   { setDeleteOpen(false); }
  async function confirmDelete() {
    const row = rooms[deletingIdx];
    if (!row?.apiId) {
      showToast("Cannot delete: room is not on the server. Refresh the page.");
      closeDelete();
      return;
    }
    setRoomMutating(true);
    try {
      await deleteRoomBackend(row.apiId);
      showToast("Room deleted.");
      await refreshRooms();
      closeDelete();
    } catch (e) {
      showToast(
        e && e.code === "NO_TOKEN"
          ? "No API token — use a backend admin account, not demo-only login."
          : e.message || "Delete failed"
      );
      closeDelete();
    } finally {
      setRoomMutating(false);
    }
  }

  useEffect(() => {
    refreshRooms();
  }, [refreshRooms]);

  /* ────────────────────────────────────────────────────── */
  /*  RENDER                                                */
  /* ────────────────────────────────────────────────────── */
  return (
    <>
      <RailPortalShell
        rootClassName="rm-app"
        mainStyle={mainStyle}
        sidebar={<AdminSidebarNav logoSrc="/public/logo.png" />}
      >
        {/* ── TOP BAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Room Management</span>
          </div>
          <AdminTopbarActions
            notifications={[
              { id: "rm-1", msg: "Room catalog syncs from MongoDB when the API is running.", time: "Admin", read: true },
            ]}
            onRequestLogout={requestLogout}
          />
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">

          {/* Dashboard Header */}
          <div className="rm-dashboard-header">
            <div className="rm-dashboard-title">Room Management Dashboard</div>
            <div className="rm-dashboard-sub">Manage your hotel rooms, reservations, and availability</div>
            {roomsError && (
              <div className="rm-api-err" style={{ marginTop: "12px", color: "#c0392b", fontSize: "14px" }}>
                {roomsError}
              </div>
            )}
          </div>

          <div className="rm-stats-row">
            <div className="rm-stat-card">
              <div className="rm-stat-label">
                <IconAvail /> Available Rooms
              </div>
              <div className="rm-stat-value">{statAvailable}</div>
            </div>
            <div className="rm-stat-card">
              <div className="rm-stat-label">
                <IconOccupied /> Occupied Rooms
              </div>
              <div className="rm-stat-value">{statOccupied}</div>
            </div>
            <div className="rm-stat-card">
              <div className="rm-stat-label">
                <IconTotal /> Total Rooms
              </div>
              <div className="rm-stat-value">{statTotal}</div>
            </div>
          </div>

          <div className="rm-room-switch" role="tablist" aria-label="Room views">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "status"}
              className={`rm-room-switch__btn${activeTab === "status" ? " rm-room-switch__btn--active" : ""}`}
              onClick={() => setActiveTab("status")}
            >
              Room Status
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "rooms"}
              className={`rm-room-switch__btn${activeTab === "rooms" ? " rm-room-switch__btn--active" : ""}`}
              onClick={() => setActiveTab("rooms")}
            >
              Rooms
            </button>
          </div>

          {/* ── ROOM STATUS PANEL ── */}
          {activeTab === "status" && (
            <div id="panelStatus" className="rm-panel">
              <div className="rm-top-row">
                <div className="rm-search-wrap">
                  <IconSearch/>
                  <input type="text" className="rm-search-input"
                         placeholder="Search available, occupied, needs clean..."
                         value={statusSearch}
                         onChange={e => setStatusSearch(e.target.value)}/>
                </div>
              </div>
              <div className="rm-section-label">Room Reservations</div>
              <div className="rm-table-wrap">
                <table className="rm-table">
                  <colgroup>
                    <col />
                    <col />
                    <col />
                    <col />
                    <col />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Number</th><th>Housekeeping</th>
                      <th>Package</th><th>Type</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStatuses.length === 0 ? (
                      <tr><td colSpan={5} className="rm-empty">No reservations found.</td></tr>
                    ) : filteredStatuses.map(s => (
                        <tr key={s.number}>
                          <td>{s.number}</td>
                          <td>{s.housekeeping}</td>
                          <td>{s.package}</td>
                          <td>{s.type}</td>
                          <td>
                            <span className={`rm-badge badge-${s.status.toLowerCase()}`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ROOMS PANEL ── */}
          {activeTab === "rooms" && (
            <div id="panelRooms" className="rm-panel">
              <div className="rm-top-row">
                <div className="rm-search-wrap">
                  <IconSearch/>
                  <input type="text" className="rm-search-input"
                         placeholder="Search room..."
                         value={roomsSearch}
                         onChange={e => setRoomsSearch(e.target.value)}/>
                </div>
                <button className="rm-add-btn" onClick={openAdd}>
                  <IconPlus/> Add Room
                </button>
              </div>
              <div className="rm-section-label">Manage Rooms</div>
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
                      <th>Room</th><th>Number</th><th>Package</th>
                      <th>Type</th><th>Limit</th><th>Price</th>
                      <th className="rm-th-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomsLoading ? (
                      <tr><td colSpan={7} className="rm-empty">Loading rooms…</td></tr>
                    ) : filteredRooms.length === 0 ? (
                      <tr><td colSpan={7} className="rm-empty">No rooms found.</td></tr>
                    ) : filteredRooms.map(r => {
                      const idx = rooms.indexOf(r);
                      return (
                        <tr key={(r.apiId || "") + r.roomNum + idx}>
                          <td>
                            {r.image
                              ? <img src={r.image} className="rm-thumb" alt={r.package}/>
                              : <div className="rm-thumb-empty"><IconThumb/></div>
                            }
                          </td>
                          <td>{r.roomNum}</td>
                          <td>{r.package}</td>
                          <td>{r.type}</td>
                          <td>{r.limit}</td>
                          <td>{r.price}</td>
                          <td className="action-cell rm-td-action">
                            <span className="rm-action-btns">
                              <button className="icon-action edit-btn" title="Edit"
                                      onClick={() => openEdit(idx)}><IconEdit/></button>
                              <button className="icon-action delete-btn" title="Delete"
                                      onClick={() => openDelete(idx)}><IconDelete/></button>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </RailPortalShell>

      {/* ══════════════════════════════════════════════════ */}
      {/* ADD / EDIT ROOM MODAL                             */}
      {/* ══════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="rm-modal-backdrop active" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="rm-modal">
            <div className="rm-modal-header">
              <h2 className="rm-modal-title">{editIdx === -1 ? "Add New Room" : "Edit Room"}</h2>
              <button className="rm-modal-close" onClick={closeModal}>&#x2715;</button>
            </div>
            <div className="rm-modal-body">

              <div className="rm-form-row">
                <div className="rm-form-group">
                  <label>Room number</label>
                  <input type="text" className="rm-input" placeholder="e.g. 101"
                         value={form.roomNum}
                         onChange={e => handleFormChange("roomNum", e.target.value)}/>
                </div>
                <div className="rm-form-group">
                  <label>Package</label>
                  <input type="text" className="rm-input" placeholder="e.g. Single Suites, Overnight"
                         value={form.package}
                         onChange={e => handleFormChange("package", e.target.value)}/>
                </div>
              </div>

              <div className="rm-form-row">
                <div className="rm-form-group">
                  <label>Limit (guests)</label>
                  <input type="text" className="rm-input" placeholder="e.g. 2 or 2 guests"
                         value={form.limit}
                         onChange={e => handleFormChange("limit", e.target.value)}/>
                </div>
                <div className="rm-form-group">
                  <label>Price</label>
                  <input type="text" className="rm-input" placeholder="3500 or ₱3,500"
                         value={form.price}
                         onChange={e => handleFormChange("price", e.target.value)}/>
                </div>
              </div>

              <div className="rm-form-row">
                <div className="rm-form-group rm-form-group--full">
                  <label>Features</label>
                  <div className="rm-checkbox-group">
                    {[
                      { id: "featBreakfast", label: "Free Breakfast" },
                      { id: "featWifi",      label: "WiFi"            },
                      { id: "featTv",        label: "TV"              },
                      { id: "featBath",      label: "Bathroom Amenities" },
                    ].map(f => (
                      <label key={f.id} className="rm-checkbox-item">
                        <input type="checkbox" checked={form[f.id]}
                               onChange={e => handleFormChange(f.id, e.target.checked)}/>
                        {f.label}
                      </label>
                    ))}
                    <div className="rm-other-wrap">
                      <span className="rm-other-label">Other</span>
                      <input type="text" className="rm-input rm-other-input"
                             placeholder="Other features..."
                             value={form.featOther}
                             onChange={e => handleFormChange("featOther", e.target.value)}/>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rm-form-group">
                <label>Description</label>
                <textarea className="rm-textarea" placeholder="Write something here..."
                          value={form.description}
                          onChange={e => handleFormChange("description", e.target.value)}/>
              </div>

              <div className="rm-form-group">
                <label>Upload Image</label>
                <div className="rm-upload-area"
                     onClick={() => document.getElementById("fRoomImage").click()}>
                  <input type="file" id="fRoomImage" accept="image/*"
                         style={{ display: "none" }} onChange={handleImageChange}/>
                  <div className="rm-upload-content">
                    {form.image
                      ? <img src={form.image} style={{ maxHeight: 110, borderRadius: 6, objectFit: "contain" }} alt="preview"/>
                      : (<>
                          <span className="rm-upload-text">Upload your room image here...</span>
                          <IconUpload/>
                        </>)
                    }
                  </div>
                </div>
              </div>

              {formErr && <span className="rm-err">{formErr}</span>}

              <div className="rm-modal-actions">
                <button className="rm-btn-clear" type="button" onClick={clearForm} disabled={roomMutating}>
                  Clear
                </button>
                <button className="rm-btn-save" type="button" onClick={saveRoom} disabled={roomMutating}>
                  {roomMutating ? "Saving…" : editIdx === -1 ? "Add Room" : "Save Changes"}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* DELETE CONFIRM                                     */}
      {/* ══════════════════════════════════════════════════ */}
      {deleteOpen && (
        <div
          className="rm-confirm-backdrop active"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDelete();
          }}
        >
          <div className="rm-confirm-dialog">
            <div className="rm-confirm-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none"
                   stroke="#e74c3c" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span className="rm-confirm-exclaim">!</span>
            </div>
            <h3 className="rm-confirm-title">Delete Room?</h3>
            <p className="rm-confirm-sub">This action cannot be undone.</p>
            <div className="rm-confirm-btns">
              <button className="rm-btn-cancel-confirm" onClick={closeDelete}>Cancel</button>
              <button className="rm-btn-delete-confirm" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast.visible && (
        <div className="rm-toast active">
          <IconCheck/>
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