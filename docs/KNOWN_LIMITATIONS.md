# Known Limitations

Google Sheets เหมาะกับคลินิกสาขาเดียวและจำนวนผู้ใช้พร้อมกันไม่มาก ไม่มี Transaction/locking แบบฐานข้อมูลเชิงสัมพันธ์. ระบบลดความเสี่ยงด้วย UUID, updatedAt, idempotency, batch-oriented repository และ validation แต่ยังควร Reconcile Stock/Payment เป็นประจำ.

Polling คิวทุก 20 วินาทีไม่ใช่ real-time ทันที. รายงานชุดใหญ่และการค้นหาหลายหมื่นแถวจะช้าลงตามขนาดชีต. ไม่มี Multi-branch, Claim, IPD, PACS, Lab device integration, Smart Card, Native app หรือ Microservices.

เมื่อข้อมูลโตหรือ concurrency สูง ควรย้าย Repository ไป PostgreSQL/Firestore/Supabase โดยคง Service/API contract เดิม.
