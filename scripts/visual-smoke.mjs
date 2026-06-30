import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = 5173;
const baseUrl = "http://127.0.0.1:" + port + "/";
const artifactsDir = resolve(rootDir, "artifacts");
const chromeBin = process.env.CHROME_BIN ?? "/usr/bin/google-chrome";
const captures = [
  { name: "start", url: baseUrl },
  ...Array.from({ length: 6 }, (_, level) => ({
    name: "level-" + level,
    url: baseUrl + "?smoke=game&level=" + level + "&seed=" + (20260630 + level)
  }))
];

function wait(ms) {
  return new Promise((resolveWait) => {
    setTimeout(resolveWait, ms);
  });
}

async function isServerReady() {
  try {
    const response = await fetch(baseUrl, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await isServerReady()) {
      return;
    }

    await wait(250);
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

function spawnVite() {
  const viteBin = resolve(rootDir, "node_modules", "vite", "bin", "vite.js");

  return spawn(
    process.execPath,
    [viteBin, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
}

function runChrome(capture) {
  if (!existsSync(chromeBin)) {
    throw new Error(
      `Chrome binary not found at ${chromeBin}. Set CHROME_BIN to a headless-capable Chrome/Chromium binary.`
    );
  }

  mkdirSync(artifactsDir, { recursive: true });

  const profileDir = mkdtempSync(resolve(tmpdir(), "nine-purrs-chrome-"));
  const outputPath = resolve(artifactsDir, "visual-smoke-" + capture.name + ".png");
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${profileDir}`,
    "--window-size=1152,648",
    "--virtual-time-budget=2500",
    `--screenshot=${outputPath}`,
    capture.url
  ];

  return new Promise((resolveRun, rejectRun) => {
    const chrome = spawn(chromeBin, args, {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";

    chrome.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    chrome.on("error", rejectRun);
    chrome.on("exit", (code) => {
      rmSync(profileDir, { recursive: true, force: true });

      if (code === 0) {
        resolveRun(outputPath);
        return;
      }

      rejectRun(new Error(`Headless Chrome exited with ${code}.
${stderr}`));
    });
  });
}

function assertScreenshotLooksRendered(outputPath) {
  if (!existsSync(outputPath)) {
    throw new Error(`Screenshot was not created: ${outputPath}`);
  }

  const fileSize = statSync(outputPath).size;

  if (fileSize < 10_000) {
    throw new Error(`Screenshot is suspiciously small: ${fileSize} bytes`);
  }

  const png = PNG.sync.read(readFileSync(outputPath));
  const colors = new Set();

  for (let y = 0; y < png.height; y += 12) {
    for (let x = 0; x < png.width; x += 12) {
      const index = (png.width * y + x) * 4;
      const r = png.data[index];
      const g = png.data[index + 1];
      const b = png.data[index + 2];
      const a = png.data[index + 3];

      if (a > 0) {
        colors.add(`${r},${g},${b}`);
      }
    }
  }

  if (colors.size < 12) {
    throw new Error(`Screenshot looks blank or under-rendered: ${colors.size} sampled colors`);
  }

  return colors.size;
}

let server;

try {
  if (!(await isServerReady())) {
    server = spawnVite();
  }

  await waitForServer();

  for (const capture of captures) {
    const outputPath = await runChrome(capture);
    const colors = assertScreenshotLooksRendered(outputPath);
    console.log(`Visual smoke passed: ${outputPath}`);
    console.log(`Sampled colors: ${colors}`);
  }
} finally {
  if (server) {
    server.kill("SIGTERM");
  }
}
