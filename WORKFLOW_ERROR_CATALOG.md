# Workflow Error Catalog

When the `transition_entity_status` function rejects a state change, it returns a standardized error code.

| Error Code | HTTP Status | Description | User Message (Thai) |
| :--- | :--- | :--- | :--- |
| `ERR_INVALID_TRANSITION` | 400 | Attempted to move to a status not allowed from the current state. | สถานะปัจจุบันไม่สามารถเปลี่ยนไปยังสถานะที่ระบุได้ |
| `ERR_UNAUTHORIZED_ACTION` | 403 | User role lacks permission for this state transition. | คุณไม่มีสิทธิ์ในการทำรายการนี้ |
| `ERR_MISSING_FIELDS` | 400 | Required fields for the next state are missing. | กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน |
| `ERR_CONCURRENT_MODIFICATION` | 409 | The record was modified by another user (version mismatch). | ข้อมูลมีการเปลี่ยนแปลงโดยผู้ใช้อื่น กรุณารีเฟรชและลองใหม่ |
| `ERR_MIGRATION_LOCKED` | 403 | Attempted to modify a queue flagged as `migration_review_required`. | ไม่สามารถแก้ไขคิวเก่าได้ ต้องได้รับการตรวจสอบจากผู้ดูแลระบบ |
| `ERR_DEPENDENCY_NOT_MET` | 422 | Cannot proceed (e.g., trying to bill a patient without finalizing treatment). | ไม่สามารถดำเนินการได้ เนื่องจากขั้นตอนก่อนหน้ายังไม่เสร็จสมบูรณ์ |
