import test from "node:test";
import assert from "node:assert/strict";
import { calculateInvoice } from "../src/services/billingService.js";
test("invoice calculation handles item discount, invoice discount and tax", () => assert.deepEqual(calculateInvoice([{ quantity: 2, unitPrice: 100, discount: 10 }, { quantity: 1, unitPrice: 50 }], 20, 7), { subtotal: 240, discount: 20, tax: 7, grandTotal: 227, paidAmount: 0, balance: 227 }));
test("grand total never becomes negative", () => assert.equal(calculateInvoice([{ quantity: 1, unitPrice: 10 }], 100).grandTotal, 0));
