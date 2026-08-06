import { apiGet, apiPost, apiPut } from "../api.js";
import { escapeHtml, formatTime, statusLabel } from "../formatters.js";
import { badge, pageHeader, loadingState, errorState, wireCommonActions } from "../components/ui.js";
import { toast } from "../notifications.js";
import { can } from "../permissions.js";

const POLL_INTERVAL = 20_000;
let pollTimer = null;
let requestController = null;
let mounted = false;
let loading = false;
let currentRoot = null;
let visibilityHandler = null;

function stopTimer() { if (pollTimer) clearTimeout(pollTimer); pollTimer = null; }
function onQueueRoute() { return location.hash.replace(/^#\/?/, "").split("?")[0] === "queue"; }
function isCurrent(root) { return mounted && currentRoot === root && root.isConnected && onQueueRoute(); }

function schedule(root, delay = POLL_INTERVAL) {
  stopTimer();
  if (!isCurrent(root) || document.hidden) return;
  pollTimer = setTimeout(() => load(root, { showLoading: false }), delay);
}

function queueMarkup(queues) {
  const canWriteQueue = can("queues.write");
  const canOpenVisit = can("visits.write");
  return `<div class="queue-board">${queues.length ? queues.map((q) => `<article class="card queue-card ${q.currentStatus === "in_consultation" ? "current" : ""}"><div class="gap" style="justify-content:space-between"><span class="queue-number">${escapeHtml(q.queueNumber)}</span>${badge(q.currentStatus)}</div><h3>${escapeHtml(q.patientName || `${q.patients?.firstName || ""} ${q.patients?.lastName || ""}`.trim() || q.patientId)}</h3><p class="subtle">เช็กอิน ${formatTime(q.checkInTime)} · ${statusLabel(q.currentStatus)}</p><div class="gap">${canWriteQueue ? `<button class="btn btn-secondary btn-sm" type="button" data-call="${q.queueId}"><i data-lucide="volume-2"></i> เรียก</button>` : ""}${canWriteQueue && q.currentStatus === "waiting" ? `<button class="btn btn-primary btn-sm" type="button" data-next="${q.queueId}" data-status="screening">คัดกรอง</button>` : ""}${canOpenVisit && q.currentStatus === "waiting_doctor" ? `<a class="btn btn-primary btn-sm" href="#/doctor?queueId=${q.queueId}&patientId=${q.patientId}">เข้าห้องตรวจ</a>` : ""}</div></article>`).join("") : `<section class="card empty-state"><i data-lucide="list-ordered"></i><h3>ยังไม่มีคิววันนี้</h3></section>`}</div>`;
}

function wireQueueActions(root) {
  root.querySelectorAll("[data-call]").forEach((button) => button.addEventListener("click", async () => {
    if (button.disabled) return; button.disabled = true;
    try { await apiPost(`/queues/${button.dataset.call}/call`, {}); toast("เรียกคิวแล้ว"); await load(root, { showLoading: false }); }
    catch (error) { toast(error.message, "error"); }
    finally { if (button.isConnected) button.disabled = false; }
  }));
  root.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", async () => {
    if (button.disabled) return; button.disabled = true;
    try { await apiPut(`/queues/${button.dataset.next}/status`, { status: button.dataset.status }); location.hash = `#/screening?queueId=${button.dataset.next}`; }
    catch (error) { toast(error.message, "error"); if (button.isConnected) button.disabled = false; }
  }));
}

async function load(root, { showLoading = false } = {}) {
  if (!isCurrent(root) || loading) return;
  loading = true; stopTimer();
  requestController?.abort(); requestController = new AbortController();
  if (showLoading) root.innerHTML = pageHeader("คิววันนี้", "อัปเดตอัตโนมัติทุก 20 วินาที") + loadingState();
  try {
    const queues = await apiGet("/queues/today", { signal: requestController.signal });
    if (!isCurrent(root)) return;
    const updatedAt = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
    root.innerHTML = pageHeader("คิววันนี้", `ทั้งหมด ${queues.length} คิว · อัปเดตล่าสุด ${updatedAt}`, can("queues.write") ? `<a class="btn btn-primary" href="#/patients"><i data-lucide="log-in"></i> รับผู้ป่วย</a>` : "") + queueMarkup(queues);
    wireQueueActions(root);
    wireCommonActions(root, () => load(root, { showLoading: false }));
  } catch (error) {
    if (!isCurrent(root) || requestController.signal.aborted) return;
    root.innerHTML = pageHeader("คิววันนี้") + errorState(error.message);
    wireCommonActions(root, () => load(root, { showLoading: true }));
  } finally {
    loading = false;
    if (isCurrent(root)) schedule(root);
  }
}

export async function render(root) {
  await cleanup();
  mounted = true; currentRoot = root;
  visibilityHandler = () => { if (document.hidden) stopTimer(); else if (isCurrent(root)) load(root, { showLoading: false }); };
  document.addEventListener("visibilitychange", visibilityHandler);
  await load(root, { showLoading: true });
}

export async function cleanup() {
  mounted = false; loading = false; stopTimer();
  requestController?.abort(); requestController = null;
  if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
  visibilityHandler = null; currentRoot = null;
}
