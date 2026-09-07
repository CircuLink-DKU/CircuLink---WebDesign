import { describe, it, expect, beforeAll } from "vitest";
import type { Express } from "express";
import { getApp, request, registerUser, createActiveItem, type TestUser } from "./helpers.js";

/**
 * Messaging authorization. The rule under test: a conversation is always opened
 * by the *buyer* of a listing. A seller may only reply inside a thread someone
 * else started, which is what stops sellers from cold-messaging arbitrary users.
 */
describe("messages", () => {
  let app: Express;

  beforeAll(async () => {
    app = await getApp();
  });

  /** Buyer opens a conversation about `seller`'s item and returns the new thread id. */
  const startThread = async (seller: TestUser, buyer: TestUser, itemId: string, body = "Hi, is this still available?") => {
    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ itemId, body });

    if (res.status !== 201) {
      throw new Error(`startThread failed (${res.status}): ${JSON.stringify(res.body)}`);
    }
    return res.body.data.threadId as string;
  };

  it("lets a buyer open a thread on someone else's item and lists it back", async () => {
    const seller = await registerUser(app, "seller");
    const buyer = await registerUser(app, "buyer");
    const item = await createActiveItem(app, seller);

    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ itemId: item.id, body: "Hi, is this still available?" });

    expect(res.status).toBe(201);
    expect(res.body.data.senderId).toBe(buyer.id);
    expect(res.body.data.isRead).toBe(false);
    expect(res.body.data.threadId).toEqual(expect.any(String));

    const threads = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`);

    expect(threads.status).toBe(200);
    const thread = threads.body.data.find((t: { id: string }) => t.id === res.body.data.threadId);
    expect(thread).toBeDefined();
    // The thread is anchored on the item, with the buyer as the initiating party.
    expect(thread.itemId).toBe(item.id);
    expect(thread.buyerId).toBe(buyer.id);
    expect(thread.sellerId).toBe(seller.id);
    expect(thread.lastMessage.body).toBe("Hi, is this still available?");
    // The buyer's own message must not count as unread for the buyer.
    expect(thread.unreadCount).toBe(0);
  });

  it("forbids the seller from cold-starting a thread to an arbitrary user", async () => {
    const seller = await registerUser(app, "seller");
    const target = await registerUser(app, "target");
    const item = await createActiveItem(app, seller);

    const res = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ itemId: item.id, recipientId: target.id, body: "Buy my stuff!" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");

    // The refusal must not have left a half-created thread behind for either party.
    const targetThreads = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${target.accessToken}`);
    expect(targetThreads.body.data).toHaveLength(0);

    const sellerThreads = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${seller.accessToken}`);
    expect(sellerThreads.body.data).toHaveLength(0);
  });

  it("lets the seller reply inside a thread the buyer already opened", async () => {
    const seller = await registerUser(app, "seller");
    const buyer = await registerUser(app, "buyer");
    const item = await createActiveItem(app, seller);
    const threadId = await startThread(seller, buyer, item.id);

    const reply = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ threadId, body: "Yes, still available." });

    expect(reply.status).toBe(201);
    expect(reply.body.data.threadId).toBe(threadId);
    expect(reply.body.data.senderId).toBe(seller.id);

    const messages = await request(app)
      .get("/api/messages")
      .query({ threadId })
      .set("Authorization", `Bearer ${buyer.accessToken}`);

    expect(messages.status).toBe(200);
    expect(messages.body.meta.total).toBe(2);
    // Oldest first.
    expect(messages.body.data.map((m: { senderId: string }) => m.senderId)).toEqual([buyer.id, seller.id]);
  });

  it("reuses the existing thread when the same buyer messages again about the same item", async () => {
    const seller = await registerUser(app, "seller");
    const buyer = await registerUser(app, "buyer");
    const item = await createActiveItem(app, seller);

    const first = await startThread(seller, buyer, item.id, "First ping");
    const second = await startThread(seller, buyer, item.id, "Second ping");

    expect(second).toBe(first);

    const threads = await request(app)
      .get("/api/messages")
      .query({ itemId: item.id })
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(threads.body.meta.total).toBe(1);
  });

  it("hides a thread from an unrelated user for both reading and posting", async () => {
    const seller = await registerUser(app, "seller");
    const buyer = await registerUser(app, "buyer");
    const stranger = await registerUser(app, "stranger");
    const item = await createActiveItem(app, seller);
    const threadId = await startThread(seller, buyer, item.id);

    const read = await request(app)
      .get("/api/messages")
      .query({ threadId })
      .set("Authorization", `Bearer ${stranger.accessToken}`);
    expect(read.status).toBe(403);
    expect(read.body.error.code).toBe("FORBIDDEN");
    // No message bodies may leak alongside the error.
    expect(read.body.data).toBeNull();

    const post = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${stranger.accessToken}`)
      .send({ threadId, body: "butting in" });
    expect(post.status).toBe(403);

    // The thread must not surface in the stranger's own thread list either.
    const list = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${stranger.accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(0);

    // And the failed post must not have appended anything to the thread.
    const messages = await request(app)
      .get("/api/messages")
      .query({ threadId })
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(messages.body.meta.total).toBe(1);
  });

  it("rejects a message body longer than 2000 characters", async () => {
    const seller = await registerUser(app, "seller");
    const buyer = await registerUser(app, "buyer");
    const item = await createActiveItem(app, seller);
    const threadId = await startThread(seller, buyer, item.id);

    const tooLong = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ threadId, body: "x".repeat(2001) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.code).toBe("BAD_REQUEST");

    const empty = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ threadId, body: "" });
    expect(empty.status).toBe(400);

    // Exactly at the cap is still accepted.
    const atCap = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ threadId, body: "x".repeat(2000) });
    expect(atCap.status).toBe(201);

    // Neither rejected body was persisted.
    const messages = await request(app)
      .get("/api/messages")
      .query({ threadId })
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(messages.body.meta.total).toBe(2);
  });

  it("marks a counterparty's message read but refuses to mark your own", async () => {
    const seller = await registerUser(app, "seller");
    const buyer = await registerUser(app, "buyer");
    const stranger = await registerUser(app, "stranger");
    const item = await createActiveItem(app, seller);
    const threadId = await startThread(seller, buyer, item.id);

    const reply = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ threadId, body: "Yes, still available." });
    const replyId = reply.body.data.id as string;

    // The sender cannot mark their own message read (that would fake a receipt).
    const own = await request(app)
      .patch(`/api/messages/${replyId}/read`)
      .set("Authorization", `Bearer ${seller.accessToken}`);
    expect(own.status).toBe(403);
    expect(own.body.error.message).toBe("Cannot mark own message as read");

    // A non-participant cannot touch it at all.
    const outsider = await request(app)
      .patch(`/api/messages/${replyId}/read`)
      .set("Authorization", `Bearer ${stranger.accessToken}`);
    expect(outsider.status).toBe(403);

    // Before the buyer reads it, the seller's message counts as unread for the buyer.
    const before = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(before.body.data.find((t: { id: string }) => t.id === threadId).unreadCount).toBe(1);

    const marked = await request(app)
      .patch(`/api/messages/${replyId}/read`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(marked.status).toBe(200);
    expect(marked.body.data.isRead).toBe(true);

    // Idempotent: marking again still succeeds and stays read.
    const again = await request(app)
      .patch(`/api/messages/${replyId}/read`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(again.status).toBe(200);
    expect(again.body.data.isRead).toBe(true);

    const after = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(after.body.data.find((t: { id: string }) => t.id === threadId).unreadCount).toBe(0);
  });

  it("keeps a non-owner from reading a DRAFT listing through the item endpoint", async () => {
    const seller = await registerUser(app, "seller");
    const buyer = await registerUser(app, "buyer");
    const draft = await createActiveItem(app, seller, { status: "DRAFT" });
    expect(draft.status).toBe("DRAFT");

    const view = await request(app)
      .get(`/api/items/${draft.id}`)
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(view.status).toBe(404);
  });

  /**
   * Thread creation mirrors item visibility: POST /api/messages gates on the
   * item's status, so a user holding the id of a DRAFT / HIDDEN / ARCHIVED
   * listing cannot open a thread on it and read the listing's title, price and
   * images back out of GET /api/messages — data the item endpoint 404s on.
   */
  it("should refuse to open a thread on a listing the user cannot see", async () => {
    const seller = await registerUser(app, "seller");
    const buyer = await registerUser(app, "buyer");
    const draft = await createActiveItem(app, seller, { status: "DRAFT" });

    const msg = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ itemId: draft.id, body: "about your hidden draft" });
    expect(msg.status).toBe(404);

    const threads = await request(app)
      .get("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`);
    expect(threads.body.data).toHaveLength(0);
  });

  it("requires authentication and a thread or item reference", async () => {
    const seller = await registerUser(app, "seller");
    const buyer = await registerUser(app, "buyer");
    const item = await createActiveItem(app, seller);

    const anon = await request(app).get("/api/messages");
    expect(anon.status).toBe(401);

    const anonPost = await request(app)
      .post("/api/messages")
      .send({ itemId: item.id, body: "hello" });
    expect(anonPost.status).toBe(401);

    const noTarget = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ body: "hello with nowhere to go" });
    expect(noTarget.status).toBe(400);

    const unknownThread = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ threadId: "thread-does-not-exist", body: "hello" });
    expect(unknownThread.status).toBe(404);

    const unknownItem = await request(app)
      .post("/api/messages")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ itemId: "item-does-not-exist", body: "hello" });
    expect(unknownItem.status).toBe(404);
  });
});
