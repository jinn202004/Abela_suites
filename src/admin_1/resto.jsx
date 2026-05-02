import { useState, useRef } from "react";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import "./resto.css";

const CATEGORIES = ["Main Course", "Side Dish", "Beverages", "Soup", "Fruits"];

const INITIAL_DISHES = [
  { id: 1,  name: "Tinolang Isda",         price: "225", category: "Main Course", availability: "Available",   description: "A comforting Filipino dish with fish, ginger and green papaya in a light savory broth.", image: "https://i.ytimg.com/vi/vS_Z-pCJCEA/maxresdefault.jpg" },
  { id: 2,  name: "Tinolang Manok",        price: "225", category: "Main Course", availability: "Available",   description: "Classic Filipino chicken tinola with ginger, green papaya in a light savory broth.",    image: "https://i.ytimg.com/vi/1qsziJWurg4/maxresdefault.jpg" },
  { id: 3,  name: "Tinolang Isda",         price: "225", category: "Main Course", availability: "Available",   description: "A comforting Filipino dish with fish, ginger and green papaya.",                       image: "https://i.ytimg.com/vi/vS_Z-pCJCEA/maxresdefault.jpg" },
  { id: 4,  name: "Sinigang na Bangus",    price: "275", category: "Main Course", availability: "Available",   description: "Tender milkfish in a tangy tamarind broth with vegetables.",                          image: "https://yummykitchentv.com/wp-content/uploads/2023/06/sinigang.jpg" },
  { id: 5,  name: "Sinigang na Baboy",     price: "295", category: "Main Course", availability: "Available",   description: "Rich and savory Filipino sinigang with pork in a tangy tamarind broth.",               image: "https://speedyrecipe.com/wp-content/uploads/2022/09/how-to-cook-sinigang-na-baboy.jpg" },
  { id: 6,  name: "Sinigang na Bangus",    price: "275", category: "Main Course", availability: "Available",   description: "Tender milkfish in a tangy tamarind broth with vegetables.",                          image: "https://yummykitchentv.com/wp-content/uploads/2023/06/sinigang.jpg" },
  { id: 7,  name: "Special Chicken Wings", price: "199", category: "Main Course", availability: "Available",   description: "Crispy golden chicken wings seasoned with special house spices.",                      image: "https://easychickenrecipes.com/wp-content/uploads/2023/08/featured-buffalo-wings-recipe.jpg" },
  { id: 8,  name: "Fruit Salad",           price: "99",  category: "Fruits",      availability: "Available",   description: "Fresh mixed fruits with cream dressing.",                                              image: "https://www.valyastasteofhome.com/wp-content/uploads/2015/06/062-1.jpg" },
  { id: 9,  name: "Iced Tea",              price: "55",  category: "Beverages",   availability: "Available",   description: "Refreshing iced tea served cold.",                                                     image: "https://images.cocktailwave.com/long-island-iced-tea.png" },
  { id: 10, name: "Lemon Juice",           price: "65",  category: "Beverages",   availability: "Unavailable", description: "Freshly squeezed lemon juice.",                                                        image: "https://i.pinimg.com/originals/1a/39/f4/1a39f4a400ba206d743e4ec8a1b69dd5.jpg" },
  { id: 11, name: "Sinigang na Isda",      price: "265", category: "Soup",        availability: "Available",   description: "Fish in sour tamarind broth.",                                                         image: "https://thefoodxp.com/wp-content/uploads/2022/11/Jamie-Oliver-Chicken-Soup-Recipe-1.jpg" },
  { id: 12, name: "Chicken Sopas",         price: "145", category: "Soup",        availability: "Available",   description: "Creamy Filipino chicken macaroni soup.",                                               image: "https://thefoodxp.com/wp-content/uploads/2022/11/Jamie-Oliver-Chicken-Soup-Recipe-1.jpg" },
  { id: 13, name: "Caesar Salad",          price: "175", category: "Side Dish",   availability: "Available",   description: "Classic caesar salad with croutons.",                                                  image: "https://www.thespruceeats.com/thmb/Z6IWF7c9zywuU9maSIimGLbHoI4=/3000x2000/filters:fill(auto,1)/classic-caesar-salad-recipe-996054-Hero_01-33c94cc8b8e841ee8f2a815816a0af95.jpg" },
];

/* ─── SVG Icons ─── */
const IconRestoGold  = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="2" width="36" height="36"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>);
const IconSearch     = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const IconPlus       = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const IconUpload     = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="1.5" width="32" height="32"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>);
const IconCheck      = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>);

/* ─── Custom Select ─── */
function CustomSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rm-select-wrap" onBlur={() => setOpen(false)} tabIndex={0}>
      <div className={`rm-select-display${open ? " open" : ""}`} onClick={() => setOpen(o => !o)}>
        <span>{value}</span>
        <span className={`rm-select-arrow${open ? " open" : ""}`}>&#9662;</span>
      </div>
      {open && (
        <div className="rm-select-dropdown">
          {options.map(opt => (
            <div
              key={opt}
              className={`rm-select-option${opt === value ? " selected" : ""}`}
              onMouseDown={() => { onChange(opt); setOpen(false); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Dish Image with fallback ─── */
function DishImage({ src, alt }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="rm-dish-img-placeholder">
        <IconRestoGold />
      </div>
    );
  }
  return (
    <div className="rm-dish-img-wrap">
      <img
        src={src}
        alt={alt}
        className="rm-dish-img"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

/* ─── Main Component ─── */
export default function RestoMenu() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [dishes, setDishes]         = useState(INITIAL_DISHES);
  const [nextId, setNextId]         = useState(14);
  const [currentCat, setCurrentCat] = useState("Main Course");
  const [search, setSearch]         = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(-1);
  const [fName, setFName]         = useState("");
  const [fPrice, setFPrice]       = useState("");
  const [fDesc, setFDesc]         = useState("");
  const [fCat, setFCat]           = useState("Main Course");
  const [fAvail, setFAvail]       = useState("Available");
  const [fImage, setFImage]       = useState("");
  const [formErr, setFormErr]     = useState("");
  const fileRef = useRef();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(-1);

  const [toast, setToast] = useState({ visible: false, msg: "" });
  const toastTimer        = useRef();

  function showToast(msg) {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, msg });
    toastTimer.current = setTimeout(() => setToast({ visible: false, msg: "" }), 3000);
  }

  function openAddModal() {
    setEditingId(-1);
    setFName(""); setFPrice(""); setFDesc("");
    setFCat("Main Course"); setFAvail("Available"); setFImage("");
    setFormErr("");
    setModalOpen(true);
  }

  function openEditModal(id) {
    const d = dishes.find(x => x.id === id);
    if (!d) return;
    setEditingId(id);
    setFName(d.name); setFPrice(d.price); setFDesc(d.description || "");
    setFCat(d.category); setFAvail(d.availability); setFImage(d.image || "");
    setFormErr("");
    setModalOpen(true);
  }

  function saveDish() {
    if (!fName.trim() || !fPrice.trim()) { setFormErr("Name and price are required."); return; }
    if (editingId === -1) {
      setDishes(prev => [...prev, { id: nextId, name: fName, price: fPrice, category: fCat, availability: fAvail, description: fDesc, image: fImage }]);
      setNextId(n => n + 1);
      showToast("Dish added!");
    } else {
      setDishes(prev => prev.map(d => d.id === editingId
        ? { ...d, name: fName, price: fPrice, category: fCat, availability: fAvail, description: fDesc, image: fImage }
        : d));
      showToast("Dish updated!");
    }
    setModalOpen(false);
  }

  function confirmDelete() {
    setDishes(prev => prev.filter(d => d.id !== deletingId));
    setDeleteOpen(false);
    showToast("Dish deleted.");
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setFImage(ev.target.result);
    reader.readAsDataURL(file);
  }

  const filtered = dishes.filter(d =>
    d.category === currentCat &&
    [d.name, d.description, d.availability].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <RailPortalShell
        rootClassName="rm-page"
        mainStyle={mainStyle}
        sidebar={<AdminSidebarNav />}
      >
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Restaurant Menu</span>
          </div>
          <AdminTopbarActions
            notifications={[
              { id: "resto-1", msg: "Menu changes here are local until a restaurant API is added.", time: "Admin", read: true },
            ]}
            onRequestLogout={requestLogout}
          />
        </header>

        {/* CONTENT */}
        <main className="content">

          {/* Top row */}
          <div className="rm-top-row">
            <div className="rm-search-wrap">
              <IconSearch />
              <input
                type="text"
                className="rm-search-input"
                placeholder="Search dishes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="rm-add-btn" onClick={openAddModal}>
              <IconPlus /> Add Dish
            </button>
          </div>

          {/* Category tabs */}
          <div className="rm-tabs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`rm-tab${cat === currentCat ? " active" : ""}`}
                onClick={() => setCurrentCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Dish grid */}
          <div className="rm-grid">
            {filtered.length === 0 ? (
              <div className="rm-empty">No dishes found in this category.</div>
            ) : filtered.map(dish => (
              <div className="rm-dish-card" key={dish.id}>
                <DishImage src={dish.image} alt={dish.name} />
                <div className="rm-dish-body">
                  <p className="rm-dish-name">{dish.name}</p>
                  <p className="rm-dish-price">₱{dish.price.replace(/&#8369;|₱/g, "")}</p>
                  <p className="rm-dish-desc">{dish.description}</p>
                </div>
                <div className="rm-dish-footer">
                  <button className="rm-btn-edit"   onClick={() => openEditModal(dish.id)}>Edit</button>
                  <button className="rm-btn-delete" onClick={() => { setDeletingId(dish.id); setDeleteOpen(true); }}>Delete</button>
                </div>
              </div>
            ))}
          </div>

        </main>
      </RailPortalShell>

      {/* ── ADD / EDIT MODAL ── */}
      {modalOpen && (
        <div className="rm-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="rm-modal">
            <div className="rm-modal-header">
              <h2 className="rm-modal-title">{editingId === -1 ? "Add Dish" : "Edit Dish"}</h2>
              <button className="rm-modal-close" onClick={() => setModalOpen(false)}>&#x2715;</button>
            </div>
            <div className="rm-modal-body">
              <div className="rm-form-row">
                <div className="rm-form-group">
                  <label className="rm-label">Name</label>
                  <input type="text" className="rm-input" placeholder="e.g. Chicken Wings" value={fName} onChange={e => setFName(e.target.value)} />
                </div>
                <div className="rm-form-group">
                  <label className="rm-label">Price</label>
                  <input type="text" className="rm-input" placeholder="e.g. 199" value={fPrice} onChange={e => setFPrice(e.target.value)} />
                </div>
              </div>
              <div className="rm-form-row">
                <div className="rm-form-group">
                  <label className="rm-label">Category</label>
                  <CustomSelect options={CATEGORIES} value={fCat} onChange={setFCat} />
                </div>
                <div className="rm-form-group">
                  <label className="rm-label">Availability</label>
                  <CustomSelect options={["Available", "Unavailable"]} value={fAvail} onChange={setFAvail} />
                </div>
              </div>
              <div className="rm-form-group">
                <label className="rm-label">Description</label>
                <textarea className="rm-textarea" placeholder="Write something here..." value={fDesc} onChange={e => setFDesc(e.target.value)} />
              </div>
              <div className="rm-form-group">
                <label className="rm-label">Upload Image</label>
                <div className="rm-upload-area" onClick={() => fileRef.current.click()}>
                  <input type="file" accept="image/*" className="rm-file-input" ref={fileRef} onChange={handleImageChange} />
                  {fImage
                    ? <img src={fImage} className="rm-upload-preview" alt="preview" />
                    : (
                      <div className="rm-upload-content">
                        <span className="rm-upload-text">Click to upload image</span>
                        <IconUpload />
                      </div>
                    )
                  }
                </div>
              </div>
              {formErr && <span className="rm-form-err">{formErr}</span>}
              <div className="rm-modal-actions">
                <button className="rm-btn-clear" onClick={() => { setFName(""); setFPrice(""); setFDesc(""); setFCat("Main Course"); setFAvail("Available"); setFImage(""); setFormErr(""); }}>Clear</button>
                <button className="rm-btn-save" onClick={saveDish}>{editingId === -1 ? "Add Dish" : "Save Changes"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {deleteOpen && (
        <div className="rm-confirm-backdrop">
          <div className="rm-confirm-dialog">
            <div className="rm-confirm-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/></svg>
              <span className="rm-confirm-exclaim">!</span>
            </div>
            <h3 className="rm-confirm-title">Delete Dish?</h3>
            <p className="rm-confirm-sub">This action cannot be undone.</p>
            <div className="rm-confirm-btns">
              <button className="rm-confirm-cancel" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button className="rm-confirm-delete" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div className={`rm-toast${toast.visible ? " active" : ""}`}>
        <IconCheck />
        <span>{toast.msg}</span>
      </div>

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />

    </>
  );
}