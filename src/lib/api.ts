const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
export const AUTH_TOKEN_CHANGED_EVENT = "circulink:auth-token-changed";

class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  // Single-flight guard so concurrent 401s trigger only one refresh call.
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load tokens from localStorage on init
    this.token = localStorage.getItem("access_token");
    this.refreshToken = localStorage.getItem("refresh_token");
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("access_token", token);
    } else {
      localStorage.removeItem("access_token");
    }
    window.dispatchEvent(new CustomEvent(AUTH_TOKEN_CHANGED_EVENT, { detail: { token } }));
  }

  private setRefreshToken(token: string | null) {
    this.refreshToken = token;
    if (token) {
      localStorage.setItem("refresh_token", token);
    } else {
      localStorage.removeItem("refresh_token");
    }
  }

  private setTokens(tokens: { accessToken: string; refreshToken?: string } | null) {
    if (!tokens) {
      this.setToken(null);
      this.setRefreshToken(null);
      return;
    }
    this.setToken(tokens.accessToken);
    if (tokens.refreshToken) this.setRefreshToken(tokens.refreshToken);
  }

  getToken(): string | null {
    return this.token;
  }

  // Exchange the refresh token for a fresh access token. Concurrent callers
  // share one in-flight request; on failure both tokens are cleared.
  private ensureRefreshed(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async performRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!response.ok) {
        this.setTokens(null);
        return false;
      }
      const data = (await response.json()) as { tokens: { accessToken: string; refreshToken: string } };
      this.setTokens(data.tokens);
      return true;
    } catch {
      this.setTokens(null);
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // On a 401, try refreshing the access token once and replay the request.
    if (
      response.status === 401 &&
      !isRetry &&
      this.refreshToken &&
      !endpoint.startsWith("/auth/refresh")
    ) {
      const refreshed = await this.ensureRefreshed();
      if (refreshed) {
        return this.request<T>(endpoint, options, true);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new ApiError(
        response.status,
        errorData.error?.message || errorData.message || "Request failed",
        errorData.error?.code || errorData.code
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth endpoints
  async register(data: {
    email: string;
    password: string;
    name: string;
  }) {
    const response = await this.request<{ user: User; tokens: { accessToken: string; refreshToken: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.setTokens(response.tokens);
    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<{ user: User; tokens: { accessToken: string; refreshToken: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(response.tokens);
    return response;
  }

  async logout() {
    try {
      // Send the refresh token so the server can revoke it.
      if (this.refreshToken) {
        await this.request("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      }
    } finally {
      this.setTokens(null);
    }
  }

  async getCurrentUser() {
    if (!this.token) return { user: null };
    try {
      return await this.request<{ user: User }>("/auth/me");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.setTokens(null);
        return { user: null };
      }
      throw error;
    }
  }

  async updateProfile(data: { name?: string; phone?: string; university?: string; avatarUrl?: string }) {
    return this.request<{ data: User }>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(token: string) {
    return this.request<void>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async requestEmailVerification(email: string) {
    return this.request<{ data: { expiresAt: string } }>("/auth/verify/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async requestPasswordReset(email: string) {
    return this.request<{ data: { expiresAt?: string } }>("/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string) {
    return this.request<void>("/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  // Categories
  async getCategories() {
    return this.request<{ data: Category[] }>("/categories");
  }

  // Items
  async getItems(params?: {
    categoryId?: string;
    sellerId?: string;
    q?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request<{ data: Item[]; meta: PaginationMeta }>(`/items?${query}`);
  }

  async getItem(id: string) {
    return this.request<{ data: Item }>(`/items/${id}`);
  }

  async createItem(data: CreateItemInput) {
    return this.request<{ data: Item }>("/items", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateItem(id: string, data: Partial<CreateItemInput>) {
    return this.request<{ data: Item }>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteItem(id: string) {
    return this.request<void>(`/items/${id}`, { method: "DELETE" });
  }

  // Favorites
  async getFavorites(params?: { page?: number; pageSize?: number }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request<{ data: Favorite[]; meta: PaginationMeta }>(`/favorites?${query}`);
  }

  async addFavorite(itemId: string) {
    return this.request<{ data: Favorite }>("/favorites", {
      method: "POST",
      body: JSON.stringify({ itemId }),
    });
  }

  async removeFavorite(favoriteId: string) {
    return this.request<void>(`/favorites/${favoriteId}`, { method: "DELETE" });
  }

  async removeFavoriteByItemId(itemId: string) {
    const response = await this.getFavorites({ page: 1, pageSize: 100 });
    const favorite = response.data.find((entry) => entry.itemId === itemId);
    if (!favorite) return;
    await this.removeFavorite(favorite.id);
  }

  // Messages
  async getMessageThreads(params?: { page?: number; pageSize?: number }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request<{ data: MessageThread[]; meta: PaginationMeta }>(`/messages?${query}`);
  }

  async getThreads(params?: { itemId?: string; page?: number; pageSize?: number }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request<{ data: MessageThread[]; meta: PaginationMeta }>(`/messages?${query}`);
  }

  async getMessages(threadId: string, params?: { page?: number; pageSize?: number }) {
    const query = new URLSearchParams({ threadId });
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request<{ data: Message[]; meta: PaginationMeta }>(`/messages?${query}`);
  }

  async sendMessage(
    threadOrPayload:
      | string
      | {
          threadId?: string;
          itemId?: string;
          recipientId?: string;
          body: string;
        },
    body?: string
  ) {
    const payload =
      typeof threadOrPayload === "string"
        ? { threadId: threadOrPayload, body: body ?? "" }
        : threadOrPayload;
    return this.request<{ data: Message }>("/messages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async sendMessageWithRecipient(data: {
    threadId?: string;
    itemId?: string;
    recipientId?: string;
    body: string;
  }) {
    return this.sendMessage(data);
  }

  async markMessageRead(messageId: string) {
    return this.request<{ data: Message }>(`/messages/${messageId}/read`, {
      method: "PATCH",
    });
  }

  // Orders
  async createOrder(data: { itemId: string; total?: number }) {
    return this.request<{ data: Order }>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getOrders(params?: {
    role?: "buyer" | "seller";
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request<{ data: Order[]; meta: PaginationMeta }>(`/orders?${query}`);
  }

  async getOrderById(orderId: string) {
    return this.request<{ data: Order }>(`/orders/${orderId}`);
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.request<{ data: Order }>(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  // Donations
  async createDonation(data: CreateDonationInput) {
    return this.request<{ data: Item }>("/donations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getDonations(params?: {
    q?: string;
    categoryId?: string;
    sellerId?: string;
    status?: string;
    reviewStatus?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request<{ data: Item[]; meta: PaginationMeta }>(`/donations?${query}`);
  }

  // Reviews
  async getReviews(params?: {
    status?: string;
    targetType?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request<{ data: ReviewQueueEntry[]; meta: PaginationMeta }>(`/reviews?${query}`);
  }

  async getReview(id: string) {
    return this.request<{ data: ReviewQueueEntry }>(`/reviews/${id}`);
  }

  async approveReview(id: string, data: ReviewDecisionInput = {}) {
    return this.request<{ data: ReviewQueueEntry }>(`/reviews/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async rejectReview(id: string, data: ReviewDecisionInput = {}) {
    return this.request<{ data: ReviewQueueEntry }>(`/reviews/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async requestReviewChanges(id: string, data: ReviewDecisionInput = {}) {
    return this.request<{ data: ReviewQueueEntry }>(`/reviews/${id}/request-changes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async hideReview(id: string, data: ReviewDecisionInput = {}) {
    return this.request<{ data: ReviewQueueEntry }>(`/reviews/${id}/hide`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Admin
  async getAdminUsers(params?: {
    q?: string;
    role?: string;
    page?: number;
    pageSize?: number;
  }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return this.request<{ data: AdminUser[]; meta: PaginationMeta }>(`/admin/users?${query}`);
  }

  async updateAdminUserRole(id: string, role: UserRole) {
    return this.request<{ data: AdminUser }>(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  // AI
  async suggestItemFromImages(data: AiItemSuggestInput) {
    return this.request<{ data: AiItemSuggestResult }>("/ai/item-suggest", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Uploads
  async uploadFile(file: File, isRetry = false): Promise<{ data: { path: string } }> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}/uploads`, {
      method: "POST",
      headers,
      body: formData,
    });

    // Mirror request()'s 401 → refresh → replay behavior for uploads.
    if (response.status === 401 && !isRetry && this.refreshToken) {
      const refreshed = await this.ensureRefreshed();
      if (refreshed) {
        return this.uploadFile(file, true);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new ApiError(
        response.status,
        errorData.error?.message || "Upload failed",
        errorData.error?.code
      );
    }

    return response.json() as Promise<{ data: { path: string } }>;
  }
}

// Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole | string;
  emailVerifiedAt?: string | null;
  profile?: {
    phone?: string | null;
    university?: string | null;
    avatarUrl?: string | null;
  };
}

export type UserRole = "USER" | "CLUB_OPERATOR" | "BUY42_PARTNER" | "ADMIN";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole | string;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  price: string;
  condition: string;
  status: string;
  categoryId: string;
  sellerId: string;
  images: string[];
  category: Category;
  seller: { id: string; email: string; name: string | null };
  reviewStatus?: string;
  donor?: { id: string; email: string; name: string | null };
  donorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemInput {
  title: string;
  description: string;
  price: number;
  condition: string;
  status?: string;
  categoryId: string;
  images: string[];
}

export interface CreateDonationInput {
  description: string;
  categoryId: string;
  images: string[];
}

export interface Favorite {
  id: string;
  userId: string;
  itemId: string;
  item: Item;
  createdAt: string;
}

export interface MessageThread {
  id: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  item: { id: string; title: string; price: number; images: string[] };
  unreadCount: number;
  lastMessage: Message | null;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  itemId: string;
  buyerId: string;
  sellerId: string;
  status: string;
  total: number;
  item: { id: string; title: string; price: number; images: string[] };
  buyer: { id: string; email: string; name: string | null };
  seller: { id: string; email: string; name: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ReviewUserSummary {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface ReviewDecisionRecord {
  id: string;
  reviewId: string;
  reviewerId: string;
  decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "HIDE" | string;
  reasonCode?: string | null;
  comment?: string | null;
  createdAt: string;
  reviewer?: ReviewUserSummary;
}

export interface ReviewQueueEntry {
  id: string;
  targetType: "ITEM" | "DONATION" | string;
  targetId: string;
  submissionType: "NEW_LISTING" | "NEW_DONATION" | string;
  submittedById: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_CHANGES" | "HIDDEN" | string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | string;
  flags: string[];
  summary?: string | null;
  assignedReviewerId?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  submittedBy?: ReviewUserSummary;
  assignedReviewer?: ReviewUserSummary | null;
  reviewedBy?: ReviewUserSummary | null;
  decisions?: ReviewDecisionRecord[];
}

export interface ReviewDecisionInput {
  reasonCode?: string;
  comment?: string;
}

export interface AiItemSuggestInput {
  imagePaths: string[];
  userHint?: string;
  locale?: "zh" | "en";
}

export interface AiItemSuggestResult {
  title: string;
  description: string;
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
  suggestedPrice: number;
  minimumAcceptablePrice: number;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  confidence: number;
  warnings: string[];
  source: "llm" | "heuristic";
  model?: string;
}

export const apiClient = new ApiClient(API_BASE_URL);
export { ApiError };
