import test from "node:test";
import assert from "node:assert/strict";
import { calculateAdjustedBalance } from "../src/services/inventoryService.js";
test("stock adjustment calculates new balance", () => assert.equal(calculateAdjustedBalance(10, -3), 7));
test("stock adjustment rejects negative balance", () => assert.throws(() => calculateAdjustedBalance(2, -3), (error) => error.status === 422));
