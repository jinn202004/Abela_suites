import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const file = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/admin_1/event-management.jsx",
);
let s = fs.readFileSync(file, "utf8");

const blockOpen = '<div className="rm-table-block">\n              <motion.div className="rm-table-wrap">';
const blockOpen2 = '<div className="rm-table-block">\n              <div className="rm-table-wrap">';
const wrapOnly = '<div className="rm-table-wrap">';

if (s.includes(blockOpen)) {
  s = s.split(blockOpen).join(wrapOnly);
} else if (s.includes(blockOpen2)) {
  s = s.split(blockOpen2).join(wrapOnly);
} else {
  s = s.replace(/\n              <div className="rm-table-block">\n/g, "\n");
}

// Drop one extra </div> before panel close when block was removed (status panel)
s = s.replace(
  /(\) : null\}\n              <\/div>)\n              <\/div>\n            <\/motion.div>\n          \)\}/,
  "$1\n            </div>\n          )}",
);
s = s.replace(
  /(\) : null\}\n              <\/div>)\n              <\/motion.div>\n            <\/div>\n          \)\}/,
  "$1\n            </div>\n          )}",
);

fs.writeFileSync(file, s);
console.log("ok");
