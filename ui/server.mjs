#!/usr/bin/env node
/**
 * Local UI server — zero dependencies.
 *   node ui/server.mjs
 *   open http://127.0.0.1:3847
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadExercises,
  getLibraryMeta,
  listTemplates,
  loadTemplate,
  listProfiles,
  loadProfile,
  buildWorkoutFromProfile,
  sanitizeForLog,
  getErrorMessage,
  ROOT,
} from "../generator/lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const ILLUSTRATIONS_DIR = path.join(ROOT, "library", "illustrations");
const PORT = Number(process.env.PORT) || 3847;
const HOST = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(payload);
}

function sendText(res, status, text, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(text);
}

function resolveSafeFile(baseDir, urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const relative = clean.replace(/^\//, "");
  if (relative.includes("\0") || relative.includes("..")) return null;
  const resolved = path.resolve(baseDir, relative);
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) return null;
  return resolved;
}

function resolvePublicPath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const relative = clean === "/" ? "index.html" : clean.replace(/^\//, "");
  return resolveSafeFile(PUBLIC_DIR, relative);
}

function serveFile(res, filePath) {
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, "Not found");
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": data.length,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": [".svg", ".png", ".jpg", ".jpeg", ".webp"].includes(ext)
      ? "public, max-age=3600"
      : "no-store",
  });
  res.end(data);
}

function serveStatic(req, res) {
  const urlPath = req.url || "/";
  if (urlPath.startsWith("/illustrations/")) {
    const name = urlPath.slice("/illustrations/".length);
    const filePath = resolveSafeFile(ILLUSTRATIONS_DIR, name);
    serveFile(res, filePath);
    return;
  }
  const filePath = resolvePublicPath(urlPath);
  serveFile(res, filePath);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  const max = 1_000_000;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleApi(req, res, pathname) {
  try {
    if (req.method === "GET" && pathname === "/api/meta") {
      sendJson(res, 200, getLibraryMeta());
      return;
    }

    if (req.method === "GET" && pathname === "/api/exercises") {
      sendJson(res, 200, { exercises: loadExercises() });
      return;
    }

    if (req.method === "GET" && pathname === "/api/templates") {
      const templates = listTemplates().map((id) => {
        const t = loadTemplate(id);
        return { id: t.id, name: t.name, description: t.description };
      });
      sendJson(res, 200, { templates });
      return;
    }

    if (req.method === "GET" && pathname === "/api/profiles") {
      sendJson(res, 200, { profiles: listProfiles() });
      return;
    }

    if (req.method === "GET" && pathname.startsWith("/api/profiles/")) {
      const id = pathname.slice("/api/profiles/".length);
      sendJson(res, 200, loadProfile(id));
      return;
    }

    if (req.method === "POST" && pathname === "/api/generate") {
      const body = await readBody(req);
      const profile = body.profile;
      const templateId = body.template || null;
      if (!profile || typeof profile !== "object") {
        sendJson(res, 400, { error: "Missing profile" });
        return;
      }
      const workout = buildWorkoutFromProfile(profile, templateId);
      console.log(
        "generated template=%s goal=%s",
        sanitizeForLog(workout.template.id),
        sanitizeForLog(workout.profile.goal)
      );
      sendJson(res, 200, { workout });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    const message = getErrorMessage(err);
    console.error("api_error %s", sanitizeForLog(message));
    sendJson(res, 400, { error: message });
  }
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `${HOST}:${PORT}`;
  let pathname = "/";
  try {
    pathname = new URL(req.url || "/", `http://${host}`).pathname;
  } catch {
    sendText(res, 400, "Bad request");
    return;
  }

  if (pathname.startsWith("/api/")) {
    await handleApi(req, res, pathname);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method not allowed");
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, HOST, () => {
  console.log("Gym Trainer UI at http://%s:%s", HOST, PORT);
  console.log("Project root %s", ROOT);
});
