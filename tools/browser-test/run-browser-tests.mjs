#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// LeVe AI — headless-selaintestiajuri (Stop hook -portti, 2026-07-04)
// ═══════════════════════════════════════════════════════════════
//
// Ajaa koko selain-testisuiten (?test=1, test-runner.js) headless-selaimessa
// ILMAN riippuvuuksia: oma staattinen HTTP-serveri (node:http) + järjestelmän
// Edge/Chrome CDP:llä (Node ≥22 natiivi WebSocket). Ei npm-paketteja — repo
// pysyy no-npm-filosofiassa.
//
// MIKSI: selaintestit olivat ainoa portti jota ei voinut ajaa CLI:stä →
// Stop hook oli sokea UI/selain-pinnalle. Lisäksi manuaaliajon service worker
// -cache tuotti epäpätevän baseline-vertailun (S10-premissivirhe 2026-07-03,
// ks. muisti sw-cache-invalidates-browser-baselines). Headless-ajo käyttää
// joka kerta TUOREEN väliaikaisprofiilin → SW-cache ei voi koskaan valehdella.
//
// Exit 0 ⟺ kaikki testit läpi. Muuten exit 1 + failaavat rivit stderriin.
//
// Käyttö:  node tools/browser-test/run-browser-tests.mjs
// Env:     LEVE_BROWSER=<polku> (ohita selaimen autohaku)
//          LEVE_BTEST_TIMEOUT_MS (oletus 180000)

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TIMEOUT_MS = Number(process.env.LEVE_BTEST_TIMEOUT_MS) || 180000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".csv": "text/csv; charset=utf-8",
};

// ── Staattinen serveri repo-juuresta (ephemeral portti) ──
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
        let filePath = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);
        // Path traversal -suoja: pysy repo-juuressa
        if (!path.resolve(filePath).startsWith(ROOT)) {
          res.writeHead(403); res.end(); return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404); res.end("not found"); return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": MIME[ext] || "application/octet-stream",
          "Cache-Control": "no-store",
        });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        res.writeHead(500); res.end(String(e));
      }
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

// ── Selaimen haku (Edge ensisijainen Win11:llä, Chrome fallback) ──
function findBrowser() {
  const candidates = [
    process.env.LEVE_BROWSER,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  throw new Error("Selainta ei löydy — aseta LEVE_BROWSER=<polku msedge.exe/chrome.exe>");
}

// ── DevToolsActivePort-tiedoston pollaus (remote-debugging-port=0) ──
// HUOM: Windowsin msedge.exe voi toimia launcher-stubina (parent exittaa heti 0:lla,
// varsinainen selainprosessi jatkaa) → parentin exit EI ole fataali. Ainoa luotettava
// signaali on DevToolsActivePort-tiedoston ilmestyminen tuoreeseen profiiliin.
async function waitDevtoolsPort(userDataDir) {
  const f = path.join(userDataDir, "DevToolsActivePort");
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    if (fs.existsSync(f)) {
      const lines = fs.readFileSync(f, "utf8").trim().split("\n");
      const port = Number(lines[0]);
      if (port > 0) return port;
    }
    await new Promise(r => setTimeout(r, 150));
  }
  throw new Error("DevToolsActivePort ei ilmestynyt 30 s:ssa (selain ei käynnistynyt?)");
}

// ── Minimaalinen CDP-asiakas (natiivi WebSocket, Node ≥22) ──
class Cdp {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.nextId = 1; this.pending = new Map(); this.events = []; }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", (e) => reject(new Error("CDP WebSocket -virhe: " + (e?.message || "?"))));
      this.ws.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
        } else if (msg.method) {
          this.events.push(msg); // esim. Runtime.exceptionThrown talteen diagnostiikaksi
        }
      });
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { try { this.ws?.close(); } catch { /* ignore */ } }
}

async function main() {
  const { server, port } = await startServer();
  const testUrl = `http://127.0.0.1:${port}/?test=1`;
  const browserExe = findBrowser();
  // TUORE väliaikaisprofiili joka ajolle → ei service worker -cachea, ei tilaa.
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "leve-btest-"));
  const browser = spawn(browserExe, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--disable-background-networking",
    "--disable-sync", "--mute-audio",
    testUrl,
  ], { stdio: "ignore" });

  let cdp = null;
  let browserCdp = null; // browser-tason endpoint → Browser.close (launcher-stub: kill ei riitä)
  const cleanup = async () => {
    try { cdp?.close(); } catch { /* ignore */ }
    try { if (browserCdp) { await browserCdp.send("Browser.close"); browserCdp.close(); } } catch { /* ignore */ }
    try { browser.kill(); } catch { /* ignore */ }
    try { server.close(); } catch { /* ignore */ }
    // Profiilin siivous best-effort (Windows voi lukita hetken)
    setTimeout(() => { try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch { /* ignore */ } }, 800);
  };

  try {
    const devPort = await waitDevtoolsPort(userDataDir);
    // Browser-endpoint siivousta varten
    try {
      const vres = await fetch(`http://127.0.0.1:${devPort}/json/version`);
      const vjson = await vres.json();
      if (vjson.webSocketDebuggerUrl) {
        browserCdp = new Cdp(vjson.webSocketDebuggerUrl);
        await browserCdp.connect();
      }
    } catch { /* siivous degradoituu kill-yritykseen */ }
    // Etsi testisivun CDP-target
    let target = null;
    const t0 = Date.now();
    while (!target && Date.now() - t0 < 15000) {
      const res = await fetch(`http://127.0.0.1:${devPort}/json/list`);
      const targets = await res.json();
      target = targets.find(t => t.type === "page" && t.url.includes("test=1"));
      if (!target) await new Promise(r => setTimeout(r, 200));
    }
    if (!target) throw new Error("Testisivun CDP-targetia ei löytynyt");

    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Runtime.enable");

    // Pollaa valmistumista: test-runner renderöi tulokset DOM:iin ATOMISESTI
    // lopussa ("X passed / Y total") → regex on luotettava valmis-signaali.
    const pollExpr = `(() => {
      const t = document.body ? document.body.innerText : "";
      const m = t.match(/(\\d+) passed \\/ (\\d+) total/);
      if (!m) return JSON.stringify({ done: false, len: t.length });
      const fails = t.split("\\n").filter(l => l.trim().startsWith("\\u2717") && !/testi\\u00e4 ep\\u00e4onnistui/.test(l)).slice(0, 60);
      return JSON.stringify({ done: true, passed: +m[1], total: +m[2], fails });
    })()`;

    const start = Date.now();
    let result = null;
    while (Date.now() - start < TIMEOUT_MS) {
      const r = await cdp.send("Runtime.evaluate", { expression: pollExpr, returnByValue: true });
      const parsed = JSON.parse(r.result.value);
      if (parsed.done) { result = parsed; break; }
      await new Promise(res => setTimeout(res, 500));
    }

    if (!result) {
      const exc = cdp.events.filter(e => e.method === "Runtime.exceptionThrown").slice(0, 3)
        .map(e => e.params?.exceptionDetails?.exception?.description || e.params?.exceptionDetails?.text).join("\n");
      console.error(`SELAINTESTIT: TIMEOUT ${TIMEOUT_MS} ms — testit eivät valmistuneet.`);
      if (exc) console.error("Sivun poikkeukset:\n" + exc);
      await cleanup();
      process.exit(1);
    }

    if (result.passed === result.total && result.total > 0) {
      console.log(`SELAINTESTIT: ${result.passed}/${result.total} — kaikki läpi (headless, tuore profiili, ei SW-cachea)`);
      await cleanup();
      process.exit(0);
    } else {
      console.error(`SELAINTESTIT: ${result.passed}/${result.total} — FAILURET:`);
      for (const f of result.fails) console.error("  " + f);
      await cleanup();
      process.exit(1);
    }
  } catch (e) {
    console.error("SELAINTESTIT: ajovirhe — " + e.message);
    await cleanup();
    process.exit(1);
  }
}

main();
