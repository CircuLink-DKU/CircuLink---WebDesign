import { describe, it, expect, beforeAll } from "vitest";
import type { Express } from "express";
import { getApp, request, registerUser, createActiveItem, type TestUser } from "./helpers.js";

describe("orders", () => {
  let app: Express;
  let seller: TestUser;
  let buyer: TestUser;

  beforeAll(async () => {
    app = await getApp();
    seller = await registerUser(app, "seller");
    buyer = await registerUser(app, "buyer");
  });

  it("derives the order total from the item price and ignores a client-supplied total", async () => {
    const item = await createActiveItem(app, seller, { price: 88 });

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      // A malicious buyer tries to pay 1 cent for an 88 item.
      .send({ itemId: item.id, total: 0.01 });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.total)).toBe(88);
  });

  it("rejects a second order for an item that already has an open order", async () => {
    const item = await createActiveItem(app, seller);
    const other = await registerUser(app, "buyer2");

    const first = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ itemId: item.id });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${other.accessToken}`)
      .send({ itemId: item.id });

    expect(second.status).toBe(409);
  });

  it("forbids ordering your own item", async () => {
    const item = await createActiveItem(app, seller);

    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${seller.accessToken}`)
      .send({ itemId: item.id });

    expect(res.status).toBe(403);
  });

  it("marks the item SOLD once the order is completed", async () => {
    const item = await createActiveItem(app, seller);
    const order = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ itemId: item.id });
    expect(order.status).toBe(201);

    const setStatus = (token: string, status: string) =>
      request(app)
        .patch(`/api/orders/${order.body.data.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status });

    expect((await setStatus(seller.accessToken, "ACCEPTED")).status).toBe(200);
    expect((await setStatus(buyer.accessToken, "PAID")).status).toBe(200);
    expect((await setStatus(seller.accessToken, "SHIPPED")).status).toBe(200);
    expect((await setStatus(buyer.accessToken, "COMPLETED")).status).toBe(200);

    const after = await request(app)
      .get(`/api/items/${item.id}`)
      .set("Authorization", `Bearer ${seller.accessToken}`);

    expect(after.body.data.status).toBe("SOLD");
  });

  it("rejects an invalid status transition", async () => {
    const item = await createActiveItem(app, seller);
    const order = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ itemId: item.id });
    expect(
      order.status,
      `order creation failed: ${order.status} ${JSON.stringify(order.body)} (item ${item.id} status=${item.status})`
    ).toBe(201);

    // Buyer cannot jump straight from PENDING to SHIPPED.
    const res = await request(app)
      .patch(`/api/orders/${order.body.data.id}/status`)
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ status: "SHIPPED" });

    expect(res.status).toBe(403);
  });

  it("does not expose an order to an unrelated user", async () => {
    const item = await createActiveItem(app, seller);
    const order = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${buyer.accessToken}`)
      .send({ itemId: item.id });

    const stranger = await registerUser(app, "stranger");
    const res = await request(app)
      .get(`/api/orders/${order.body.data.id}`)
      .set("Authorization", `Bearer ${stranger.accessToken}`);

    expect(res.status).toBe(403);
  });
});
