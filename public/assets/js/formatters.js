export const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
export const formatDate = (value) => value ? new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "-";
export const formatTime = (value) => value ? new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "-";
export const formatDateTime = (value) => value ? `${formatDate(value)} ${formatTime(value)}` : "-";
export const formatMoney = (value = 0) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2 }).format(Number(value));
export const maskCitizenId = (value = "") => {
  const text = String(value ?? "");
  return text.length === 13 ? `${text[0]}-${text.slice(1, 5)}-xxxxx-xx-${text[12]}` : text || "-";
};
export const maskPhone = (value = "") => {
  const text = String(value ?? "");
  return text.length >= 7 ? `${text.slice(0, 3)}-xxx-${text.slice(-4)}` : text || "-";
};
export const statusLabel = (status = "") => ({ waiting: "รอคัดกรอง", screening: "กำลังคัดกรอง", waiting_doctor: "รอพบแพทย์", in_consultation: "กำลังตรวจ", waiting_pharmacy: "รอรับยา", waiting_payment: "รอชำระเงิน", completed: "เสร็จสิ้น", cancelled: "ยกเลิก", scheduled: "นัดหมาย", confirmed: "ยืนยันแล้ว", checked_in: "เช็กอินแล้ว", paid: "ชำระแล้ว", unpaid: "ยังไม่ชำระ", partially_paid: "ชำระบางส่วน", active: "ใช้งาน" }[status] || status || "-");
export const statusClass = (status) => ["completed", "paid", "confirmed", "dispensed"].includes(status) ? "success" : ["cancelled", "void", "disabled"].includes(status) ? "danger" : ["waiting", "unpaid", "waiting_payment"].includes(status) ? "warning" : "info";
