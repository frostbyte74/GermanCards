import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname, sep } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT ?? 4173);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    // Also exercise relative asset loading under the GitHub project-site prefix.
    if (path === "/GermanCards") { res.writeHead(302, { Location: "/GermanCards/" }); res.end(); return; }
    if (path.startsWith("/GermanCards/")) path = path.slice("/GermanCards".length);
    if (path.endsWith("/")) path += "index.html";
    const absolute = resolve(root, "." + path.replaceAll("/", sep));
    const relative = absolute.slice(root.length);
    if (!absolute.startsWith(root) || relative.split(sep).some(part => part.startsWith(".")) ||
        relative.split(sep).includes("node_modules")) {
      res.writeHead(403); res.end("Forbidden"); return;
    }
    const bytes = await readFile(absolute);
    res.writeHead(200, { "Content-Type": mime[extname(absolute)] ?? "text/plain; charset=utf-8" });
    res.end(bytes);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`GermanCards: http://127.0.0.1:${port}/GermanCards/`));
