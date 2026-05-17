import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, "../src/frontdesks/frontdesk-bills.jsx");
const neu = fs.readFileSync(path.join(root, "fd-bills-state-snippet.txt"), "utf8");
let s = fs.readFileSync(file, "utf8");
const start = s.indexOf("  const [search, setSearch]");
const end = s.indexOf("  async function openBillDetails(row)");
if (start < 0 || end < 0) {
  console.error("markers missing", start, end);
  process.exit(1);
}
s = s.slice(0, start) + neu + s.slice(end);
fs.writeFileSync(file, s);
console.log("spliced state");
