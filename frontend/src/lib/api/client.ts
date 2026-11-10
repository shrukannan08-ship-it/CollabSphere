/**
 * Typed API client for the CollabSphere backend.
 * All requests go through this client — never raw fetch in pages/components.
 */

import { browser } from '$app/environment';
import { goto } from '$app/navigation';

const rawApiBase = import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:8081/api/v1';
const API_BASE = rawApiBase.replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ApiError {
  error: string;
  code: string;
  details?: { field: string; message: string }[];
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: { field: string; message: string }[]
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ---------------------------------------------------------------------------
// Auth token management (in-memory + localStorage for persistence)
// ---------------------------------------------------------------------------
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

const STORAGE_KEYS = {
  accessToken: 'cs_access_token',
  refreshToken: 'cs_refresh_token',
} as const;

export function setTokens(accessToken: string, refreshToken: string): void {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
  if (browser) {
    localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  }
}

export function clearTokens(): void {
  _accessToken = null;
  _refreshToken = null;
  if (browser) {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  }
}

export function loadStoredTokens(): void {
  if (!browser) return;
  _accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
  _refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

function notifyRefreshSubscribers(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function attemptTokenRefresh(): Promise<string | null> {
  if (!_refreshToken) return null;

  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeToRefresh(resolve);
    });
  }

  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: _refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const json = (await res.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
    setTokens(json.data.accessToken, json.data.refreshToken);
    notifyRefreshSubscribers(json.data.accessToken);
    return json.data.accessToken;
  } catch {
    clearTokens();
    return null;
  } finally {
    isRefreshing = false;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  };

  if (!skipAuth && _accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  let response = await fetch(url, { ...fetchOptions, headers });

  // 401 — try token refresh
  if (response.status === 401 && !skipAuth) {
    const newToken = await attemptTokenRefresh();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...fetchOptions, headers });
    } else {
      // Refresh failed — redirect to login
      clearTokens();
      if (browser) goto('/login');
      throw new ApiClientError(401, 'UNAUTHENTICATED', 'Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = (await response.json()) as ApiError;
    } catch {
      errorData = { error: 'Request failed', code: 'NETWORK_ERROR' };
    }
    throw new ApiClientError(
      response.status,
      errorData.code,
      errorData.error,
      errorData.details
    );
  }

  return response.json() as Promise<T>;
}

// Convenience methods
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<ApiResponse<T>>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<ApiResponse<T>>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<ApiResponse<T>>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<ApiResponse<T>>(endpoint, { method: 'DELETE', ...options }),
};

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  username: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  message?: string;
}

export const authApi = {
  register: (input: RegisterInput) =>
    api.post<AuthResponse>('/auth/register', input, { skipAuth: true } as RequestInit),

  login: (input: LoginInput) =>
    api.post<AuthResponse>('/auth/login', input, { skipAuth: true } as RequestInit),

  logout: (refreshToken: string) =>
    api.post<{ message: string }>('/auth/logout', { refreshToken }),

  verifyEmail: (token: string) =>
    api.post<{ message: string }>('/auth/verify-email', { token }, { skipAuth: true } as RequestInit),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }, { skipAuth: true } as RequestInit),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }, { skipAuth: true } as RequestInit),

  me: () => api.get<AuthUser>('/auth/me'),
};

// ---------------------------------------------------------------------------
// Users API
// ---------------------------------------------------------------------------
export interface UserProjectSummary {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  status: string;
  domain: string | null;
  tags: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  role: string;
  isOwner: boolean;
  skills: string[];
}

export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  headline: string | null;
  institution: string | null;
  department: string | null;
  degree: string | null;
  yearOfStudy: number | null;
  graduationYear: number | null;
  city: string | null;
  country: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  websiteUrl: string | null;
  isPublic: boolean;
  openToCollaborate: boolean;
  emailVerified: boolean;
  verificationStatus: string;
  role: string;
  skills: Skill[];
  projects?: UserProjectSummary[];
  connectionCount: number;
  followerCount: number;
  followingCount: number;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years: number | null;
  isPrimary: boolean;
  endorsementCount: number;
}

export const usersApi = {
  getMe: () => api.get<StudentProfile>('/users/me'),
  updateMe: (data: Partial<StudentProfile>) => api.patch<StudentProfile>('/users/me', data),
  getProfile: (username: string) => api.get<StudentProfile>(`/users/${username}`),

  addSkill: (data: { skillName?: string; skillId?: string; level?: string }) =>
    api.post<Skill[]>('/users/me/skills', data),
  removeSkill: (skillId: string) => api.delete(`/users/me/skills/${skillId}`),

  search: (params: Record<string, string | number | boolean | undefined>) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    return api.get<StudentProfile[]>(`/users/search?${qs}`);
  },

  getSkills: (q?: string) =>
    api.get<Array<{ id: string; name: string; slug: string; category: string | null }>>(
      q ? `/users/skills?q=${encodeURIComponent(q)}` : '/users/skills'
    ),

  sendConnectionRequest: (addresseeId: string, message?: string) =>
    api.post<{ message: string }>('/users/connections/request', { addresseeId, message }),

  respondToConnection: (id: string, action: 'accept' | 'reject') =>
    api.patch<{ message: string }>(`/users/connections/${id}/respond`, { action }),

  getConnections: (type: 'all' | 'pending' | 'sent' = 'all') =>
    api.get<unknown[]>(`/users/connections/list?type=${type}`),
};

// ---------------------------------------------------------------------------
// Projects API
// ---------------------------------------------------------------------------
export interface ProjectSkill {
  id: string;
  name: string;
  slug: string;
  isRequired: boolean;
}

export interface ProjectMemberDetail {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  contribution: string | null;
  joinedAt: string;
}

export interface ProjectDetail {
  id: string;
  teamId: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  status: 'planning' | 'active' | 'completed' | 'archived' | 'on_hold';
  domain: string | null;
  tags: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  documentationUrl: string | null;
  isPublic: boolean;
  isFeatured: boolean;
  teamSize: number;
  recruitmentStatus: 'open' | 'closed';
  startDate: string | null;
  endDate: string | null;
  thumbnailUrl: string | null;
  createdBy: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  skills: ProjectSkill[];
  members?: ProjectMemberDetail[];
}

export interface CreateProjectInput {
  name: string;
  title?: string;
  tagline?: string;
  description: string;
  domain?: string;
  category?: string;
  tags?: string[];
  status?: 'planning' | 'active' | 'completed' | 'archived' | 'on_hold';
  githubUrl?: string;
  demoUrl?: string;
  documentationUrl?: string;
  isPublic?: boolean;
  requiredSkills?: string[];
  teamSize?: number;
  recruitmentStatus?: 'open' | 'closed';
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {}

export interface JoinRequestDetail {
  id: string;
  projectId: string;
  projectName?: string;
  projectDomain?: string | null;
  requesterId: string;
  requesterName: string;
  requesterUsername: string;
  requesterAvatarUrl: string | null;
  requesterHeadline: string | null;
  requesterSkills: string[];
  targetUserId: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  responseMessage: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const projectsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => {
    const qs = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return api.get<ProjectDetail[]>(`/projects${qs ? `?${qs}` : ''}`);
  },

  getMyProjects: () => api.get<ProjectDetail[]>('/projects/user/me'),

  get: (id: string) => api.get<ProjectDetail>(`/projects/${id}`),

  create: (data: CreateProjectInput) => api.post<ProjectDetail>('/projects', data),

  update: (id: string, data: UpdateProjectInput) => api.patch<ProjectDetail>(`/projects/${id}`, data),

  updateRecruitment: (id: string, status: 'open' | 'closed') =>
    api.patch<ProjectDetail>(`/projects/${id}/recruitment`, { status }),

  delete: (id: string) => api.delete<{ message: string }>(`/projects/${id}`),

  createJoinRequest: (projectId: string, data: { message?: string | null }) =>
    api.post<JoinRequestDetail>(`/projects/${projectId}/requests`, data),

  getJoinRequests: (projectId: string, status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return api.get<JoinRequestDetail[]>(`/projects/${projectId}/requests${qs}`);
  },

  getMyJoinRequest: (projectId: string) =>
    api.get<JoinRequestDetail | null>(`/projects/${projectId}/my-request`),

  reviewJoinRequest: (
    projectId: string,
    requestId: string,
    data: { status: 'accepted' | 'rejected'; responseMessage?: string | null }
  ) => api.patch<JoinRequestDetail>(`/projects/${projectId}/requests/${requestId}`, data),

  getMySentJoinRequests: () =>
    api.get<JoinRequestDetail[]>('/projects/user/my-requests'),
};

// ---------------------------------------------------------------------------
// Positions & Applications API (Phase 2)
// ---------------------------------------------------------------------------
export interface PositionDetail {
  id: string;
  projectId: string | null;
  projectName?: string;
  projectSlug?: string;
  teamId: string | null;
  title: string;
  description: string;
  responsibilities: string | null;
  requiredSkills: string[];
  niceToHave: string[];
  slots: number;
  filledSlots: number;
  isOpen: boolean;
  createdBy: string;
  creatorName?: string;
  creatorUsername?: string;
  createdAt: string;
  updatedAt: string;
  applicationCount?: number;
}

export interface ApplicationDetail {
  id: string;
  positionId: string;
  positionTitle?: string;
  projectId?: string;
  projectName?: string;
  applicantId: string;
  applicantName: string;
  applicantUsername: string;
  applicantAvatarUrl: string | null;
  applicantHeadline: string | null;
  status: 'pending' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';
  coverNote: string | null;
  relevantSkills: string[];
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
  createdAt: string;
}

export interface CreatePositionInput {
  projectId: string;
  title: string;
  description: string;
  responsibilities?: string;
  requiredSkills: string[];
  niceToHave?: string[];
  slots?: number;
  isOpen?: boolean;
}

export interface UpdatePositionInput extends Partial<Omit<CreatePositionInput, 'projectId'>> {}

export interface ApplyPositionInput {
  coverNote: string;
  relevantSkills?: string[];
}

export interface ReviewApplicationInput {
  status: 'accepted' | 'rejected' | 'under_review';
  reviewerNote?: string;
}

export const positionsApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) => {
    const qs = params
      ? new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return api.get<PositionDetail[]>(`/positions${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => api.get<PositionDetail>(`/positions/${id}`),

  create: (data: CreatePositionInput) => api.post<PositionDetail>('/positions', data),

  update: (id: string, data: UpdatePositionInput) => api.patch<PositionDetail>(`/positions/${id}`, data),

  delete: (id: string) => api.delete<{ message: string }>(`/positions/${id}`),

  apply: (positionId: string, data: ApplyPositionInput) =>
    api.post<ApplicationDetail>(`/positions/${positionId}/apply`, data),

  getApplications: (positionId: string) =>
    api.get<ApplicationDetail[]>(`/positions/${positionId}/applications`),

  getMyApplications: () =>
    api.get<ApplicationDetail[]>('/positions/my-applications'),

  reviewApplication: (applicationId: string, data: ReviewApplicationInput) =>
    api.patch<ApplicationDetail>(`/positions/applications/${applicationId}/review`, data),

  withdrawApplication: (applicationId: string) =>
    api.post<ApplicationDetail>(`/positions/applications/${applicationId}/withdraw`, {}),
};

// ---------------------------------------------------------------------------
// Discussions API (Phase 3)
// ---------------------------------------------------------------------------
export interface ThreadReplyDetail {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreadDetail {
  id: string;
  projectId: string;
  projectName?: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  title: string;
  content: string;
  isPinned: boolean;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  replies?: ThreadReplyDetail[];
}

export interface CreateThreadInput {
  projectId: string;
  title: string;
  content: string;
  isPinned?: boolean;
}

export interface UpdateThreadInput {
  title?: string;
  content?: string;
  isPinned?: boolean;
}

export const discussionsApi = {
  listThreads: (projectId: string, page = 1, limit = 20) =>
    api.get<ThreadDetail[]>(`/discussions/threads?projectId=${projectId}&page=${page}&limit=${limit}`),

  getThread: (id: string) =>
    api.get<ThreadDetail>(`/discussions/threads/${id}`),

  createThread: (data: CreateThreadInput) =>
    api.post<ThreadDetail>('/discussions/threads', data),

  updateThread: (id: string, data: UpdateThreadInput) =>
    api.patch<ThreadDetail>(`/discussions/threads/${id}`, data),

  deleteThread: (id: string) =>
    api.delete<{ message: string }>(`/discussions/threads/${id}`),

  createReply: (threadId: string, content: string, parentId?: string | null) =>
    api.post<ThreadReplyDetail>(`/discussions/threads/${threadId}/replies`, { content, parentId }),

  updateReply: (replyId: string, content: string) =>
    api.patch<ThreadReplyDetail>(`/discussions/replies/${replyId}`, { content }),

  deleteReply: (replyId: string) =>
    api.delete<{ message: string }>(`/discussions/replies/${replyId}`),
};

// ---------------------------------------------------------------------------
// Notifications API (Phase 3)
// ---------------------------------------------------------------------------
export interface NotificationDetail {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  actorId: string | null;
  actorName: string | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const notificationsApi = {
  list: (limit = 20) =>
    api.get<NotificationDetail[]>(`/notifications?limit=${limit}`),

  markAsRead: (id: string) =>
    api.patch<{ message: string }>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.post<{ message: string }>('/notifications/read-all'),
};



