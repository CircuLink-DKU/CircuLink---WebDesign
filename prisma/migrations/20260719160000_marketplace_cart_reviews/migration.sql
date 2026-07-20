-- Extend the marketplace database with listing metadata, order completion tracking,
-- shopping carts and transaction reviews.
--
-- This migration is intentionally additive. Existing rows remain valid because every
-- new required column has a safe default and every other new column is nullable.

-- -----------------------------------------------------------------------------
-- 1. Item listing metadata and moderation ownership
-- -----------------------------------------------------------------------------

ALTER TABLE "Item"
    ADD COLUMN "transactionLocation" TEXT,
    ADD COLUMN "contactInfo" TEXT,
    ADD COLUMN "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "publisherIp" TEXT,
    ADD COLUMN "reviewedAt" TIMESTAMP(3),
    ADD COLUMN "reviewedById" TEXT;

COMMENT ON COLUMN "Item"."transactionLocation" IS
    'Seller-provided meetup or handoff location. Avoid storing a private residential address.';

COMMENT ON COLUMN "Item"."contactInfo" IS
    'Item-specific contact instructions. This is sensitive data and should not be exposed by public listing APIs.';

COMMENT ON COLUMN "Item"."isNegotiable" IS
    'Whether the seller is willing to negotiate the listed price.';

COMMENT ON COLUMN "Item"."publisherIp" IS
    'Normalized IPv4 or IPv6 address observed when the listing was submitted or published. Restricted to trusted administrators.';

COMMENT ON COLUMN "Item"."reviewedAt" IS
    'Timestamp of the final listing moderation decision.';

COMMENT ON COLUMN "Item"."reviewedById" IS
    'User ID of the administrator or moderator who made the final listing decision.';

CREATE INDEX "Item_reviewedById_idx" ON "Item"("reviewedById");
CREATE INDEX "Item_reviewedAt_idx" ON "Item"("reviewedAt");

ALTER TABLE "Item"
    ADD CONSTRAINT "Item_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 2. Order completion and real-world transaction state
-- -----------------------------------------------------------------------------

ALTER TABLE "Order"
    ADD COLUMN "transactionStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    ADD COLUMN "completedAt" TIMESTAMP(3);

COMMENT ON COLUMN "Order"."transactionStatus" IS
    'Real-world transaction state, separate from the existing order approval/payment workflow status.';

COMMENT ON COLUMN "Order"."completedAt" IS
    'Time when the buyer and seller confirmed that the transaction was completed.';

CREATE INDEX "Order_transactionStatus_idx" ON "Order"("transactionStatus");
CREATE INDEX "Order_completedAt_idx" ON "Order"("completedAt");

-- -----------------------------------------------------------------------------
-- 3. Shopping cart
-- -----------------------------------------------------------------------------

CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

COMMENT ON TABLE "Cart" IS
    'Persistent shopping cart owned by one user. Status can preserve lifecycle information after checkout.';

CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

COMMENT ON TABLE "CartItem" IS
    'Associates a cart with a unique second-hand listing. Quantity is omitted because each listing is treated as unique inventory.';

CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");
CREATE INDEX "Cart_status_idx" ON "Cart"("status");
CREATE INDEX "Cart_updatedAt_idx" ON "Cart"("updatedAt");

CREATE UNIQUE INDEX "CartItem_cartId_itemId_key" ON "CartItem"("cartId", "itemId");
CREATE INDEX "CartItem_itemId_idx" ON "CartItem"("itemId");
CREATE INDEX "CartItem_createdAt_idx" ON "CartItem"("createdAt");

ALTER TABLE "Cart"
    ADD CONSTRAINT "Cart_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CartItem"
    ADD CONSTRAINT "CartItem_cartId_fkey"
    FOREIGN KEY ("cartId") REFERENCES "Cart"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CartItem"
    ADD CONSTRAINT "CartItem_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "Item"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- -----------------------------------------------------------------------------
-- 4. Buyer/seller transaction evaluation system
-- -----------------------------------------------------------------------------

CREATE TABLE "TransactionReview" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TransactionReview_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "TransactionReview_distinct_users_check" CHECK ("authorId" <> "subjectId")
);

COMMENT ON TABLE "TransactionReview" IS
    'Mutual buyer/seller evaluation attached to an order. Each author can review an order only once.';

COMMENT ON COLUMN "TransactionReview"."status" IS
    'Moderation state for the review, such as PUBLISHED, HIDDEN, or REMOVED.';

CREATE UNIQUE INDEX "TransactionReview_orderId_authorId_key"
    ON "TransactionReview"("orderId", "authorId");
CREATE INDEX "TransactionReview_authorId_idx" ON "TransactionReview"("authorId");
CREATE INDEX "TransactionReview_subjectId_idx" ON "TransactionReview"("subjectId");
CREATE INDEX "TransactionReview_status_idx" ON "TransactionReview"("status");
CREATE INDEX "TransactionReview_createdAt_idx" ON "TransactionReview"("createdAt");

ALTER TABLE "TransactionReview"
    ADD CONSTRAINT "TransactionReview_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TransactionReview"
    ADD CONSTRAINT "TransactionReview_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransactionReview"
    ADD CONSTRAINT "TransactionReview_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
