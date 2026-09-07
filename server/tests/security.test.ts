import { describe, it, expect, beforeAll } from "vitest";
import type { Express } from "express";
import { getApp, request, registerUser, type TestUser } from "./helpers.js";

describe("platform hardening", () => {
  let app: Express;
  let user: TestUser;

  beforeAll(async () => {
    app = await getApp();
    user = await registerUser(app, "sec");
  });

  describe("security headers", () => {
    it("sets the baseline security headers on API responses", async () => {
      const res = await request(app).get("/api/version");

      expect(res.status).toBe(200);
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["referrer-policy"]).toBe("no-referrer");
      expect(res.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
    });

    it("sets them on error responses too, not just on the happy path", async () => {
      const res = await request(app).get("/api/metrics");

      expect(res.status).toBe(401);
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["referrer-policy"]).toBe("no-referrer");
      expect(res.headers["strict-transport-security"]).toMatch(/max-age=\d+/);
    });

    it("serves user-uploaded files with nosniff so they cannot be sniffed into HTML", async () => {
      // A 1x1 transparent GIF: real image bytes, so the stored file is genuinely an image.
      const gif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );

      const upload = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${user.accessToken}`)
        .attach("file", gif, { filename: "pixel.gif", contentType: "image/gif" });

      expect(upload.status).toBe(201);
      const storedPath: string = upload.body.data.path;
      expect(storedPath.startsWith("/uploads/")).toBe(true);
      // The client-supplied filename is never reused for the stored object.
      expect(storedPath).not.toContain("pixel.gif");

      const served = await request(app).get(storedPath);

      expect(served.status).toBe(200);
      expect(served.headers["x-content-type-options"]).toBe("nosniff");
    });
  });

  describe("GET /api/metrics", () => {
    it("rejects an anonymous caller with 401", async () => {
      const res = await request(app).get("/api/metrics");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
      expect(res.body.data).toBeNull();
    });

    it("rejects an authenticated non-admin USER with 403", async () => {
      const res = await request(app)
        .get("/api/metrics")
        .set("Authorization", `Bearer ${user.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
      // No metrics snapshot leaks to a non-admin.
      expect(res.body.data).toBeNull();
    });
  });

  describe("public probes", () => {
    it("exposes GET /api/version without auth", async () => {
      const res = await request(app).get("/api/version");

      expect(res.status).toBe(200);
      expect(typeof res.body.data.version).toBe("string");
      expect(typeof res.body.data.node).toBe("string");
      expect(res.body.data.node.startsWith("v")).toBe(true);
      expect(typeof res.body.data.uptime).toBe("number");
    });

    it("reports GET /healthz ok while the database is reachable", async () => {
      const res = await request(app).get("/healthz");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });

    it("keeps the public listing endpoint readable without a token", async () => {
      // The global `authenticate` middleware must stay optional: a regression that
      // turned it into a hard gate would lock anonymous visitors out of browsing.
      const res = await request(app).get("/api/items");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(typeof res.body.meta.total).toBe("number");
    });
  });

  describe("error envelope", () => {
    it("returns a 404 carrying both the envelope and the legacy error wrapper", async () => {
      const res = await request(app).get("/api/definitely-not-a-route");

      expect(res.status).toBe(404);
      // Unified envelope.
      expect(typeof res.body.code).toBe("number");
      expect(typeof res.body.message).toBe("string");
      expect(res.body.data).toBeNull();
      expect(typeof res.body.timestamp).toBe("number");
      expect(res.body.path).toBe("/api/definitely-not-a-route");
      // Legacy wrapper the current frontend ApiClient still reads.
      expect(res.body.error.code).toBe("NOT_FOUND");
      expect(typeof res.body.error.message).toBe("string");
    });

    it("returns 400 BAD_REQUEST for a validation failure", async () => {
      const res = await request(app).post("/api/auth/login").send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.data).toBeNull();
      expect(res.body.path).toBe("/api/auth/login");
    });

    it("rejects a malformed bearer token with 401 rather than treating it as anonymous", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer not-a-real-jwt");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /api/uploads", () => {
    it("requires authentication", async () => {
      const res = await request(app)
        .post("/api/uploads")
        .attach("file", Buffer.from("<h1>x</h1>"), {
          filename: "evil.html",
          contentType: "text/html",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects a non-image upload", async () => {
      const res = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${user.accessToken}`)
        .attach("file", Buffer.from("<h1>x</h1>"), {
          filename: "evil.html",
          contentType: "text/html",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
      expect(res.body.data).toBeNull();
    });

    it("rejects an image mimetype smuggled under a .html filename by storing a safe name", async () => {
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      );

      const res = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${user.accessToken}`)
        .attach("file", png, { filename: "evil.html", contentType: "image/png" });

      expect(res.status).toBe(201);
      const storedPath: string = res.body.data.path;
      expect(storedPath.endsWith(".png")).toBe(true);
      expect(storedPath).not.toContain("evil");
    });
  });
});
