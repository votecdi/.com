const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const fileInput = document.getElementById("file");
const zoomEl = document.getElementById("zoom");
const zoomText = document.getElementById("zoomText");

const qualityEl = document.getElementById("quality");
const qText = document.getElementById("qText");

const btnDownload = document.getElementById("download");
const btnShare = document.getElementById("share");
const btnReset = document.getElementById("reset");
const btnFit = document.getElementById("fit");

const toastEl = document.getElementById("toast");

// ========= Files =========
// frame1.png / frame2.png (transparent hole)
// logo.png (watermark; transparent png recommended)
let currentFrame = "frame1.png";

// ========= State =========
let userImg = null;
let frameImg = new Image();

let zoom = 1;
let offsetX = 0;
let offsetY = 0;

let dragging = false;
let lastX = 0;
let lastY = 0;
let activePointerId = null;

canvas.style.touchAction = "none";

// ========= Toast =========
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.textContent = ""), 2200);
}

// ========= Load Frame =========
frameImg.src = currentFrame;
frameImg.onload = () => drawPreview();
frameImg.onerror = () => toast("Frame লোড হয়নি (ফাইল নাম/পাথ চেক করুন)");

// ========= Load Logo (for export only) =========
const logoImg = new Image();
logoImg.src = "logo.png"; // if missing, watermark will be skipped

// ========= Draw helpers =========
function drawBackground(targetCtx, W, H) {
  targetCtx.fillStyle = "#000";
  targetCtx.fillRect(0, 0, W, H);
}

function drawUser(targetCtx, W, H, scaleFactor) {
  if (!userImg) return;

  const iw = userImg.width, ih = userImg.height;
  const coverScale = Math.max(W / iw, H / ih);
  const scale = coverScale * zoom;

  const w = iw * scale;
  const h = ih * scale;

  const x = (W - w) / 2 + offsetX * scaleFactor;
  const y = (H - h) / 2 + offsetY * scaleFactor;

  targetCtx.drawImage(userImg, x, y, w, h);
}

function drawFrame(targetCtx, W, H) {
  if (!frameImg.complete) return;
  targetCtx.drawImage(frameImg, 0, 0, W, H);
}

// ✅ Preview: user + frame (NO logo)
function renderPreview(targetCtx, outSize) {
  const W = outSize, H = outSize;
  const scaleFactor = outSize / canvas.width;

  targetCtx.clearRect(0, 0, W, H);
  drawBackground(targetCtx, W, H);

  // Transparent-hole frame হলে:
  // user আগে আঁকা → তারপর frame (frame এর hole দিয়ে user দেখা যাবে)
  drawUser(targetCtx, W, H, scaleFactor);
  drawFrame(targetCtx, W, H);
}

function drawPreview() {
  renderPreview(ctx, canvas.width);
}

// ✅ Export: user + frame + logo watermark (ONLY on download/share)
function renderExport(targetCtx, outSize) {
  const W = outSize, H = outSize;
  const scaleFactor = outSize / canvas.width;

  targetCtx.clearRect(0, 0, W, H);
  drawBackground(targetCtx, W, H);

  drawUser(targetCtx, W, H, scaleFactor);
  drawFrame(targetCtx, W, H);

  // Watermark logo bottom-center
  if (logoImg.complete && logoImg.naturalWidth > 0) {
    const size = W * 0.14;                 // logo size
    const x = (W - size) / 2;
    const y = H - size - (W * 0.07);       // bottom margin

    targetCtx.save();
    targetCtx.globalAlpha = 0.95;
    targetCtx.drawImage(logoImg, x, y, size, size);
    targetCtx.restore();
  }
}

// ========= Controls =========
function resetAll() {
  zoom = 1;
  offsetX = 0;
  offsetY = 0;
  zoomEl.value = String(zoom);
  zoomText.textContent = `${zoom.toFixed(2)}x`;
  drawPreview();
}

function centerOnly() {
  offsetX = 0;
  offsetY = 0;
  drawPreview();
}

zoomEl.addEventListener("input", () => {
  zoom = Number(zoomEl.value);
  zoomText.textContent = `${zoom.toFixed(2)}x`;
  drawPreview();
});

qualityEl.addEventListener("change", () => {
  qText.textContent = qualityEl.value;
});

// ========= Upload (NO BG REMOVE) =========
fileInput.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;

  const img = new Image();
  img.onload = () => {
    userImg = img;
    resetAll();
    toast("✅ ছবি লোড হয়েছে");
  };
  img.onerror = () => toast("ছবি লোড হয়নি");
  img.src = URL.createObjectURL(f);
});

// ========= Frame Switch =========
document.querySelectorAll(".frame").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".frame").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");

    currentFrame = b.dataset.f;
    frameImg.src = currentFrame;
    toast("ফ্রেম পরিবর্তন হয়েছে");
  });
});

btnReset.addEventListener("click", resetAll);
btnFit.addEventListener("click", centerOnly);

// ========= Export helpers =========
function exportBlob(size) {
  return new Promise((resolve, reject) => {
    if (!userImg) return reject(new Error("No photo"));

    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const octx = out.getContext("2d");

    renderExport(octx, size);

    out.toBlob((blob) => {
      if (!blob) return reject(new Error("Blob failed"));
      resolve(blob);
    }, "image/png");
  });
}

btnDownload.addEventListener("click", async () => {
  try {
    const size = Number(qualityEl.value || 1080);
    const blob = await exportBlob(size);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `dp-${size}.png`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);

    toast("✅ ডাউনলোড শুরু হয়েছে");
  } catch {
    toast("আগে ছবি আপলোড করুন");
  }
});

btnShare.addEventListener("click", async () => {
  try {
    const size = Number(qualityEl.value || 1080);
    const blob = await exportBlob(size);
    const file = new File([blob], `dp-${size}.png`, { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ title: "DP Maker", text: "DP", files: [file] });
      toast("✅ শেয়ার হয়েছে");
      return;
    }

    // fallback open
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    toast("শেয়ার সাপোর্ট নেই—ছবি ওপেন হয়েছে");
  } catch {
    toast("আগে ছবি আপলোড করুন");
  }
});

// ========= Smooth Drag =========
function getCanvasPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

canvas.addEventListener("pointerdown", (ev) => {
  if (!userImg) return;
  activePointerId = ev.pointerId;
  canvas.setPointerCapture(activePointerId);

  dragging = true;
  const p = getCanvasPoint(ev);
  lastX = p.x;
  lastY = p.y;
});

canvas.addEventListener("pointermove", (ev) => {
  if (!dragging || ev.pointerId !== activePointerId) return;
  const p = getCanvasPoint(ev);

  offsetX += (p.x - lastX);
  offsetY += (p.y - lastY);
  lastX = p.x;
  lastY = p.y;

  drawPreview();
});

function endDrag(ev) {
  if (ev.pointerId !== activePointerId) return;
  dragging = false;
  activePointerId = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

// ========= PWA =========
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
