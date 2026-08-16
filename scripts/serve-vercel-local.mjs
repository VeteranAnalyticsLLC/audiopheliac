#!/usr/bin/env node
/**
 * Filesystem-first local preview of the Vercel output.
 * Static assets from .vercel/output/static (correct MIME).
 * Everything else hits the Nitro __server function — same as Vercel.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd());
const staticDir = resolve(root, ".vercel/output/static");
const funcPath = resolve(root, ".vercel/output/functions/__server.func/index.mjs");
const port = Number(process.env.PORT || 4178);
const host = process.env.HOST || "127.0.0.1";

const MIME = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

if (!existsSync(staticDir) || !existsSync(funcPath)) {
  console.error("No Vercel output. Run npm run build first.");
  process.exit(1);
}

const { default: vercelHandler } = await import(pathToFileURL(funcPath).href);

function safeStatic(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const rel = decoded.replace(/^\/+/, "");
  if (!rel) return null;
  const full = normalize(join(staticDir, rel));
  if (!full.startsWith(staticDir)) return null;
  if (!existsSync(full) || !statSync(full).isFile()) return null;
  return full;
}

const server = createServer(async (req, res) => {
  const url = req.url || "/";
  const pathOnly = url.split("?", 1)[0] ?? "/";
  const file = safeStatic(pathOnly);

  if (file) {
    const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
    res.statusCode = 200;
    res.setHeader("content-type", type);
    if (pathOnly.startsWith("/assets/")) {
      res.setHeader("cache-control", "public, max-age=31536000, immutable");
    }
    createReadStream(file).pipe(res);
    return;
  }

  if (pathOnly.startsWith("/assets/")) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("asset not found");
    return;
  }

  try {
    const proto = "http";
    const hostHdr = req.headers.host || `${host}:${port}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) for (const v of value) headers.append(key, v);
      else headers.set(key, value);
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const request = new Request(`${proto}://${hostHdr}${url}`, {
      method: req.method || "GET",
      headers,
      body: ["GET", "HEAD"].includes((req.method || "GET").toUpperCase()) ? undefined : body,
    });
    const response = await vercelHandler.fetch(request);
    res.statusCode = response.status;
    const setCookies =
      typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") return;
      res.setHeader(key, value);
    });
    for (const cookie of setCookies) res.appendHeader("set-cookie", cookie);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error("[serve-vercel-local]", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(String(err?.message || err));
    }
  }
});

server.listen(port, host, () => {
  console.log(`vercel-local http://${host}:${port}/`);
});
