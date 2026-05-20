import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { fetchRestaurantMenuAdminBootstrap, uploadMenuImageDirectBackend } from "../api/menuApi";
import { getMenus, createMenu, updateMenu, deleteMenu } from "../api/menu.service";
import "./resto.css";
import "./adminClickable.css";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import {
  AdminViewDetailModal,
  AdminDetailRow,
  AdminDetailHeroImage,
} from "../components/AdminViewDetailModal";
import { handleAdminRowActivate, handleAdminRowKeyDown } from "./adminClickUtils";

const PESO = "\u20B1";

/** Default category names created in MongoDB when the collection is empty (admin only). */
const CATEGORIES_FALLBACK = ["Main Course", "Side Dish", "Beverages", "Soup", "Fruits"];
/** In-memory menu list cache so category tabs can swap without waiting on the network again. */
const MENU_LIST_CACHE_MS = 5 * 60 * 1000;

function menuListCacheKey(categoryName, search, page, limit) {
  const name = String(categoryName ?? "").trim();
  const p = Math.max(1, Number(page) || 1);
  const lim = Math.max(1, Number(limit) || 10);
  return `${name}|${String(search ?? "").trim()}|${p}|${lim}`;
}

/** Category id from API row (`id` from backend or legacy `_id`). */
function categoryRowId(row) {
  const v = row?.id ?? row?._id;
  if (v == null || String(v).trim() === "") return undefined;
  return String(v).trim();
}

/** Page buttons for pagination without allocating `Array(totalPages)` (avoids freeze when totalPages is huge). */
function visibleMenuPageNumbers(currentPage, totalPages) {
  const t = Math.max(1, Math.min(5000, Number(totalPages) || 1));
  const c = Math.min(Math.max(1, Number(currentPage) || 1), t);
  if (t <= 9) return Array.from({ length: t }, (_, i) => i + 1);
  const set = new Set([1, t, c, c - 1, c + 1]);
  return [...set].filter((p) => p >= 1 && p <= t).sort((a, b) => a - b);
}

function orderCategoryNames(rows = []) {
  const names = Array.isArray(rows) ? rows.map((c) => String(c?.name || "").trim()).filter(Boolean) : [];
  const seen = new Set();
  const ordered = [];
  for (const n of CATEGORIES_FALLBACK) {
    if (names.includes(n) && !seen.has(n)) {
      seen.add(n);
      ordered.push(n);
    }
  }
  for (const n of names.sort((a, b) => a.localeCompare(b))) {
    if (!seen.has(n)) {
      seen.add(n);
      ordered.push(n);
    }
  }
  return ordered.length > 0 ? ordered : [...CATEGORIES_FALLBACK];
}

function guessImageContentType(file) {
  const t = String(file?.type || "")
    .trim()
    .split(";")[0]
    .toLowerCase();
  if (t && t.startsWith("image/")) return t;
  const name = String(file?.name || "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "image/jpeg";
}

const MENU_IMAGE_DATA_URL_MAX_CHARS = 400_000;

/** Browser `fetch` failures (offline, wrong API URL, CORS) usually surface as TypeError / "Failed to fetch" with no HTTP status. */
function isLikelyNetworkFailure(err) {
  if (!err || err.status != null) return false;
  const name = String(err.name || "");
  const msg = String(err.message || "");
  return (
    name === "TypeError" ||
    msg === "Failed to fetch" ||
    /networkerror|load failed|failed to fetch/i.test(msg)
  );
}

function readImageFileAsDataUrlLimited(file, maxChars = MENU_IMAGE_DATA_URL_MAX_CHARS) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      if (s.length > maxChars) {
        reject(
          new Error(
            "Image is too large to store without S3. Add AWS_* and S3_MENU_BUCKET to the API .env (see .env.example).",
          ),
        );
        return;
      }
      resolve(s);
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

/** When false (`VITE_MENU_IMAGE_LOCAL_FALLBACK=false`), failed S3/API uploads surface errors instead of a data-URL preview. */
const MENU_IMAGE_LOCAL_FALLBACK_ENABLED = !(
  import.meta.env.VITE_MENU_IMAGE_LOCAL_FALLBACK === "false" ||
  import.meta.env.VITE_MENU_IMAGE_LOCAL_FALLBACK === "0"
);

/* â”€â”€â”€ SVG Icons â”€â”€â”€ */
const IconRestoGold  = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="2" width="36" height="36"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>);
const IconSearch     = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const IconPlus       = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
const IconUpload     = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="1.5" width="32" height="32"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>);
const IconCheck      = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>);

function menuItemToDish(m, categories = []) {
  const rawId = m.id ?? m._id;
  const n = Number(m.price);
  const priceStr = Number.isFinite(n)
    ? (Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : String(n))
    : "0";
  const categoryNameFromPayload =
    typeof m.category === "string"
      ? m.category.trim()
      : m.category && typeof m.category === "object" && m.category.name
        ? String(m.category.name).trim()
        : "";
  const categoryRefId = String(m.categoryRef ?? m.categoryId ?? "").trim();
  const categoryNameFromRef =
    categoryRefId && Array.isArray(categories)
      ? categories.find((c) => String(categoryRowId(c) ?? "") === categoryRefId)?.name ||
        categories.find((c) => String(c?.name ?? "").trim().toLowerCase() === categoryRefId.toLowerCase())?.name ||
        ""
      : "";
  const categoryName = categoryNameFromPayload || categoryNameFromRef || categories[0]?.name || CATEGORIES_FALLBACK[0];
  const status = String(m.status ?? m.availability ?? "available").toLowerCase();
  const itemName = String(m.itemName ?? m.name ?? "").trim();
  return {
    id: rawId != null ? String(rawId) : "",
    name: itemName,
    price: priceStr,
    category: categoryName,
    availability: status === "available" ? "Available" : "Unavailable",
    description: m.description || "",
    image: m.imageUrl || "",
  };
}

/** Build GET /api/menu filters for a category tab or form row. */
function menuListFilters(categories, categoryName, search) {
  const name = String(categoryName ?? "").trim();
  const row = Array.isArray(categories)
    ? categories.find((c) => String(c?.name ?? "").trim() === name)
    : null;
  const filters = {
    category: String(row?.name ?? name).trim(),
    search: search || undefined,
  };
  const cid = categoryRowId(row);
  if (cid) filters.categoryId = cid;
  return filters;
}

function shouldCacheMenuList(dishes, search) {
  return (Array.isArray(dishes) ? dishes.length : 0) > 0 || Boolean(String(search ?? "").trim());
}

function categoryNameMatches(dishCategory, filterName) {
  const a = String(dishCategory ?? "").trim().toLowerCase();
  const b = String(filterName ?? "").trim().toLowerCase();
  return Boolean(a && b && a === b);
}

async function fetchMenuForCategoryPage(page, limit, categories, categoryName, search, options = {}) {
  const filterName = String(categoryName ?? "").trim();
  const primary = await getMenus(
    page,
    limit,
    menuListFilters(categories, filterName, search),
    options,
  );
  const rows = Array.isArray(primary?.data) ? primary.data : [];
  const totalItems = Number(primary?.totalItems) || 0;
  if (rows.length > 0 || totalItems > 0 || !filterName || search) {
    return primary;
  }

  const wide = await getMenus(1, 500, { search: search || undefined }, options);
  const allRows = Array.isArray(wide?.data) ? wide.data : [];
  const filtered = allRows.filter((m) =>
    categoryNameMatches(menuItemToDish(m, categories).category, filterName),
  );
  const ti = filtered.length;
  const tp = Math.max(1, Math.ceil(ti / limit));
  const cur = Math.min(Math.max(1, page), tp);
  const start = (cur - 1) * limit;
  return {
    currentPage: cur,
    totalPages: tp,
    totalItems: ti,
    data: filtered.slice(start, start + limit),
  };
}

function applyMenuPageResult(result, categories) {
  const rows = Array.isArray(result?.data) ? result.data : [];
  const tp = Number(result?.totalPages);
  const ti = Number(result?.totalItems);
  const nextTp = Number.isFinite(tp) && tp >= 1 ? Math.min(9999, tp) : 1;
  const nextTi = Number.isFinite(ti) && ti >= 0 ? ti : rows.length;
  const mapped = rows.map((m) => menuItemToDish(m, categories));
  return { mapped, nextTp, nextTi, rows };
}


/* â”€â”€â”€ Dish card skeleton (same footprint as .rm-dish-card while menu is fetching) â”€â”€â”€ */
function DishCardSkeleton() {
  return (
    <div className="rm-dish-card rm-dish-card--skeleton" aria-hidden>
      <div className="rm-dish-skel-img" />
      <div className="rm-dish-body">
        <div className="rm-dish-skel-line rm-dish-skel-line--lg" />
        <div className="rm-dish-skel-line rm-dish-skel-line--sm" />
        <div className="rm-dish-skel-block" />
      </div>
      <div className="rm-dish-footer rm-dish-footer--skeleton">
        <div className="rm-dish-skel-btn" />
        <div className="rm-dish-skel-btn" />
      </div>
    </div>
  );
}

/* Dish image with fallback + optional full-size preview */
function DishImage({ src, alt, onPreview }) {
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    setErrored(false);
  }, [src]);
  if (!src || errored) {
    return (
      <div className="rm-dish-img-wrap">
        <div className="rm-dish-img-placeholder rm-dish-img-placeholder--in-card">
          <IconRestoGold />
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="rm-dish-img-wrap rm-dish-img-wrap--previewable"
      onClick={() => onPreview?.({ src, alt })}
      aria-label={alt ? `View full-size photo of ${alt}` : "View full-size photo"}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="rm-dish-img"
        onError={() => setErrored(true)}
      />
      <span className="rm-dish-img-zoom-hint" aria-hidden="true">
        View photo
      </span>
    </button>
  );
}

/* â”€â”€â”€ Main Component â”€â”€â”€ */
export default function RestoMenu() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();

  const [categories, setCategories] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  /** True while the main menu GET for the current filters is in flight. */
  const [menuFetching, setMenuFetching] = useState(false);
  /** Full card skeletons only after a short delay when switching lists (fast responses skip heavy skeletons). */
  const [delayedListSkeleton, setDelayedListSkeleton] = useState(false);
  const [loadNotice, setLoadNotice] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [viewDish, setViewDish] = useState(null);

  const [currentCat, setCurrentCat] = useState("Main Course");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [menuPage, setMenuPage] = useState(1);
  const [menuLimit, setMenuLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(-1);
  const [fName, setFName] = useState("");
  const [fPrice, setFPrice] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fCat, setFCat] = useState("Main Course");
  const [fAvail, setFAvail] = useState("Available");
  const [fImage, setFImage] = useState("");
  const [imageUploadBusy, setImageUploadBusy] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const fileRef = useRef();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [toast, setToast] = useState({ visible: false, msg: "" });
  const toastTimer = useRef();
  const prevSearchTrimRef = useRef("");
  /** Previous menu list cache key (category + search + page + limit). */
  const prevListKeyRef = useRef(null);
  /** Ignore stale GET responses when the user switches tabs quickly. */
  const menuFetchGenRef = useRef(0);
  /** Cached menu pages: key â†’ { dishes, totalPages, totalItems, savedAt } */
  const menuListCacheRef = useRef(new Map());
  const prefetchInFlightRef = useRef(new Set());
  /** When unchanged, reload skips clearing menu cache (avoids refetch storm after token refresh). */
  const lastCategoryDigestRef = useRef("");
  const dishesRef = useRef([]);
  const listSkelTimerRef = useRef(null);
  /** Bumps when a new restaurant bootstrap starts (avoids StrictMode / overlap applying stale state). */
  const loadSeqRef = useRef(0);

  useEffect(() => {
    dishesRef.current = dishes;
  }, [dishes]);

  const categoryNames = useMemo(() => {
    const ordered = orderCategoryNames(categories);
    return ordered.length > 0 ? ordered : [...CATEGORIES_FALLBACK];
  }, [categories]);

  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast({ visible: true, msg });
    toastTimer.current = setTimeout(() => setToast({ visible: false, msg: "" }), 3000);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = search.trim();
      if (prevSearchTrimRef.current !== next) {
        prevSearchTrimRef.current = next;
        setMenuPage(1);
      }
      setDebouncedSearch(next);
    }, 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadRestaurantBootstrap = useCallback(async (signal) => {
    setLoading(true);
    setLoadNotice("");
    const seq = ++loadSeqRef.current;
    try {
      const data = await fetchRestaurantMenuAdminBootstrap({
        limit: menuLimit,
        signal,
      });
      if (signal?.aborted || seq !== loadSeqRef.current) return;

      const cats = Array.isArray(data.categories) ? data.categories : [];
      const digest = Array.isArray(cats)
        ? cats
            .map((c) => `${categoryRowId(c) ?? ""}\t${String(c?.name ?? "").trim()}`)
            .sort()
            .join("\n")
        : "";
      if (lastCategoryDigestRef.current !== digest) {
        lastCategoryDigestRef.current = digest;
        menuListCacheRef.current.clear();
        prevListKeyRef.current = null;
      }
      setCategories(cats);
      const orderedCats = orderCategoryNames(cats);
      const selectedName = String(data.selectedCategoryName || "").trim();
      const nextCat =
        selectedName && orderedCats.includes(selectedName)
          ? selectedName
          : orderedCats.length > 0
            ? orderedCats[0]
            : "Main Course";
      setCurrentCat(nextCat);
      setMenuPage(1);

      const mp = data.menuPage || {};
      const rows = Array.isArray(mp.data) ? mp.data : [];
      const tp = Number(mp.totalPages);
      const ti = Number(mp.totalItems);
      const nextTp = Number.isFinite(tp) && tp >= 1 ? Math.min(9999, tp) : 1;
      const nextTi = Number.isFinite(ti) && ti >= 0 ? ti : rows.length;
      const mapped = rows.map((m) => menuItemToDish(m, cats));
      const key = menuListCacheKey(nextCat, "", 1, menuLimit);
      menuListCacheRef.current.set(key, {
        dishes: mapped,
        totalPages: nextTp,
        totalItems: nextTi,
        savedAt: Date.now(),
      });
      prevListKeyRef.current = key;
      setDishes(mapped);
      setTotalPages(nextTp);
      setTotalItems(nextTi);
    } catch (e) {
      if (e?.name === "AbortError") return;
      if (seq !== loadSeqRef.current) return;
      setCategories([]);
      lastCategoryDigestRef.current = "";
      setLoadNotice(
        e?.code === "NO_TOKEN"
          ? "Sign in as admin to load the menu from the database."
          : e?.message || "Could not load restaurant data.",
      );
      setDishes([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      if (!signal?.aborted && seq === loadSeqRef.current) {
        setLoading(false);
      }
    }
  }, [menuLimit]);

  useEffect(() => {
    const ac = new AbortController();
    void loadRestaurantBootstrap(ac.signal);
    return () => ac.abort();
  }, [loadRestaurantBootstrap]);

  useEffect(() => {
    const onTok = () => void loadRestaurantBootstrap();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
  }, [loadRestaurantBootstrap]);

  /** Prefetch page 1 on tab hover/focus (no bulk warm-up - that competed with the first menu fetch and slowed cold loads). */
  const prefetchCategoryMenu = useCallback(
    (catName) => {
      const filterName = String(catName ?? "").trim();
      if (!filterName) return;
      const key = menuListCacheKey(filterName, debouncedSearch, 1, menuLimit);
      const existing = menuListCacheRef.current.get(key);
      if (
        existing &&
        Date.now() - existing.savedAt <= MENU_LIST_CACHE_MS &&
        shouldCacheMenuList(existing.dishes, debouncedSearch)
      ) {
        return;
      }
      if (prefetchInFlightRef.current.has(key)) return;
      prefetchInFlightRef.current.add(key);
      void (async () => {
        try {
          const result = await fetchMenuForCategoryPage(
            1,
            menuLimit,
            categories,
            filterName,
            debouncedSearch,
          );
          const { mapped, nextTp, nextTi } = applyMenuPageResult(result, categories);
          if (shouldCacheMenuList(mapped, debouncedSearch)) {
            menuListCacheRef.current.set(key, {
              dishes: mapped,
              totalPages: nextTp,
              totalItems: nextTi,
              savedAt: Date.now(),
            });
          }
        } catch {
          /* ignore prefetch failures */
        } finally {
          prefetchInFlightRef.current.delete(key);
        }
      })();
    },
    [categories, debouncedSearch, menuLimit],
  );

  useEffect(() => {
    const filterNameEarly = String(currentCat ?? "").trim();
    if (!filterNameEarly) {
      setDishes([]);
      setTotalItems(0);
      setTotalPages(1);
      setMenuFetching(false);
      setDelayedListSkeleton(false);
      prevListKeyRef.current = null;
      return undefined;
    }

    if (listSkelTimerRef.current) {
      clearTimeout(listSkelTimerRef.current);
      listSkelTimerRef.current = null;
    }
    setDelayedListSkeleton(false);

    const fetchGen = ++menuFetchGenRef.current;
    let cancelled = false;

    const filterName = String(currentCat ?? "").trim();
    const key = menuListCacheKey(filterName, debouncedSearch, menuPage, menuLimit);

    const keyChanged = prevListKeyRef.current !== key;
    const hit = menuListCacheRef.current.get(key);
    const cacheFresh = Boolean(hit && Date.now() - hit.savedAt <= MENU_LIST_CACHE_MS);
    const cacheUsable = cacheFresh && shouldCacheMenuList(hit?.dishes, debouncedSearch);

    if (cacheUsable) {
      if (keyChanged) {
        setDishes(hit.dishes);
        setTotalPages(hit.totalPages);
        setTotalItems(hit.totalItems);
      }
      prevListKeyRef.current = key;
      setMenuFetching(false);
      return () => {
        cancelled = true;
      };
    }

    prevListKeyRef.current = key;

    if (keyChanged) {
      setDishes([]);
      const hadRows = dishesRef.current.length > 0;
      if (hadRows) {
        listSkelTimerRef.current = window.setTimeout(() => {
          listSkelTimerRef.current = null;
          if (!cancelled) setDelayedListSkeleton(true);
        }, 220);
      } else {
        setDelayedListSkeleton(true);
      }
    }

    setMenuFetching(true);

    const menuAc = new AbortController();

    const run = async () => {
      try {
        const result = await fetchMenuForCategoryPage(
          menuPage,
          menuLimit,
          categories,
          filterName,
          debouncedSearch,
          { signal: menuAc.signal },
        );
        if (cancelled || fetchGen !== menuFetchGenRef.current) return;
        if (listSkelTimerRef.current) {
          clearTimeout(listSkelTimerRef.current);
          listSkelTimerRef.current = null;
        }
        setDelayedListSkeleton(false);
        const { mapped, nextTp, nextTi, rows } = applyMenuPageResult(result, categories);
        if (rows.length === 0 && nextTi > 0 && menuPage > 1) {
          setMenuPage((p) => Math.max(1, p - 1));
          return;
        }
        setTotalPages(nextTp);
        setTotalItems(nextTi);
        setDishes(mapped);
        if (shouldCacheMenuList(mapped, debouncedSearch)) {
          menuListCacheRef.current.set(key, {
            dishes: mapped,
            totalPages: nextTp,
            totalItems: nextTi,
            savedAt: Date.now(),
          });
        } else {
          menuListCacheRef.current.delete(key);
        }
      } catch (e) {
        if (cancelled || fetchGen !== menuFetchGenRef.current) return;
        if (e?.name === "AbortError") return;
        if (listSkelTimerRef.current) {
          clearTimeout(listSkelTimerRef.current);
          listSkelTimerRef.current = null;
        }
        setDelayedListSkeleton(false);
        setDishes([]);
        setTotalItems(0);
        setTotalPages(1);
        setLoadNotice(e?.message || "Could not load menu page.");
      } finally {
        if (!cancelled && fetchGen === menuFetchGenRef.current) {
          setDelayedListSkeleton(false);
          setMenuFetching(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
      menuAc.abort();
      if (listSkelTimerRef.current) {
        clearTimeout(listSkelTimerRef.current);
        listSkelTimerRef.current = null;
      }
    };
  }, [categories, currentCat, menuPage, menuLimit, debouncedSearch]);

  const refreshMenuPage = useCallback(async (opts = {}) => {
    const filterName = String(currentCat ?? "").trim();
    if (!filterName) return;
    const skipStaleGuard = Boolean(opts.skipStaleGuard);
    const gen = menuFetchGenRef.current;
    const pageToFetch =
      opts.page != null
        ? Math.max(1, parseInt(String(opts.page), 10) || 1)
        : Math.max(1, parseInt(String(menuPage), 10) || 1);
    try {
      const result = await fetchMenuForCategoryPage(
        pageToFetch,
        menuLimit,
        categories,
        filterName,
        debouncedSearch,
      );
      if (!skipStaleGuard && gen !== menuFetchGenRef.current) return;
      const { mapped, nextTp, nextTi, rows } = applyMenuPageResult(result, categories);
      if (rows.length === 0 && nextTi > 0 && pageToFetch > 1) {
        setMenuPage((p) => Math.max(1, p - 1));
        return;
      }
      setTotalPages(nextTp);
      setTotalItems(nextTi);
      setDishes(mapped);
      const cacheKey = menuListCacheKey(filterName, debouncedSearch, pageToFetch, menuLimit);
      if (shouldCacheMenuList(mapped, debouncedSearch)) {
        menuListCacheRef.current.set(cacheKey, {
          dishes: mapped,
          totalPages: nextTp,
          totalItems: nextTi,
          savedAt: Date.now(),
        });
      } else {
        menuListCacheRef.current.delete(cacheKey);
      }
    } catch {
      /* silent - visibility / post-save refresh should not spam notices */
    }
  }, [categories, currentCat, menuPage, menuLimit, debouncedSearch]);

  useEffect(() => {
    if (!String(currentCat ?? "").trim()) return undefined;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshMenuPage();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [currentCat, refreshMenuPage]);

  function defaultCategoryName() {
    return orderCategoryNames(categories)[0] ?? CATEGORIES_FALLBACK[0];
  }

  function openAddModal() {
    if (categories.length === 0) {
      showToast("No categories yet - refresh the page or check admin login.");
      void loadRestaurantBootstrap();
      return;
    }
    setEditingId(-1);
    setFName("");
    setFPrice("");
    setFDesc("");
    setFCat(defaultCategoryName());
    setFAvail("Available");
    setFImage("");
    setFormErr("");
    setModalOpen(true);
  }

  function openEditModal(id) {
    const d = dishes.find((x) => String(x.id) === String(id));
    if (!d) return;
    setEditingId(id);
    setFName(d.name);
    setFPrice(d.price);
    setFDesc(d.description || "");
    setFCat(d.category);
    setFAvail(d.availability);
    setFImage(d.image || "");
    setFormErr("");
    setModalOpen(true);
  }

  async function saveDish() {
    if (saveBusy) return;
    if (!fName.trim() || !fPrice.trim()) {
      setFormErr("Name and price are required.");
      return;
    }
    const cat = categories.find(
      (c) => String(c?.name ?? "").trim() === String(fCat ?? "").trim(),
    );
    if (!cat) {
      setFormErr("Choose a category that exists in the database.");
      return;
    }
    const priceNum = parseFloat(String(fPrice).replace(/[\u20B1₱,\s]/g, ""));
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setFormErr("Enter a valid price greater than 0.");
      return;
    }
    const availability = fAvail === "Available" ? "available" : "unavailable";
    const body = {
      name: fName.trim(),
      description: fDesc.trim(),
      price: priceNum,
      category: String(cat.name ?? fCat).trim(),
      imageUrl: fImage || "",
      availability,
      status: availability,
    };
    setSaveBusy(true);
    const editId = editingId;
    try {
      if (editId === -1) {
        await createMenu(body);
        setModalOpen(false);
        showToast("Dish added!");
        if (menuPage !== 1) setMenuPage(1);
      } else {
        const idStr = String(editId);
        const updatedItem = await updateMenu(idStr, body);
        const mapped = menuItemToDish(updatedItem, categories);
        const stillInTab =
          String(mapped.category ?? "").trim() === String(currentCat ?? "").trim();
        setDishes((rows) => {
          if (!stillInTab) return rows.filter((r) => String(r.id) !== idStr);
          return rows.map((row) => (String(row.id) === idStr ? mapped : row));
        });
        setModalOpen(false);
        showToast("Dish updated!");
      }
      menuListCacheRef.current.clear();
      const pageAfterSave =
        editId === -1 ? (menuPage !== 1 ? 1 : menuPage) : menuPage;
      await refreshMenuPage({ skipStaleGuard: true, page: pageAfterSave });
    } catch (e) {
      setFormErr(e?.message || "Save failed.");
    } finally {
      setSaveBusy(false);
    }
  }

  function closeDelete() {
    setDeleteOpen(false);
    setDeletingId(null);
  }

  async function confirmDelete() {
    if (deletingId == null) return;
    const id = String(deletingId);
    const snapshot = {
      dishes,
      totalItems,
      totalPages,
      menuPage,
    };
    closeDelete();
    setDishes((rows) => rows.filter((x) => String(x.id) !== id));
    setTotalItems((n) => Math.max(0, n - 1));
    try {
      await deleteMenu(id);
      showToast("Dish deleted.");
      menuListCacheRef.current.clear();
      await refreshMenuPage({ skipStaleGuard: true });
    } catch (e) {
      setDishes(snapshot.dishes);
      setTotalItems(snapshot.totalItems);
      setTotalPages(snapshot.totalPages);
      setMenuPage(snapshot.menuPage);
      window.alert(e?.message || "Delete failed.");
    }
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setFormErr("");

    async function applyLocalPreview(reason) {
      const dataUrl = await readImageFileAsDataUrlLimited(file);
      setFImage(dataUrl);
      setFormErr("");
      if (reason === "s3-disabled") {
        showToast("S3 is not configured - using a local preview. Fine for dev; use S3 in production.");
      } else {
        showToast(
          "Could not reach the API - using a local preview. Check VITE_API_BASE_URL / backend if you need uploads.",
        );
      }
    }

    try {
      setImageUploadBusy(true);
      try {
        const result = await uploadMenuImageDirectBackend(file);
        if (!result?.publicUrl) {
          throw new Error("Server did not return an image URL.");
        }
        setFImage(result.publicUrl);
      } catch (err) {
        if (MENU_IMAGE_LOCAL_FALLBACK_ENABLED && (err?.status === 503 || isLikelyNetworkFailure(err))) {
          await applyLocalPreview(err?.status === 503 ? "s3-disabled" : "network");
          return;
        }
        if (!MENU_IMAGE_LOCAL_FALLBACK_ENABLED && isLikelyNetworkFailure(err)) {
          throw new Error(
            "Could not reach the API. Use relative /api in dev (leave VITE_API_BASE_URL unset with the Vite proxy), or fix the API URL.",
          );
        }
        throw err;
      }
    } catch (err) {
      setFormErr(err?.message || "Image upload failed.");
    } finally {
      setImageUploadBusy(false);
    }
  }

  const tabsToShow = categoryNames;
  const showDishPlaceholders =
    delayedListSkeleton &&
    menuFetching &&
    dishes.length === 0 &&
    categories.length > 0 &&
    !loading;
  const showListLoadingShim =
    menuFetching &&
    dishes.length === 0 &&
    !delayedListSkeleton &&
    categories.length > 0 &&
    !loading;
  const dishSkeletonCount = Math.min(4, Math.max(2, Math.min(menuLimit, 6)));

  return (
    <>
      <RailPortalShell
        rootClassName="app-layout admin-app-layout app-root resto-admin-page"
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
              {
                id: "resto-1",
                msg:
                  loadNotice ||
                  "Menu is paginated from MongoDB (GET /api/menu?page&limit). Categories from /api/categories.",
                time: "Admin",
                read: true,
              },
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
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="button" className="rm-add-btn" onClick={openAddModal}>
              <IconPlus /> Add Dish
            </button>
          </div>

          {/* Category tabs - use resto-cat-* not .rm-tabs/.rm-tab (Room Management uses those globally). */}
          <div
            className="resto-cat-tabs"
            role="tablist"
            aria-label="Menu categories"
            aria-busy={menuFetching && dishes.length === 0 ? "true" : "false"}
          >
            {tabsToShow.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={cat === currentCat}
                className={`resto-cat-tab${cat === currentCat ? " resto-cat-tab--active" : ""}`}
                onClick={() => {
                  setMenuPage(1);
                  setCurrentCat(cat);
                }}
                onFocus={() => prefetchCategoryMenu(cat)}
                onMouseEnter={() => prefetchCategoryMenu(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Dish grid - light shim first; full skeletons only if the request is slow */}
          <div className={`rm-grid${menuFetching && dishes.length > 0 ? " rm-grid--refreshing" : ""}`}>
            {loading ? (
              <div className="rm-empty">Loading…</div>
            ) : showListLoadingShim ? (
              <div className="rm-menu-loading-shim" role="status" aria-label="Loading menu" />
            ) : showDishPlaceholders ? (
              Array.from({ length: dishSkeletonCount }, (_, i) => <DishCardSkeleton key={`menu-skel-${i}`} />)
            ) : dishes.length === 0 ? (
              <div className="rm-empty">
                {debouncedSearch
                  ? `No dishes match your search in ${currentCat}.`
                  : `No dishes in ${currentCat} yet. Use "Add Dish" to create one.`}
              </div>
            ) : (
              dishes.map((dish) => (
                <div
                  className="rm-dish-card admin-clickable-card"
                  key={dish.id || `${dish.name}-${dish.price}-${dish.category}`}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleAdminRowActivate(e, () => setViewDish(dish))}
                  onKeyDown={(e) => handleAdminRowKeyDown(e, () => setViewDish(dish))}
                >
                  <DishImage
                    src={dish.image}
                    alt={dish.name}
                    onPreview={(item) =>
                      setImagePreview({ src: item.src, alt: item.alt, caption: item.alt })
                    }
                  />
                  <div className="rm-dish-body">
                    <p className="rm-dish-name">{dish.name}</p>
                    <p className="rm-dish-price">
                      {PESO}
                      {String(dish.price).replace(/[^\d.]/g, "")}
                    </p>
                    <p className="rm-dish-desc">{dish.description}</p>
                  </div>
                  <div className="rm-dish-footer">
                    <button
                      type="button"
                      className="rm-btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(dish.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rm-btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(dish.id);
                        setDeleteOpen(true);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {!loading && !showDishPlaceholders && !showListLoadingShim && categories.length > 0 && (
            <div className="rm-pagination-row">
              <div className="rm-pagination-meta">
                <span className="rm-pagination-count">
                  {totalItems} dish{totalItems === 1 ? "" : "es"} Â· Page {menuPage} of {totalPages}
                </span>
                <label className="rm-pagination-limit">
                  <span>Per page</span>
                  <select
                    className="rm-pagination-select"
                    value={menuLimit}
                    onChange={(e) => {
                      setMenuLimit(Number(e.target.value));
                      setMenuPage(1);
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
                  disabled={menuPage <= 1}
                  onClick={() => setMenuPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {visibleMenuPageNumbers(menuPage, totalPages).map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <span key={p} className="rm-page-btn-wrap">
                        {showEllipsis ? <span className="rm-page-ellipsis">…</span> : null}
                        <button
                          type="button"
                          className={`rm-page-btn${p === menuPage ? " rm-page-btn--active" : ""}`}
                          onClick={() => setMenuPage(p)}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
                <button
                  type="button"
                  className="rm-page-btn"
                  disabled={menuPage >= totalPages}
                  onClick={() => setMenuPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </main>
      </RailPortalShell>

      {/* â”€â”€ ADD / EDIT MODAL â”€â”€ */}
      {modalOpen && (
        <div
          className="rm-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="rm-modal">
            <div className="rm-modal-header">
              <h2 className="rm-modal-title">{editingId === -1 ? "Add Dish" : "Edit Dish"}</h2>
              <button type="button" className="rm-modal-close" onClick={() => setModalOpen(false)}>
                &#x2715;
              </button>
            </div>
            <div className="rm-modal-body">
              <div className="rm-form-row">
                <div className="rm-form-group">
                  <label className="rm-label">Name</label>
                  <input
                    type="text"
                    className="rm-input"
                    placeholder="e.g. Chicken Wings"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                  />
                </div>
                <div className="rm-form-group">
                  <label className="rm-label">Price</label>
                  <input
                    type="text"
                    className="rm-input"
                    placeholder="e.g. 199"
                    value={fPrice}
                    onChange={(e) => setFPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="rm-form-row">
                <div className="rm-form-group">
                  <label className="rm-label">Category</label>
                  <select
                    className="rm-input rm-native-select"
                    value={fCat}
                    onChange={(e) => setFCat(e.target.value)}
                  >
                    {categoryNames.length === 0 ? (
                      <option value={fCat}>{fCat || "Main Course"}</option>
                    ) : (
                      categoryNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="rm-form-group">
                  <label className="rm-label">Availability</label>
                  <select
                    className="rm-input rm-native-select"
                    value={fAvail}
                    onChange={(e) => setFAvail(e.target.value)}
                  >
                    <option value="Available">Available</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>
              </div>
              <div className="rm-form-group">
                <label className="rm-label">Description</label>
                <textarea
                  className="rm-textarea"
                  placeholder="Write something here..."
                  value={fDesc}
                  onChange={(e) => setFDesc(e.target.value)}
                />
              </div>
              <div className="rm-form-group">
                <label className="rm-label">Upload image</label>
                <p className="rm-upload-hint" style={{ fontSize: "0.85rem", color: "#888", margin: "0 0 8px" }}>
                  Images are sent to your API, then stored in S3 when AWS env vars are set. If S3 is unavailable, a small
                  local preview may be used (development only).
                </p>
                <div
                  className={`rm-upload-area${imageUploadBusy ? " rm-upload-area--busy" : ""}`}
                  onClick={() => {
                    if (!imageUploadBusy) fileRef.current?.click();
                  }}
                  style={imageUploadBusy ? { opacity: 0.7, pointerEvents: "none" } : undefined}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                    className="rm-file-input"
                    ref={fileRef}
                    disabled={imageUploadBusy}
                    onChange={(ev) => void handleImageChange(ev)}
                  />
                  {imageUploadBusy ? (
                    <div className="rm-upload-content">
                      <span className="rm-upload-text">Uploading to storage…</span>
                    </div>
                  ) : fImage ? (
                    <img src={fImage} className="rm-upload-preview" alt="preview" />
                  ) : (
                    <div className="rm-upload-content">
                      <span className="rm-upload-text">Click to upload image</span>
                      <IconUpload />
                    </div>
                  )}
                </div>
              </div>
              {formErr && <span className="rm-form-err">{formErr}</span>}
              <div className="rm-modal-actions">
                <button
                  type="button"
                  className="rm-btn-clear"
                  onClick={() => {
                    setFName("");
                    setFPrice("");
                    setFDesc("");
                    setFCat(defaultCategoryName());
                    setFAvail("Available");
                    setFImage("");
                    setFormErr("");
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="rm-btn-save"
                  disabled={saveBusy}
                  onClick={() => void saveDish()}
                >
                  {saveBusy ? "Saving…" : editingId === -1 ? "Add Dish" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ DELETE CONFIRM (same pattern as room-management.jsx) â”€â”€ */}
      {deleteOpen && (
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
            <h3 className="rm-confirm-title">Delete Dish?</h3>
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
      )}

      {toast.visible &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="resto-menu-toast active" role="status">
            <IconCheck />
            <span>{toast.msg}</span>
          </div>,
          document.body
        )}

      <AdminViewDetailModal
        open={Boolean(viewDish)}
        onClose={() => setViewDish(null)}
        title="Dish Details"
      >
        {viewDish ? (
          <div className="view-item-info">
            <AdminDetailHeroImage src={viewDish.image} alt={viewDish.name} />
            <AdminDetailRow label="Name" value={viewDish.name} />
            <AdminDetailRow label="Category" value={viewDish.category} />
            <AdminDetailRow
              label="Price"
              value={`${PESO}${String(viewDish.price).replace(/[^\d.]/g, "")}`}
            />
            <AdminDetailRow label="Availability" value={viewDish.availability || "—"} />
            <AdminDetailRow label="Description">
              {viewDish.description ? (
                <p className="admin-view-detail-desc">{viewDish.description}</p>
              ) : (
                "—"
              )}
            </AdminDetailRow>
          </div>
        ) : null}
      </AdminViewDetailModal>

      <ImagePreviewModal
        open={Boolean(imagePreview)}
        onClose={() => setImagePreview(null)}
        src={imagePreview?.src}
        alt={imagePreview?.alt}
        caption={imagePreview?.caption}
      />
      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
