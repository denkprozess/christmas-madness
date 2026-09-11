const invites = Object.freeze({
  uBs00foSFHQwNuDQ: { giver: "Daniel", recipient: "Timon" },
  "ka1-2UssmdYvR0A3": { giver: "Angela", recipient: "Denise" },
  "GRiP-k9VTQj5SUav": { giver: "Nina", recipient: "Angela" },
  x3JBEwn72RdOcxLt: { giver: "Denise", recipient: "Petra" },
  aClBCRmhjjs1dbQd: { giver: "Timon", recipient: "Torben" },
  EyGbYqCUyS5_JHQh: { giver: "Petra", recipient: "Anni" },
  tRmYE3NzFVDrtihI: { giver: "Torben", recipient: "Nina" },
  RUO3OXMaiPhuleY9: { giver: "Anni", recipient: "Daniel" },
});

const token = decodeURIComponent(location.hash.replace(/^#\/?(?:einladung\/)?/, ""));
const invite = invites[token];
const greeting = document.querySelector("#greeting");
const intro = document.querySelector("#intro");
const scratchStage = document.querySelector("#scratchStage");
const invalidState = document.querySelector("#invalidState");
const scratchCanvas = document.querySelector("#scratchCanvas");
const scratchHelp = document.querySelector("#scratchHelp");
const invitation = document.querySelector("#invitation");

let scratchContext;
let canvasScale = 1;
let isScratching = false;
let isRevealed = false;
let lastPoint = null;
let coverageCells = [];
let coveredCells = 0;
const coverageColumns = 22;
const coverageRows = 9;
const revealThreshold = 0.62;

if (invite) {
  document.title = `Hallo ${invite.giver} · Familienwichteln 2026`;
  greeting.textContent = `Hallo, ${invite.giver}.`;
  intro.textContent = "Dein Weihnachtslos liegt bereit. Dahinter wartet der Name der Person, die du dieses Jahr beschenkst.";
  document.querySelector("#recipient").textContent = invite.recipient;
  scratchStage.hidden = false;
  const wasAlreadyRevealed = readRevealState();

  if (wasAlreadyRevealed) {
    intro.textContent = "Schön, dass du wieder da bist. Dein Weihnachtslos ist bereits geöffnet.";
    showResult({ celebrate: false, remembered: true });
  } else {
    requestAnimationFrame(prepareScratchCover);
  }
} else {
  greeting.textContent = "Oh, du bist zu früh.";
  intro.textContent = "Zu dieser Einladung fehlt noch ein kleines Stück Weihnachtszauber.";
  invalidState.hidden = false;
}

requestAnimationFrame(() => invitation.classList.add("is-ready"));

function prepareScratchCover() {
  const bounds = scratchCanvas.getBoundingClientRect();
  canvasScale = Math.min(window.devicePixelRatio || 1, 2);
  scratchCanvas.width = Math.round(bounds.width * canvasScale);
  scratchCanvas.height = Math.round(bounds.height * canvasScale);

  scratchContext = scratchCanvas.getContext("2d", { willReadFrequently: false });
  scratchContext.scale(canvasScale, canvasScale);
  const gradient = scratchContext.createLinearGradient(0, 0, bounds.width, bounds.height);
  gradient.addColorStop(0, "#b48531");
  gradient.addColorStop(0.45, "#f8da8a");
  gradient.addColorStop(0.72, "#c99b42");
  gradient.addColorStop(1, "#8c6726");
  scratchContext.fillStyle = gradient;
  scratchContext.fillRect(0, 0, bounds.width, bounds.height);

  const shine = scratchContext.createLinearGradient(0, 0, bounds.width, 0);
  shine.addColorStop(0, "rgba(255,255,255,0)");
  shine.addColorStop(0.46, "rgba(255,255,255,.22)");
  shine.addColorStop(0.54, "rgba(255,255,255,.05)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  scratchContext.fillStyle = shine;
  scratchContext.fillRect(0, 0, bounds.width, bounds.height);

  scratchContext.save();
  scratchContext.globalAlpha = 0.14;
  for (let index = 0; index < 520; index += 1) {
    const size = Math.random() * 1.8 + 0.3;
    scratchContext.fillStyle = Math.random() > 0.48 ? "#fff6d3" : "#52380f";
    scratchContext.fillRect(Math.random() * bounds.width, Math.random() * bounds.height, size, size);
  }
  scratchContext.restore();

  scratchContext.fillStyle = "rgba(69, 39, 7, .82)";
  scratchContext.textAlign = "center";
  scratchContext.textBaseline = "middle";
  scratchContext.font = "700 13px Inter, system-ui, sans-serif";
  scratchContext.letterSpacing = "3px";
  scratchContext.fillText("FREIRUBBELN", bounds.width / 2, bounds.height / 2 - 7);
  scratchContext.fillStyle = "rgba(69, 39, 7, .58)";
  scratchContext.font = "500 11px Inter, system-ui, sans-serif";
  scratchContext.fillText("✦  ✦  ✦", bounds.width / 2, bounds.height / 2 + 22);

  coverageCells = Array.from({ length: coverageColumns * coverageRows }, () => false);
  scratchCanvas.addEventListener("pointerdown", startScratch);
  scratchCanvas.addEventListener("pointermove", continueScratch);
  scratchCanvas.addEventListener("pointerup", stopScratch);
  scratchCanvas.addEventListener("pointercancel", stopScratch);
  scratchCanvas.addEventListener("pointerleave", stopScratch);
  scratchCanvas.addEventListener("keydown", handleScratchKey);
}

function getCanvasPoint(event) {
  const bounds = scratchCanvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
    y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
  };
}

function startScratch(event) {
  if (isRevealed) return;
  event.preventDefault();
  isScratching = true;
  lastPoint = getCanvasPoint(event);
  scratchCanvas.setPointerCapture?.(event.pointerId);
  const shouldReveal = scratchAt(lastPoint, lastPoint);
  if (shouldReveal) finishScratchAndReveal(event);
}

function continueScratch(event) {
  if (!isScratching || isRevealed) return;
  event.preventDefault();
  const point = getCanvasPoint(event);
  const shouldReveal = scratchAt(lastPoint, point);
  lastPoint = point;
  if (shouldReveal) finishScratchAndReveal(event);
}

function stopScratch(event) {
  if (!isScratching) return;
  isScratching = false;
  lastPoint = null;
  if (event?.pointerId !== undefined && scratchCanvas.hasPointerCapture?.(event.pointerId)) {
    scratchCanvas.releasePointerCapture(event.pointerId);
  }
}

function finishScratchAndReveal(event) {
  // iOS Safari can flicker when a transformed canvas still owns the active
  // pointer. End the gesture first, then start the reveal animation.
  stopScratch(event);
  requestAnimationFrame(() => showResult({ celebrate: true }));
}

function scratchAt(from, to) {
  const bounds = scratchCanvas.getBoundingClientRect();
  const brushSize = Math.max(34, Math.min(58, bounds.width * 0.12));

  scratchContext.save();
  scratchContext.globalCompositeOperation = "destination-out";
  scratchContext.lineCap = "round";
  scratchContext.lineJoin = "round";
  scratchContext.lineWidth = brushSize;
  scratchContext.beginPath();
  scratchContext.moveTo(from.x, from.y);
  scratchContext.lineTo(to.x, to.y);
  scratchContext.stroke();
  scratchContext.restore();

  return markCoverage(from, to, brushSize / 2, bounds);
}

function markCoverage(from, to, radius, bounds) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / Math.max(radius * 0.45, 8)));

  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const x = from.x + (to.x - from.x) * progress;
    const y = from.y + (to.y - from.y) * progress;

    for (let row = 0; row < coverageRows; row += 1) {
      for (let column = 0; column < coverageColumns; column += 1) {
        const index = row * coverageColumns + column;
        if (coverageCells[index]) continue;

        const cellX = ((column + 0.5) / coverageColumns) * bounds.width;
        const cellY = ((row + 0.5) / coverageRows) * bounds.height;
        if (Math.hypot(cellX - x, cellY - y) <= radius) {
          coverageCells[index] = true;
          coveredCells += 1;
        }
      }
    }
  }

  const coverage = coveredCells / coverageCells.length;
  if (coverage > 0.16 && coverage < revealThreshold) {
    scratchHelp.querySelector("span:last-child").textContent = "Weiter so – gleich ist es so weit";
  }
  return coverage >= revealThreshold;
}

function handleScratchKey(event) {
  if ((event.key === "Enter" || event.key === " ") && !isRevealed) {
    event.preventDefault();
    showResult({ celebrate: true });
  }
}

function showResult({ celebrate, remembered = false }) {
  if (isRevealed) return;
  isRevealed = true;
  stopScratch();
  scratchStage.classList.add("is-revealed");
  scratchCanvas.setAttribute("aria-hidden", "true");
  scratchCanvas.tabIndex = -1;
  document.querySelectorAll(".reveal-card > p, .reveal-card > strong, .reveal-card > span")
    .forEach((element) => element.removeAttribute("aria-hidden"));
  document.querySelector("#resultAnnouncement").textContent = `Du beschenkst ${invite.recipient}.`;
  scratchHelp.innerHTML = remembered
    ? '<span class="scratch-help__gesture" aria-hidden="true">✦</span><span>Dein Los ist bereits geöffnet</span>'
    : '<span class="scratch-help__gesture" aria-hidden="true">✦</span><span>Dein Wichtel wurde enthüllt</span>';

  if (!remembered) writeRevealState();
  if (celebrate) launchConfetti();

  if (remembered) {
    scratchCanvas.hidden = true;
  } else {
    window.setTimeout(() => {
      scratchCanvas.hidden = true;
    }, 850);
  }
}

function storageKey() {
  return `familienwichteln-2026:${token}`;
}

function cookieName() {
  return `wichteln_${token.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function readRevealState() {
  try {
    if (localStorage.getItem(storageKey()) === "revealed") return true;
  } catch {
    // Private browsing can block local storage; the cookie remains as fallback.
  }

  return document.cookie
    .split(";")
    .some((part) => part.trim() === `${cookieName()}=revealed`);
}

function writeRevealState() {
  try {
    localStorage.setItem(storageKey(), "revealed");
  } catch {
    // The invitation still works when local storage is unavailable.
  }

  document.cookie = `${cookieName()}=revealed; Max-Age=31536000; Path=/; SameSite=Strict; Secure`;
}

function launchConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const container = document.querySelector("#confetti");
  const colors = ["#f8d98d", "#fff4ce", "#a92e42", "#2c7a60", "#d6a53e"];
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 36; index += 1) {
    const piece = document.createElement("i");
    piece.style.setProperty("--x", `${38 + Math.random() * 24}vw`);
    piece.style.setProperty("--dx", `${-180 + Math.random() * 360}px`);
    piece.style.setProperty("--delay", `${Math.random() * 0.18}s`);
    piece.style.setProperty("--duration", `${1.35 + Math.random() * 0.75}s`);
    piece.style.setProperty("--turn", `${180 + Math.random() * 720}deg`);
    piece.style.setProperty("--color", colors[index % colors.length]);
    fragment.append(piece);
  }

  container.replaceChildren(fragment);
  window.setTimeout(() => container.replaceChildren(), 2600);
}

function createSnow() {
  const container = document.querySelector("#snow");
  const fragment = document.createDocumentFragment();

  const snowflakeCount = window.matchMedia("(max-width: 600px)").matches ? 20 : 32;

  for (let index = 0; index < snowflakeCount; index += 1) {
    const flake = document.createElement("i");
    flake.style.setProperty("--x", `${Math.random() * 100}vw`);
    flake.style.setProperty("--size", `${2 + Math.random() * 4}px`);
    flake.style.setProperty("--duration", `${10 + Math.random() * 15}s`);
    flake.style.setProperty("--delay", `${Math.random() * -20}s`);
    flake.style.setProperty("--drift", `${-45 + Math.random() * 90}px`);
    fragment.append(flake);
  }

  container.append(fragment);
}

createSnow();

window.addEventListener("hashchange", () => location.reload());
