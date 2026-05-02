import React, { useState, useEffect, useRef } from "react";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import "./inventory.css";

/* ── INITIAL DATA ── */
const initialInventory = [
  { id: 1, name: "Bed Sheet",     category: "Room",  unit: "Piece", quantity: 0,  threshold: 10, cost: "₱150" },
  { id: 2, name: "Pillow Case",   category: "Room",  unit: "Piece", quantity: 10, threshold: 10, cost: "₱80"  },
  { id: 3, name: "Shampoo",       category: "Room",  unit: "Piece", quantity: 5,  threshold: 10, cost: "₱109" },
  { id: 4, name: "Paper Plate",   category: "Event", unit: "Piece", quantity: 0,  threshold: 10, cost: "₱50"  },
  { id: 5, name: "Plastic Spoon", category: "Event", unit: "Pack",  quantity: 10, threshold: 10, cost: "₱30"  },
  { id: 6, name: "Plastic Fork",  category: "Event", unit: "Pack",  quantity: 20, threshold: 10, cost: "₱30"  },
  { id: 7, name: "Plastic cup",   category: "Event", unit: "Pack",  quantity: 50, threshold: 10, cost: "₱45"  },
  { id: 8, name: "Table Cover",   category: "Event", unit: "Pack",  quantity: 50, threshold: 10, cost: "₱60"  },
];

function getStatus(item) {
  if (item.quantity <= 0) return { label: "Out of Stock", cls: "badge-out" };
  if (item.quantity <= item.threshold) return { label: "Low Stock", cls: "badge-low" };
  return { label: "In Stock", cls: "badge-stock" };
}

export default function InventoryManagement() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [inventory, setInventory]           = useState(initialInventory);
  const [activityLog, setActivityLog]       = useState([
    { title: 'Bed Sheet stock is low', desc: 'Low stock alert triggered.', time: '3/14/2026, 9:00:00 AM' }
  ]);
  const [currentTab, setCurrentTab]         = useState("Rooms");
  const [searchQuery, setSearchQuery]       = useState("");
  const [nextId, setNextId]                 = useState(9);

  /* Modal states */
  const [addModalOpen, setAddModalOpen]         = useState(false);
  const [viewModalOpen, setViewModalOpen]       = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen]   = useState(false);

  /* Form states */
  const [editingId, setEditingId]           = useState(-1);
  const [deletingId, setDeletingId]         = useState(-1);
  const [viewItem, setViewItem]             = useState(null);
  const [addErr, setAddErr]                 = useState("");
  const [withdrawErr, setWithdrawErr]       = useState("");

  const [fProductName, setFProductName]     = useState("");
  const [fCategory, setFCategory]           = useState("Room");
  const [fUnit, setFUnit]                   = useState("Piece");
  const [fQuantity, setFQuantity]           = useState("");
  const [fThreshold, setFThreshold]         = useState("");
  const [fUnitCost, setFUnitCost]           = useState("");

  const [selectedWithdrawId, setSelectedWithdrawId] = useState(-1);
  const [fWithdrawQty, setFWithdrawQty]     = useState(0);
  const [fWithdrawNote, setFWithdrawNote]   = useState("");
  const [customSelectOpen, setCustomSelectOpen] = useState(false);

  /* Notification / user dropdowns */

  /* Toast */
  const [toast, setToast]                   = useState({ visible: false, msg: "" });
  const toastTimer = useRef(null);

  /* ── HELPERS ── */
  function logActivity(title, desc) {
    const now = new Date();
    setActivityLog(prev => [{ title, desc, time: now.toLocaleString() }, ...prev]);
  }

  function showToast(msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, msg });
    toastTimer.current = setTimeout(() => setToast({ visible: false, msg: "" }), 3000);
  }

  /* ── FILTER ── */
  const catFilter = currentTab === "Rooms" ? "Room" : "Event";
  const filtered = inventory.filter(item =>
    item.category === catFilter &&
    (item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     item.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
     String(item.quantity).includes(searchQuery))
  );

  /* ── ADD / EDIT ── */
  function openAddModal() {
    setEditingId(-1);
    setFProductName(""); setFCategory("Room"); setFUnit("Piece");
    setFQuantity(""); setFThreshold(""); setFUnitCost("");
    setAddErr("");
    setAddModalOpen(true);
  }

  function openEditModal(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    setEditingId(id);
    setFProductName(item.name);
    setFCategory(item.category);
    setFUnit(item.unit);
    setFQuantity(item.quantity);
    setFThreshold(item.threshold);
    setFUnitCost(item.cost.replace(/₱/g, ""));
    setAddErr("");
    setAddModalOpen(true);
  }

  function saveProduct() {
    if (!fProductName.trim() || !fUnitCost.trim()) {
      setAddErr("Product name and unit cost are required.");
      return;
    }
    const costStr = fUnitCost.indexOf("₱") === -1 ? "₱" + fUnitCost : fUnitCost;
    if (editingId === -1) {
      const newItem = {
        id: nextId, name: fProductName.trim(), category: fCategory,
        unit: fUnit, quantity: parseInt(fQuantity) || 0,
        threshold: parseInt(fThreshold) || 0, cost: costStr
      };
      setInventory(prev => [...prev, newItem]);
      setNextId(n => n + 1);
      logActivity(`Added "${fProductName.trim()}"`, `${parseInt(fQuantity) || 0} units added at ${costStr} each.`);
      showToast("Product added!");
    } else {
      setInventory(prev => prev.map(i => i.id === editingId
        ? { ...i, name: fProductName.trim(), category: fCategory, unit: fUnit,
            quantity: parseInt(fQuantity) || 0, threshold: parseInt(fThreshold) || 0, cost: costStr }
        : i));
      logActivity(`Updated "${fProductName.trim()}"`, "Product details updated.");
      showToast("Product updated!");
    }
    setAddModalOpen(false);
  }

  /* ── VIEW ── */
  function openViewModal(id) {
    const item = inventory.find(i => i.id === id);
    if (item) { setViewItem(item); setViewModalOpen(true); }
  }

  /* ── WITHDRAW ── */
  function openWithdrawModal(preselectedId = -1) {
    setSelectedWithdrawId(preselectedId);
    setFWithdrawQty(0);
    setFWithdrawNote("");
    setWithdrawErr("");
    setCustomSelectOpen(false);
    setWithdrawModalOpen(true);
  }

  function confirmWithdraw() {
    const qty = parseInt(fWithdrawQty) || 0;
    if (selectedWithdrawId === -1) { setWithdrawErr("Please select an item."); return; }
    if (qty <= 0) { setWithdrawErr("Quantity must be greater than 0."); return; }
    const item = inventory.find(i => i.id === selectedWithdrawId);
    if (qty > item.quantity) { setWithdrawErr(`Not enough stock. Available: ${item.quantity}`); return; }
    setInventory(prev => prev.map(i => i.id === selectedWithdrawId ? { ...i, quantity: i.quantity - qty } : i));
    logActivity(`Withdrew "${item.name}"`, `${qty} unit(s) withdrawn.${fWithdrawNote ? " Note: " + fWithdrawNote : ""}`);
    showToast("Withdrawn successfully!");
    setWithdrawModalOpen(false);
  }

  /* ── DELETE ── */
  function openDelete(id) { setDeletingId(id); setDeleteModalOpen(true); }
  function confirmDelete() {
    const item = inventory.find(i => i.id === deletingId);
    if (item) {
      logActivity(`Deleted "${item.name}"`, "Item removed from inventory.");
      setInventory(prev => prev.filter(i => i.id !== deletingId));
    }
    setDeleteModalOpen(false);
    showToast("Item deleted.");
  }

  /* ── CLOSE ON OUTSIDE CLICK ── */
  useEffect(() => {
    function handler(e) {
      if (!e.target.closest("#customSelectWrap")) setCustomSelectOpen(false);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const selectedWithdrawItem = inventory.find(i => i.id === selectedWithdrawId);

  return (
    <>
      <RailPortalShell
        mainStyle={mainStyle}
        rootStyle={{ display: "flex" }}
        sidebar={<AdminSidebarNav />}
      >
        {/* ── TOP BAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Inventory Management</span>
          </div>
          <AdminTopbarActions
            notifications={[{ msg: "Bed Sheet stock is low", time: "3/14/2026, 9:00:00 AM" }]}
            onRequestLogout={requestLogout}
          />
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">
          <div>
            <div className="inv-page-title">Inventory</div>
            <div className="inv-page-sub">Manage stock, view activity, and archive items</div>
          </div>

          {/* TOP ACTION ROW */}
          <div className="inv-top-row">
            <div className="inv-search-wrap">
              <svg className="inv-search-icon" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="15" height="15">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text" id="invSearch" className="inv-search-input" placeholder="Search item..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="inv-btn inv-btn-add" onClick={openAddModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add
            </button>
            <button className="inv-btn inv-btn-activity" onClick={() => setActivityModalOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Activity
            </button>
            <button className="inv-btn inv-btn-withdraw" onClick={() => openWithdrawModal()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/>
              </svg>
              Withdraw
            </button>
          </div>

          {/* TABS */}
          <div className="inv-tabs">
            <button className={`inv-tab${currentTab === "Rooms" ? " active" : ""}`} onClick={() => setCurrentTab("Rooms")}>Rooms</button>
            <button className={`inv-tab${currentTab === "Event" ? " active" : ""}`} onClick={() => setCurrentTab("Event")}>Event</button>
          </div>

          {/* TABLE */}
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Product</th><th>Category</th><th>Unit</th>
                  <th>Quantity</th><th>Threshold</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody id="invTableBody">
                {filtered.length === 0 ? (
                  <tr><td colSpan="7" className="inv-empty">No items found.</td></tr>
                ) : filtered.map(item => {
                  const st = getStatus(item);
                  return (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.unit}</td>
                      <td>{item.quantity}</td>
                      <td>{item.threshold}</td>
                      <td><span className={`inv-badge ${st.cls}`}>{st.label}</span></td>
                      <td className="action-cell">
                        <button className="icon-action view-btn" title="View" onClick={() => openViewModal(item.id)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        <button className="icon-action edit-btn" title="Edit" onClick={() => openEditModal(item.id)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button className="icon-action delete-btn" title="Delete" onClick={() => openDelete(item.id)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </RailPortalShell>

      {/* ── ADD / EDIT MODAL ── */}
      <div className={`inv-modal-backdrop${addModalOpen ? " active" : ""}`} id="addBackdrop"
        onClick={e => { if (e.target === e.currentTarget) setAddModalOpen(false); }}>
        <div className="inv-modal">
          <div className="inv-modal-header">
            <h2 className="inv-modal-title">{editingId === -1 ? "Add Products" : "Edit Product"}</h2>
            <button className="inv-modal-close" onClick={() => setAddModalOpen(false)}>✕</button>
          </div>
          <div className="inv-modal-body">
            <div className="inv-form-row">
              <div className="inv-form-group">
                <label>Product Name</label>
                <input type="text" className="inv-input" placeholder="e.g. Shampoo"
                  value={fProductName} onChange={e => setFProductName(e.target.value)} />
              </div>
              <div className="inv-form-group">
                <label>Category</label>
                <div className="inv-select-wrap">
                  <select className="inv-select" value={fCategory} onChange={e => setFCategory(e.target.value)}>
                    <option value="Room">Room</option>
                    <option value="Event">Event</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="inv-form-row">
              <div className="inv-form-group">
                <label>Unit of Measurement</label>
                <div className="inv-select-wrap">
                  <select className="inv-select" value={fUnit} onChange={e => setFUnit(e.target.value)}>
                    <option value="Piece">Piece</option>
                    <option value="Pack">Pack</option>
                    <option value="Box">Box</option>
                    <option value="Bottle">Bottle</option>
                    <option value="Set">Set</option>
                  </select>
                </div>
              </div>
              <div className="inv-form-group">
                <label>Initial Quantity</label>
                <div className="inv-number-wrap">
                  <input type="number" className="inv-input" placeholder="50" min="0"
                    value={fQuantity} onChange={e => setFQuantity(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="inv-form-row">
              <div className="inv-form-group">
                <label>Minimum Threshold</label>
                <div className="inv-number-wrap">
                  <input type="number" className="inv-input" placeholder="10" min="0"
                    value={fThreshold} onChange={e => setFThreshold(e.target.value)} />
                </div>
              </div>
              <div className="inv-form-group">
                <label>Unit Cost</label>
                <input type="text" className="inv-input" placeholder="₱109"
                  value={fUnitCost} onChange={e => setFUnitCost(e.target.value)} />
              </div>
            </div>
            {addErr && <span className="inv-err">{addErr}</span>}
            <div className="inv-modal-actions">
              <button className="inv-btn-clear" onClick={() => {
                setFProductName(""); setFCategory("Room"); setFUnit("Piece");
                setFQuantity(""); setFThreshold(""); setFUnitCost(""); setAddErr("");
              }}>Clear</button>
              <button className="inv-btn-submit" onClick={saveProduct}>
                {editingId === -1 ? "Add" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── VIEW MODAL ── */}
      <div className={`inv-modal-backdrop${viewModalOpen ? " active" : ""}`}
        onClick={e => { if (e.target === e.currentTarget) setViewModalOpen(false); }}>
        <div className="inv-modal" style={{ maxWidth: "380px" }}>
          <div className="inv-modal-header">
            <h2 className="inv-modal-title">View Item</h2>
            <button className="inv-modal-close" onClick={() => setViewModalOpen(false)}>✕</button>
          </div>
          <div className="inv-modal-body">
            <div className="view-item-info" id="viewItemInfo">
              {viewItem && (() => {
                const st = getStatus(viewItem);
                return (
                  <>
                    <div className="view-item-row"><strong>Name:</strong> {viewItem.name}</div>
                    <div className="view-item-row"><strong>Category:</strong> {viewItem.category}</div>
                    <div className="view-item-row"><strong>Quantity:</strong> {viewItem.quantity}</div>
                    <div className="view-item-row"><strong>Unit:</strong> {viewItem.unit.toLowerCase()}</div>
                    <div className="view-item-row"><strong>Threshold:</strong> {viewItem.threshold}</div>
                    <div className="view-item-row">
                      <strong>Status:</strong> {viewItem.quantity} {viewItem.unit}(s) -{" "}
                      <span className={`inv-badge ${st.cls}`} style={{ fontSize: "11px" }}>{st.label}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── WITHDRAW MODAL ── */}
      <div className={`inv-modal-backdrop${withdrawModalOpen ? " active" : ""}`}
        onClick={e => { if (e.target === e.currentTarget) { setWithdrawModalOpen(false); setCustomSelectOpen(false); } }}>
        <div className="inv-modal" style={{ maxWidth: "440px" }}>
          <div className="inv-modal-header">
            <h2 className="inv-modal-title">Withdraw Item</h2>
            <button className="inv-modal-close" onClick={() => { setWithdrawModalOpen(false); setCustomSelectOpen(false); }}>✕</button>
          </div>
          <div className="inv-modal-body">
            <div className="withdraw-info" id="withdrawInfo">
              {selectedWithdrawItem ? (
                <><strong>Item:</strong> {selectedWithdrawItem.name}<br/><strong>Available:</strong> {selectedWithdrawItem.quantity}</>
              ) : (
                <><strong>Item:</strong> —<br/><strong>Available:</strong> —</>
              )}
            </div>
            <div className="inv-form-group">
              <label>Item</label>
              <div className="custom-select-wrap" id="customSelectWrap">
                <div className={`custom-select-display${customSelectOpen ? " open" : ""}`}
                  onClick={e => { e.stopPropagation(); setCustomSelectOpen(o => !o); }}>
                  <span id="customSelectText">
                    {selectedWithdrawItem ? `${selectedWithdrawItem.name} (Available: ${selectedWithdrawItem.quantity})` : "Select item..."}
                  </span>
                  <span className={`custom-select-arrow${customSelectOpen ? " open" : ""}`}>▾</span>
                </div>
                <div className={`custom-select-dropdown${customSelectOpen ? " open" : ""}`}>
                  {inventory.map(item => (
                    <div key={item.id} className="custom-select-option" onClick={() => {
                      setSelectedWithdrawId(item.id);
                      setCustomSelectOpen(false);
                    }}>
                      {item.name} (Available: {item.quantity})
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="inv-form-group">
              <label>Quantity to withdraw</label>
              <div className="inv-number-wrap">
                <input type="number" className="inv-input" value={fWithdrawQty} min="0"
                  onChange={e => setFWithdrawQty(e.target.value)} />
              </div>
            </div>
            <div className="inv-form-group">
              <label>Note (optional)</label>
              <textarea className="inv-textarea" placeholder="Describe the reason (e.g. used for event, spoilage...)"
                value={fWithdrawNote} onChange={e => setFWithdrawNote(e.target.value)} />
            </div>
            {withdrawErr && <span className="inv-err">{withdrawErr}</span>}
            <div className="inv-modal-actions">
              <button className="inv-btn-cancel" onClick={() => { setWithdrawModalOpen(false); setCustomSelectOpen(false); }}>Cancel</button>
              <button className="inv-btn-withdraw-submit" onClick={confirmWithdraw}>Withdraw</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVITY LOG MODAL ── */}
      <div className={`inv-modal-backdrop${activityModalOpen ? " active" : ""}`}
        onClick={e => { if (e.target === e.currentTarget) setActivityModalOpen(false); }}>
        <div className="inv-modal" style={{ maxWidth: "480px" }}>
          <div className="inv-modal-header">
            <h2 className="inv-modal-title">Activity Log</h2>
            <button className="inv-modal-close" onClick={() => setActivityModalOpen(false)}>✕</button>
          </div>
          <div className="inv-modal-body">
            <div className="activity-list" id="activityList">
              {activityLog.length === 0 ? (
                <div className="activity-empty">No activity yet.</div>
              ) : activityLog.map((a, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-item-top">
                    <span className="activity-item-name">{a.title}</span>
                    <span className="activity-item-time">{a.time}</span>
                  </div>
                  <div className="activity-item-desc">{a.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── DELETE CONFIRM ── */}
      <div className={`inv-confirm-backdrop${deleteModalOpen ? " active" : ""}`} id="deleteBackdrop">
        <div className="inv-confirm-dialog">
          <div className="inv-confirm-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            <span className="inv-confirm-exclaim">!</span>
          </div>
          <h3 className="inv-confirm-title">Delete Item?</h3>
          <p className="inv-confirm-sub">This action cannot be undone.</p>
          <div className="inv-confirm-btns">
            <button className="inv-confirm-cancel" onClick={() => setDeleteModalOpen(false)}>Cancel</button>
            <button className="inv-confirm-delete" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      </div>

      {/* ── TOAST ── */}
      <div className={`inv-toast${toast.visible ? " active" : ""}`} id="invToast">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2">
          <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
        </svg>
        <span id="invToastMsg">{toast.msg}</span>
      </div>

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}