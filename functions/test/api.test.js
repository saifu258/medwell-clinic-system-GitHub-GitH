import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";

test("health endpoint uses standard response", async () => { const server = app.listen(0); try { const { port } = server.address(); const response = await fetch(`http://127.0.0.1:${port}/api/health`); const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.success, true); assert.equal(body.data.service, "medwell-api"); } finally { server.close(); } });
test("protected endpoint rejects missing Firebase token", async () => { const server = app.listen(0); try { const { port } = server.address(); const response = await fetch(`http://127.0.0.1:${port}/api/patients`); const body = await response.json(); assert.equal(response.status, 401); assert.equal(body.error.code, "UNAUTHENTICATED"); } finally { server.close(); } });
