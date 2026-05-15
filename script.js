const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const sound = document.getElementById("sound");

let clonesTriggered = false;
let cloneStartTime = null;
let mask = null;
let gestureLocked = false;

// Set sound source (using Junsu.mp3 from parent folder)
sound.src = "../Junsu.mp3";

// ----------------------
// Gesture detection (hand distance-based)
// ----------------------
// Simple gesture: detect hands close together
function predictGesture(right, left, threshold = 0.15) {
  if (!right || !left) return false;

  const distance = Math.sqrt(
    (right[8].x - left[8].x) ** 2 +
      (right[8].y - left[8].y) ** 2 +
      (right[8].z - left[8].z) ** 2,
  );

  const confidenceEl = document.querySelector(".confidence");
  if (confidenceEl)
    confidenceEl.textContent = ((1 - distance) * 100).toFixed(1) + "%";

  return distance < threshold;
}

// ----------------------
// Custom clones - Circular layout for beautiful positioning
// ----------------------
const customClones = [
  // Center/main position
  { x: 0, y: 0, scale: 1, delay: 800, smokeSpawned: false },

  // First ring - close around
  { x: -120, y: -80, scale: 0.85, delay: 1000, smokeSpawned: false },
  { x: 120, y: -80, scale: 0.85, delay: 1100, smokeSpawned: false },
  { x: -140, y: 60, scale: 0.8, delay: 1200, smokeSpawned: false },
  { x: 140, y: 60, scale: 0.8, delay: 1300, smokeSpawned: false },

  // Second ring - medium distance
  { x: -200, y: -120, scale: 0.7, delay: 1400, smokeSpawned: false },
  { x: 200, y: -120, scale: 0.7, delay: 1500, smokeSpawned: false },
  { x: -220, y: 100, scale: 0.7, delay: 1600, smokeSpawned: false },
  { x: 220, y: 100, scale: 0.7, delay: 1700, smokeSpawned: false },

  // Third ring - far distance
  { x: -280, y: -60, scale: 0.6, delay: 1800, smokeSpawned: false },
  { x: 280, y: -60, scale: 0.6, delay: 1900, smokeSpawned: false },
  { x: -300, y: 140, scale: 0.6, delay: 2000, smokeSpawned: false },
  { x: 300, y: 140, scale: 0.6, delay: 2100, smokeSpawned: false },

  // Additional clones for density
  { x: -160, y: -160, scale: 0.55, delay: 2200, smokeSpawned: false },
  { x: 160, y: -160, scale: 0.55, delay: 2300, smokeSpawned: false },
  { x: 0, y: -200, scale: 0.5, delay: 2400, smokeSpawned: false },
  { x: -120, y: 150, scale: 0.55, delay: 2500, smokeSpawned: false },
];

// ----------------------
// Selfie Segmentation
// ----------------------
const selfie = new SelfieSegmentation({
  locateFile: (f) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`,
});
selfie.setOptions({ modelSelection: 1 });
selfie.onResults((r) => (mask = r.segmentationMask));

// ----------------------
// Holistic
// ----------------------
const holistic = new Holistic({
  locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${f}`,
});
holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
});

// ----------------------
// Camera set up
// ----------------------
const camera = new Camera(video, {
  width: 640,
  height: 480,
  onFrame: async () => {
    await selfie.send({ image: video });
    await holistic.send({ image: video });
  },
});
camera.start();

// ----------------------
// adding the smoke sprites
// ----------------------
const SMOKE_FOLDERS = ["smoke_1", "smoke_2", "smoke_3"];
const SMOKE_FRAME_COUNT = 5;
const SMOKE_DURATION = 600;
const activeSmokes = [];

function spawnSmoke(x, y, scale) {
  scale *= 1.2;
  const folder =
    SMOKE_FOLDERS[Math.floor(Math.random() * SMOKE_FOLDERS.length)];

  const frames = [];
  for (let i = 1; i <= SMOKE_FRAME_COUNT; i++) {
    const img = new Image();
    img.src = `assets/${folder}/${i}.png`;
    frames.push(img);
  }

  activeSmokes.push({ x, y, scale, start: performance.now(), frames });
}

function drawSmokes() {
  const now = performance.now();
  for (let i = activeSmokes.length - 1; i >= 0; i--) {
    const s = activeSmokes[i];
    const elapsed = now - s.start;
    const frameDuration = SMOKE_DURATION / SMOKE_FRAME_COUNT;
    const frameIndex = Math.floor(elapsed / frameDuration);

    if (frameIndex >= s.frames.length) {
      activeSmokes.splice(i, 1);
      continue;
    }

    const img = s.frames[frameIndex];
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.scale, s.scale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }
}

// ----------------------
// Results on loop
// ----------------------
holistic.onResults((res) => {
  if (!mask) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw live webcam as background
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const person = grabPerson();
  const isCloseGesture = predictGesture(
    res.rightHandLandmarks,
    res.leftHandLandmarks,
  );

  if (isCloseGesture && !gestureLocked) {
    gestureLocked = true;
    if (!clonesTriggered) {
      startClones();
    } else {
      resetClones();
    }
  } else if (!isCloseGesture) {
    gestureLocked = false;
  }

  // Spawn smoke independently for each clone
  if (clonesTriggered) {
    const now = performance.now();
    customClones.forEach((cl) => {
      if (!cl.smokeSpawned && now - cloneStartTime >= cl.delay) {
        cl.smokeSpawned = true;
        const centerX = cl.x + canvas.width / 2;
        const centerY = cl.y + canvas.height / 2 - 40;
        spawnSmoke(centerX - 15, centerY, cl.scale);
        spawnSmoke(centerX + 15, centerY, cl.scale);
      }
    });

    toggleImage();
    drawClones(person);
    drawSmokes();
  } else {
    ctx.drawImage(person, 0, 0);
  }

  if (res.rightHandLandmarks) drawFingerSkeleton(res.rightHandLandmarks);
  if (res.leftHandLandmarks) drawFingerSkeleton(res.leftHandLandmarks);
});

// ----------------------
// draw clones function
// ----------------------
function drawClones(person) {
  const now = performance.now();
  const sorted = [...customClones].sort((a, b) => b.delay - a.delay);

  sorted.forEach((cl) => {
    if (now - cloneStartTime >= cl.delay) {
      ctx.save();
      ctx.translate(cl.x + (canvas.width * (1 - cl.scale)) / 2, cl.y);
      ctx.scale(cl.scale, cl.scale);
      ctx.drawImage(person, 0, 0);
      ctx.restore();
    }
  });

  ctx.drawImage(person, 0, 0); // main person always on top
}

// ----------------------
// grab person helper function
// ----------------------
function grabPerson() {
  const offscreen = document.createElement("canvas");
  offscreen.width = canvas.width;
  offscreen.height = canvas.height;
  const tempCtx = offscreen.getContext("2d");

  tempCtx.drawImage(mask, 0, 0, canvas.width, canvas.height);
  tempCtx.globalCompositeOperation = "source-in";
  tempCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
  tempCtx.globalCompositeOperation = "source-over";

  return offscreen;
}

// ----------------------
// finger skeelton
// ----------------------
const FINGER_INDICES = {
  thumb: [0, 1, 2, 3, 4],
  index: [0, 5, 6, 7, 8],
  middle: [0, 9, 10, 11, 12],
  ring: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
};

function drawFingerSkeleton(lm) {
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;

  for (const indices of Object.values(FINGER_INDICES)) {
    ctx.beginPath();
    indices.forEach((i, idx) => {
      const x = lm[i].x * canvas.width;
      const y = lm[i].y * canvas.height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  lm.forEach((point) => {
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, Math.PI * 2);
    ctx.fillStyle = "red";
    ctx.fill();
  });
}

// ----------------------
// Hand image toggle
// ----------------------
function setOverlayState(state) {
  const img = document.getElementById("overlayImg");
  const btn = img.closest(".video-overlay-btn");

  if (img.dataset.state === state) return;

  img.dataset.state = state;
  img.src = state === "2" ? "assets/state-2.png" : "assets/state-1.png";

  if (state === "2") {
    btn.classList.add("pop");
    setTimeout(() => btn.classList.remove("pop"), 200);
  }
}

function toggleImage() {
  setOverlayState("2");
}

function startClones() {
  clonesTriggered = true;
  cloneStartTime = performance.now();
  customClones.forEach((cl) => (cl.smokeSpawned = false));
  activeSmokes.length = 0;
  console.log("CLONE TRIGGERED");
  playSound();
  setOverlayState("2");
}

function resetClones() {
  clonesTriggered = false;
  cloneStartTime = null;
  customClones.forEach((cl) => (cl.smokeSpawned = false));
  activeSmokes.length = 0;
  console.log("CLONES RESET");
  setOverlayState("1");
}

function playSound() {
  if (sound && sound.src) {
    sound.currentTime = 0;
    sound.play().catch((e) => console.log("Sound play blocked:", e));
  }
}

// ----------------------
// Reset everything on load
// ----------------------
window.onload = () => {
  clonesTriggered = false;
  cloneStartTime = null;
};

// ----------------------
// Backup: Click/Touch to trigger clones
// ----------------------
canvas.addEventListener("click", () => {
  if (!clonesTriggered) {
    startClones();
  }
});

canvas.addEventListener("touchstart", () => {
  if (!clonesTriggered) {
    startClones();
  }
});

// Double-click to reset
canvas.addEventListener("dblclick", () => {
  resetClones();
});
