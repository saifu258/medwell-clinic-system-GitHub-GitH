import test from "node:test";
import assert from "node:assert/strict";
import { GOOGLE_AUTH_MESSAGES, createGoogleLoginFlow, routeForGoogleSession } from "../../public/assets/js/googleLoginFlow.js";

const authError = (code) => Object.assign(new Error(code), { code });
const createUser = (events = []) => ({
  uid: "synthetic-google-user",
  async getIdToken(forceRefresh) { events.push(`token:${forceRefresh}`); return "synthetic-id-token"; }
});

const setup = ({ popup, currentUser = null, events = [] } = {}) => {
  const auth = { currentUser };
  let popupCalls = 0;
  const flow = createGoogleLoginFlow({
    auth,
    provider: {},
    persistence: "synthetic-local",
    setPersistence: async () => { events.push("persistence"); },
    signInWithPopup: async () => { popupCalls += 1; events.push("popup"); return popup(); }
  });
  return { auth, flow, popupCalls: () => popupCalls };
};

test("popup success performs authenticated post-login processing", async () => {
  const events = [];
  const user = createUser(events);
  const { flow } = setup({ events, popup: async () => ({ user }) });
  const result = await flow.run(async (authenticatedUser) => { events.push("profile"); return authenticatedUser.uid; });
  assert.equal(result, user.uid);
  assert.deepEqual(events, ["persistence", "popup", "token:true", "profile"]);
});

test("popup-closed without currentUser remains a cancellation error", async () => {
  const { flow } = setup({ popup: async () => { throw authError("auth/popup-closed-by-user"); } });
  await assert.rejects(flow.run(), { code: "auth/popup-closed-by-user" });
  assert.match(GOOGLE_AUTH_MESSAGES["auth/popup-closed-by-user"], /ปิดหน้าต่าง Google/);
});

test("popup-closed with currentUser continues without a false cancellation", async () => {
  const events = [];
  const user = createUser(events);
  const { flow } = setup({ currentUser: user, events, popup: async () => { throw authError("auth/popup-closed-by-user"); } });
  const result = await flow.run(async () => "continued");
  assert.equal(result, "continued");
  assert.deepEqual(events, ["persistence", "popup", "token:true"]);
});

test("cancelled-popup-request with currentUser continues successfully", async () => {
  const user = createUser();
  const { flow } = setup({ currentUser: user, popup: async () => { throw authError("auth/cancelled-popup-request"); } });
  assert.equal(await flow.run(async () => "continued"), "continued");
});

test("popup-blocked remains distinct and tells the user to allow popups", async () => {
  const { flow } = setup({ popup: async () => { throw authError("auth/popup-blocked"); } });
  await assert.rejects(flow.run(), { code: "auth/popup-blocked" });
  assert.match(GOOGLE_AUTH_MESSAGES["auth/popup-blocked"], /อนุญาตป๊อปอัป/);
});

test("repeated calls share one popup and one post-login operation", async () => {
  const user = createUser();
  let releasePopup;
  let postLoginCalls = 0;
  const popupGate = new Promise((resolve) => { releasePopup = resolve; });
  const { flow, popupCalls } = setup({ popup: async () => { await popupGate; return { user }; } });
  const afterAuthentication = async () => { postLoginCalls += 1; return "done"; };
  const first = flow.run(afterAuthentication);
  const second = flow.run(afterAuthentication);
  assert.equal(first, second);
  releasePopup();
  assert.equal(await first, "done");
  assert.equal(await second, "done");
  assert.equal(popupCalls(), 1);
  assert.equal(postLoginCalls, 1);
});

test("forced ID token is obtained before the profile callback", async () => {
  const events = [];
  const user = createUser(events);
  const { flow } = setup({ events, popup: async () => ({ user }) });
  await flow.run(async () => { events.push("profile-api"); });
  assert.ok(events.indexOf("token:true") < events.indexOf("profile-api"));
});

test("ACTIVE_USER honors the API dashboard redirect", () => {
  assert.equal(routeForGoogleSession({ state: "ACTIVE_USER", redirectRoute: "#/dashboard" }), "dashboard");
});

test("ACTIVE_USER honors the API role-review redirect", () => {
  assert.equal(routeForGoogleSession({ state: "ACTIVE_USER", redirectRoute: "#/role-review" }), "role-review");
});

test("NEEDS_ROLE_SELECTION opens role selection", () => {
  assert.equal(routeForGoogleSession({ state: "NEEDS_ROLE_SELECTION" }), "select-role");
});
