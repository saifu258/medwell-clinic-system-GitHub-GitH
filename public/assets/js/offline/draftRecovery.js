export const DraftRecovery = {
  checkConflict(serverVersion, draftBaseVersion) {
    if (serverVersion === draftBaseVersion) return "SAFE_RESTORE";
    if (serverVersion > draftBaseVersion) return "CONFLICT";
    return "SAFE_RESTORE";
  },

  buildConflictUI(serverUpdatedTime, draftUpdatedTime, onDiscardFnName, onRestoreManualFnName) {
    return `
      <div class="alert alert-warning">
        <strong>พบข้อมูลขัดแย้ง (Version Conflict)</strong><br>
        ข้อมูลบนเซิร์ฟเวอร์มีการเปลี่ยนแปลงขณะที่คุณกำลังทำงานออฟไลน์<br>
        เวลาอัปเดตเซิร์ฟเวอร์: ${new Date(serverUpdatedTime).toLocaleString('th-TH')}<br>
        เวลาอัปเดตแบบร่าง: ${new Date(draftUpdatedTime).toLocaleString('th-TH')}<br>
        <div class="mt-2">
            <button class="btn btn-sm btn-outline-danger" onclick="${onDiscardFnName}()">ละทิ้งแบบร่าง</button>
            <button class="btn btn-sm btn-primary" onclick="${onRestoreManualFnName}()">ดูแบบร่างเพื่อรวมข้อมูลด้วยตนเอง</button>
        </div>
      </div>
    `;
  }
};
