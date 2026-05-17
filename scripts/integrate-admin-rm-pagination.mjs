import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const fe = path.join(root, "..");

const statusPag = `                  <AdminRmPagination
                    rangeFrom={statusRangeFrom}
                    rangeTo={statusRangeTo}
                    totalItems={filteredStatuses.length}
                    page={statusCurrentPage}
                    totalPages={statusTotalPages}
                    pageSize={statusPageSize}
                    onPageChange={setStatusPage}
                    onPageSizeChange={setStatusPageSize}
                    ariaLabel="Room reservation pages"
                  />`;

const roomsPag = `                  <AdminRmPagination
                    rangeFrom={roomsRangeFrom}
                    rangeTo={roomsRangeTo}
                    totalItems={filteredRooms.length}
                    page={roomsCurrentPage}
                    totalPages={roomsTotalPages}
                    pageSize={roomsPageSize}
                    onPageChange={setRoomsPage}
                    onPageSizeChange={setRoomsPageSize}
                    ariaLabel="Room catalog pages"
                  />`;

const eventStatusPag = `                  <AdminRmPagination
                    rangeFrom={statusRangeFrom}
                    rangeTo={statusRangeTo}
                    totalItems={filteredStatuses.length}
                    page={statusCurrentPage}
                    totalPages={statusTotalPages}
                    pageSize={statusPageSize}
                    onPageChange={setStatusPage}
                    onPageSizeChange={setStatusPageSize}
                    ariaLabel="Event reservation pages"
                  />`;

const eventVenuePag = `                  <AdminRmPagination
                    rangeFrom={venueRangeFrom}
                    rangeTo={venueRangeTo}
                    totalItems={filteredVenues.length}
                    page={venueCurrentPage}
                    totalPages={venueTotalPages}
                    pageSize={venuePageSize}
                    onPageChange={setVenuePage}
                    onPageSizeChange={setVenuePageSize}
                    ariaLabel="Event venue pages"
                  />`;

function replacePaginationBlock(src, ariaLabel, replacement) {
  const open = `className="rm-pagination-bar" aria-label="${ariaLabel}"`;
  const start = src.indexOf(open);
  if (start < 0) throw new Error(`block not found: ${ariaLabel}`);
  const blockStart = src.lastIndexOf("<", start);
  let depth = 0;
  let i = blockStart;
  while (i < src.length) {
    if (src.startsWith("<div", i)) depth++;
    if (src.startsWith("</div>", i)) {
      depth--;
      if (depth === 0) {
        i += "</motion.div>".length - 6; // wrong
        i += 6;
        const end = i;
        return src.slice(0, blockStart) + replacement + src.slice(end);
      }
    }
    i++;
  }
  throw new Error(`unclosed block: ${ariaLabel}`);
}

function replacePaginationBlockFixed(src, ariaLabel, replacement) {
  const marker = `aria-label="${ariaLabel}"`;
  const idx = src.indexOf(marker);
  if (idx < 0) throw new Error(`marker not found: ${ariaLabel}`);
  const blockStart = src.lastIndexOf("<", idx);
  let pos = blockStart;
  let depth = 0;
  while (pos < src.length) {
    if (src.slice(pos, pos + 4) === "<div") depth++;
    if (src.slice(pos, pos + 6) === "</div>") {
      depth--;
      if (depth === 0) {
        const end = pos + 6;
        return src.slice(0, blockStart) + replacement + src.slice(end);
      }
    }
    pos++;
  }
  throw new Error(`unclosed: ${ariaLabel}`);
}

// room-management
const rmPath = path.join(fe, "src/admin_1/room-management.jsx");
let rm = fs.readFileSync(rmPath, "utf8");
if (!rm.includes('import AdminRmPagination')) {
  rm = rm.replace(
    'import "./room-management.css";',
    'import AdminRmPagination from "./AdminRmPagination";\nimport "./room-management.css";',
  );
}
rm = replacePaginationBlockFixed(rm, "Room status pages", statusPag);
rm = replacePaginationBlockFixed(rm, "Room catalog pages", roomsPag);
fs.writeFileSync(rmPath, rm);
console.log("room-management ok");

// event-management
const emPath = path.join(fe, "src/admin_1/event-management.jsx");
let em = fs.readFileSync(emPath, "utf8");
em = em.replace(
  'import "./event-management.css";',
  'import AdminRmPagination from "./AdminRmPagination";\nimport "./event-management.css";',
);
em = em.replace(
  "/** Event admin tables: rows per page (client-side only; APIs unchanged). */\nconst EM_TABLE_PAGE_SIZE = 10;\n\n",
  "",
);
em = em.replace(
  "  const [statusPage, setStatusPage] = useState(1);\n  const [venuePage, setVenuePage] = useState(1);",
  "  const [statusPage, setStatusPage] = useState(1);\n  const [venuePage, setVenuePage] = useState(1);\n  const [statusPageSize, setStatusPageSize] = useState(10);\n  const [venuePageSize, setVenuePageSize] = useState(10);",
);
em = em.replaceAll("EM_TABLE_PAGE_SIZE", "statusPageSize");
// fix venue calculations - first replace was too broad
em = em.replace(
  /const venueTotalPages = Math\.max\(1, Math\.ceil\(filteredVenues\.length \/ statusPageSize\)\);/,
  "const venueTotalPages = Math.max(1, Math.ceil(filteredVenues.length / venuePageSize));",
);
em = em.replace(
  /const venuePageStart = \(venueCurrentPage - 1\) \* statusPageSize;/,
  "const venuePageStart = (venueCurrentPage - 1) * venuePageSize;",
);
em = em.replace(
  /filteredVenues\.slice\(venuePageStart, venuePageStart \+ statusPageSize\)/,
  "filteredVenues.slice(venuePageStart, venuePageStart + venuePageSize)",
);
em = em.replace(
  "  }, [statusSearch]);",
  "  }, [statusSearch, statusPageSize]);",
);
em = em.replace(
  "  }, [venueSearch]);",
  "  }, [venueSearch, venuePageSize]);",
);
em = replacePaginationBlockFixed(em, "Event reservation pages", eventStatusPag);
em = replacePaginationBlockFixed(em, "Event venue pages", eventVenuePag);
fs.writeFileSync(emPath, em);
console.log("event-management ok");
