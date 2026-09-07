import request from "supertest";
import type { Express } from "express";
import { applyTestEnv } from "./test-env.js";

// Env must be set before the compiled app (which validates env at import) loads.
applyTestEnv();

let cachedApp: Express | null = null;

/** Boots the compiled production server once and reuses it across tests. */
export const getApp = async (): Promise<Express> => {
  if (!cachedApp) {
    const mod = await import("../../dist/server/app.js");
    cachedApp = (mod as { createApp: () => Express }).createApp();
  }
  return cachedApp;
};

let counter = 0;
/**
 * Unique identifier so repeated runs never collide on unique columns.
 *
 * Deliberately HEX (0-9a-f) rather than base36: generated ids end up inside item
 * titles, and the listing-review heuristic matches the keyword "qr" as a bare
 * substring. A base36 id could randomly contain "qr", flagging the listing into
 * PENDING_REVIEW and making unrelated tests fail intermittently. No review
 * keyword is spellable from the hex alphabet.
 */
export const uid = () =>
  `${Date.now().toString(16)}${(counter++).toString(16)}${Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0")}`;

export interface TestUser {
  email: string;
  accessToken: string;
  refreshToken: string;
  id: string;
}

export const registerUser = async (app: Express, prefix = "user"): Promise<TestUser> => {
  const email = `${prefix}-${uid()}@example.com`;
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password: "password123", name: prefix });

  if (res.status !== 201) {
    throw new Error(`register failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  return {
    email,
    id: res.body.user.id,
    accessToken: res.body.tokens.accessToken,
    refreshToken: res.body.tokens.refreshToken,
  };
};

export const firstCategoryId = async (app: Express): Promise<string> => {
  const res = await request(app).get("/api/categories");
  return res.body.data[0].id;
};

/**
 * Creates an item. An image is supplied so the listing-review heuristic does not
 * divert it to PENDING_REVIEW — these tests need an ACTIVE, purchasable listing.
 */
export const createActiveItem = async (
  app: Express,
  seller: TestUser,
  overrides: Record<string, unknown> = {}
) => {
  const categoryId = await firstCategoryId(app);
  const res = await request(app)
    .post("/api/items")
    .set("Authorization", `Bearer ${seller.accessToken}`)
    .send({
      title: `Item ${uid()}`,
      description: "A perfectly ordinary test listing.",
      price: 88,
      condition: "GOOD",
      categoryId,
      images: ["/uploads/test/image.jpg"],
      ...overrides,
    });

  if (res.status !== 201) {
    throw new Error(`createItem failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
};

export { request };
