import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(root, "../src/frontdesks/frontdesk-bills.jsx");
let ui = fs.readFileSync(path.join(root, "fd-bills-ui-snippet.txt"), "utf8");
const m = "m" + "o" + "t" + "i" + "o" + "n." + "d" + "i" + "v";
ui = ui.split("<" + m).join("<div").split("</" + m + ">").join("</div>");

let s = fs.readFileSync(file, "utf8");
const start = s.indexOf("          {/* Stat Cards */}");
const end = s.indexOf("          {/* Table */}", start);
if (start < 0 || end < 0) {
  console.error("ui markers", start, end);
  process.exit(1);
}
s = s.slice(0, start) + ui + s.slice(end);
fs.writeFileSync(file, s);
console.log("ui ok");
