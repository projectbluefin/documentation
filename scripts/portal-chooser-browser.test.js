const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.join(__dirname, "..");
const buildDir = path.join(root, "build");

function findChromium() {
  const candidates = [
    "/snap/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function createStaticServer(dir) {
  return http.createServer((req, res) => {
    let reqPath = req.url.split("?")[0];
    if (reqPath.endsWith("/")) reqPath += "index.html";
    let filePath = path.join(dir, reqPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      return res.end("Not found");
    }
    const ext = path.extname(filePath);
    const types = {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    res.setHeader("Content-Type", types[ext] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  });
}

class ChromiumSession {
  constructor(browserProc, wsUrl) {
    this.proc = browserProc;
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    await this.send("Runtime.enable");
    await this.send("Page.enable");
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          this.ws.removeEventListener("message", handler);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      };
      this.ws.addEventListener("message", handler);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        res.exceptionDetails.exception?.description ||
          res.exceptionDetails.text,
      );
    }
    return res.result?.value;
  }

  async setViewport(width, height, isMobile = false) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
  }

  async setReducedMotion(enabled) {
    await this.send("Emulation.setEmulatedMedia", {
      features: enabled
        ? [{ name: "prefers-reduced-motion", value: "reduce" }]
        : [],
    });
  }

  async close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    if (this.proc && !this.proc.killed) {
      this.proc.kill();
    }
  }
}

async function launchBrowser(targetUrl) {
  const bin = findChromium();
  if (!bin) {
    throw new Error("No Chromium binary found on host system.");
  }

  const cp = spawn(bin, [
    "--headless=new",
    "--remote-debugging-port=0",
    "--disable-gpu",
    "--no-first-run",
    "--no-sandbox",
    targetUrl,
  ]);

  const dbgPort = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout waiting for remote debugging port")),
      10000,
    );
    cp.stderr.on("data", (data) => {
      const match = data
        .toString()
        .match(/ws:\/\/127\.0\.0\.1:(\d+)\/devtools\/browser\//);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    cp.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  // Give Chromium a moment to load target URL
  await new Promise((r) => setTimeout(r, 1200));

  const listRes = await fetch(`http://127.0.0.1:${dbgPort}/json/list`);
  const pages = await listRes.json();
  const page =
    pages.find((p) => p.url.includes("portal-prototype")) || pages[0];
  if (!page || !page.webSocketDebuggerUrl) {
    cp.kill();
    throw new Error("No suitable debuggable page found in Chromium.");
  }

  const session = new ChromiumSession(cp, page.webSocketDebuggerUrl);
  await session.connect();
  return session;
}

test("chooser transitions in local Chromium preserve accessibility, focus headings, and update live announcements", async (t) => {
  const indexHtml = path.join(buildDir, "portal-prototype", "index.html");
  assert.ok(
    fs.existsSync(indexHtml),
    "build/portal-prototype/index.html must exist before running browser tests",
  );

  const server = createStaticServer(buildDir);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const targetUrl = `http://127.0.0.1:${port}/portal-prototype/`;

  let session;
  try {
    session = await launchBrowser(targetUrl);

    // Helper: inspect active element and live region
    const getFocusState = async () => {
      return session.evaluate(`
        (() => {
          const active = document.activeElement;
          const chooser = document.querySelector("[class*=imageChooser]");
          const liveRegion = document.querySelector("[aria-live=polite]");
          return {
            tagName: active ? active.tagName : null,
            text: active ? (active.textContent || "").trim() : "",
            isBody: active === document.body,
            insideChooser: chooser ? chooser.contains(active) : false,
            announcement: liveRegion ? (liveRegion.textContent || "").trim() : ""
          };
        })()
      `);
    };

    // Helper: click element matching text inside chooser
    const clickChooserElement = async (selector, textMatch) => {
      return session.evaluate(`
        (() => {
          const chooser = document.querySelector("[class*=imageChooser]");
          const root = chooser || document;
          const els = Array.from(root.querySelectorAll("${selector}"));
          const target = els.find(el => el.textContent.includes("${textMatch}"));
          if (!target) {
            throw new Error("Could not find element '${selector}' containing '${textMatch}' in chooser");
          }
          target.click();
          return true;
        })()
      `);
    };

    // Helper: wait for activeElement change or short delay
    const waitTransition = async () => {
      await session.evaluate(`new Promise(r => setTimeout(r, 120))`);
    };

    // --- 1. DESKTOP VIEWPORT ---
    await t.test(
      "desktop forward path, back, and reset transitions preserve focus inside step",
      async () => {
        await session.setViewport(1280, 800, false);
        await session.setReducedMotion(false);

        // Verify initial mount skips focus stealing
        const initial = await getFocusState();
        assert.equal(
          initial.isBody,
          true,
          "initial mount must leave activeElement on body (skip initial mount)",
        );
        assert.equal(
          initial.announcement,
          "Step 1: Choose a Bluefin release.",
          "initial mount must expose Step 1 live announcement",
        );

        // Step 1 -> Step 2: Choose Stable (RECOMMENDED)
        await clickChooserElement("[role=button]", "RECOMMENDED");
        await waitTransition();
        const step2 = await getFocusState();
        assert.equal(
          step2.isBody,
          false,
          "focus must NOT land on body after transition to architecture",
        );
        assert.equal(
          step2.insideChooser,
          true,
          "focus must land inside newly rendered step",
        );
        assert.equal(step2.tagName, "H3", "step heading must be focused");
        assert.ok(
          step2.text.includes("Which architecture will you install Bluefin on"),
        );
        assert.equal(
          step2.announcement,
          "Step 2: Choose architecture for Bluefin.",
        );

        // Step 2 -> Step 3: Choose x86_64
        await clickChooserElement("button", "x86_64");
        await waitTransition();
        const step3 = await getFocusState();
        assert.equal(
          step3.isBody,
          false,
          "focus must NOT land on body after transition to GPU",
        );
        assert.equal(
          step3.insideChooser,
          true,
          "focus must land inside newly rendered step",
        );
        assert.equal(step3.tagName, "H3", "GPU step heading must be focused");
        assert.ok(
          step3.text.includes(
            "Who is the vendor of your primary graphics card",
          ),
        );
        assert.equal(
          step3.announcement,
          "Step 3: Choose graphics card vendor.",
        );

        // Step 3 -> Step 4 (Download for Stable): Choose AMD or Intel
        await clickChooserElement("button", "AMD or Intel");
        await waitTransition();
        const stepDownload = await getFocusState();
        assert.equal(
          stepDownload.isBody,
          false,
          "focus must NOT land on body after transition to download",
        );
        assert.equal(
          stepDownload.insideChooser,
          true,
          "focus must land inside newly rendered step",
        );
        assert.equal(
          stepDownload.tagName,
          "H3",
          "Download step heading must be focused",
        );
        assert.equal(stepDownload.text, "Ready to Download!");
        assert.equal(stepDownload.announcement, "Ready to download Bluefin.");

        // Back transition: Click "Back" from download step
        await clickChooserElement("button", "Back");
        await waitTransition();
        const backToGpu = await getFocusState();
        assert.equal(
          backToGpu.isBody,
          false,
          "focus must NOT land on body after back transition",
        );
        assert.equal(
          backToGpu.insideChooser,
          true,
          "focus must land inside newly rendered step",
        );
        assert.equal(
          backToGpu.tagName,
          "H3",
          "GPU heading must be focused after back navigation",
        );
        assert.equal(
          backToGpu.announcement,
          "Step 3: Choose graphics card vendor.",
        );

        // Back again: Click "Back to releases"
        await clickChooserElement("button", "Back");
        await waitTransition();
        await clickChooserElement("button", "Back to releases");
        await waitTransition();
        const backToRelease = await getFocusState();
        assert.equal(
          backToRelease.isBody,
          false,
          "focus must NOT land on body after returning to release step",
        );
        assert.equal(
          backToRelease.insideChooser,
          true,
          "focus must land inside newly rendered step",
        );
        assert.equal(
          backToRelease.announcement,
          "Step 1: Choose a Bluefin release.",
        );
      },
    );

    // --- 2. ARM DIRECT-DOWNLOAD PATH ---
    await t.test(
      "ARM direct-download jumps straight to download step and focuses heading",
      async () => {
        // Step 1: Choose Bluefin LTS
        await clickChooserElement("[role=button]", "Bluefin LTS");
        await waitTransition();
        const archStep = await getFocusState();
        assert.equal(archStep.isBody, false);
        assert.equal(archStep.insideChooser, true);
        assert.equal(archStep.tagName, "H3");
        assert.equal(
          archStep.announcement,
          "Step 2: Choose architecture for Bluefin LTS.",
        );

        // Step 2: Choose ARM64 (Direct-download bypasses GPU and Kernel steps)
        await clickChooserElement("button", "ARM64");
        await waitTransition();
        const armDownload = await getFocusState();
        assert.equal(
          armDownload.isBody,
          false,
          "focus must NOT land on body after ARM direct-download",
        );
        assert.equal(
          armDownload.insideChooser,
          true,
          "focus must land inside download step",
        );
        assert.equal(
          armDownload.tagName,
          "H3",
          "Download heading must be focused",
        );
        assert.equal(armDownload.text, "Ready to Download!");
        assert.equal(
          armDownload.announcement,
          "Ready to download Bluefin LTS.",
        );

        // Reset chooser: "Choose a different release"
        await clickChooserElement("button", "Choose a different release");
        await waitTransition();
        const resetState = await getFocusState();
        assert.equal(
          resetState.isBody,
          false,
          "focus must NOT land on body after reset",
        );
        assert.equal(
          resetState.insideChooser,
          true,
          "focus must land inside release step",
        );
        assert.equal(
          resetState.announcement,
          "Step 1: Choose a Bluefin release.",
        );
      },
    );

    // --- 3. NVIDIA BYPASS PATH ---
    await t.test(
      "Nvidia bypass transitions directly to GDX download skipping kernel step",
      async () => {
        // Step 1: Choose Bluefin LTS
        await clickChooserElement("[role=button]", "Bluefin LTS");
        await waitTransition();

        // Step 2: Choose x86_64
        await clickChooserElement("button", "x86_64");
        await waitTransition();
        const gpuStep = await getFocusState();
        assert.equal(
          gpuStep.announcement,
          "Step 3: Choose graphics card vendor.",
        );

        // Step 3: Choose Nvidia (bypasses Kernel step straight to GDX download)
        await clickChooserElement("button", "Nvidia RTX or GTX");
        await waitTransition();
        const gdxDownload = await getFocusState();
        assert.equal(
          gdxDownload.isBody,
          false,
          "focus must NOT land on body after Nvidia bypass",
        );
        assert.equal(
          gdxDownload.insideChooser,
          true,
          "focus must land inside download step",
        );
        assert.equal(
          gdxDownload.tagName,
          "H3",
          "Download heading must be focused",
        );
        assert.equal(gdxDownload.text, "Ready to Download!");
        assert.equal(
          gdxDownload.announcement,
          "Ready to download Bluefin GDX.",
        );

        // Reset
        await clickChooserElement("button", "Choose a different release");
        await waitTransition();
      },
    );

    // --- 4. MOBILE VIEWPORT ---
    await t.test(
      "mobile viewport preserves focus management on transitions",
      async () => {
        await session.setViewport(375, 667, true);

        // Select Stable
        await clickChooserElement("[role=button]", "RECOMMENDED");
        await waitTransition();
        const mobileArch = await getFocusState();
        assert.equal(
          mobileArch.isBody,
          false,
          "mobile focus must NOT land on body",
        );
        assert.equal(
          mobileArch.insideChooser,
          true,
          "mobile focus must land inside chooser",
        );
        assert.equal(mobileArch.tagName, "H3");

        // Select x86
        await clickChooserElement("button", "x86_64");
        await waitTransition();
        const mobileGpu = await getFocusState();
        assert.equal(mobileGpu.isBody, false);
        assert.equal(mobileGpu.insideChooser, true);
        assert.equal(mobileGpu.tagName, "H3");

        // Reset back to releases
        await clickChooserElement("button", "Back");
        await waitTransition();
        await clickChooserElement("button", "Back to releases");
        await waitTransition();
      },
    );

    // --- 5. PREFERS-REDUCED-MOTION ---
    await t.test(
      "reduced motion preserves focus transitions and announcements",
      async () => {
        await session.setViewport(1280, 800, false);
        await session.setReducedMotion(true);

        // LTS -> ARM direct download under reduced motion
        await clickChooserElement("[role=button]", "Bluefin LTS");
        await waitTransition();
        await clickChooserElement("button", "ARM64");
        await waitTransition();

        const reducedDownload = await getFocusState();
        assert.equal(
          reducedDownload.isBody,
          false,
          "reduced motion focus must NOT land on body",
        );
        assert.equal(reducedDownload.insideChooser, true);
        assert.equal(reducedDownload.tagName, "H3");
        assert.equal(reducedDownload.text, "Ready to Download!");
        assert.equal(
          reducedDownload.announcement,
          "Ready to download Bluefin LTS.",
        );

        // Reset
        await clickChooserElement("button", "Choose a different release");
        await waitTransition();
      },
    );
  } finally {
    if (session) await session.close();
    server.close();
  }
});
