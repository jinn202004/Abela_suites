import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, "../src/frontdesks/frontdesk-bills.jsx");
const pag = fs.readFileSync(path.join(root, "fd-pagination-snippet.txt"), "utf8");

let s = fs.readFileSync(file, "utf8");
const start = s.indexOf("          {!rowsLoading && (");
if (start < 0) {
  console.error("pag start not found");
  process.exit(1);
}
const end = s.indexOf("\n        </main>", start);
if (end < 0) {
  console.error("pag end not found");
  process.exit(1);
}
s = s.slice(0, start) + pag + s.slice(end);
fs.writeFileSync(file, s);
console.log("pag ok");
