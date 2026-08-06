import test from "node:test";
import assert from "node:assert/strict";
import { assertTransition } from "../src/utils/helpers.js";
test("valid queue transition passes", () => assert.equal(assertTransition("queue", "waiting", "screening"), true));
test("invalid transition returns conflict", () => assert.throws(() => assertTransition("queue", "waiting", "completed"), (error) => error.status === 409));
test("cancel transition is allowed and reason is checked by service", () => assert.equal(assertTransition("appointment", "confirmed", "cancelled"), true));
