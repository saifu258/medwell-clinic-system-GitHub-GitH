import test from "node:test";
import assert from "node:assert/strict";
import { hasPermission } from "../src/permissions/permissions.js";
test("admin has all permissions", () => assert.equal(hasPermission({ roles: ["admin"], permissions: [] }, "inventory.adjust"), true));
test("role permission is enforced", () => { assert.equal(hasPermission({ roles: ["nurse"], permissions: [] }, "screenings.write"), true); assert.equal(hasPermission({ roles: ["nurse"], permissions: [] }, "billing.write"), false); });
test("additional permission is supported", () => assert.equal(hasPermission({ roles: [], permissions: ["reports.export"] }, "reports.export"), true));
