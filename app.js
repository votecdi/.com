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

// ===== State =====
let currentFrame = "frame1.png";
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

// ===== Toast =====
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.textContent = ""), 2200);
}

// ===== Frame load =====
frameImg.src = currentFrame;
frameImg.onload = () => draw();
frameImg.onerror = () => toast("Frame লোড হয়নি (ফাইল নাম/পাথ চেক করুন)");

// ===== BG Remove (Free, stable) =====
const segmenter = new SelfieSegmentation({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
});
segmenter.setOptions({ modelSelection: 1, selfieMode: true });

// ===== Draw helpers =====
function drawBackground(targetCtx, W, H) {
  targetCtx.fillStyle = "#000";
  targetCtx.fillRect(0, 0, W, H);
}

function drawFrame(targetCtx, W, H) {
  if (!frameImg.complete) return;
  targetCtx.drawImage(frameImg, 0, 0, W, H);
}

// User photo (transparent bg already) — Frame stays visible depending on order
function drawUserImage(targetCtx, W, H, scaleFactor) {
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

function renderToContext(targetCtx, outSize) {
  const W = outSize, H = outSize;
  const scaleFactor = outSize / canvas.width;

  targetCtx.clearRect(0, 0, W, H);
  drawBackground(targetCtx, W, H);

  // 🔁 Order:
  // If you want user on top of frame -> drawFrame first then drawUserImage
  // If you want frame on top -> drawUserImage first then drawFrame
  // (আপনার আগের পছন্দ অনুযায়ী: Frame background, user on top)
  drawFrame(targetCtx, W, H);
  drawUserImage(targetCtx, W, H, scaleFactor);
}

function draw() {
  renderToContext(ctx, canvas.width);
}

function resetAll() {
  zoom = 1;
  offsetX = 0;
  offsetY = 0;
  zoomEl.value = String(zoom);
  zoomText.textContent = `${zoom.toFixed(2)}x`;
  draw();
}

function centerOnly() {
  offsetX = 0;
  offsetY = 0;
  draw();
}

// ===== Zoom =====
zoomEl.addEventListener("input", () => {
  zoom = Number(zoomEl.value);
  zoomText.textContent = `${zoom.toFixed(2)}x`;
  draw();
});

// ===== Quality =====
qualityEl.addEventListener("change", () => {
  qText.textContent = qualityEl.value;
});

// ===== Upload + Remove BG (stable transparent cutout) =====
fileInput.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;

  toast("ব্যাকগ্রাউন্ড রিমুভ হচ্ছে...");

  const img = new Image();
  img.onload = async () => {
    // set results handler for THIS image
    segmenter.onResults((res) => {
      const mask = res.segmentationMask;

      const cut = document.createElement("canvas");
      cut.width = img.width;
      cut.height = img.height;

      const cctx = cut.getContext("2d");
      cctx.drawImage(img, 0, 0);

      // Transparent background
      cctx.globalCompositeOperation = "destination-in";
      cctx.drawImage(mask, 0, 0, img.width, img.height);

      const finalImg = new Image();
      finalImg.onload = () => {
        userImg = finalImg;
        resetAll();
        toast("✅ রেডি!");
      };
      finalImg.src = cut.toDataURL("image/png");
    });

    try {
      await segmenter.send({ image: img });
    } catch {
      toast("BG remove failed");
    }
  };
  img.src = URL.createObjectURL(f);
});

// ===== Frame Switch =====
document.querySelectorAll(".frame").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".frame").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");

    currentFrame = b.dataset.f;
    frameImg.src = currentFrame;
    toast("ফ্রেম পরিবর্তন হয়েছে");
  });
});

// ===== Buttons =====
btnReset.addEventListener("click", resetAll);
btnFit.addEventListener("click", centerOnly);

// ===== Export helper (HD/Ultra) =====
function exportCanvasBlob(size) {
  return new Promise((resolve, reject) => {
    if (!userImg) return reject(new Error("No photo"));

    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const octx = out.getContext("2d");

    renderToContext(octx, size);

    out.toBlob((blob) => {
      if (!blob) return reject(new Error("Blob failed"));
      resolve(blob);
    }, "image/png");
  });
}

btnDownload.addEventListener("click", async () => {
  try {
    const size = Number(qualityEl.value || 1080);
    const blob = await exportCanvasBlob(size);

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

// ===== Share =====
btnShare.addEventListener("click", async () => {
  try {
    const size = Number(qualityEl.value || 1080);
    const blob = await exportCanvasBlob(size);
    const file = new File([blob], `dp-${size}.png`, { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ title: "DP Maker", text: "My DP", files: [file] });
      toast("✅ শেয়ার হয়েছে");
      return;
    }

    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    toast("শেয়ার সাপোর্ট নেই—ছবি ওপেন হয়েছে");
  } catch {
    toast("আগে ছবি আপলোড করুন");
  }
});

// ===== Ultra Smooth Drag (Pointer Events) =====
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
  draw();
});

function endDrag(ev) {
  if (ev.pointerId !== activePointerId) return;
  dragging = false;
  activePointerId = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

// ===== PWA Service Worker register =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
