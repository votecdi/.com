const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const file = document.getElementById("file");
const zoomEl = document.getElementById("zoom");
const zoomText = document.getElementById("zoomText");
const download = document.getElementById("download");
const reset = document.getElementById("reset");
const fit = document.getElementById("fit");

let currentFrame = "frame1.png";

let userImg = null;
let frameImg = new Image();

let zoom = 1, x = 0, y = 0;

let drag = false, lx = 0, ly = 0, pid = null;

canvas.style.touchAction="none";

frameImg.src=currentFrame;
frameImg.onload=()=>draw();

/* BG Remove */
let segment = new SelfieSegmentation({
locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`
});

segment.setOptions({modelSelection:1,selfieMode:true});

/* Upload + Remove BG */
file.addEventListener("change",e=>{
const f=e.target.files[0];
if(!f) return;

const img=new Image();
img.src=URL.createObjectURL(f);

img.onload=async()=>{

await segment.send({image:img});

segment.onResults(r=>{

const c=document.createElement("canvas");
c.width=img.width;
c.height=img.height;

const cx=c.getContext("2d");

cx.drawImage(img,0,0);
cx.globalCompositeOperation="destination-in";
cx.drawImage(r.segmentationMask,0,0,c.width,c.height);

const out=new Image();
out.onload=()=>{
userImg=out;
resetAll();
};
out.src=c.toDataURL("image/png");

});
};
});

/* Frame Switch */
document.querySelectorAll(".frame").forEach(b=>{
b.onclick=()=>{

document.querySelectorAll(".frame")
.forEach(x=>x.classList.remove("active"));

b.classList.add("active");

currentFrame=b.dataset.f;
frameImg.src=currentFrame;
};
});

/* Zoom */
zoomEl.oninput=()=>{
zoom=+zoomEl.value;
zoomText.textContent=zoom.toFixed(2)+"x";
draw();
};

reset.onclick=resetAll;
fit.onclick=()=>{x=0;y=0;draw();};

/* Download */
download.onclick=()=>{
if(!userImg){alert("Upload photo first");return;}

draw();

const a=document.createElement("a");
a.download="dp.png";
a.href=canvas.toDataURL("image/png");
a.click();
};

/* Draw */
function draw(){

ctx.clearRect(0,0,canvas.width,canvas.height);

ctx.fillStyle="#000";
ctx.fillRect(0,0,canvas.width,canvas.height);

if(userImg){

const cs=Math.max(
canvas.width/userImg.width,
canvas.height/userImg.height
)*zoom;

const w=userImg.width*cs;
const h=userImg.height*cs;

ctx.drawImage(
userImg,
(canvas.width-w)/2+x,
(canvas.height-h)/2+y,
w,h
);
}

ctx.drawImage(frameImg,0,0,canvas.width,canvas.height);
}

function resetAll(){
zoom=1;x=0;y=0;
zoomEl.value=1;
zoomText.textContent="1.00x";
draw();
}

/* Smooth Drag */
function p(e){
const r=canvas.getBoundingClientRect();
return{
x:(e.clientX-r.left)*(canvas.width/r.width),
y:(e.clientY-r.top)*(canvas.height/r.height)
};
}

canvas.onpointerdown=e=>{
if(!userImg)return;

pid=e.pointerId;
canvas.setPointerCapture(pid);

drag=true;

const pt=p(e);
lx=pt.x; ly=pt.y;
};

canvas.onpointermove=e=>{
if(!drag||e.pointerId!==pid)return;

const pt=p(e);

x+=pt.x-lx;
y+=pt.y-ly;

lx=pt.x; ly=pt.y;

draw();
};

canvas.onpointerup=()=>{drag=false;pid=null};
canvas.onpointercancel=()=>{drag=false;pid=null};
