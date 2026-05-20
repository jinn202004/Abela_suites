import { useState, useLayoutEffect, useRef } from "react";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import "./attendance-management.css";
import "./adminClickable.css";
import {
  AdminViewDetailModal,
  AdminDetailRow,
} from "../components/AdminViewDetailModal";
import { handleAdminRowActivate, handleAdminRowKeyDown } from "./adminClickUtils";

const STATUS_OPTIONS = ["Present", "Late", "Absent", "On leave", "Half-day"];

const emptyForm = () => ({
  staffId: "",
  date: new Date().toISOString().slice(0, 10),
  timeIn: "",
  timeOut: "",
  status: "Present",
  notes: "",
});

function padTime(d) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function AttendanceManagement() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [rows] = useState([]);
  const [staffList] = useState([]);
  const [loadError] = useState(
    "Staff and attendance are not loaded: the Express API does not expose these endpoints yet. This screen is UI-only until backend routes exist.",
  );

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm());
  const [formErr, setFormErr] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [toast, setToast] = useState({ visible: false, msg: "" });
  const [viewRow, setViewRow] = useState(null);

  /** After sidebar route change, ignore stray activations on Add / row actions (shared admin shell). */
  const suppressModalOpensUntilRef = useRef(0);
  useLayoutEffect(() => {
    suppressModalOpensUntilRef.current = performance.now() + 600;
  }, []);

  const showToast = (msg) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: "" }), 3000);
  };

  const activeStaff = staffList.filter((s) => String(s.status || "").toLowerCase() !== "inactive");

  const filtered = rows.filter((r) => {
    if (dateFilter && String(r.date) !== dateFilter) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      String(r.employeeName || "")
        .toLowerCase()
        .includes(q) ||
      String(r.role || "")
        .toLowerCase()
        .includes(q) ||
      String(r.status || "")
        .toLowerCase()
        .includes(q) ||
      String(r.date || "").includes(q) ||
      String(r.notes || "")
        .toLowerCase()
        .includes(q)
    );
  });

  const openAdd = () => {
    if (performance.now() < suppressModalOpensUntilRef.current) return;
    setEditingId(null);
    setForm(emptyForm());
    setFormErr("");
    setModalOpen(true);
  };

  const openViewRow = (row) => {
    if (performance.now() < suppressModalOpensUntilRef.current) return;
    if (row) setViewRow(row);
  };

  const openEdit = (row) => {
    if (performance.now() < suppressModalOpensUntilRef.current) return;
    setEditingId(row.id);
    setForm({
      staffId: row.staffId != null ? String(row.staffId) : "",
      date: row.date || "",
      timeIn: row.timeIn || "",
      timeOut: row.timeOut || "",
      status: row.status || "Present",
      notes: row.notes || "",
    });
    setFormErr("");
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleField = (field) => (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const onStaffChange = (e) => {
    const id = e.target.value;
    const st = activeStaff.find((s) => String(s.id) === String(id));
    setForm((f) => ({
      ...f,
      staffId: id,
      ...(st ? { employeeName: st.name, role: st.role } : {}),
    }));
  };

  const applyNow = (field) => () => {
    setForm((f) => ({ ...f, [field]: padTime(new Date()) }));
  };

  const saveAttendance = async () => {
    const { staffId, date, timeIn } = form;
    if (!staffId) {
      setFormErr("Select an employee.");
      return;
    }
    if (!date || !timeIn) {
      setFormErr("Date and time in are required.");
      return;
    }
    const st = activeStaff.find((s) => String(s.id) === String(staffId));
    if (!st) {
      setFormErr("Selected employee was not found.");
      return;
    }

    setFormErr("Saving attendance requires backend API routes for staff and attendances (not implemented yet).");
  };

  const openDelete = (id) => {
    if (performance.now() < suppressModalOpensUntilRef.current) return;
    setDeletingId(id);
    setDeleteOpen(true);
  };
  const closeDelete = () => setDeleteOpen(false);

  const confirmDelete = async () => {
    if (deletingId == null) return;
    showToast("Delete requires a backend attendance API (not implemented yet).");
    closeDelete();
  };

  const badgeClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "present" || s === "half-day") return "badge-active";
    if (s === "late") return "badge-onleave";
    if (s === "absent" || s === "on leave") return "badge-inactive";
    return "badge-active";
  };

  return (
    <>
      <RailPortalShell
        rootClassName="app-layout admin-app-layout app-root"
        mainStyle={mainStyle}
        sidebar={<AdminSidebarNav />}
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Attendances</span>
          </div>
          <AdminTopbarActions
            notifications={[
              { id: "att-1", msg: "Attendance API is not wired yet — this page is UI-only.", time: "Admin", read: true },
            ]}
            onRequestLogout={requestLogout}
          />
        </header>

        <main className="content">
          <section className="att-process" aria-labelledby="att-process-title">
            <h3 id="att-process-title">How attendance works</h3>
            <ol>
              <li>
                <strong>Record</strong> each shift with the employee, date, clock-in (and clock-out when the shift
                ends).
              </li>
              <li>
                <strong>Status</strong> marks exceptions (late, absent, leave, half-day) for payroll and HR review.
              </li>
              <li>
                When the backend provides staff and attendance APIs, records will persist in the database. Use <strong>Search</strong>{" "}
                and <strong>Date</strong> to audit a period.
              </li>
            </ol>
          </section>

          {loadError && <p className="att-api-warning">{loadError}</p>}

          <div className="sm-top-row att-toolbar">
            <div className="sm-search-wrap">
              <svg className="sm-search-icon" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="sm-search-input"
                placeholder="Search by name, role, status, date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="att-date-filter">
              <label htmlFor="att-date-filter">Filter by date</label>
              <input
                id="att-date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
              {dateFilter && (
                <button type="button" className="att-clear-date" onClick={() => setDateFilter("")}>
                  Clear
                </button>
              )}
            </div>
            <button className="sm-add-btn" type="button" onClick={openAdd}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Record attendance
            </button>
          </div>

          <div className="sm-table-wrap">
            <table className="sm-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Date</th>
                  <th>Time in</th>
                  <th>Time out</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="sm-empty">
                      No attendance rows match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="admin-clickable-row"
                      tabIndex={0}
                      onClick={(e) => handleAdminRowActivate(e, () => openViewRow(r))}
                      onKeyDown={(e) => handleAdminRowKeyDown(e, () => openViewRow(r))}
                    >
                      <td>{r.employeeName}</td>
                      <td>{r.role}</td>
                      <td>{r.date}</td>
                      <td>{r.timeIn || "—"}</td>
                      <td>{r.timeOut ? r.timeOut : "—"}</td>
                      <td>
                        <span className={`sm-badge ${badgeClass(r.status)}`}>{r.status}</span>
                      </td>
                      <td className="att-notes-cell">{r.notes || "—"}</td>
                      <td className="action-cell">
                        <button
                          className="icon-action edit-btn"
                          type="button"
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(r);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="icon-action delete-btn"
                          type="button"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDelete(r.id);
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </RailPortalShell>

      {modalOpen ? (
      <div
        className="rm-modal-backdrop active"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div className="rm-modal att-modal">
          <div className="rm-modal-header">
            <h2 className="rm-modal-title">{editingId == null ? "Record attendance" : "Edit attendance"}</h2>
            <button type="button" className="rm-modal-close" onClick={closeModal}>
              ✕
            </button>
          </div>
          <div className="rm-modal-body">
            <div className="sm-form-group full">
              <label htmlFor="att-staff">Employee</label>
              <div className="sm-select-wrap">
                <select id="att-staff" className="sm-select" value={form.staffId} onChange={onStaffChange}>
                  <option value="">Admin</option>
                  <option value="">Front Desk</option>
                  <option value="">Housekeeping</option>
                  <option value="">Cashier</option>
                  {activeStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm-form-row">
              <div className="sm-form-group">
                <label htmlFor="att-date">Date</label>
                <input id="att-date" type="date" className="sm-input" value={form.date} onChange={handleField("date")} />
              </div>
              <div className="sm-form-group">
                <label htmlFor="att-status">Status</label>
                <div className="sm-select-wrap">
                  <select id="att-status" className="sm-select" value={form.status} onChange={handleField("status")}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="sm-form-row">
              <div className="sm-form-group">
                <label htmlFor="att-in">Time in</label>
                <div className="att-time-row">
                  <input id="att-in" type="time" className="sm-input" value={form.timeIn} onChange={handleField("timeIn")} />
                  <button type="button" className="att-now-btn" onClick={applyNow("timeIn")}>
                    Now
                  </button>
                </div>
              </div>
              <div className="sm-form-group">
                <label htmlFor="att-out">Time out (optional)</label>
                <div className="att-time-row">
                  <input id="att-out" type="time" className="sm-input" value={form.timeOut} onChange={handleField("timeOut")} />
                  <button type="button" className="att-now-btn" onClick={applyNow("timeOut")}>
                    Now
                  </button>
                </div>
              </div>
            </div>

            <div className="sm-form-group full">
              <label htmlFor="att-notes">Notes</label>
              <input
                id="att-notes"
                type="text"
                className="sm-input"
                placeholder="Optional (e.g. reason for late)"
                value={form.notes}
                onChange={handleField("notes")}
              />
            </div>

            <span className="sm-err">{formErr}</span>

            <div className="rm-modal-actions">
              <button type="button" className="rm-btn-clear" onClick={() => setForm(emptyForm())}>
                Reset
              </button>
              <button type="button" className="rm-btn-save" onClick={saveAttendance}>
                {editingId == null ? "Save record" : "Update record"}
              </button>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {deleteOpen ? (
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
          <h3 className="rm-confirm-title">Delete attendance row?</h3>
          <p className="rm-confirm-sub">This removes the log entry from the server.</p>
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
      ) : null}

      {toast.visible ? (
        <div className="rm-toast active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span>{toast.msg}</span>
        </div>
      ) : null}

      <AdminViewDetailModal
        open={Boolean(viewRow)}
        onClose={() => setViewRow(null)}
        title="Attendance Details"
      >
        {viewRow ? (
          <div className="view-item-info">
            <AdminDetailRow label="Employee" value={viewRow.employeeName} />
            <AdminDetailRow label="Role" value={viewRow.role} />
            <AdminDetailRow label="Date" value={viewRow.date} />
            <AdminDetailRow label="Time in" value={viewRow.timeIn || "—"} />
            <AdminDetailRow label="Time out" value={viewRow.timeOut || "—"} />
            <AdminDetailRow label="Status">
              <span className={`sm-badge ${badgeClass(viewRow.status)}`}>{viewRow.status}</span>
            </AdminDetailRow>
            <AdminDetailRow label="Notes" value={viewRow.notes || "—"} />
          </div>
        ) : null}
      </AdminViewDetailModal>

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
