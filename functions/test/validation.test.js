import test from "node:test";
import assert from "node:assert/strict";
import { validateCitizenId, generateCode, maskCitizenId, maskPhone, parseJson, thaiDate } from "../src/utils/helpers.js";

test("validateCitizenId accepts a valid Thai citizen ID checksum", () => assert.equal(validateCitizenId("1101700203450"), true));
test("validateCitizenId rejects invalid input", () => assert.throws(() => validateCitizenId("123"), /13 หลัก/));
test("generateCode contains prefix and collision-resistant suffix", () => { const a = generateCode("HN"); const b = generateCode("HN"); assert.match(a, /^HN-\d{6}-[A-F0-9]{4}$/); assert.notEqual(a, b); });
test("masking hides citizen ID and phone", () => { assert.equal(maskCitizenId("1101700203451"), "1-1017-xxxxx-xx-1"); assert.equal(maskPhone("0812345678"), "081-xxx-5678"); });
test("parseJson falls back safely", () => assert.deepEqual(parseJson("not-json"), []));
test("thaiDate returns Thai display format", () => assert.match(thaiDate("2026-08-02T00:00:00.000Z"), /02\/08\/2569/));
