import assert from "node:assert/strict";
import test from "node:test";

import { maskCitizenId, maskPhone } from "../../public/assets/js/formatters.js";

test("nullable patient identifiers render as an empty-state marker", () => {
  assert.equal(maskCitizenId(null), "-");
  assert.equal(maskPhone(null), "-");
  assert.equal(maskCitizenId(undefined), "-");
  assert.equal(maskPhone(undefined), "-");
});

test("patient identifiers remain masked", () => {
  assert.equal(maskCitizenId("1234567890123"), "1-2345-xxxxx-xx-3");
  assert.equal(maskPhone("0812345678"), "081-xxx-5678");
});
