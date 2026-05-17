import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const hk = path.join(root, "../src/housekeeping");

const paginationCss = `
  /* Client-side table pagination (no API/DB changes) */
  .housekeeping-portal-layout .rm-pagination-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px 20px;
    margin-top: 8px;
    padding: 12px 14px 4px;
    border-top: 1px solid #e8dcc8;
    background: #faf8f4;
    font-size: 13px;
    color: var(--text-mid, #5c574f);
  }
  .housekeeping-portal-layout .rm-pagination-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .housekeeping-portal-layout .rm-pagination-count {
    font-weight: 600;
    color: var(--text-dark, #2c2824);
  }
  .housekeeping-portal-layout .rm-pagination-limit {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }
  .housekeeping-portal-layout .rm-pagination-select {
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid #d4cfc4;
    background: #fff;
    font-size: 13px;
    color: var(--text-dark, #2c2824);
  }
  .housekeeping-portal-layout .rm-pagination-btns {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
  }
  .housekeeping-portal-layout .rm-page-btn-wrap {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .housekeeping-portal-layout .rm-page-ellipsis {
    padding: 0 4px;
    color: #999;
    user-select: none;
  }
  .housekeeping-portal-layout .rm-page-btn {
    min-width: 36px;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid #d4cfc4;
    background: #fff;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-dark, #2c2824);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .housekeeping-portal-layout .rm-page-btn:hover:not(:disabled) {
    border-color: var(--gold, #b8922a);
    color: var(--gold, #b8922a);
  }
  .housekeeping-portal-layout .rm-page-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .housekeeping-portal-layout .rm-page-btn--active {
    border-color: var(--gold, #b8922a);
    background: #fffdf8;
    color: #8a6d1f;
  }
`;

for (const cssFile of ["rooms.css", "housekeepingrooms.css"]) {
  const p = path.join(hk, cssFile);
  let css = fs.readFileSync(p, "utf8");
  if (!css.includes("housekeeping-portal-layout .rm-pagination-row")) {
    css = css.trimEnd() + paginationCss + "\n";
    fs.writeFileSync(p, css);
    console.log("css", cssFile);
  }
}

// --- dashboard ---
const dashPath = path.join(hk, "housekeepingdashboard.jsx");
let dash = fs.readFileSync(dashPath, "utf8");
if (!dash.includes("useHousekeepingClientPagination")) {
  dash = dash.replace(
    'import "./rooms.css";',
    `import AdminRmPagination from "../admin_1/AdminRmPagination";
import { useHousekeepingClientPagination } from "./useHousekeepingClientPagination";
import "./rooms.css";`,
  );
  dash = dash.replace(
    `  const [search, setSearch] = useState("");
  const [activeNav, setActiveNav] = useState("");`,
    `  const [search, setSearch] = useState("");
  const [activeNav, setActiveNav] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return inventoryRows.filter((r) => {
      if (!q) return true;
      const hay = [String(r.number), r.housekeeping, r.package, r.type, r.displayStatus]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [inventoryRows, search]);

  const {
    page: dashPage,
    setPage: setDashPage,
    pageSize: dashPageSize,
    setPageSize: setDashPageSize,
    totalPages: dashTotalPages,
    totalItems: dashTotalItems,
    rangeFrom: dashRangeFrom,
    rangeTo: dashRangeTo,
    pagedItems: dashPagedItems,
  } = useHousekeepingClientPagination(filtered, [search]);`,
  );
  dash = dash.replace(
    `  const q = search.toLowerCase().trim();
  const filtered = inventoryRows.filter((r) => {
    if (!q) return true;
    const hay = [String(r.number), r.housekeeping, r.package, r.type, r.displayStatus].join(" ").toLowerCase();
    return hay.includes(q);
  });

  /* After load/search`,
    `  /* After load/search`,
  );
  dash = dash.replaceAll("filtered.map((r)", "dashPagedItems.map((r)");
  dash = dash.replace(
    `                ) : (
                  <ul className="hk-dash-mobile__list">
                    {dashPagedItems.map((r) => (`,
    `                ) : (
                  <>
                  <ul className="hk-dash-mobile__list">
                    {dashPagedItems.map((r) => (`,
  );
  // fix mobile pagination insert - find closing </ul> before )} for mobile
  dash = dash.replace(
    `                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <motion.div className="rm-table-wrap hk-dash-table-outer"`,
    `                    ))}
                  </ul>
                  {!loading && dashTotalItems > 0 ? (
                    <AdminRmPagination
                      loading={loading}
                      rangeFrom={dashRangeFrom}
                      rangeTo={dashRangeTo}
                      totalItems={dashTotalItems}
                      page={dashPage}
                      totalPages={dashTotalPages}
                      pageSize={dashPageSize}
                      onPageChange={setDashPage}
                      onPageSizeChange={setDashPageSize}
                      ariaLabel="Dashboard inventory pages"
                    />
                  ) : null}
                  </>
                )}
              </div>
            ) : (
              <div className="rm-table-wrap hk-dash-table-outer"`,
  );
  dash = dash.split("<motion.div").join("<motion.div").split("motion.").join("");
  dash = dash.replace(
    `                </table>
              </div>
            )}
          </div>
        </main>`,
    `                </table>
                {!loading && dashTotalItems > 0 ? (
                  <AdminRmPagination
                    loading={loading}
                    rangeFrom={dashRangeFrom}
                    rangeTo={dashRangeTo}
                    totalItems={dashTotalItems}
                    page={dashPage}
                    totalPages={dashTotalPages}
                    pageSize={dashPageSize}
                    onPageChange={setDashPage}
                    onPageSizeChange={setDashPageSize}
                    ariaLabel="Dashboard inventory pages"
                  />
                ) : null}
              </div>
            )}
          </motion.div>
        </main>`,
  );
  dash = dash.replace("</motion.div>\n        </main>", "</div>\n        </main>");
  dash = dash.replace("<motion.div", "<div");
  fs.writeFileSync(dashPath, dash);
  console.log("dashboard");
}

function patchCleaning(file, label, resetExpr) {
  const p = path.join(hk, file);
  let s = fs.readFileSync(p, "utf8");
  if (s.includes("useHousekeepingClientPagination")) {
    console.log("skip", file);
    return;
  }
  s = s.replace(
    'import "./housekeepingrooms.css";',
    `import AdminRmPagination from "../admin_1/AdminRmPagination";
import { useHousekeepingClientPagination } from "./useHousekeepingClientPagination";
import "./housekeepingrooms.css";`,
  );
  s = s.replace(
    `  }, [rows, currentTab, search]);

  const emptyHint = useMemo(() => {`,
    `  }, [rows, currentTab, search]);

  const {
    page: tablePage,
    setPage: setTablePage,
    pageSize: tablePageSize,
    setPageSize: setTablePageSize,
    totalPages: tableTotalPages,
    totalItems: tableTotalItems,
    rangeFrom: tableRangeFrom,
    rangeTo: tableRangeTo,
    pagedItems: pagedRows,
  } = useHousekeepingClientPagination(filtered, ${resetExpr});

  const emptyHint = useMemo(() => {`,
  );
  s = s.replaceAll("filtered.map((r)", "pagedRows.map((r)");
  s = s.replace(
    `              </table>
            </div>
          </div>
        </main>`,
    `              </table>
              {!loading && tableTotalItems > 0 ? (
                <AdminRmPagination
                  loading={loading}
                  rangeFrom={tableRangeFrom}
                  rangeTo={tableRangeTo}
                  totalItems={tableTotalItems}
                  page={tablePage}
                  totalPages={tableTotalPages}
                  pageSize={tablePageSize}
                  onPageChange={setTablePage}
                  onPageSizeChange={setTablePageSize}
                  ariaLabel="${label}"
                />
              ) : null}
            </div>
          </div>
        </main>`,
  );
  fs.writeFileSync(p, s);
  console.log(file);
}

patchCleaning("rooms.jsx", "Room cleaning task pages", "[search, currentTab]");
patchCleaning("events.jsx", "Event cleaning task pages", "[search, currentTab]");
