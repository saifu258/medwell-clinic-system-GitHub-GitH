import { createRemoteJWKSet, jwtVerify } from "jose";

const firebaseProjectId = "medwell-clinic-system";
const firebaseKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export type FirebaseUser = { uid: string; email: string; name?: string; picture?: string; provider?: string };

export async function verifyFirebaseRequest(request: Request): Promise<FirebaseUser> {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { status: 401, code: "UNAUTHENTICATED" });
  try {
    const { payload } = await jwtVerify(match[1], firebaseKeys, {
      issuer: `https://securetoken.google.com/${firebaseProjectId}`,
      audience: firebaseProjectId,
      algorithms: ["RS256"]
    });
    if (!payload.sub || !payload.email) throw new Error("Missing Firebase identity claims");
    const firebase = payload.firebase && typeof payload.firebase === "object" ? payload.firebase as Record<string, unknown> : {};
    return {
      uid: payload.sub,
      email: String(payload.email),
      name: payload.name ? String(payload.name) : undefined,
      picture: payload.picture ? String(payload.picture) : undefined,
      provider: firebase.sign_in_provider ? String(firebase.sign_in_provider) : undefined
    };
  } catch {
    throw Object.assign(new Error("Session ไม่ถูกต้องหรือหมดอายุ"), { status: 401, code: "UNAUTHENTICATED" });
  }
}
