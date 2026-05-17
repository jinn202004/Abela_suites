import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, "../src/frontdesks/frontdesk-housekeeping.jsx");
let s = fs.readFileSync(file, "utf8");

if (s.includes("hk-table-block")) {
  console.log("already wrapped");
  process.exit(0);
}

const tableOpen = '            <div className="hk-table-wrap">';
const idx = s.indexOf(tableOpen);
if (idx < 0) {
  console.error("hk-table-wrap not found");
  process.exit(1);
}

const blockOpen = `            <div className="hk-table-block">\n${tableOpen}`;
s = s.slice(0, idx) + blockOpen + s.slice(idx + tableOpen.length);

const pagEnd = s.indexOf("\n        </main>");
if (pagEnd < 0) {
  console.error("</main> not found");
  process.exit(1);
}

s = `${s.slice(0, pagEnd)}\n            </div>${s.slice(pagEnd)}`;
fs.writeFileSync(file, s);
console.log("wrapped ok");
