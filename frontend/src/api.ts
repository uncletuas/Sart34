export type Session = {
  accessToken: string;
  refreshToken: string;
};

export type Workspace = {
  id: string;
  name: string;
  type: "BUSINESS" | "AGENCY" | "CLIENT";
  industry?: string;
  whatsappNumber?: string;
  email?: string;
  defaultCurrency: string;
  wallet?: { balance: number };
};

export type Campaign = {
  id: string;
  workspaceId: string;
  name: string;
  goal: string;
  platform: string;
  status: string;
  objective?: string;
  aiStrategyJson?: Record<string, unknown>;
  policyReviews?: Array<{ riskLevel: string; humanStatus: string; flaggedReasons: string[] }>;
  creatives?: Array<Creative>;
  createdAt: string;
};

export type Creative = {
  id: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
};

export type Lead = {
  id: string;
  fullName: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  interest?: string;
  status: string;
  temperature: string;
  campaign?: Campaign;
  createdAt: string;
};

export type SocialPost = {
  id: string;
  workspaceId: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: string;
  platforms: string[];
  status: "DRAFT" | "PUBLISHING" | "PUBLISHED" | "PARTIAL" | "FAILED";
  results?: Array<{ platform: string; status: string; note: string }>;
  publishedAt?: string;
  createdAt: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

export class ApiClient {
  private accessToken = localStorage.getItem("sart34.accessToken") ?? "";
  private refreshToken = localStorage.getItem("sart34.refreshToken") ?? "";

  get authenticated() {
    return Boolean(this.accessToken);
  }

  saveSession(session: Session) {
    this.accessToken = session.accessToken;
    this.refreshToken = session.refreshToken;
    localStorage.setItem("sart34.accessToken", session.accessToken);
    localStorage.setItem("sart34.refreshToken", session.refreshToken);
  }

  clearSession() {
    this.accessToken = "";
    this.refreshToken = "";
    localStorage.removeItem("sart34.accessToken");
    localStorage.removeItem("sart34.refreshToken");
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (this.accessToken) headers.set("Authorization", `Bearer ${this.accessToken}`);

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(Array.isArray(body.message) ? body.message.join(", ") : body.message ?? "Request failed");
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  register(payload: { name: string; email: string }) {
    return this.request<Session>("/auth/register", { method: "POST", body: JSON.stringify(payload) });
  }

  login(payload: { email: string; password: string }) {
    return this.request<Session>("/auth/login", { method: "POST", body: JSON.stringify(payload) });
  }

  me() {
    return this.request<{ id: string; firstName: string; email: string; role: string; memberships: Array<{ workspace: Workspace }> }>("/auth/me");
  }

  workspaces() {
    return this.request<Workspace[]>("/workspaces");
  }

  createWorkspace(payload: Record<string, unknown>) {
    return this.request<Workspace>("/workspaces", { method: "POST", body: JSON.stringify(payload) });
  }

  overview(workspaceId: string) {
    return this.request<{ campaigns: Array<{ status: string; _count: number }>; leads: Array<{ status: string; _count: number }>; walletBalance: number }>(
      `/reports/overview?workspaceId=${workspaceId}`
    );
  }

  campaigns(workspaceId: string) {
    return this.request<Campaign[]>(`/campaigns?workspaceId=${workspaceId}`);
  }

  createCampaign(payload: Record<string, unknown>) {
    return this.request<Campaign>("/campaigns", { method: "POST", body: JSON.stringify(payload) });
  }

  generateCampaign(id: string) {
    return this.request<Record<string, unknown>>(`/campaigns/${id}/generate-ai`, { method: "POST", body: JSON.stringify({ mode: "quick" }) });
  }

  reviewCampaign(id: string) {
    return this.request(`/campaigns/${id}/review-policy`, { method: "POST" });
  }

  approveCampaign(id: string) {
    return this.request(`/campaigns/${id}/approve`, { method: "POST", body: JSON.stringify({ notes: "Approved from web dashboard." }) });
  }

  launchCampaign(id: string) {
    return this.request(`/campaigns/${id}/launch`, { method: "POST" });
  }

  leads(workspaceId: string) {
    return this.request<Lead[]>(`/leads?workspaceId=${workspaceId}`);
  }

  createLead(payload: Record<string, unknown>) {
    return this.request<Lead>("/leads", { method: "POST", body: JSON.stringify(payload) });
  }

  updateLead(id: string, payload: Record<string, unknown>) {
    return this.request<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  }

  wallet(workspaceId: string) {
    return this.request<{ balance: number; transactions: Array<{ id: string; amount: number; reason: string; createdAt: string }> }>(
      `/wallet?workspaceId=${workspaceId}`
    );
  }

  buyCredits(workspaceId: string, bundleId = "starter-credits") {
    return this.request("/wallet/buy-credits", { method: "POST", body: JSON.stringify({ workspaceId, bundleId }) });
  }

  integrations(workspaceId: string) {
    return this.request<Array<{ id: string; provider: string; accountName?: string; status: string; metadata?: unknown }>>(
      `/integrations?workspaceId=${workspaceId}`
    );
  }

  metaConnect(workspaceId: string) {
    return this.request<{ authorizationUrl: string | null; message: string }>("/integrations/meta/connect", {
      method: "POST",
      body: JSON.stringify({ workspaceId })
    });
  }

  googleConnect(workspaceId: string) {
    return this.request<{ authorizationUrl: string | null; message: string }>("/integrations/google/connect", {
      method: "POST",
      body: JSON.stringify({ workspaceId })
    });
  }

  tiktokConnect(workspaceId: string) {
    return this.request<{ authorizationUrl: string | null; message: string }>("/integrations/tiktok/connect", {
      method: "POST",
      body: JSON.stringify({ workspaceId })
    });
  }

  whatsappConnect(workspaceId: string) {
    return this.request<{ authorizationUrl: string | null; message: string }>("/integrations/whatsapp/connect", {
      method: "POST",
      body: JSON.stringify({ workspaceId })
    });
  }

  removeIntegration(integrationId: string) {
    return this.request<{ success: boolean }>(`/integrations/${integrationId}`, { method: "DELETE" });
  }

  syncIntegration(integrationId: string) {
    return this.request<unknown>(`/integrations/${integrationId}/sync`, { method: "POST" });
  }

  templates() {
    return this.request<Array<{
      id: string;
      industry: string;
      name: string;
      goal: string;
      description: string;
      defaultDurationDays: number;
      defaultDailyBudget: number;
      callToAction: string;
      audienceHints: string;
      copyExamples: string[];
      recommendedPlatforms: string[];
    }>>("/templates");
  }

  uploadCreative(file: File, workspaceId: string, campaignId?: string) {
    const form = new FormData();
    form.append("file", file);
    const query = new URLSearchParams({ workspaceId });
    if (campaignId) query.set("campaignId", campaignId);
    return this.request<Creative & { workspaceId: string }>(`/creatives/upload?${query.toString()}`, {
      method: "POST",
      body: form
    });
  }

  creatives(workspaceId: string) {
    return this.request<Array<Creative & { workspaceId: string; createdAt: string }>>(`/creatives?workspaceId=${workspaceId}`);
  }

  deleteCreative(id: string) {
    return this.request<{ success: boolean }>(`/creatives/${id}`, { method: "DELETE" });
  }

  attachCreatives(campaignId: string, creativeIds: string[]) {
    return this.request<unknown>(`/campaigns/${campaignId}/creatives`, {
      method: "POST",
      body: JSON.stringify({ creativeIds })
    });
  }

  campaignMetrics(campaignId: string) {
    return this.request<Array<{ id: string; date: string; impressions: number; clicks: number; leads: number; spend: number; reach: number; costPerLead: number; conversions: number }>>(`/campaigns/${campaignId}/metrics`);
  }

  campaign(campaignId: string) {
    return this.request<Campaign & { copies?: Array<{ id: string; primaryText: string; headline?: string; description?: string; cta?: string }>; leadQuestions?: Array<{ id: string; question: string }>; metrics?: Array<{ date: string; impressions: number; clicks: number; leads: number; spend: number }> }>(`/campaigns/${campaignId}`);
  }

  pauseCampaign(id: string) { return this.request<unknown>(`/campaigns/${id}/pause`, { method: "POST" }); }
  resumeCampaign(id: string) { return this.request<unknown>(`/campaigns/${id}/resume`, { method: "POST" }); }
  archiveCampaign(id: string) { return this.request<unknown>(`/campaigns/${id}`, { method: "DELETE" }); }
  optimizeCampaign(id: string) { return this.request<Record<string, string[]>>(`/campaigns/${id}/optimize`, { method: "POST" }); }

  generateLeadFollowUp(leadId: string, channel: "WHATSAPP" | "SMS" | "EMAIL" | "CALL") {
    return this.request<{ message: string; suggested_next_action?: string; temperature?: string }>(`/leads/${leadId}/generate-follow-up`, {
      method: "POST",
      body: JSON.stringify({ channel })
    });
  }

  addLeadNote(leadId: string, note: string) {
    return this.request<unknown>(`/leads/${leadId}/notes`, {
      method: "POST",
      body: JSON.stringify({ note })
    });
  }

  workspaceDetail(id: string) {
    return this.request<Workspace & { members: Array<{ id: string; role: string; user: { id: string; firstName: string; lastName: string; email: string } }> }>(`/workspaces/${id}`);
  }

  inviteMember(workspaceId: string, email: string, role: string = "MARKETING_MANAGER") {
    return this.request<unknown>(`/workspaces/${workspaceId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email, role })
    });
  }

  walletTransactions(workspaceId: string) {
    return this.request<Array<{ id: string; amount: number; reason: string; createdAt: string; type: string }>>(`/wallet/transactions?workspaceId=${workspaceId}`);
  }

  posts(workspaceId: string) {
    return this.request<SocialPost[]>(`/posts?workspaceId=${workspaceId}`);
  }

  createPost(payload: { workspaceId: string; caption: string; mediaUrl?: string; mediaType?: string; platforms: string[] }) {
    return this.request<SocialPost>("/posts", { method: "POST", body: JSON.stringify(payload) });
  }

  publishPost(id: string) {
    return this.request<SocialPost>(`/posts/${id}/publish`, { method: "POST" });
  }

  deletePost(id: string) {
    return this.request<{ success: boolean }>(`/posts/${id}`, { method: "DELETE" });
  }

  adminUsers() {
    return this.request<Array<{ id: string; firstName: string; lastName: string; email: string; role: string; isActive: boolean; createdAt: string }>>("/admin/users");
  }

  adminWorkspaces() {
    return this.request<Array<Workspace & { members?: unknown[] }>>("/admin/workspaces");
  }

  adminCampaigns() {
    return this.request<Campaign[]>("/admin/campaigns");
  }

  adminFlaggedCampaigns() {
    return this.request<Array<{ id: string; riskLevel: string; humanStatus: string; flaggedReasons: string[]; campaign?: Campaign; createdAt: string }>>("/admin/flagged-campaigns");
  }
}

export const api = new ApiClient();
