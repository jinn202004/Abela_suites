import { useState } from "react";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import "./bills.css";

/* ── STATIC DATA ── */
const initialRoomBills = [
  { id: 152, customer: "Joanah Cultura", room: 5,  package: "N/A", checkIn: "2/20/2026", checkOut: "2/23/2026", amount: 5000, paid: 0 },
  { id: 153, customer: "Jujenn Nabo",    room: 1,  package: "N/A", checkIn: "2/20/2026", checkOut: "2/20/2026", amount: 5000, paid: 0 },
  { id: 154, customer: "Jujenn Nabo",    room: 12, package: "N/A", checkIn: "2/20/2026", checkOut: "2/20/2026", amount: 5000, paid: 0 },
  { id: 155, customer: "Jujenn Nabo",    room: 13, package: "N/A", checkIn: "2/20/2026", checkOut: "2/20/2026", amount: 5000, paid: 0 },
  { id: 156, customer: "Joanah Cultura", room: 20, package: "N/A", checkIn: "2/20/2026", checkOut: "2/20/2026", amount: 5000, paid: 0 },
];

const initialEventBills = [
  { id: 16,  customer: "Joanah Cultura", venue: "Mini Sky Bar",  package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 17,  customer: "Jujenn Nabo",    venue: "Function Hall", package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 18,  customer: "Jujenn Nabo",    venue: "Mini Sky Bar",  package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 19,  customer: "Janah Cultura",  venue: "Function Hall", package: "N/A", date: "2/20/2026", amount: 5000, paid: 2500 },
  { id: 20,  customer: "Janah Cultura",  venue: "Mini Sky Bar",  package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 21,  customer: "Jujenn Nabo",    venue: "Function Hall", package: "N/A", date: "2/20/2026", amount: 5000, paid: 5000 },
  { id: 22,  customer: "Jujenn Nabo",    venue: "Mini Sky Bar",  package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 23,  customer: "Janah Cultura",  venue: "Function Hall", package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 24,  customer: "Janah Cultura",  venue: "Mini Sky Bar",  package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 25,  customer: "Jujenn Nabo",    venue: "Function Hall", package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 26,  customer: "Jujenn Nabo",    venue: "Mini Sky Bar",  package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 27,  customer: "Joanah Cultura", venue: "Function Hall", package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 28,  customer: "Janah Cultura",  venue: "Mini Sky Bar",  package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 29,  customer: "Jujenn Nabo",    venue: "Function Hall", package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
  { id: 30,  customer: "Joanah Cultura", venue: "Mini Sky Bar",  package: "N/A", date: "2/20/2026", amount: 5000, paid: 0 },
];

/* ── SVG ICONS ── */
const Icons = {
  Room: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden>
      <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/>
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Print: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="14" height="14">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Check: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2">
      <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
};

/* ── SIDEBAR ── */
function Sidebar() {
  return <AdminSidebarNav logoSrc="/public/logo.png" />;
}

/* ── TOPBAR ── */
function Topbar({ onRequestLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <AdminSidebarToggle />
        <span className="breadcrumb-title">Bills and Invoices</span>
      </div>
      <AdminTopbarActions
        notifications={[{ msg: "Bill #152 has an outstanding balance", time: "3/15/2026, 9:00:00 AM" }]}
        onRequestLogout={onRequestLogout}
      />
    </header>
  );
}

/* ── STAT CARDS ── */
function StatCards({ roomCount, eventCount }) {
  return (
    <div className="bills-stats-row">
      <div className="bills-stat-card">
        <div className="bills-stat-label">
          <Icons.Room />
          Room Bills
        </div>
        <div className="bills-stat-value">{roomCount}</div>
      </div>
      <div className="bills-stat-card">
        <div className="bills-stat-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Event Bills
        </div>
        <div className="bills-stat-value">{eventCount}</div>
      </div>
      <div className="bills-stat-card">
        <div className="bills-stat-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Total Bills
        </div>
        <div className="bills-stat-value">{roomCount + eventCount}</div>
      </div>
    </div>
  );
}

/* ── BILLS DETAILS MODAL ── */
function DetailsModal({ bill, onClose }) {
  if (!bill) return null;
  const remaining = bill.amount - bill.paid;
  const isRoom    = bill.room !== undefined;

  return (
    <div className="bills-modal-backdrop active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bills-modal">
        <div className="bills-modal-header">
          <h2 className="bills-modal-title">Bills Details</h2>
          <button className="bills-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="bills-modal-body">
          <div className="bill-detail-row"><strong>Bills:</strong> {bill.id}</div>
          <div className="bill-detail-row"><strong>Customer:</strong> {bill.customer}</div>

          {isRoom ? (
            <>
              <div className="bill-detail-row"><strong>Room:</strong> {bill.room}</div>
              <div className="bill-detail-row"><strong>Package:</strong> {bill.package || "N/A"}</div>
              <div className="bill-detail-row"><strong>Check-in:</strong> {bill.checkIn}</div>
              <div className="bill-detail-row"><strong>Check-out:</strong> {bill.checkOut}</div>
            </>
          ) : (
            <>
              <div className="bill-detail-row"><strong>Venue:</strong> {bill.venue}</div>
              <div className="bill-detail-row"><strong>Package:</strong> {bill.package || "N/A"}</div>
              <div className="bill-detail-row"><strong>Date:</strong> {bill.date}</div>
            </>
          )}

          <div className="bill-amount-box">
            <div className="bill-amount-row">
              <strong>Total Amount:</strong>
              <span className="bill-amount-total">₱{Number(bill.amount).toFixed(2)}</span>
            </div>
            <div className="bill-no-payment">
              {bill.paid === 0 ? "No payments recorded yet" : `₱${Number(bill.paid).toFixed(2)} paid`}
            </div>
            <div className="bill-amount-row" style={{ marginTop: 4 }}>
              <span className="bill-balance-label">Total Paid:</span>
              <span>₱{Number(bill.paid).toFixed(2)}</span>
            </div>
            <div className="bill-amount-row">
              <span className="bill-balance-label">Remaining Balance:</span>
              <span className="bill-balance-value">₱{Number(remaining).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── TOAST ── */
function Toast({ message, visible }) {
  return (
    <div className={`bills-toast${visible ? " active" : ""}`}>
      <Icons.Check />
      <span>{message}</span>
    </div>
  );
}

/* ── MAIN COMPONENT ── */
export default function Bills() {
  const { mainStyle } = useAdminShell();
  const [currentTab, setCurrentTab] = useState("room");
  const [search,     setSearch]     = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [selectedBill, setSelectedBill] = useState(null);
  const [toast,      setToast]      = useState({ visible: false, message: "" });
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();

  const showToast = (msg) => {
    setToast({ visible: true, message: msg });
    setTimeout(() => setToast({ visible: false, message: "" }), 3000);
  };

  const handleRequestLogout = () => {
    requestLogout();
  };

  const openDetails = (id) => {
    const bill =
      initialRoomBills.find((b) => b.id === id) ||
      initialEventBills.find((b) => b.id === id);
    setSelectedBill(bill || null);
  };

  const printBill = (id) => {
    const bill =
      initialRoomBills.find((b) => b.id === id) ||
      initialEventBills.find((b) => b.id === id);
    if (bill) showToast(`Printing Bill #${bill.id}...`);
  };

  /* Filter logic */
  const data     = currentTab === "room" ? initialRoomBills : initialEventBills;
  const q        = search.toLowerCase();
  const filtered = data.filter((b) => {
    const str =
      String(b.id) +
      " " +
      b.customer.toLowerCase() +
      (currentTab === "room" ? " " + b.room : " " + b.venue.toLowerCase());
    return str.includes(q);
  });

  return (
    <>
      <RailPortalShell rootClassName="bills-page" mainStyle={mainStyle} sidebar={<Sidebar />}>
        <Topbar
          onRequestLogout={handleRequestLogout}
        />

        <main className="content">
          {/* Header */}
          <div>
            <div className="bills-title">Billings Management</div>
            <div className="bills-sub">View and manage all room and event bills</div>
          </div>

          {/* Stat Cards */}
          <StatCards roomCount={initialRoomBills.length} eventCount={initialEventBills.length} />

          {/* Tabs */}
          <div className="bills-tabs">
            <button
              className={`bills-tab${currentTab === "room" ? " active" : ""}`}
              onClick={() => { setCurrentTab("room"); setSearch(""); }}
            >
              Room Bills
            </button>
            <button
              className={`bills-tab${currentTab === "event" ? " active" : ""}`}
              onClick={() => { setCurrentTab("event"); setSearch(""); }}
            >
              Event Bills
            </button>
          </div>

          {/* Filter Row */}
          <div className="bills-filter-row">
            <div className="bills-search-wrap">
              <Icons.Search />
              <input
                type="text"
                className="bills-search-input"
                placeholder="Search customer name, bill #, room, or event..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="bills-time-wrap">
              <select
                className="bills-time-select"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {/* Section Label */}
          <div className="bills-section-label">
            {currentTab === "room" ? "Room Reservations" : "Event Reservations"}
          </div>

          {/* Table */}
          <div className="bills-table-wrap">
            <table className="bills-table">
              <thead>
                <tr>
                  {currentTab === "room" ? (
                    <>
                      <th>Bill #</th><th>Customer</th><th>Room</th>
                      <th>Check-In</th><th>Check-Out</th><th>Amount</th><th>Action</th>
                    </>
                  ) : (
                    <>
                      <th>Customer</th><th>Venue</th><th>Date</th><th>Amount</th><th>Action</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={currentTab === "room" ? 7 : 5} className="bills-empty">
                      No bills found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => (
                    <tr key={b.id}>
                      {currentTab === "room" ? (
                        <>
                          <td>#{b.id}</td>
                          <td>{b.customer}</td>
                          <td>{b.room}</td>
                          <td>{b.checkIn}</td>
                          <td>{b.checkOut}</td>
                          <td>₱{Number(b.amount).toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td>{b.customer}</td>
                          <td>{b.venue}</td>
                          <td>{b.date}</td>
                          <td>₱{Number(b.amount).toFixed(2)}</td>
                        </>
                      )}
                      <td className="action-cell">
                        <button
                          className="icon-action view-btn"
                          title="View Details"
                          onClick={() => openDetails(b.id)}
                        >
                          <Icons.Eye />
                        </button>
                        <button
                          className="icon-action print-btn"
                          title="Print"
                          onClick={() => printBill(b.id)}
                        >
                          <Icons.Print />
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

      {/* Modal */}
      <DetailsModal bill={selectedBill} onClose={() => setSelectedBill(null)} />

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}