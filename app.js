const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const fileInput = document.getElementById("file");
const zoomEl = document.getElementById("zoom");
const zoomText = document.getElementById("zoomText");
const btnDownload = document.getElementById("download");
const btnReset = document.getElementById("reset");
const btnFit = document.getElementById("fit");

const FRAME_SRC = "frame.png"; // আপনার frame.png (একই ফোল্ডারে)

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

frameImg.src = FRAME_SRC;
frameImg.onload = () => draw();
frameImg.onerror = () => alert("frame.png পাওয়া যায়নি। একই ফোল্ডারে frame.png আছে কিনা চেক করুন।");

function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBackground() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawUserImage() {
  if (!userImg) return;

  const cw = canvas.width, ch = canvas.height;
  const iw = userImg.width, ih = userImg.height;

  // cover-fit so no empty gaps
  const coverScale = Math.max(cw / iw, ch / ih);
  const scale = coverScale * zoom;

  const w = iw * scale;
  const h = ih * scale;

  const x = (cw - w) / 2 + offsetX;
  const y = (ch - h) / 2 + offsetY;

  ctx.drawImage(userImg, x, y, w, h);
}

function drawFrame() {
  if (!frameImg.complete) return;
  ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
}

function draw() {
  clear();
  drawBackground();
  drawUserImage();
  drawFrame();
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

zoomEl.addEventListener("input", () => {
  zoom = Number(zoomEl.value);
  zoomText.textContent = `${zoom.toFixed(2)}x`;
  draw();
});

fileInput.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f) return;

  const img = new Image();
  img.onload = () => {
    userImg = img;
    resetAll();
  };
  img.src = URL.createObjectURL(f);
});

btnReset.addEventListener("click", resetAll);
btnFit.addEventListener("click", centerOnly);

btnDownload.addEventListener("click", () => {
  if (!userImg) {
    alert("আগে একটি ছবি আপলোড করুন।");
    return;
  }
  draw();
  const a = document.createElement("a");
  a.download = "dp-frame.png";
  a.href = canvas.toDataURL("image/png");
  a.click();
});

/* ===== Ultra Smooth Drag (Pointer Events) ===== */
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
