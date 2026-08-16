import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const src = join("dist", "client");
const dest = "docs";
if (!existsSync(join(src, "_shell.html"))) {
  throw new Error("missing dist/client/_shell.html — run GITHUB_PAGES=1 vite build first");
}

cpSync(src, dest, { recursive: true });
const shell = readFileSync(join(dest, "_shell.html"), "utf8").replaceAll("/./assets/", "./assets/");
for (const name of ["_shell.html", "index.html", "404.html"]) {
  writeFileSync(join(dest, name), shell);
}
writeFileSync(join(dest, ".nojekyll"), "");
console.log("wrote", dest);
