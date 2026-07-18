type ReviewRiskLevel = "LOW" | "MEDIUM" | "HIGH";
type ReviewTargetType = "ITEM" | "DONATION";
type ReviewSubmissionType = "NEW_LISTING" | "NEW_DONATION";

export type ReviewAssessment = {
  shouldReview: boolean;
  riskLevel: ReviewRiskLevel;
  flags: string[];
  summary: string;
};

const REVIEW_KEYWORDS = [
  "wechat",
  "微信",
  "qr",
  "二维码",
  "transfer",
  "转账",
  "deposit",
  "押金",
  "cash only",
  "私聊",
  "outside platform",
  "站外"
];

const SENSITIVE_CATEGORY_SLUGS = new Set(["food-snacks", "power-batteries", "tools-accessories"]);

const containsReviewKeyword = (value: string) => {
  const normalized = value.toLowerCase();
  return REVIEW_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
};

const buildAssessment = (flags: string[]): ReviewAssessment => {
  if (flags.length === 0) {
    return {
      shouldReview: false,
      riskLevel: "LOW",
      flags,
      summary: "No review-triggering rules matched."
    };
  }

  const riskLevel: ReviewRiskLevel = flags.some((flag) =>
    ["external_payment", "missing_images", "high_value"].includes(flag)
  )
    ? "HIGH"
    : "MEDIUM";

  return {
    shouldReview: true,
    riskLevel,
    flags,
    summary: `Matched review rules: ${flags.join(", ")}.`
  };
};

export const assessListingSubmission = (input: {
  title: string;
  description: string;
  price: number;
  images: string[];
  category?: { slug: string; name: string } | null;
}): ReviewAssessment => {
  const flags: string[] = [];
  const text = `${input.title}\n${input.description}`;

  if (input.images.length === 0) flags.push("missing_images");
  if (input.price >= 1000) flags.push("high_value");
  if (containsReviewKeyword(text)) flags.push("external_payment");
  if (input.category && SENSITIVE_CATEGORY_SLUGS.has(input.category.slug)) flags.push("sensitive_category");

  return buildAssessment(flags);
};

export const assessDonationSubmission = (input: {
  description: string;
  images: string[];
  category?: { slug: string; name: string } | null;
}): ReviewAssessment => {
  const flags: string[] = [];

  if (input.images.length === 0) flags.push("missing_images");
  if (containsReviewKeyword(input.description)) flags.push("external_payment");
  if (input.category && SENSITIVE_CATEGORY_SLUGS.has(input.category.slug)) flags.push("sensitive_category");

  return buildAssessment(flags);
};

export type CreateReviewInput = {
  targetType: ReviewTargetType;
  targetId: string;
  submissionType: ReviewSubmissionType;
  submittedById: string;
  assessment: ReviewAssessment;
};
