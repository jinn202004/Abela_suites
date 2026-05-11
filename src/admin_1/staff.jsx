import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import {
  fetchStaffList,
  createStaffBackend,
  updateStaffBackend,
  deleteStaffBackend,
} from "../api/staffApi";
import "./staff.css";

const emptyForm = {
  name: "",
  email: "",
  role: "Front Desk",
  department: "Operations",
  contact: "",
  status: "Active",
  password: "",
  confirmPassword: "",
};

export default function StaffManagement() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState({ visible: false, msg: "" });

  /** Block stray pointer/click activation right after landing on this route (sidebar ghost-click). */
  const suppressModalOpensUntilRef = useRef(0);
  useLayoutEffect(() => {
    suppressModalOpensUntilRef.current = performance.now() + 600;
  }, []);

  const showToast = useCallback((msg) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: "" }), 3000);
  }, []);

  const loadStaff = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const rows = await fetchStaffList();
      setStaff(rows);
    } catch (e) {
      const msg =
        e.code === "NO_TOKEN"
          ? "Sign in as an admin to manage staff."
          : e.status === 403
            ? "Admin access required."
            : e.message || "Could not load staff.";
      setLoadError(msg);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const filtered = staff.filter((s) => {
    const q = search.toLowerCase();
    return (
      String(s.name ?? "").toLowerCase().includes(q) ||
      String(s.email ?? "").toLowerCase().includes(q) ||
      String(s.role ?? "").toLowerCase().includes(q) ||
      String(s.department ?? "").toLowerCase().includes(q) ||
      String(s.contact ?? "").includes(q) ||
      String(s.status ?? "").toLowerCase().includes(q)
    );
  });

  const openAdd = () => {
    if (performance.now() < suppressModalOpensUntilRef.current) return;
    setEditingId(null);
    setForm(emptyForm);
    setFormErr("");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    if (performance.now() < suppressModalOpensUntilRef.current) return;
    setEditingId(row.id);
    setForm({
      name: row.name ?? "",
      email: row.email ?? "",
      role: row.role ?? "Front Desk",
      department: row.department ?? "",
      contact: row.contact ?? "",
      status: row.status ?? "Active",
      password: "",
      confirmPassword: "",
    });
    setFormErr("");
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleChange = (field) => (e) => {
    let val = e.target.value;
    if (field === "contact") val = val.replace(/\D/g, "").slice(0, 11);
    setForm((f) => ({ ...f, [field]: val }));
  };

  const clearForm = () => {
    setForm(emptyForm);
    setFormErr("");
  };

  const saveStaff = async () => {
    const { name, email, role, department, contact, status, password, confirmPassword } = form;
    if (!name.trim() || !email.trim() || !department.trim() || !contact.trim()) {
      setFormErr("Name, email, department, and contact are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormErr("Enter a valid email.");
      return;
    }
    if (editingId == null) {
      if (!String(password || "").trim()) {
        setFormErr("Password is required for a new login account.");
        return;
      }
      if (String(password) !== String(confirmPassword)) {
        setFormErr("Password and confirmation must match.");
        return;
      }
    } else if (String(password || "").trim() && String(password) !== String(confirmPassword)) {
      setFormErr("Password and confirmation must match.");
      return;
    }

    setSaving(true);
    setFormErr("");
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        role,
        department: department.trim(),
        contact: contact.trim(),
        status,
      };
      if (editingId == null) {
        payload.password = String(password).trim();
      } else if (String(password || "").trim()) {
        payload.password = String(password).trim();
      }
      if (editingId == null) {
        const created = await createStaffBackend(payload);
        setStaff((prev) => [created, ...prev]);
        showToast("Staff added successfully!");
      } else {
        const updated = await updateStaffBackend(editingId, payload);
        setStaff((prev) => prev.map((s) => (s.id === editingId ? updated : s)));
        showToast("Staff updated successfully!");
      }
      closeModal();
    } catch (e) {
      setFormErr(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (id) => {
    if (performance.now() < suppressModalOpensUntilRef.current) return;
    setDeletingId(id);
    setDeleteOpen(true);
  };
  const closeDelete = () => setDeleteOpen(false);

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteStaffBackend(deletingId);
      setStaff((prev) => prev.filter((s) => s.id !== deletingId));
      closeDelete();
      showToast("Staff deleted.");
    } catch (e) {
      showToast(e.message || "Delete failed.");
      closeDelete();
    }
  };

  const badgeClass = (status) =>
    status === "Active" ? "badge-active" : status === "On Leave" ? "badge-onleave" : "badge-inactive";

  return (
    
    <>
      <RailPortalShell rootClassName="app-root" mainStyle={mainStyle} sidebar={<AdminSidebarNav />}>
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Team &amp; login accounts</span>
          </div>
          <AdminTopbarActions
            notifications={[{ msg: "Staff roles are User accounts in MongoDB", time: "Admin only" }]}
            onRequestLogout={requestLogout}
          />
        </header>

        <main className="content">
          {loadError ? (
            <p className="sm-load-err" style={{ color: "#c0392b", marginBottom: "1rem" }}>
              {loadError}{" "}
              <button type="button" className="sm-add-btn" style={{ marginLeft: 8 }} onClick={() => void loadStaff()}>
                Retry
              </button>
            </p>
          ) : null}

          <div className="sm-top-row">
            <div className="sm-search-wrap">
              <svg className="sm-search-icon" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="sm-search-input"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={loading}
              />
            </div>
            <button className="sm-add-btn" onClick={openAdd} disabled={loading || !!loadError}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Staff
            </button>
          </div>

          <div className="sm-table-wrap">
            <table className="sm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="sm-empty">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="sm-empty">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td>{s.email}</td>
                      <td>{s.role}</td>
                      <td>{s.department}</td>
                      <td>{s.contact}</td>
                      <td>
                        <span className={`sm-badge ${badgeClass(s.status)}`}>{s.status}</span>
                      </td>
                      <td className="action-cell">
                        <button className="icon-action edit-btn" type="button" title="Edit" onClick={() => openEdit(s)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className="icon-action delete-btn" type="button" title="Delete" onClick={() => openDelete(s.id)}>
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
        <div className="rm-modal sm-staff-dialog">
          <div className="rm-modal-header">
            <h2 className="rm-modal-title">{editingId == null ? "Add team member (User account)" : "Edit team member"}</h2>
            <button type="button" className="rm-modal-close" onClick={closeModal}>
              ✕
            </button>
          </div>
          <div className="rm-modal-body">
            <div className="sm-form-group full">
              <label>Name</label>
              <input type="text" className="sm-input" placeholder="Enter full name" value={form.name} onChange={handleChange("name")} />
            </div>

            <div className="sm-form-row">
              <div className="sm-form-group">
                <label>Email</label>
                <input type="email" className="sm-input" placeholder="email@example.com" value={form.email} onChange={handleChange("email")} />
              </div>
              <div className="sm-form-group">
                <label>Role</label>
                <div className="sm-select-wrap">
                  <select className="sm-select" value={form.role} onChange={handleChange("role")}>
                    <option value="Admin">Admin</option>
                    <option value="Front Desk">Front Desk</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Cashier">Cashier</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="sm-form-row">
              <div className="sm-form-group">
                <label>Department</label>
                <input
                  type="text"
                  className="sm-input"
                  placeholder="e.g. Front Office"
                  value={form.department}
                  onChange={handleChange("department")}
                />
              </div>
              <div className="sm-form-group">
                <label>Contact</label>
                <input type="text" className="sm-input" placeholder="09XXXXXXXXX" maxLength="11" value={form.contact} onChange={handleChange("contact")} />
              </div>
            </div>

            <div className="sm-form-row">
              <div className="sm-form-group">
                <label>Status</label>
                <div className="sm-select-wrap">
                  <select className="sm-select" value={form.status} onChange={handleChange("status")}>
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="sm-form-row">
              <div className="sm-form-group">
                <label>{editingId == null ? "Password" : "New password (optional)"}</label>
                <input
                  type="password"
                  className="sm-input"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange("password")}
                  placeholder={editingId == null ? "Strong password for sign-in" : "Leave blank to keep current"}
                />
              </div>
              <div className="sm-form-group">
                <label>Confirm password</label>
                <input
                  type="password"
                  className="sm-input"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  placeholder="Repeat password"
                />
              </div>
            </div>

            <span className="sm-err">{formErr}</span>

            <div className="rm-modal-actions">
              <button type="button" className="rm-btn-clear" onClick={clearForm} disabled={saving}>
                Clear
              </button>
              <button type="button" className="rm-btn-save" onClick={() => void saveStaff()} disabled={saving}>
                {saving ? "Saving…" : editingId == null ? "Add Staff" : "Save Changes"}
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
          <h3 className="rm-confirm-title">Delete Staff?</h3>
          <p className="rm-confirm-sub">This action cannot be undone.</p>
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

      {toast.visible ? (
        <div className="rm-toast active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span>{toast.msg}</span>
        </div>
      ) : null}

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
