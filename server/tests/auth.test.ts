import { describe, it, expect, beforeAll } from "vitest";
import type { Express } from "express";
import { getApp, request, registerUser, uid, type TestUser } from "./helpers.js";

/**
 * Session / credential lifecycle.
 *
 * Every test mints its own user so the file is order-independent and does not
 * depend on rows created by any other test file.
 */
describe("auth sessions", () => {
  let app: Express;

  const refresh = (refreshToken: string) =>
    request(app).post("/api/auth/refresh").send({ refreshToken });

  const me = (accessToken?: string) => {
    const req = request(app).get("/api/auth/me");
    return accessToken ? req.set("Authorization", `Bearer ${accessToken}`) : req;
  };

  beforeAll(async () => {
    app = await getApp();
  });

  it("refresh returns a usable access token and rotates the refresh token", async () => {
    const user: TestUser = await registerUser(app, "refresh");

    const res = await refresh(user.refreshToken);
    expect(res.status).toBe(200);
    expect(typeof res.body.tokens.accessToken).toBe("string");
    // The refresh token carries a random jti, so rotation is always observable.
    // (The access token is only compared behaviourally: its JWT payload is a pure
    // function of id/email/role/iat, so two tokens minted in the same second are
    // byte-identical by design and comparing the strings would be flaky.)
    expect(res.body.tokens.refreshToken).not.toBe(user.refreshToken);

    const authed = await me(res.body.tokens.accessToken);
    expect(authed.status).toBe(200);
    expect(authed.body.user.id).toBe(user.id);
    expect(authed.body.user.email).toBe(user.email);
    expect(authed.body.user).not.toHaveProperty("passwordHash");
  });

  it("revokes the old refresh token once it has been redeemed", async () => {
    const user = await registerUser(app, "rotate");

    const first = await refresh(user.refreshToken);
    expect(first.status).toBe(200);

    // Replaying the consumed token must not mint another session.
    const replay = await refresh(user.refreshToken);
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe("UNAUTHORIZED");
    expect(replay.body).not.toHaveProperty("tokens");
  });

  it("logout revokes the refresh token", async () => {
    const user = await registerUser(app, "logout");

    const out = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken: user.refreshToken });
    expect(out.status).toBe(204);

    const after = await refresh(user.refreshToken);
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects /api/auth/me without a token and with a garbage token", async () => {
    const anonymous = await me();
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe("UNAUTHORIZED");
    expect(anonymous.body).not.toHaveProperty("user");

    const garbage = await me("not.a.real.jwt");
    expect(garbage.status).toBe(401);
    expect(garbage.body.error.code).toBe("UNAUTHORIZED");
    expect(garbage.body).not.toHaveProperty("user");
  });
});

describe("auth password reset", () => {
  let app: Express;

  beforeAll(async () => {
    app = await getApp();
  });

  const forgot = (email: string) =>
    request(app).post("/api/auth/password/forgot").send({ email });

  it("does not let /password/forgot enumerate registered accounts", async () => {
    const user = await registerUser(app, "enumerate");
    const unknownEmail = `never-registered-${uid()}@example.com`;

    const known = await forgot(user.email);
    const unknown = await forgot(unknownEmail);

    // Same status for both — the whole point of the endpoint.
    expect(known.status).toBe(unknown.status);
    expect(known.status).toBe(200);

    // Same top-level envelope either way.
    expect(Object.keys(known.body)).toEqual(["data"]);
    expect(Object.keys(unknown.body)).toEqual(["data"]);

    // Nothing is ever minted or echoed for an address that does not exist.
    expect(unknown.body.data).toEqual({});

    // In production the responses are byte-identical: the reset token is only
    // echoed when EXPOSE_DEV_TOKENS is explicitly enabled (as the test env does),
    // so this is the ONLY thing that distinguishes them, and it fails closed.
    expect(unknown.body.data.token).toBeUndefined();
    expect(typeof known.body.data.token).toBe("string");
  });

  it("reset rotates the password, burns the token and kills existing sessions", async () => {
    const user = await registerUser(app, "reset");
    const newPassword = "newpassword123";

    const requested = await forgot(user.email);
    expect(requested.status).toBe(200);
    // Non-production returns the raw token so local/CI flows need no mailbox.
    const token = requested.body.data.token as string;
    expect(typeof token).toBe("string");

    const reset = await request(app)
      .post("/api/auth/password/reset")
      .send({ token, password: newPassword });
    expect(reset.status).toBe(204);

    // The reset token is single-use.
    const replayed = await request(app)
      .post("/api/auth/password/reset")
      .send({ token, password: "anotherpassword123" });
    expect(replayed.status).toBe(401);

    // Sessions minted before the reset are revoked.
    const staleRefresh = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: user.refreshToken });
    expect(staleRefresh.status).toBe(401);

    // The old password no longer works, the new one does.
    const oldLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "password123" });
    expect(oldLogin.status).toBe(401);
    expect(oldLogin.body.error.code).toBe("UNAUTHORIZED");

    const newLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.user.id).toBe(user.id);
    expect(newLogin.body.user).not.toHaveProperty("passwordHash");
    expect(typeof newLogin.body.tokens.accessToken).toBe("string");
  });
});

describe("auth registration", () => {
  let app: Express;

  beforeAll(async () => {
    app = await getApp();
  });

  const register = (body: Record<string, unknown>) =>
    request(app).post("/api/auth/register").send(body);

  it("rejects a password shorter than 8 characters", async () => {
    const res = await register({ email: `short-${uid()}@example.com`, password: "short12" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
    expect(res.body).not.toHaveProperty("tokens");
  });

  it("rejects a malformed email address", async () => {
    const res = await register({ email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
    expect(res.body).not.toHaveProperty("tokens");
  });

  it("rejects an email that is already registered", async () => {
    const email = `duplicate-${uid()}@example.com`;

    const first = await register({ email, password: "password123", name: "First" });
    expect(first.status).toBe(201);
    expect(first.body.user).not.toHaveProperty("passwordHash");

    const second = await register({ email, password: "differentpassword", name: "Second" });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("CONFLICT");
    expect(second.body).not.toHaveProperty("tokens");
  });
});
