import { describe, it, expect, beforeAll } from "vitest";
import type { Express } from "express";
import {
  getApp,
  request,
  registerUser,
  createActiveItem,
  firstCategoryId,
  uid,
  type TestUser,
} from "./helpers.js";

/**
 * Creates an item with NO images so the listing-review heuristic diverts it to
 * PENDING_REVIEW. Used to exercise the "non-ACTIVE items are not public" rules.
 */
const createPendingItem = async (app: Express, seller: TestUser) => {
  const categoryId = await firstCategoryId(app);
  const res = await request(app)
    .post("/api/items")
    .set("Authorization", `Bearer ${seller.accessToken}`)
    .send({
      title: `Pending ${uid()}`,
      description: "A listing with no images, so it lands in review.",
      price: 42,
      condition: "GOOD",
      categoryId,
      images: [],
    });

  expect(res.status).toBe(201);
  expect(res.body.data.status).toBe("PENDING_REVIEW");
  return res.body.data;
};

describe("items", () => {
  let app: Express;
  let seller: TestUser;
  let stranger: TestUser;
  // A dedicated author for the validation block: item creation is rate limited
  // per user (30/min), and that block burns a request per rejected payload.
  let validator: TestUser;
  let categoryId: string;

  beforeAll(async () => {
    app = await getApp();
    seller = await registerUser(app, "itemseller");
    stranger = await registerUser(app, "itemstranger");
    validator = await registerUser(app, "itemvalidator");
    categoryId = await firstCategoryId(app);
  });

  const createRaw = (token: string, overrides: Record<string, unknown>) =>
    request(app)
      .post("/api/items")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: `Item ${uid()}`,
        description: "A perfectly ordinary test listing.",
        price: 88,
        condition: "GOOD",
        categoryId,
        images: ["/uploads/test/image.jpg"],
        ...overrides,
      });

  describe("seller privacy", () => {
    it("does not leak the seller email in the public list", async () => {
      const item = await createActiveItem(app, seller);

      const res = await request(app).get("/api/items").query({ sellerId: seller.id });

      expect(res.status).toBe(200);
      const listed = res.body.data.find((i: { id: string }) => i.id === item.id);
      expect(listed).toBeDefined();
      expect(listed.seller.id).toBe(seller.id);
      expect(typeof listed.seller.name).toBe("string");
      expect(Object.keys(listed.seller)).not.toContain("email");
      // Nothing anywhere in the payload should expose the address.
      expect(JSON.stringify(res.body)).not.toContain(seller.email);
    });

    it("does not leak the seller email in the public detail view", async () => {
      const item = await createActiveItem(app, seller);

      const res = await request(app).get(`/api/items/${item.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.seller.id).toBe(seller.id);
      expect(typeof res.body.data.seller.name).toBe("string");
      expect(Object.keys(res.body.data.seller)).not.toContain("email");
      expect(JSON.stringify(res.body)).not.toContain(seller.email);
    });

    it("does not leak the seller email to an authenticated non-owner either", async () => {
      const item = await createActiveItem(app, seller);

      const res = await request(app)
        .get(`/api/items/${item.id}`)
        .set("Authorization", `Bearer ${stranger.accessToken}`);

      expect(res.status).toBe(200);
      expect(Object.keys(res.body.data.seller)).not.toContain("email");
      expect(JSON.stringify(res.body)).not.toContain(seller.email);
    });
  });

  describe("non-ACTIVE item visibility", () => {
    it("hides a PENDING_REVIEW item from anonymous callers and other users, but not its owner", async () => {
      const pending = await createPendingItem(app, seller);

      const anon = await request(app).get(`/api/items/${pending.id}`);
      expect(anon.status).toBe(404);
      expect(anon.body.error.code).toBe("NOT_FOUND");

      const other = await request(app)
        .get(`/api/items/${pending.id}`)
        .set("Authorization", `Bearer ${stranger.accessToken}`);
      expect(other.status).toBe(404);
      expect(other.body.error.code).toBe("NOT_FOUND");

      const owner = await request(app)
        .get(`/api/items/${pending.id}`)
        .set("Authorization", `Bearer ${seller.accessToken}`);
      expect(owner.status).toBe(200);
      expect(owner.body.data.id).toBe(pending.id);
      expect(owner.body.data.status).toBe("PENDING_REVIEW");
    });

    it("does not let an anonymous caller enumerate non-ACTIVE items via ?status", async () => {
      const pending = await createPendingItem(app, seller);
      // A visible sibling, so an empty result can't make the loop below vacuous.
      const visible = await createActiveItem(app, seller);

      for (const status of ["PENDING_REVIEW", "HIDDEN"]) {
        const res = await request(app).get("/api/items").query({ status, pageSize: 100 });

        expect(res.status).toBe(200);
        const ids = res.body.data.map((i: { id: string }) => i.id);
        // The status filter is ignored for the public — every row is ACTIVE.
        for (const listed of res.body.data as Array<{ id: string; status: string }>) {
          expect(listed.status).toBe("ACTIVE");
        }
        expect(ids).toContain(visible.id);
        expect(ids).not.toContain(pending.id);
      }
    });

    it("does not let an anonymous caller enumerate another user's non-ACTIVE items via ?sellerId&status", async () => {
      const pending = await createPendingItem(app, seller);
      const visible = await createActiveItem(app, seller);

      const res = await request(app)
        .get("/api/items")
        .query({ sellerId: seller.id, status: "PENDING_REVIEW", pageSize: 100 });

      expect(res.status).toBe(200);
      const ids = res.body.data.map((i: { id: string }) => i.id);
      // The filter is silently forced back to ACTIVE rather than honored.
      for (const listed of res.body.data as Array<{ status: string }>) {
        expect(listed.status).toBe("ACTIVE");
      }
      expect(ids).toContain(visible.id);
      expect(ids).not.toContain(pending.id);
    });

    it("does not let a logged-in user enumerate someone else's non-ACTIVE items", async () => {
      const pending = await createPendingItem(app, seller);
      const visible = await createActiveItem(app, seller);

      const res = await request(app)
        .get("/api/items")
        .query({ sellerId: seller.id, status: "PENDING_REVIEW", pageSize: 100 })
        .set("Authorization", `Bearer ${stranger.accessToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((i: { id: string }) => i.id);
      for (const listed of res.body.data as Array<{ status: string }>) {
        expect(listed.status).toBe("ACTIVE");
      }
      expect(ids).toContain(visible.id);
      expect(ids).not.toContain(pending.id);
    });

    it("lets a user list their OWN non-ACTIVE items via ?sellerId=self&status", async () => {
      const owner = await registerUser(app, "pendingowner");
      const pending = await createPendingItem(app, owner);

      const res = await request(app)
        .get("/api/items")
        .query({ sellerId: owner.id, status: "PENDING_REVIEW", pageSize: 100 })
        .set("Authorization", `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.map((i: { id: string }) => i.id)).toContain(pending.id);
      for (const listed of res.body.data as Array<{ status: string }>) {
        expect(listed.status).toBe("PENDING_REVIEW");
      }
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe("create input validation", () => {
    it("rejects a title longer than 200 characters", async () => {
      const res = await createRaw(validator.accessToken, { title: "t".repeat(201) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("accepts a title of exactly 200 characters", async () => {
      const res = await createRaw(validator.accessToken, { title: `T${"t".repeat(199)}` });

      expect(res.status).toBe(201);
    });

    it("rejects a description longer than 5000 characters", async () => {
      const res = await createRaw(validator.accessToken, { description: "d".repeat(5001) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("rejects a price above 1000000", async () => {
      const res = await createRaw(validator.accessToken, { price: 1_000_001 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("rejects a negative price", async () => {
      const res = await createRaw(validator.accessToken, { price: -1 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("rejects a client-assigned privileged status on create", async () => {
      for (const status of ["SOLD", "HIDDEN", "REJECTED", "ARCHIVED"]) {
        const res = await createRaw(validator.accessToken, { status });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe("BAD_REQUEST");
      }
    });

    it("still accepts the two statuses a client may choose", async () => {
      const draft = await createRaw(validator.accessToken, { status: "DRAFT" });
      expect(draft.status).toBe(201);
      expect(draft.body.data.status).toBe("DRAFT");

      const active = await createRaw(validator.accessToken, { status: "ACTIVE" });
      expect(active.status).toBe(201);
      expect(active.body.data.status).toBe("ACTIVE");
    });

    it("requires authentication to create an item", async () => {
      const res = await request(app).post("/api/items").send({
        title: `Item ${uid()}`,
        description: "no token",
        price: 10,
        condition: "GOOD",
        categoryId,
        images: ["/uploads/test/image.jpg"],
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("ownership on write", () => {
    it("forbids a non-owner from patching an item", async () => {
      const item = await createActiveItem(app, seller);

      const res = await request(app)
        .patch(`/api/items/${item.id}`)
        .set("Authorization", `Bearer ${stranger.accessToken}`)
        .send({ title: "hijacked" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");

      const after = await request(app).get(`/api/items/${item.id}`);
      expect(after.body.data.title).toBe(item.title);
    });

    it("forbids a non-owner from deleting an item", async () => {
      const item = await createActiveItem(app, seller);

      const res = await request(app)
        .delete(`/api/items/${item.id}`)
        .set("Authorization", `Bearer ${stranger.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");

      // The item survives the rejected delete.
      const after = await request(app).get(`/api/items/${item.id}`);
      expect(after.status).toBe(200);
    });

    it("lets the owner delete their own item", async () => {
      const owner = await registerUser(app, "deleter");
      const item = await createActiveItem(app, owner);

      const res = await request(app)
        .delete(`/api/items/${item.id}`)
        .set("Authorization", `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(204);

      const after = await request(app).get(`/api/items/${item.id}`);
      expect(after.status).toBe(404);
    });

    it("requires authentication to patch or delete", async () => {
      const item = await createActiveItem(app, seller);

      const patched = await request(app).patch(`/api/items/${item.id}`).send({ title: "x" });
      expect(patched.status).toBe(401);

      const deleted = await request(app).delete(`/api/items/${item.id}`);
      expect(deleted.status).toBe(401);
    });
  });

  describe("moderation cannot be bypassed by editing after creation", () => {
    it("re-runs the listing review on edit instead of letting a clean draft go live dirty", async () => {
      const author = await registerUser(app, "editor");

      // A clean DRAFT passes the review heuristic on create.
      const draft = await createActiveItem(app, author, { status: "DRAFT" });
      expect(draft.status).toBe("DRAFT");

      // Editing in review-triggering content must NOT quietly stay publishable.
      const edited = await request(app)
        .patch(`/api/items/${draft.id}`)
        .set("Authorization", `Bearer ${author.accessToken}`)
        .send({ description: "Pay by wechat transfer, cash only, 站外 deal" });
      expect(edited.status).toBe(200);

      // Whether it was diverted on the edit itself or on the attempt to go live,
      // the end state must never be a live ACTIVE listing that skipped review.
      const activated = await request(app)
        .patch(`/api/items/${draft.id}`)
        .set("Authorization", `Bearer ${author.accessToken}`)
        .send({ status: "ACTIVE" });

      const finalStatus =
        activated.status === 200 ? activated.body.data.status : edited.body.data.status;
      expect(finalStatus).not.toBe("ACTIVE");
      expect(finalStatus).toBe("PENDING_REVIEW");

      // And it must not be publicly visible.
      const anon = await request(app).get(`/api/items/${draft.id}`);
      expect(anon.status).toBe(404);
    });
  });

  describe("owners can retrieve all of their own listings in one call", () => {
    it("does not force status=ACTIVE when a user lists their own items", async () => {
      const owner = await registerUser(app, "mylistings");
      const active = await createActiveItem(app, owner);
      // No images -> diverted to PENDING_REVIEW by the review heuristic.
      const pending = await createActiveItem(app, owner, { images: [] });
      expect(pending.status).toBe("PENDING_REVIEW");

      const res = await request(app)
        .get(`/api/items?sellerId=${owner.id}`)
        .set("Authorization", `Bearer ${owner.accessToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((i: { id: string }) => i.id);
      expect(ids).toContain(active.id);
      expect(ids).toContain(pending.id);
    });

    it("still hides another user's non-ACTIVE listings when they ask without a status", async () => {
      const other = await registerUser(app, "otherowner");
      const hidden = await createActiveItem(app, other, { images: [] });
      const snooper = await registerUser(app, "snooper");

      const res = await request(app)
        .get(`/api/items?sellerId=${other.id}`)
        .set("Authorization", `Bearer ${snooper.accessToken}`);

      const ids = res.body.data.map((i: { id: string }) => i.id);
      expect(ids).not.toContain(hidden.id);
      for (const item of res.body.data) expect(item.status).toBe("ACTIVE");
    });
  });
});
