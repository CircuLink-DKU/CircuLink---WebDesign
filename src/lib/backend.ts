import { apiClient, ApiError, CreateItemInput } from './api';

const PROFILE_CACHE_KEY = 'profile_cache_v1';

type CachedProfile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  university: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

const readProfileCache = (): Record<string, CachedProfile> => {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CachedProfile>) : {};
  } catch {
    return {};
  }
};

const writeProfileCache = (cache: Record<string, CachedProfile>) => {
  localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
};

// Auth helpers for Express API
export const signUp = async (email: string, password: string, userData: {
  nickname: string;
  phone?: string;
}) => {
  try {
    const displayName = userData.nickname.trim();
    const response = await apiClient.register({
      email,
      password,
      name: displayName
    });

    if (userData.phone) {
      await apiClient.updateProfile({
        name: displayName,
        phone: userData.phone
      });
    }

    return { data: response, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const response = await apiClient.login(email, password);
    return { data: response, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

// Sign in using test account credentials from env (for local development)
export const signInTestUser = async () => {
  const email = import.meta.env.VITE_TEST_EMAIL as string | undefined;
  const password = import.meta.env.VITE_TEST_PASSWORD as string | undefined;

  if (!email || !password) {
    throw new Error('Set VITE_TEST_EMAIL and VITE_TEST_PASSWORD in your .env');
  }

  return await signIn(email, password);
};

// Dev helper: create the test user (if needed) and sign in.
export const createAndSignInTestUser = async () => {
  if (!import.meta.env.DEV) {
    throw new Error('createAndSignInTestUser is available only in development');
  }

  const email = (import.meta.env.VITE_TEST_EMAIL as string | undefined) ?? 'test@example.com';
  const password = (import.meta.env.VITE_TEST_PASSWORD as string | undefined) ?? 'password123';

  // Try signing in first
  const { data, error } = await signIn(email, password);
  if (!error) return { data, error: null };

  // If sign-in failed, attempt to sign up the user
  const { data: signupData, error: signupError } = await signUp(email, password, {
    nickname: 'Test User',
    phone: undefined
  });

  if (signupError) {
    return { data: signupData, error: signupError };
  }

  // Try signing in again after sign-up
  const { data: data2, error: error2 } = await signIn(email, password);
  return { data: data2, error: error2 };
};

export const resendVerificationEmail = async (email: string) => {
  try {
    const response = await apiClient.requestEmailVerification(email);
    return { data: response, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const signOut = async () => {
  try {
    await apiClient.logout();
    return { error: null };
  } catch (error) {
    return { error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await apiClient.getCurrentUser();
    return { user: response.user, error: null };
  } catch (error) {
    return { user: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

// Profile helpers (simplified - backend doesn't have separate profiles table yet)
export const getProfile = async (userId: string) => {
  try {
    const { user } = await getCurrentUser();
    if (user && user.id === userId) {
      const cached = readProfileCache()[userId];
      return { 
        data: {
          id: user.id,
          email: user.email,
          full_name: user.name || cached?.full_name || '',
          avatar_url: cached?.avatar_url || null,
          university: cached?.university || '',
          phone: cached?.phone || null,
          created_at: cached?.created_at || new Date().toISOString(),
          updated_at: cached?.updated_at || new Date().toISOString()
        }, 
        error: null 
      };
    }
    return { data: null, error: new Error('User not found') };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const updateProfile = async (userId: string, updates: Record<string, unknown>) => {
  try {
    const response = await apiClient.updateProfile({
      name: updates.full_name as string | undefined,
      phone: updates.phone as string | undefined,
      university: updates.university as string | undefined,
      avatarUrl: updates.avatar_url as string | undefined
    });

    const profile = response.data?.profile;
    const cached: CachedProfile = {
      id: response.data.id,
      email: response.data.email,
      full_name: response.data.name || '',
      avatar_url: profile?.avatarUrl || null,
      university: profile?.university || '',
      phone: profile?.phone || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const cache = readProfileCache();
    cache[userId] = cached;
    writeProfileCache(cache);
    return { data: cached, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

// Items helpers (migrated to Express API)
export const getItems = async (filters?: {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string[];
  status?: string;
}) => {
  try {
    const response = await apiClient.getItems({
      categoryId: filters?.category,
      q: filters?.search,
      minPrice: filters?.minPrice,
      maxPrice: filters?.maxPrice,
      condition: filters?.condition?.[0], // Backend expects single condition
      status: filters?.status
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const getItem = async (itemId: string) => {
  try {
    const response = await apiClient.getItem(itemId);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const createItem = async (itemData: CreateItemInput) => {
  try {
    const response = await apiClient.createItem(itemData);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const updateItem = async (itemId: string, updates: Partial<CreateItemInput>) => {
  try {
    const response = await apiClient.updateItem(itemId, updates);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const deleteItem = async (itemId: string) => {
  try {
    await apiClient.deleteItem(itemId);
    return { error: null };
  } catch (error) {
    return { error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

// Categories helpers
export const getCategories = async () => {
  try {
    const response = await apiClient.getCategories();
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

// Favorites helpers
export const getFavorites = async (userId: string) => {
  void userId;
  try {
    const response = await apiClient.getFavorites();
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const addToFavorites = async (userId: string, itemId: string) => {
  void userId;
  try {
    const response = await apiClient.addFavorite(itemId);
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const removeFromFavorites = async (userId: string, itemId: string) => {
  void userId;
  try {
    await apiClient.removeFavoriteByItemId(itemId);
    return { error: null };
  } catch (error) {
    return { error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

// Messages helpers
export const getMessages = async (userId: string, itemId?: string) => {
  try {
    const response = await apiClient.getThreads({ itemId });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const sendMessage = async (messageData: {
  sender_id: string;
  receiver_id: string;
  item_id: string;
  content: string;
}) => {
  try {
    const response = await apiClient.sendMessage({
      itemId: messageData.item_id,
      recipientId: messageData.receiver_id,
      body: messageData.content
    });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};

export const markMessageAsRead = async (messageId: string) => {
  try {
    await apiClient.markMessageRead(messageId);
    return { error: null };
  } catch (error) {
    return { error: error instanceof ApiError ? error : new Error(String(error)) };
  }
};
