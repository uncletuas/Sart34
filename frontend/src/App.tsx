import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Eye,
  FolderOpen,
  Home,
  ImagePlus,
  Inbox,
  Layout,
  Globe,
  Loader2,
  LogOut,
  Mail,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  Pause,
  PenLine,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  UserRound,
  Users,
  Wallet,
  X,
  Zap
} from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, Campaign, Creative, Lead, SocialPost, Workspace } from "./api";

type Toast = { type: "success" | "error" | "info"; message: string };
type BusinessTab = "home" | "library" | "inbox" | "profile";
type AdminTab = "admin-home" | "admin-review" | "admin-users" | "admin-profile";

type IntegrationAccount = { id: string; provider: string; accountName?: string; status: string };

type Template = {
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
};

type Requirement = { key: string; label: string; hint?: string; type?: "text" | "url" | "tel" | "select"; options?: string[] };

type PlatformDef = {
  id: string;
  name: string;
  short: string;
  surfaces: string[];
  accent: string;
  glyph: string;
  formats: string[];
  adStructure: string;
  requirements: Requirement[];
  supportsOrganicPost: boolean;
  postCaptionLimit: number;
  postNote: string;
  connect: (workspaceId: string) => Promise<{ authorizationUrl: string | null; message: string }>;
};

const PLATFORMS: PlatformDef[] = [
  {
    id: "META",
    name: "Meta",
    short: "Facebook + Instagram",
    surfaces: ["Instagram Feed", "Reels", "Stories", "Facebook Feed", "Marketplace"],
    accent: "#1877F2",
    glyph: "ƒ",
    formats: ["Single image 1:1 / 4:5", "Video & Reels 9:16", "Carousel", "Collection"],
    adStructure: "Campaign → Ad set (budget, audience, placements) → Ad",
    requirements: [
      { key: "page", label: "Facebook Page" },
      { key: "instagram", label: "Instagram account", hint: "Optional, needed for Instagram placements" },
      { key: "adAccount", label: "Meta ad account" },
      { key: "pixel", label: "Pixel / Conversions API", hint: "Tracks conversions and powers optimization" },
      { key: "payment", label: "Payment method on the ad account" }
    ],
    supportsOrganicPost: true,
    postCaptionLimit: 2200,
    postNote: "Posts as a Page / Instagram feed post or Reel.",
    connect: (workspaceId) => api.metaConnect(workspaceId)
  },
  {
    id: "GOOGLE",
    name: "Google Ads",
    short: "Search, YouTube, Display, PMax",
    surfaces: ["Google Search", "YouTube", "Display Network", "Discover", "Gmail", "Maps"],
    accent: "#1A73E8",
    glyph: "G",
    formats: ["Responsive Search Ad", "Performance Max", "Display", "Video"],
    adStructure: "Campaign (Search / PMax / Display / Video) → Ad group or Asset group → Ad",
    requirements: [
      { key: "adAccount", label: "Google Ads account + billing" },
      { key: "businessName", label: "Business name" },
      { key: "finalUrl", label: "Final URL", type: "url" },
      { key: "headlines", label: "5 to 15 headlines, max 30 characters each" },
      { key: "descriptions", label: "2 to 4 descriptions, max 90 characters each" },
      { key: "conversion", label: "Conversion tracking (Google tag)" }
    ],
    supportsOrganicPost: false,
    postCaptionLimit: 0,
    postNote: "Google is an ads network, not a social feed — used for ad campaigns only.",
    connect: (workspaceId) => api.googleConnect(workspaceId)
  },
  {
    id: "TIKTOK",
    name: "TikTok",
    short: "For You + Spark Ads",
    surfaces: ["For You feed", "TopView", "Spark Ads"],
    accent: "#000000",
    glyph: "♪",
    formats: ["In-feed video 9:16 (9-60s)", "Spark Ad (boost an organic post)"],
    adStructure: "Campaign → Ad group (budget, audience) → Ad",
    requirements: [
      { key: "adAccount", label: "TikTok Ads Manager account" },
      { key: "identity", label: "TikTok Business account / identity" },
      { key: "pixel", label: "TikTok Pixel" },
      { key: "payment", label: "Payment method" }
    ],
    supportsOrganicPost: true,
    postCaptionLimit: 2200,
    postNote: "Posts as a native vertical video; sound-on works best.",
    connect: (workspaceId) => api.tiktokConnect(workspaceId)
  },
  {
    id: "WHATSAPP",
    name: "WhatsApp Business",
    short: "Click to chat + Catalog",
    surfaces: ["Click-to-WhatsApp ads", "Status", "Broadcast", "Catalog"],
    accent: "#25D366",
    glyph: "✓",
    formats: ["Click to chat", "Status update", "Broadcast template", "Catalog message"],
    adStructure: "Click-to-WhatsApp ads are created and run through Meta Ads Manager",
    requirements: [
      { key: "whatsappNumber", label: "Verified WhatsApp Business number", type: "tel" },
      { key: "businessProfile", label: "Business profile (logo, hours, address)" },
      { key: "template", label: "Approved message templates", hint: "Required for broadcasts" }
    ],
    supportsOrganicPost: true,
    postCaptionLimit: 1024,
    postNote: "Publishes as a Status update; broadcasts need an approved template.",
    connect: (workspaceId) => api.whatsappConnect(workspaceId)
  },
  {
    id: "LINKEDIN",
    name: "LinkedIn",
    short: "B2B feed + lead gen",
    surfaces: ["LinkedIn Feed (Sponsored Content)", "Message Ads", "Conversation Ads"],
    accent: "#0A66C2",
    glyph: "in",
    formats: ["Single image", "Video", "Carousel", "Document ad", "Lead gen form"],
    adStructure: "Campaign group → Campaign (objective, audience) → Ad",
    requirements: [
      { key: "page", label: "LinkedIn Page" },
      { key: "adAccount", label: "Campaign Manager ad account + billing" },
      { key: "insightTag", label: "LinkedIn Insight Tag", hint: "Conversion tracking" },
      { key: "audience", label: "Audience by job title, seniority, function, industry" }
    ],
    supportsOrganicPost: true,
    postCaptionLimit: 3000,
    postNote: "Posts to the company Page; professional tone performs best.",
    connect: (workspaceId) => api.linkedinConnect(workspaceId)
  },
  {
    id: "X",
    name: "X",
    short: "Promoted posts",
    surfaces: ["Home timeline", "Search", "Profiles"],
    accent: "#000000",
    glyph: "𝕏",
    formats: ["Promoted post", "Image", "Video", "Carousel"],
    adStructure: "Campaign (objective, budget) → Ad group → Ad (promoted post)",
    requirements: [
      { key: "profile", label: "X profile to promote from" },
      { key: "adAccount", label: "X Ads account + billing" },
      { key: "audience", label: "Audience by interests, keywords, follower lookalikes" }
    ],
    supportsOrganicPost: true,
    postCaptionLimit: 280,
    postNote: "Posts must fit 280 characters.",
    connect: (workspaceId) => api.xConnect(workspaceId)
  }
];

const PLATFORM_BY_ID = Object.fromEntries(PLATFORMS.map((platform) => [platform.id, platform]));

const campaignGoals: Array<[string, string]> = [
  ["WHATSAPP_MESSAGES", "WhatsApp messages"],
  ["GENERATE_LEADS", "Lead generation"],
  ["GET_CALLS", "Phone calls"],
  ["WEBSITE_TRAFFIC", "Website traffic"],
  ["SELL_PRODUCTS", "Product sales"],
  ["REAL_ESTATE_LISTING", "Property listing"],
  ["BOOK_APPOINTMENTS", "Appointments"],
  ["EVENT_REGISTRATION", "Event registration"]
];

const leadStages = ["NEW_LEAD", "CONTACTED", "INTERESTED", "FOLLOW_UP", "APPOINTMENT_SCHEDULED", "NEGOTIATION", "WON", "LOST"];

export function App() {
  const [sessionReady, setSessionReady] = useState(api.authenticated);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const connectError = params.get("connect_error");
    if (connected) {
      setToast({ type: "success", message: `${connected.toUpperCase()} account connected` });
    } else if (connectError) {
      setToast({ type: "error", message: `Could not connect ${connectError.toUpperCase()}` });
    }
    if (connected || connectError) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <>
      {sessionReady ? (
        <ConsoleApp onLogout={() => setSessionReady(false)} notify={setToast} />
      ) : (
        <AuthPanel onReady={() => setSessionReady(true)} notify={setToast} />
      )}
      {toast ? <div className={`toast ${toast.type}`} role="status">{toast.message}</div> : null}
    </>
  );
}

function AuthPanel({ onReady, notify }: { onReady: () => void; notify: (toast: Toast) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const session =
        mode === "login"
          ? await api.login({ email: String(form.get("email")), password: String(form.get("password")) })
          : await api.register({
              name: String(form.get("name")),
              email: String(form.get("email")),
              password: String(form.get("password"))
            });
      api.saveSession(session);
      onReady();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Authentication failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-art" aria-hidden="true">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </div>
      <section className="auth-card">
        <Brand large />
        <div className="auth-copy">
          <h1>{mode === "login" ? "Sign in to Sart34" : "Create your Sart34 account"}</h1>
        </div>
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button>
        </div>
        <form onSubmit={submit} className="form-stack">
          {mode === "register" ? (
            <Field label="Your name"><input name="name" required autoComplete="name" /></Field>
          ) : null}
          <Field label="Email"><input name="email" type="email" required autoComplete="email" /></Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "register" ? "At least 8 characters" : undefined}
            />
          </Field>
          <button className="filled-button" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : null}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function ConsoleApp({ onLogout, notify }: { onLogout: () => void; notify: (toast: Toast) => void }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ firstName: string; email: string; role: string } | null>(null);

  async function loadUser() {
    setLoading(true);
    try {
      const me = await api.me();
      setUser({ firstName: me.firstName, email: me.email, role: me.role });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load account.";
      if (message.toLowerCase().includes("unauthorized")) {
        api.clearSession();
        onLogout();
        return;
      }
      notify({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadUser(); }, []);

  function logout() {
    api.clearSession();
    onLogout();
  }

  if (loading || !user) return <SplashScreen />;
  if (user.role === "SUPER_ADMIN") return <AdminConsole user={user} logout={logout} notify={notify} />;
  return <BusinessConsole user={user} logout={logout} notify={notify} />;
}

function BusinessConsole({ user, logout, notify }: { user: { firstName: string; email: string; role: string }; logout: () => void; notify: (toast: Toast) => void }) {
  const [tab, setTab] = useState<BusinessTab>("home");
  const [createTemplate, setCreateTemplate] = useState<Template | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [crossPostOpen, setCrossPostOpen] = useState(false);
  const [campaignDetail, setCampaignDetail] = useState<Campaign | null>(null);
  const [leadDetail, setLeadDetail] = useState<Lead | null>(null);
  const [issueCampaign, setIssueCampaign] = useState<Campaign | null>(null);
  const [connectPlatform, setConnectPlatform] = useState<PlatformDef | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [overview, setOverview] = useState<{ walletBalance: number } | null>(null);

  async function ensureWorkspace() {
    const existing = await api.workspaces();
    if (existing[0]) return existing[0];
    return api.createWorkspace({
      name: `${user.firstName} Studio`,
      type: "BUSINESS",
      email: user.email,
      defaultCurrency: "NGN"
    });
  }

  async function load() {
    setLoading(true);
    try {
      const activeWorkspace = await ensureWorkspace();
      setWorkspace(activeWorkspace);
      const [campaignRows, leadRows, summary, accountRows, creativeRows, templateRows, postRows] = await Promise.all([
        api.campaigns(activeWorkspace.id),
        api.leads(activeWorkspace.id),
        api.overview(activeWorkspace.id),
        api.integrations(activeWorkspace.id),
        api.creatives(activeWorkspace.id).catch(() => []),
        api.templates().catch(() => []),
        api.posts(activeWorkspace.id).catch(() => [])
      ]);
      setCampaigns(campaignRows);
      setLeads(leadRows);
      setOverview(summary);
      setAccounts(accountRows);
      setCreatives(creativeRows);
      setTemplates(templateRows);
      setPosts(postRows);
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not sync Sart34." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const issueCount = useMemo(
    () => campaigns.filter((campaign) => ["FAILED", "REJECTED"].includes(campaign.status)).length,
    [campaigns]
  );

  function openCreate(template?: Template) {
    setCreateTemplate(template ?? null);
    setCreateOpen(true);
  }

  return (
    <div className="shell">
      <AppBar
        title={tab === "home" ? "Sart34" : tabLabel(tab)}
        subtitle={tab === "home" ? workspace?.name ?? "Studio" : undefined}
        right={
          <>
            <IconBtn onClick={() => void load()} label="Refresh"><RefreshCw size={20} /></IconBtn>
            <button className="avatar-chip" onClick={() => setTab("profile")} aria-label="Profile">
              <span>{user.firstName[0]?.toUpperCase() ?? "S"}</span>
            </button>
          </>
        }
      />
      <main className="main">
        {loading ? <FeedSkeleton /> : null}
        {!loading && tab === "home" ? (
          <HomeFeed
            user={user}
            campaigns={campaigns}
            posts={posts}
            leads={leads}
            accounts={accounts}
            walletBalance={overview?.walletBalance ?? 0}
            onConnect={(platform) => setConnectPlatform(platform)}
            onOpenCampaign={setCampaignDetail}
            onFix={setIssueCampaign}
            onDeletePost={async (id) => {
              try {
                await api.deletePost(id);
                await load();
              } catch (error) {
                notify({ type: "error", message: error instanceof Error ? error.message : "Could not delete post" });
              }
            }}
            onPublishPost={async (id) => {
              try {
                await api.publishPost(id);
                notify({ type: "success", message: "Post sent to platforms" });
                await load();
              } catch (error) {
                notify({ type: "error", message: error instanceof Error ? error.message : "Could not publish" });
              }
            }}
          />
        ) : null}
        {!loading && tab === "library" ? (
          <LibraryPage
            workspace={workspace}
            creatives={creatives}
            templates={templates}
            campaigns={campaigns}
            onUpload={async (file) => {
              if (!workspace) return;
              try {
                await api.uploadCreative(file, workspace.id);
                notify({ type: "success", message: "Uploaded" });
                await load();
              } catch (error) {
                notify({ type: "error", message: error instanceof Error ? error.message : "Upload failed" });
              }
            }}
            onDelete={async (id) => {
              try {
                await api.deleteCreative(id);
                notify({ type: "success", message: "Removed" });
                await load();
              } catch (error) {
                notify({ type: "error", message: error instanceof Error ? error.message : "Delete failed" });
              }
            }}
            onUseTemplate={(template) => openCreate(template)}
          />
        ) : null}
        {!loading && tab === "inbox" ? (
          <InboxPage
            campaigns={campaigns}
            leads={leads}
            onFix={setIssueCampaign}
            onOpenLead={setLeadDetail}
          />
        ) : null}
        {!loading && tab === "profile" ? (
          <ProfilePage
            user={user}
            workspace={workspace}
            walletBalance={overview?.walletBalance ?? 0}
            accounts={accounts}
            campaigns={campaigns}
            leads={leads}
            onConnect={(platform) => setConnectPlatform(platform)}
            onDisconnect={async (id) => {
              try {
                await api.removeIntegration(id);
                notify({ type: "success", message: "Disconnected" });
                await load();
              } catch (error) {
                notify({ type: "error", message: error instanceof Error ? error.message : "Could not disconnect" });
              }
            }}
            onBuyCredits={async () => {
              if (!workspace) return;
              try {
                await api.buyCredits(workspace.id);
                notify({ type: "success", message: "Credits added" });
                await load();
              } catch (error) {
                notify({ type: "error", message: error instanceof Error ? error.message : "Credit purchase failed" });
              }
            }}
            onInvite={async (email) => {
              if (!workspace) return;
              try {
                await api.inviteMember(workspace.id, email);
                notify({ type: "success", message: "Invitation sent" });
              } catch (error) {
                notify({ type: "error", message: error instanceof Error ? error.message : "Invite failed" });
              }
            }}
            onLogout={logout}
          />
        ) : null}
      </main>
      <BottomNav
        tab={tab}
        onTab={setTab}
        onCreate={() => setCreateMenuOpen(true)}
        inboxBadge={leads.filter((lead) => lead.status === "NEW_LEAD").length + issueCount}
      />
      {createMenuOpen ? (
        <CreateMenu
          onClose={() => setCreateMenuOpen(false)}
          onAd={() => { setCreateMenuOpen(false); openCreate(); }}
          onPost={() => { setCreateMenuOpen(false); setCrossPostOpen(true); }}
        />
      ) : null}
      {crossPostOpen && workspace ? (
        <CrossPostSheet
          workspace={workspace}
          accounts={accounts}
          creatives={creatives}
          onClose={() => setCrossPostOpen(false)}
          onConnect={(platform) => setConnectPlatform(platform)}
          onDone={() => {
            setCrossPostOpen(false);
            notify({ type: "success", message: "Post created" });
            void load();
          }}
          notify={notify}
        />
      ) : null}
      {createOpen && workspace ? (
        <CreateAdSheet
          workspace={workspace}
          accounts={accounts}
          creatives={creatives}
          templates={templates}
          initialTemplate={createTemplate}
          onClose={() => { setCreateOpen(false); setCreateTemplate(null); }}
          onConnect={(platform) => setConnectPlatform(platform)}
          onCreated={() => {
            setCreateOpen(false);
            setCreateTemplate(null);
            notify({ type: "success", message: "Ad submitted to AI" });
            void load();
          }}
          notify={notify}
        />
      ) : null}
      {connectPlatform && workspace ? (
        <ConnectAccountSheet
          platform={connectPlatform}
          workspace={workspace}
          accounts={accounts}
          onClose={() => setConnectPlatform(null)}
          notify={notify}
        />
      ) : null}
      {issueCampaign ? (
        <IssueFixSheet
          campaign={issueCampaign}
          onClose={() => setIssueCampaign(null)}
          onResolved={() => {
            setIssueCampaign(null);
            notify({ type: "success", message: "Resubmitted" });
            void load();
          }}
          notify={notify}
        />
      ) : null}
      {campaignDetail ? (
        <CampaignDetailSheet
          campaign={campaignDetail}
          onClose={() => setCampaignDetail(null)}
          onChange={async () => { await load(); }}
          notify={notify}
        />
      ) : null}
      {leadDetail ? (
        <LeadDetailSheet
          lead={leadDetail}
          onClose={() => setLeadDetail(null)}
          onChange={async () => { await load(); }}
          notify={notify}
        />
      ) : null}
    </div>
  );
}

function AppBar({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="appbar">
      <Brand />
      <div className="appbar-titles">
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <div className="appbar-actions">{right}</div>
    </header>
  );
}

function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={`brand ${large ? "brand-large" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <span>S</span>
        <span>34</span>
      </span>
      {large ? <strong>Sart34</strong> : null}
    </div>
  );
}

function IconBtn({ children, onClick, label, badge }: { children: ReactNode; onClick?: () => void; label: string; badge?: number }) {
  return (
    <button className="icon-btn" type="button" onClick={onClick} aria-label={label}>
      {children}
      {badge ? <b className="dot-badge">{badge > 9 ? "9+" : badge}</b> : null}
    </button>
  );
}

function BottomNav({ tab, onTab, onCreate, inboxBadge }: { tab: BusinessTab; onTab: (tab: BusinessTab) => void; onCreate: () => void; inboxBadge: number }) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Primary">
      <BottomTab active={tab === "home"} onClick={() => onTab("home")} icon={<Home />} label="Home" />
      <BottomTab active={tab === "library"} onClick={() => onTab("library")} icon={<FolderOpen />} label="Library" />
      <button className="fab" onClick={onCreate} aria-label="Create ad"><Plus size={26} /></button>
      <BottomTab active={tab === "inbox"} onClick={() => onTab("inbox")} icon={<Inbox />} label="Inbox" badge={inboxBadge} />
      <BottomTab active={tab === "profile"} onClick={() => onTab("profile")} icon={<UserRound />} label="You" />
    </nav>
  );
}

function BottomTab({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; badge?: number }) {
  return (
    <button className={`bottom-tab ${active ? "active" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}>
      <span className="bottom-icon">{icon}{badge ? <b className="dot-badge">{badge > 9 ? "9+" : badge}</b> : null}</span>
      <span>{label}</span>
    </button>
  );
}

function HomeFeed({
  user,
  campaigns,
  posts,
  leads,
  accounts,
  walletBalance,
  onConnect,
  onOpenCampaign,
  onFix,
  onDeletePost,
  onPublishPost
}: {
  user: { firstName: string };
  campaigns: Campaign[];
  posts: SocialPost[];
  leads: Lead[];
  accounts: IntegrationAccount[];
  walletBalance: number;
  onConnect: (platform: PlatformDef) => void;
  onOpenCampaign: (campaign: Campaign) => void;
  onFix: (campaign: Campaign) => void;
  onDeletePost: (id: string) => void | Promise<void>;
  onPublishPost: (id: string) => void | Promise<void>;
}) {
  const connectedIds = new Set(accounts.filter((account) => account.status === "CONNECTED").map((account) => account.provider));
  const pendingLeads = leads.filter((lead) => !["WON", "LOST"].includes(lead.status)).length;
  const totals = campaigns.reduce(
    (sum, campaign) => {
      const metric = (campaign as { metrics?: Array<{ impressions: number; leads: number }> }).metrics?.[0];
      return {
        impressions: sum.impressions + (metric?.impressions ?? 0),
        leadsCount: sum.leadsCount + (metric?.leads ?? 0)
      };
    },
    { impressions: 0, leadsCount: 0 }
  );

  const timeline: TimelineEntry[] = [
    ...campaigns.map((campaign) => ({ kind: "campaign" as const, at: campaign.createdAt, campaign })),
    ...posts.map((post) => ({ kind: "post" as const, at: post.createdAt, post }))
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="feed">
      <section className="hero-greeting">
        <div>
          <span>Welcome back</span>
          <h2>Hi {user.firstName}</h2>
        </div>
      </section>

      <StoryRail connectedIds={connectedIds} onConnect={onConnect} />

      <section className="metric-row">
        <MetricChip icon={<Send size={18} />} label="Active ads" value={String(campaigns.filter((campaign) => ["ACTIVE", "READY_TO_LAUNCH", "SUBMITTED"].includes(campaign.status)).length)} />
        <MetricChip icon={<MessageCircle size={18} />} label="Open leads" value={String(pendingLeads)} accent="success" />
        <MetricChip icon={<Eye size={18} />} label="Impressions" value={totals.impressions.toLocaleString()} />
        <MetricChip icon={<Wallet size={18} />} label="Credits" value={String(walletBalance)} accent="warn" />
      </section>

      {timeline.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="feed-stack">
          {timeline.map((entry) =>
            entry.kind === "campaign" ? (
              <AdPostCard
                key={`c-${entry.campaign.id}`}
                campaign={entry.campaign}
                onOpen={() => onOpenCampaign(entry.campaign)}
                onFix={() => onFix(entry.campaign)}
              />
            ) : (
              <PostCard
                key={`p-${entry.post.id}`}
                post={entry.post}
                onDelete={() => onDeletePost(entry.post.id)}
                onPublish={() => onPublishPost(entry.post.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

type TimelineEntry =
  | { kind: "campaign"; at: string; campaign: Campaign }
  | { kind: "post"; at: string; post: SocialPost };

function StoryRail({ connectedIds, onConnect }: { connectedIds: Set<string>; onConnect: (platform: PlatformDef) => void }) {
  const loop = [...PLATFORMS, ...PLATFORMS, ...PLATFORMS];
  return (
    <section className="story-rail" aria-label="Connected platforms">
      <div className="story-track">
        {loop.map((platform, index) => {
          const isConnected = connectedIds.has(platform.id);
          return (
            <button
              key={`${platform.id}-${index}`}
              className={`story ${isConnected ? "live" : "idle"}`}
              onClick={() => onConnect(platform)}
              aria-hidden={index >= PLATFORMS.length}
              tabIndex={index >= PLATFORMS.length ? -1 : 0}
            >
              <span className="story-ring" style={{ background: isConnected ? `conic-gradient(${platform.accent}, ${platform.accent}80)` : "transparent" }}>
                <span className="story-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
              </span>
              <span className="story-label">{platform.name}</span>
              <span className="story-status">{isConnected ? "Live" : "Connect"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function MetricChip({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent?: "success" | "warn" }) {
  return (
    <article className={`metric-chip ${accent ?? ""}`}>
      <span className="metric-icon">{icon}</span>
      <span className="metric-text">
        <strong>{value}</strong>
        <span>{label}</span>
      </span>
    </article>
  );
}

function AdPostCard({ campaign, onOpen, onFix }: { campaign: Campaign; onOpen: () => void; onFix: () => void }) {
  const platforms = campaignPlatforms(campaign);
  const status = campaign.status;
  const issue = ["FAILED", "REJECTED"].includes(status);
  const live = ["ACTIVE", "READY_TO_LAUNCH", "SUBMITTED"].includes(status);
  const creative = campaign.creatives?.[0];
  const goal = campaignGoals.find(([value]) => value === campaign.goal);
  const metric = (campaign as { metrics?: Array<{ impressions: number; leads: number; clicks: number }> }).metrics?.[0];

  return (
    <article className={`post-card ${live ? "live" : ""} ${issue ? "issue" : ""}`} onClick={onOpen} role="button" tabIndex={0}>
      <header className="post-head">
        <div className="post-author">
          <span className="post-avatar"><Sparkles size={16} /></span>
          <div>
            <strong>{campaign.name}</strong>
            <span>{goal?.[1] ?? campaign.goal} · {timeAgo(campaign.createdAt)}</span>
          </div>
        </div>
        <button className="ghost-icon" aria-label="More" onClick={(event) => { event.stopPropagation(); onOpen(); }}><MoreHorizontal size={20} /></button>
      </header>

      <div className="post-creative" role="img" aria-label="Ad creative">
        {creative ? (
          /\.(mp4|mov|webm)$/i.test(creative.fileName) ? (
            <video src={creative.fileUrl} muted loop playsInline />
          ) : (
            <img src={creative.fileUrl} alt={campaign.name} />
          )
        ) : (
          <div className="post-creative-placeholder">
            <ImagePlus size={32} />
          </div>
        )}
      </div>

      <div className="post-platforms">
        {platforms.map((platform) => (
          <span key={platform.id} className="platform-pill" style={{ ['--accent' as never]: platform.accent }}>
            <span className="platform-pill-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
            {platform.name}
          </span>
        ))}
        <StatusPill value={status} />
      </div>

      {metric ? (
        <div className="post-metrics">
          <MiniMetric label="Impressions" value={metric.impressions.toLocaleString()} />
          <MiniMetric label="Clicks" value={metric.clicks.toLocaleString()} />
          <MiniMetric label="Leads" value={metric.leads.toLocaleString()} />
        </div>
      ) : null}

      {issue ? (
        <div className="post-issue" onClick={(event) => event.stopPropagation()}>
          <AlertTriangle size={18} />
          <div>
            <strong>Action needed</strong>
            <span>{summarizeIssue(campaign)}</span>
          </div>
          <button className="filled-button compact danger" onClick={(event) => { event.stopPropagation(); onFix(); }}>Fix</button>
        </div>
      ) : null}
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyFeed() {
  return (
    <article className="empty-feed">
      <div className="empty-feed-art" aria-hidden="true"><Sparkles size={28} /></div>
      <h3>Nothing here yet</h3>
      <p>Tap the plus button to run an ad or publish a post across your platforms.</p>
    </article>
  );
}

function CreateMenu({ onClose, onAd, onPost }: { onClose: () => void; onAd: () => void; onPost: () => void }) {
  return (
    <div className="menu-backdrop" role="dialog" aria-modal="true" aria-label="Create" onClick={onClose}>
      <div className="create-menu" onClick={(event) => event.stopPropagation()}>
        <span className="menu-grip" aria-hidden="true" />
        <button className="create-menu-item" onClick={onAd}>
          <span className="create-menu-icon ad"><Megaphone size={22} /></span>
          <span>
            <strong>Ad campaign</strong>
            <em>AI builds the campaign, you approve and launch</em>
          </span>
        </button>
        <button className="create-menu-item" onClick={onPost}>
          <span className="create-menu-icon post"><PenLine size={22} /></span>
          <span>
            <strong>Social post</strong>
            <em>Write once, cross-post to every connected platform</em>
          </span>
        </button>
      </div>
    </div>
  );
}

function PostCard({ post, onDelete, onPublish }: { post: SocialPost; onDelete: () => void; onPublish: () => void }) {
  const [busy, setBusy] = useState(false);
  const platforms = post.platforms.map((id) => PLATFORM_BY_ID[id]).filter((value): value is PlatformDef => Boolean(value));
  const isVideo = post.mediaType?.startsWith("video");

  async function publish() {
    setBusy(true);
    try {
      await onPublish();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="post-card post-social">
      <header className="post-head">
        <div className="post-author">
          <span className="post-avatar post"><PenLine size={16} /></span>
          <div>
            <strong>Social post</strong>
            <span>{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        <button className="ghost-icon" aria-label="Delete" onClick={onDelete}><Trash2 size={18} /></button>
      </header>

      {post.mediaUrl ? (
        <div className="post-creative">
          {isVideo ? <video src={post.mediaUrl} muted loop playsInline /> : <img src={post.mediaUrl} alt="" />}
        </div>
      ) : null}

      <p className="post-caption">{post.caption}</p>

      <div className="post-platforms">
        {platforms.map((platform) => (
          <span key={platform.id} className="platform-pill" style={{ ['--accent' as never]: platform.accent }}>
            <span className="platform-pill-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
            {platform.name}
          </span>
        ))}
        <SocialPostStatusPill value={post.status} />
      </div>

      {post.results && post.results.length ? (
        <ul className="post-results">
          {post.results.map((result) => (
            <li key={result.platform} className={result.status === "QUEUED" ? "ok" : "skip"}>
              {result.status === "QUEUED" ? <BadgeCheck size={14} /> : <AlertTriangle size={14} />}
              <span>{PLATFORM_BY_ID[result.platform]?.name ?? result.platform}: {result.note}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {post.status === "DRAFT" || post.status === "FAILED" || post.status === "PARTIAL" ? (
        <footer className="post-actions single">
          <button className="post-action primary" disabled={busy} onClick={() => void publish()}>
            {busy ? <Loader2 className="spin" size={18} /> : <Globe size={18} />}
            <span>{post.status === "DRAFT" ? "Publish to platforms" : "Retry publish"}</span>
          </button>
        </footer>
      ) : null}
    </article>
  );
}

function SocialPostStatusPill({ value }: { value: SocialPost["status"] }) {
  const map: Record<SocialPost["status"], { label: string; tone: string }> = {
    DRAFT: { label: "Draft", tone: "muted" },
    PUBLISHING: { label: "Publishing", tone: "info" },
    PUBLISHED: { label: "Published", tone: "success" },
    PARTIAL: { label: "Partly sent", tone: "warn" },
    FAILED: { label: "Failed", tone: "danger" }
  };
  const entry = map[value];
  return <span className={`status ${entry.tone}`}>{entry.label}</span>;
}

function CrossPostSheet({ workspace, accounts, creatives, onClose, onConnect, onDone, notify }: {
  workspace: Workspace;
  accounts: IntegrationAccount[];
  creatives: Creative[];
  onClose: () => void;
  onConnect: (platform: PlatformDef) => void;
  onDone: () => void;
  notify: (toast: Toast) => void;
}) {
  const connectedIds = new Set(accounts.filter((account) => account.status === "CONNECTED").map((account) => account.provider));
  const postablePlatforms = PLATFORMS.filter((platform) => platform.supportsOrganicPost);
  const [caption, setCaption] = useState("");
  const [brief, setBrief] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [media, setMedia] = useState<{ url: string; type: string; kind: "image" | "video" } | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(postablePlatforms.filter((platform) => connectedIds.has(platform.id)).map((platform) => platform.id));
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const captionLimit = selected.length
    ? Math.min(...selected.map((id) => PLATFORM_BY_ID[id]?.postCaptionLimit ?? 2200))
    : 2200;
  const overLimit = caption.length > captionLimit;

  async function draftWithAi() {
    if (!brief.trim()) return;
    setDrafting(true);
    try {
      const result = await api.draftPost({ workspaceId: workspace.id, prompt: brief.trim(), platforms: selected });
      const tags = (result.hashtags ?? []).map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");
      setCaption([result.caption ?? "", tags].filter(Boolean).join("\n\n"));
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not draft the post" });
    } finally {
      setDrafting(false);
    }
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLocalPreview(URL.createObjectURL(file));
    try {
      const uploaded = await api.uploadCreative(file, workspace.id);
      setMedia({ url: uploaded.fileUrl, type: uploaded.fileType, kind: file.type.startsWith("video") ? "video" : "image" });
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Upload failed" });
      setLocalPreview(null);
    }
  }

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function save(publish: boolean) {
    if (!caption.trim()) {
      notify({ type: "error", message: "Write a caption first" });
      return;
    }
    if (selected.length === 0) {
      notify({ type: "error", message: "Pick at least one platform" });
      return;
    }
    if (publish && overLimit) {
      notify({ type: "error", message: `Caption is too long — ${captionLimit} character limit` });
      return;
    }
    setBusy(publish ? "publish" : "draft");
    try {
      const created = await api.createPost({
        workspaceId: workspace.id,
        caption: caption.trim(),
        mediaUrl: media?.url,
        mediaType: media?.type,
        platforms: selected
      });
      if (publish) await api.publishPost(created.id);
      onDone();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not save post" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <FullSheet onClose={onClose} title="New social post" subtitle="One post, every platform">
      <div className="sheet-body">
        <section className="form-step">
          <button type="button" className="upload-drop compact" onClick={() => fileInput.current?.click()}>
            {localPreview ? (
              media?.kind === "video" ? <video src={localPreview} controls /> : <img src={localPreview} alt="" />
            ) : (
              <>
                <Upload size={24} />
                <strong>Add photo or video</strong>
                <span>Optional</span>
              </>
            )}
          </button>
          <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={pickFile} />
          {creatives.length > 0 && !localPreview ? (
            <>
              <span className="field-label">Or reuse from library</span>
              <div className="reuse-grid">
                {creatives.slice(0, 9).map((creative) => {
                  const isVideo = /\.(mp4|mov|webm)$/i.test(creative.fileName);
                  return (
                    <button key={creative.id} type="button" className={`reuse-tile ${media?.url === creative.fileUrl ? "selected" : ""}`} onClick={() => { setMedia({ url: creative.fileUrl, type: creative.fileType, kind: isVideo ? "video" : "image" }); setLocalPreview(creative.fileUrl); }}>
                      {isVideo ? <video src={creative.fileUrl} muted /> : <img src={creative.fileUrl} alt="" />}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          <span className="field-label">Draft with AI</span>
          <div className="ai-assist">
            <input value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="What is this post about?" />
            <button type="button" className="filled-button compact" onClick={() => void draftWithAi()} disabled={drafting || !brief.trim()}>
              {drafting ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />} Draft
            </button>
          </div>

          <Field label="Caption">
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Write your post, or let the AI draft it above." />
          </Field>
          <div className={`char-count ${overLimit ? "over" : ""}`}>
            {caption.length} / {captionLimit}
            {overLimit ? ` — too long for ${selected.map((id) => PLATFORM_BY_ID[id]?.name).filter(Boolean).join(", ")}` : ""}
          </div>

          <span className="field-label">Post to</span>
          <div className="platform-grid">
            {postablePlatforms.map((platform) => {
              const connected = connectedIds.has(platform.id);
              const isSelected = selected.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  type="button"
                  className={`platform-card ${isSelected ? "selected" : ""} ${connected ? "" : "needs-link"}`}
                  onClick={() => (connected ? toggle(platform.id) : onConnect(platform))}
                  style={{ ['--accent' as never]: platform.accent }}
                >
                  <span className="platform-card-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
                  <strong>{platform.name}</strong>
                  <span>{platform.short}</span>
                  <span className="platform-card-tag">
                    {connected ? (isSelected ? <BadgeCheck size={14} /> : <Plus size={14} />) : <AlertTriangle size={14} />}
                    {connected ? (isSelected ? "Selected" : "Tap to add") : "Connect first"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="sheet-footer">
        <button className="ghost-button" onClick={() => void save(false)} disabled={busy !== null}>
          {busy === "draft" ? <Loader2 className="spin" size={16} /> : null} Save draft
        </button>
        <button className="filled-button success" onClick={() => void save(true)} disabled={busy !== null}>
          {busy === "publish" ? <Loader2 className="spin" size={18} /> : <Globe size={18} />} Publish now
        </button>
      </footer>
    </FullSheet>
  );
}

function LibraryPage({
  workspace,
  creatives,
  templates,
  campaigns,
  onUpload,
  onDelete,
  onUseTemplate
}: {
  workspace: Workspace | null;
  creatives: Creative[];
  templates: Template[];
  campaigns: Campaign[];
  onUpload: (file: File) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onUseTemplate: (template: Template) => void;
}) {
  const [tab, setTab] = useState<"creatives" | "templates" | "reports">("creatives");
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="page">
      <h2 className="page-title">Library</h2>
      <div className="segmented">
        <button className={tab === "creatives" ? "active" : ""} onClick={() => setTab("creatives")}>Creatives {creatives.length ? <b>{creatives.length}</b> : null}</button>
        <button className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>Templates</button>
        <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>Reports</button>
      </div>

      {tab === "creatives" ? (
        <section className="card">
          <header className="card-head">
            <div><strong>Your media</strong><span>Reuse across campaigns</span></div>
            <button className="filled-button compact" onClick={() => fileInput.current?.click()}><Upload size={16} /> Upload</button>
            <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUpload(file);
              event.target.value = "";
            }} />
          </header>
          {creatives.length === 0 ? (
            <div className="empty"><ImagePlus size={26} /><strong>Nothing saved yet</strong><span>Upload photos, videos, flyers or logos.</span></div>
          ) : (
            <div className="media-grid">
              {creatives.map((creative) => (
                <figure className="media-tile" key={creative.id}>
                  {/\.(mp4|mov|webm)$/i.test(creative.fileName) ? (
                    <video src={creative.fileUrl} muted loop playsInline />
                  ) : (
                    <img src={creative.fileUrl} alt={creative.fileName} />
                  )}
                  <figcaption>
                    <span>{creative.fileName}</span>
                    <button className="ghost-icon" aria-label="Delete" onClick={() => onDelete(creative.id)}><Trash2 size={16} /></button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "templates" ? (
        <section className="card">
          <header className="card-head"><div><strong>Campaign templates</strong><span>Start with a proven structure</span></div></header>
          <div className="template-grid">
            {templates.map((template) => (
              <article className="template-card" key={template.id}>
                <span className="template-tag">{template.industry}</span>
                <strong>{template.name}</strong>
                <span className="template-desc">{template.description}</span>
                <div className="template-meta">
                  <span>NGN {template.defaultDailyBudget.toLocaleString()} / day</span>
                  <span>{template.defaultDurationDays} days</span>
                </div>
                <div className="template-platforms">
                  {template.recommendedPlatforms.map((id) => {
                    const platform = PLATFORM_BY_ID[id];
                    if (!platform) return null;
                    return (
                      <span key={id} className="platform-pill compact" style={{ ['--accent' as never]: platform.accent }}>
                        <span className="platform-pill-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
                        {platform.name}
                      </span>
                    );
                  })}
                </div>
                <button className="filled-button compact" onClick={() => onUseTemplate(template)}>Use template</button>
              </article>
            ))}
            {templates.length === 0 ? <div className="empty"><Layout size={26} /><strong>No templates yet</strong></div> : null}
          </div>
        </section>
      ) : null}

      {tab === "reports" ? <ReportsView campaigns={campaigns} workspace={workspace} /> : null}
    </div>
  );
}

function ReportsView({ campaigns, workspace }: { campaigns: Campaign[]; workspace: Workspace | null }) {
  const totals = campaigns.reduce(
    (sum, campaign) => {
      const metrics = (campaign as { metrics?: Array<{ impressions: number; clicks: number; leads: number; spend: number }> }).metrics ?? [];
      for (const metric of metrics) {
        sum.impressions += metric.impressions;
        sum.clicks += metric.clicks;
        sum.leads += metric.leads;
        sum.spend += Number(metric.spend ?? 0);
      }
      return sum;
    },
    { impressions: 0, clicks: 0, leads: 0, spend: 0 }
  );
  const cpl = totals.leads ? Math.round(totals.spend / totals.leads) : 0;

  return (
    <section className="card">
      <header className="card-head"><div><strong>Performance</strong><span>{workspace?.name ?? "Studio"}</span></div></header>
      <div className="kpi-grid four">
        <KPI label="Impressions" value={totals.impressions.toLocaleString()} />
        <KPI label="Clicks" value={totals.clicks.toLocaleString()} />
        <KPI label="Leads" value={totals.leads.toLocaleString()} accent="success" />
        <KPI label="Spend" value={`NGN ${totals.spend.toLocaleString()}`} />
      </div>
      <div className="kpi-grid">
        <KPI label="Cost per lead" value={cpl ? `NGN ${cpl.toLocaleString()}` : "—"} />
        <KPI label="Active ads" value={String(campaigns.filter((campaign) => campaign.status === "ACTIVE").length)} />
        <KPI label="Total ads" value={String(campaigns.length)} />
      </div>
    </section>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: "success" | "warn" }) {
  return <div className={`kpi ${accent ?? ""}`}><strong>{value}</strong><span>{label}</span></div>;
}

function InboxPage({ campaigns, leads, onFix, onOpenLead }: { campaigns: Campaign[]; leads: Lead[]; onFix: (campaign: Campaign) => void; onOpenLead: (lead: Lead) => void }) {
  const [tab, setTab] = useState<"actions" | "leads">("actions");
  const issues = campaigns.filter((campaign) => ["FAILED", "REJECTED"].includes(campaign.status));

  return (
    <div className="page">
      <h2 className="page-title">Inbox</h2>
      <div className="segmented">
        <button className={tab === "actions" ? "active" : ""} onClick={() => setTab("actions")}>
          Actions {issues.length ? <b>{issues.length}</b> : null}
        </button>
        <button className={tab === "leads" ? "active" : ""} onClick={() => setTab("leads")}>
          Leads {leads.length ? <b>{leads.length}</b> : null}
        </button>
      </div>
      {tab === "actions" ? (
        <section className="card">
          {issues.length === 0 ? (
            <div className="empty"><ShieldCheck size={28} /><strong>All clear</strong></div>
          ) : (
            <ul className="action-list">
              {issues.map((campaign) => (
                <li key={campaign.id}>
                  <div className="action-icon"><AlertTriangle size={20} /></div>
                  <div className="action-text">
                    <strong>{campaign.name}</strong>
                    <span>{summarizeIssue(campaign)}</span>
                  </div>
                  <button className="filled-button compact" onClick={() => onFix(campaign)}>Fix</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="card">
          {leads.length === 0 ? (
            <div className="empty"><Inbox size={28} /><strong>No leads yet</strong></div>
          ) : (
            <ul className="lead-list">
              {leads.map((lead) => (
                <li key={lead.id} className={lead.status === "NEW_LEAD" ? "unread" : ""} onClick={() => onOpenLead(lead)}>
                  <span className="lead-avatar">{lead.fullName.charAt(0)?.toUpperCase()}</span>
                  <div className="lead-text">
                    <strong>{lead.fullName}</strong>
                    <span>{lead.whatsappNumber ?? lead.phone ?? lead.email ?? "No contact"}</span>
                    <span className="lead-meta">{lead.interest ?? "—"} · {timeAgo(lead.createdAt)}</span>
                  </div>
                  <div className="lead-actions">
                    <StatusPill value={lead.status} compact />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function ProfilePage({
  user,
  workspace,
  walletBalance,
  accounts,
  campaigns,
  leads,
  onConnect,
  onDisconnect,
  onBuyCredits,
  onInvite,
  onLogout
}: {
  user: { firstName: string; email: string; role: string };
  workspace: Workspace | null;
  walletBalance: number;
  accounts: IntegrationAccount[];
  campaigns: Campaign[];
  leads: Lead[];
  onConnect: (platform: PlatformDef) => void;
  onDisconnect: (id: string) => void | Promise<void>;
  onBuyCredits: () => void;
  onInvite: (email: string) => void | Promise<void>;
  onLogout: () => void;
}) {
  const accountByProvider = useMemo(() => {
    const map = new Map<string, IntegrationAccount>();
    for (const account of accounts) map.set(account.provider, account);
    return map;
  }, [accounts]);

  const wonLeads = leads.filter((lead) => lead.status === "WON").length;
  const liveAds = campaigns.filter((campaign) => campaign.status === "ACTIVE").length;

  const [members, setMembers] = useState<Array<{ id: string; role: string; user: { firstName: string; lastName: string; email: string } }>>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [transactions, setTransactions] = useState<Array<{ id: string; amount: number; reason: string; createdAt: string; type: string }>>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (!workspace) return;
    setMemberLoading(true);
    api.workspaceDetail(workspace.id)
      .then((detail) => setMembers(detail.members ?? []))
      .catch(() => undefined)
      .finally(() => setMemberLoading(false));
    api.walletTransactions(workspace.id)
      .then(setTransactions)
      .catch(() => undefined);
  }, [workspace?.id]);

  return (
    <div className="page profile-page">
      <section className="profile-hero">
        <div className="profile-hero-bg" aria-hidden="true" />
        <div className="profile-hero-row">
          <div className="profile-avatar">{user.firstName[0]?.toUpperCase()}</div>
          <div className="profile-hero-meta">
            <strong>{user.firstName}</strong>
            <span>{user.email}</span>
            <span className="profile-pill"><BadgeCheck size={14} /> {workspace?.name ?? "Studio"}</span>
          </div>
        </div>
        <div className="profile-hero-stats">
          <div><strong>{liveAds}</strong><span>Live ads</span></div>
          <div><strong>{leads.length}</strong><span>Leads</span></div>
          <div><strong>{wonLeads}</strong><span>Won</span></div>
          <div><strong>{walletBalance}</strong><span>Credits</span></div>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <div><strong>Connected accounts</strong></div>
          <span className="muted small">{accounts.filter((account) => account.status === "CONNECTED").length}/{PLATFORMS.length}</span>
        </header>
        <div className="connect-grid">
          {PLATFORMS.map((platform) => {
            const account = accountByProvider.get(platform.id);
            const status = account?.status ?? "NOT_CONNECTED";
            const connected = status === "CONNECTED";
            return (
              <button key={platform.id} className={`connect-card ${connected ? "connected" : ""}`} onClick={() => onConnect(platform)}>
                <span className="connect-card-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
                <div className="connect-card-text">
                  <strong>{platform.name}</strong>
                  <span>{platform.short}</span>
                </div>
                <div className="connect-card-status">
                  {connected ? (
                    <>
                      <BadgeCheck size={16} />
                      <span>{account?.accountName ?? "Connected"}</span>
                    </>
                  ) : status === "EXPIRED" || status === "FAILED" ? (
                    <>
                      <AlertTriangle size={16} />
                      <span>Reconnect</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Connect</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <div><strong>Wallet</strong><span>{walletBalance} credits</span></div>
          <button className="filled-button compact" onClick={onBuyCredits}><CircleDollarSign size={16} /> Top up</button>
        </header>
        {transactions.length > 0 ? (
          <ul className="txn-list">
            {transactions.slice(0, 6).map((txn) => (
              <li key={txn.id}>
                <div>
                  <strong>{txn.reason}</strong>
                  <span>{new Date(txn.createdAt).toLocaleDateString()}</span>
                </div>
                <span className={`txn-amount ${txn.amount < 0 ? "negative" : "positive"}`}>{txn.amount > 0 ? "+" : ""}{txn.amount}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card">
        <header className="card-head">
          <div><strong>Team</strong><span>{members.length} member{members.length === 1 ? "" : "s"}</span></div>
          <button className="filled-button compact" onClick={() => setInviteOpen(true)}><UserPlus size={16} /> Invite</button>
        </header>
        {memberLoading ? <div className="empty"><Loader2 className="spin" size={18} /></div> : (
          <ul className="member-list">
            {members.map((member) => (
              <li key={member.id}>
                <span className="member-avatar">{member.user.firstName?.[0]?.toUpperCase()}</span>
                <div>
                  <strong>{member.user.firstName} {member.user.lastName}</strong>
                  <span>{member.user.email}</span>
                </div>
                <span className="status muted compact">{member.role.toLowerCase().replaceAll("_", " ")}</span>
              </li>
            ))}
            {members.length === 0 ? <div className="empty"><Users size={22} /><strong>Just you</strong></div> : null}
          </ul>
        )}
      </section>

      <section className="card">
        <header className="card-head"><div><strong>Settings</strong></div></header>
        <ul className="setting-list">
          <SettingRow icon={<Settings size={18} />} title="Business" subtitle={workspace?.name ?? "Default"} />
          <SettingRow icon={<CircleDollarSign size={18} />} title="Currency" subtitle={workspace?.defaultCurrency ?? "NGN"} />
          <SettingRow icon={<Bell size={18} />} title="Notifications" subtitle="WhatsApp, email" />
          <SettingRow icon={<Shield size={18} />} title="Permissions" subtitle={user.role.replaceAll("_", " ").toLowerCase()} />
        </ul>
      </section>

      <button className="ghost-button danger full" onClick={onLogout}><LogOut size={18} /> Sign out</button>

      {inviteOpen ? (
        <FullSheet onClose={() => setInviteOpen(false)} title="Invite a teammate">
          <div className="sheet-body">
            <Field label="Email">
              <input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="teammate@business.com" />
            </Field>
          </div>
          <footer className="sheet-footer">
            <button className="ghost-button" onClick={() => setInviteOpen(false)}>Cancel</button>
            <button className="filled-button" onClick={async () => {
              if (!inviteEmail) return;
              await onInvite(inviteEmail);
              setInviteOpen(false);
              setInviteEmail("");
            }}><UserPlus size={18} /> Send invite</button>
          </footer>
        </FullSheet>
      ) : null}
    </div>
  );
}

function SettingRow({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <li>
      <span className="setting-icon">{icon}</span>
      <div><strong>{title}</strong><span>{subtitle}</span></div>
      <ChevronRight size={18} />
    </li>
  );
}

function CreateAdSheet({
  workspace,
  accounts,
  creatives,
  templates,
  initialTemplate,
  onClose,
  onConnect,
  onCreated,
  notify
}: {
  workspace: Workspace;
  accounts: IntegrationAccount[];
  creatives: Creative[];
  templates: Template[];
  initialTemplate: Template | null;
  onClose: () => void;
  onConnect: (platform: PlatformDef) => void;
  onCreated: () => void;
  notify: (toast: Toast) => void;
}) {
  const steps = ["Start", "Upload", "Brief", "Platforms", "Audience", "Budget", "Preview", "Approve"] as const;
  const [step, setStep] = useState(initialTemplate ? 1 : 0);
  const [template, setTemplate] = useState<Template | null>(initialTemplate);
  const [uploadedCreative, setUploadedCreative] = useState<Creative | null>(null);
  const [pickedCreative, setPickedCreative] = useState<Creative | null>(null);
  const [localMedia, setLocalMedia] = useState<{ file: File; url: string; kind: "image" | "video" } | null>(null);
  const [brief, setBrief] = useState({
    name: initialTemplate?.name ?? "",
    productName: "",
    price: "",
    offer: "",
    description: "",
    goal: initialTemplate?.goal ?? "GENERATE_LEADS"
  });
  const connectedIds = new Set(accounts.filter((account) => account.status === "CONNECTED").map((account) => account.provider));
  const initialPlatforms = (initialTemplate?.recommendedPlatforms ?? PLATFORMS.map((platform) => platform.id))
    .filter((id) => connectedIds.has(id) || id === "META");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialPlatforms.length ? initialPlatforms : ["META"]);
  const [audience, setAudience] = useState({ location: "", ageMin: 18, ageMax: 45, interests: initialTemplate?.audienceHints ?? "", gender: "ALL" });
  const [budget, setBudget] = useState({
    daily: initialTemplate?.defaultDailyBudget ?? 5000,
    durationDays: initialTemplate?.defaultDurationDays ?? 14,
    callToAction: initialTemplate?.callToAction ?? "Send WhatsApp message"
  });
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLocalMedia({ file, url, kind: file.type.startsWith("video") ? "video" : "image" });
    try {
      const uploaded = await api.uploadCreative(file, workspace.id);
      setUploadedCreative(uploaded);
      setPickedCreative(uploaded);
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Upload failed" });
    }
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function applyTemplate(value: Template) {
    setTemplate(value);
    setBrief((current) => ({ ...current, name: value.name, goal: value.goal }));
    setBudget({
      daily: value.defaultDailyBudget,
      durationDays: value.defaultDurationDays,
      callToAction: value.callToAction
    });
    setAudience((current) => ({ ...current, interests: value.audienceHints }));
    setSelectedPlatforms(value.recommendedPlatforms);
    setStep(1);
  }

  async function submit() {
    if (!brief.name) {
      notify({ type: "error", message: "Give your ad a name" });
      setStep(2);
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.createCampaign({
        workspaceId: workspace.id,
        name: brief.name,
        goal: brief.goal,
        platform: selectedPlatforms[0] ?? "META",
        objective: brief.description || brief.offer || brief.productName,
        durationDays: Number(budget.durationDays),
        productDetails: {
          productName: brief.productName,
          price: brief.price,
          offer: brief.offer,
          audience: audience.interests,
          location: audience.location,
          description: brief.description,
          dailyBudget: Number(budget.daily),
          callToAction: budget.callToAction,
          targetPlatforms: selectedPlatforms,
          ageMin: audience.ageMin,
          ageMax: audience.ageMax,
          gender: audience.gender,
          templateId: template?.id
        }
      });
      if (pickedCreative) {
        await api.attachCreatives(created.id, [pickedCreative.id]).catch(() => undefined);
      }
      try {
        await api.generateCampaign(created.id);
        await api.reviewCampaign(created.id);
      } catch (error) {
        // AI generation runs best-effort. If it fails, the user can retry from the detail sheet.
      }
      onCreated();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not save the ad." });
    } finally {
      setSubmitting(false);
    }
  }

  function next() { setStep((current) => Math.min(steps.length - 1, current + 1)); }
  function back() { setStep((current) => Math.max(0, current - 1)); }

  const previewMedia = localMedia ?? (pickedCreative ? {
    url: pickedCreative.fileUrl,
    kind: /\.(mp4|mov|webm)$/i.test(pickedCreative.fileName) ? "video" as const : "image" as const
  } : null);

  return (
    <FullSheet onClose={onClose} title="Create ad" subtitle={steps[step]}>
      <div className="stepper">
        {steps.map((label, index) => (
          <span key={label} className={`stepper-dot ${index <= step ? "done" : ""} ${index === step ? "current" : ""}`}>
            <i />
            <em>{label}</em>
          </span>
        ))}
      </div>

      <div className="sheet-body">
        {step === 0 ? (
          <section className="form-step">
            <button className="start-tile" onClick={() => setStep(1)}>
              <Sparkles size={22} />
              <strong>Start blank</strong>
              <span>Upload your own media</span>
            </button>
            <span className="field-label">Or pick a template</span>
            <div className="template-grid">
              {templates.map((value) => (
                <article className={`template-card ${template?.id === value.id ? "selected" : ""}`} key={value.id}>
                  <span className="template-tag">{value.industry}</span>
                  <strong>{value.name}</strong>
                  <span className="template-desc">{value.description}</span>
                  <div className="template-meta">
                    <span>NGN {value.defaultDailyBudget.toLocaleString()} / day</span>
                    <span>{value.defaultDurationDays}d</span>
                  </div>
                  <button className="filled-button compact" onClick={() => applyTemplate(value)}>Use template</button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="upload-step">
            <button type="button" className="upload-drop" onClick={() => fileInput.current?.click()}>
              {previewMedia ? (
                previewMedia.kind === "video" ? <video src={previewMedia.url} controls /> : <img src={previewMedia.url} alt="" />
              ) : (
                <>
                  <Upload size={28} />
                  <strong>Upload photo or video</strong>
                  <span>9:16 vertical works best for Reels and TikTok</span>
                </>
              )}
            </button>
            <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={pickFile} />
            {creatives.length > 0 ? (
              <>
                <span className="field-label">Or reuse from library</span>
                <div className="reuse-grid">
                  {creatives.slice(0, 9).map((creative) => (
                    <button key={creative.id} type="button" className={`reuse-tile ${pickedCreative?.id === creative.id ? "selected" : ""}`} onClick={() => { setPickedCreative(creative); setLocalMedia(null); setUploadedCreative(null); }}>
                      {/\.(mp4|mov|webm)$/i.test(creative.fileName) ? <video src={creative.fileUrl} muted /> : <img src={creative.fileUrl} alt="" />}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {step === 2 ? (
          <section className="form-step">
            <Field label="Ad name"><input value={brief.name} onChange={(event) => setBrief({ ...brief, name: event.target.value })} /></Field>
            <Field label="Product or service"><input value={brief.productName} onChange={(event) => setBrief({ ...brief, productName: event.target.value })} /></Field>
            <div className="row">
              <Field label="Price"><input value={brief.price} onChange={(event) => setBrief({ ...brief, price: event.target.value })} placeholder="NGN" /></Field>
              <Field label="Offer or hook"><input value={brief.offer} onChange={(event) => setBrief({ ...brief, offer: event.target.value })} /></Field>
            </div>
            <Field label="Anything else for the AI">
              <textarea value={brief.description} onChange={(event) => setBrief({ ...brief, description: event.target.value })} />
            </Field>
            <span className="field-label">Goal</span>
            <div className="chip-grid">
              {campaignGoals.map(([value, label]) => (
                <button key={value} type="button" className={`chip ${brief.goal === value ? "active" : ""}`} onClick={() => setBrief({ ...brief, goal: value })}>
                  <strong>{label}</strong>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="form-step">
            <div className="platform-grid">
              {PLATFORMS.map((platform) => {
                const connected = connectedIds.has(platform.id);
                const selected = selectedPlatforms.includes(platform.id);
                return (
                  <button key={platform.id} type="button" className={`platform-card ${selected ? "selected" : ""} ${connected ? "" : "needs-link"}`} onClick={() => togglePlatform(platform.id)} style={{ ['--accent' as never]: platform.accent }}>
                    <span className="platform-card-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
                    <strong>{platform.name}</strong>
                    <span>{platform.short}</span>
                    <span className="platform-card-tag">
                      {selected ? <BadgeCheck size={14} /> : <Plus size={14} />}
                      {connected ? "Connected" : "Connect required"}
                    </span>
                    {!connected ? (
                      <span className="platform-card-link" onClick={(event) => { event.stopPropagation(); onConnect(platform); }}>
                        Connect <ArrowRight size={12} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="form-step">
            <Field label="Locations"><input value={audience.location} onChange={(event) => setAudience({ ...audience, location: event.target.value })} placeholder="Lagos, Abuja" /></Field>
            <Field label="Interests / keywords"><input value={audience.interests} onChange={(event) => setAudience({ ...audience, interests: event.target.value })} /></Field>
            <div className="row">
              <Field label="Min age"><input type="number" min={13} max={64} value={audience.ageMin} onChange={(event) => setAudience({ ...audience, ageMin: Number(event.target.value) })} /></Field>
              <Field label="Max age"><input type="number" min={13} max={65} value={audience.ageMax} onChange={(event) => setAudience({ ...audience, ageMax: Number(event.target.value) })} /></Field>
            </div>
            <span className="field-label">Gender</span>
            <div className="segmented">
              {["ALL", "WOMEN", "MEN"].map((option) => (
                <button key={option} type="button" className={audience.gender === option ? "active" : ""} onClick={() => setAudience({ ...audience, gender: option })}>{option}</button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="form-step">
            <Field label="Daily budget (NGN)">
              <input type="number" min={500} value={budget.daily} onChange={(event) => setBudget({ ...budget, daily: Number(event.target.value) })} />
            </Field>
            <Field label="Run for (days)">
              <input type="number" min={1} value={budget.durationDays} onChange={(event) => setBudget({ ...budget, durationDays: Number(event.target.value) })} />
            </Field>
            <Field label="Call to action">
              <select value={budget.callToAction} onChange={(event) => setBudget({ ...budget, callToAction: event.target.value })}>
                {["Send WhatsApp message", "Learn more", "Sign up", "Get quote", "Shop now", "Book now", "Call now"].map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            <article className="forecast">
              <Zap size={20} />
              <div>
                <strong>Estimated daily reach</strong>
                <span>{Math.round(budget.daily * 4).toLocaleString()} – {Math.round(budget.daily * 9).toLocaleString()} people</span>
              </div>
              <div>
                <strong>Total spend</strong>
                <span>NGN {(budget.daily * budget.durationDays).toLocaleString()}</span>
              </div>
            </article>
          </section>
        ) : null}

        {step === 6 ? (
          <section className="preview-step">
            <div className="preview-stack">
              {selectedPlatforms.map((id) => {
                const platform = PLATFORM_BY_ID[id];
                if (!platform) return null;
                return <PlatformPreview key={id} platform={platform} media={previewMedia} brief={brief} budget={budget} audience={audience} />;
              })}
              {selectedPlatforms.length === 0 ? <p className="muted">No platforms selected.</p> : null}
            </div>
          </section>
        ) : null}

        {step === 7 ? (
          <section className="approve-step">
            <Sparkles size={28} />
            <h3>Ready to launch on {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? "" : "s"}</h3>
            <div className="approve-summary">
              <div><span>Goal</span><strong>{campaignGoals.find(([value]) => value === brief.goal)?.[1] ?? "Lead generation"}</strong></div>
              <div><span>Audience</span><strong>{audience.location || "Auto"} · {audience.ageMin}-{audience.ageMax}</strong></div>
              <div><span>Budget</span><strong>NGN {budget.daily.toLocaleString()} / day · {budget.durationDays}d</strong></div>
              <div><span>Platforms</span><strong>{selectedPlatforms.map((id) => PLATFORM_BY_ID[id]?.name).join(" · ")}</strong></div>
            </div>
          </section>
        ) : null}
      </div>

      <footer className="sheet-footer">
        <button type="button" className="ghost-button" disabled={step === 0} onClick={back}><ArrowLeft size={16} /> Back</button>
        {step < steps.length - 1 ? (
          <button type="button" className="filled-button" onClick={next}>Continue <ArrowRight size={16} /></button>
        ) : (
          <button type="button" className="filled-button success" onClick={() => void submit()} disabled={submitting}>
            {submitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />} Approve and submit
          </button>
        )}
      </footer>
    </FullSheet>
  );
}

function PlatformPreview({ platform, media, brief, budget, audience }: {
  platform: PlatformDef;
  media: { url: string; kind: "image" | "video" } | null;
  brief: { productName: string; offer: string; description: string };
  budget: { callToAction: string };
  audience: { location: string };
}) {
  const headline = brief.offer || brief.productName || "Your hook here";
  const body = brief.description || "Sart34 will write the body.";

  if (platform.id === "META") {
    return (
      <div className="preview meta-preview">
        <div className="preview-chrome">
          <span className="preview-dot" /> <strong>your.brand</strong> · <span>Sponsored</span>
          <MoreHorizontal size={16} />
        </div>
        <div className="preview-media">
          {media ? (media.kind === "video" ? <video src={media.url} loop muted autoPlay playsInline /> : <img src={media.url} alt="" />) : <PreviewPlaceholder />}
        </div>
        <div className="preview-body">
          <strong>your.brand</strong> {headline}
          <p>{body}</p>
          <button className="preview-cta">{budget.callToAction}</button>
        </div>
        <span className="preview-foot">Instagram Feed · Reels · Stories · Facebook</span>
      </div>
    );
  }

  if (platform.id === "GOOGLE") {
    return (
      <div className="preview google-preview">
        <div className="g-search">
          <span className="g-icon">G</span>
          <span>Search · {audience.location || "your region"}</span>
        </div>
        <div className="g-result">
          <span className="g-ad-tag">Sponsored</span>
          <strong>{headline.slice(0, 30)}</strong>
          <span className="g-url">your-business.com</span>
          <p>{body.slice(0, 90)}</p>
          <span className="g-sitelinks">More info · Pricing · Contact · Reviews</span>
        </div>
        <span className="preview-foot">Search · YouTube · Display · Maps</span>
      </div>
    );
  }

  if (platform.id === "TIKTOK") {
    return (
      <div className="preview tiktok-preview">
        <div className="tt-frame">
          {media ? (media.kind === "video" ? <video src={media.url} loop muted autoPlay playsInline /> : <img src={media.url} alt="" />) : <PreviewPlaceholder />}
          <div className="tt-overlay">
            <div className="tt-text">
              <strong>@your.brand · Sponsored</strong>
              <p>{headline}</p>
              <span className="tt-music">♪ original sound</span>
            </div>
          </div>
          <button className="preview-cta tt-cta">{budget.callToAction}</button>
        </div>
        <span className="preview-foot">For You · Spark Ads · 9:16</span>
      </div>
    );
  }

  if (platform.id === "WHATSAPP") {
    return (
      <div className="preview whatsapp-preview">
        <div className="wa-bubble">
          <strong>Your Brand · WhatsApp Business</strong>
          <p>{headline}</p>
          <p className="wa-meta">{body.slice(0, 140)}</p>
          <div className="wa-quick"><span>{budget.callToAction}</span><span>See catalog</span></div>
        </div>
        <span className="preview-foot">Click-to-WhatsApp · Catalog · Broadcast</span>
      </div>
    );
  }

  if (platform.id === "LINKEDIN") {
    return (
      <div className="preview linkedin-preview">
        <div className="li-head">
          <div className="li-avatar">in</div>
          <div><strong>Your Company</strong><span>Promoted · {audience.location || "Global"}</span></div>
        </div>
        <p className="li-body">{body}</p>
        <div className="li-media">{media ? (media.kind === "video" ? <video src={media.url} controls /> : <img src={media.url} alt="" />) : <PreviewPlaceholder />}</div>
        <div className="li-card">
          <strong>{headline}</strong>
          <span>your-business.com</span>
          <button className="preview-cta li-cta">{budget.callToAction}</button>
        </div>
        <span className="preview-foot">Sponsored Content · Lead Gen Form</span>
      </div>
    );
  }

  if (platform.id === "X") {
    return (
      <div className="preview x-preview">
        <div className="x-head">
          <div className="x-avatar">𝕏</div>
          <div><strong>Your Brand</strong> <span>@yourbrand · Promoted</span></div>
        </div>
        <p>{body.slice(0, 240)}</p>
        <div className="x-media">{media ? (media.kind === "video" ? <video src={media.url} controls /> : <img src={media.url} alt="" />) : <PreviewPlaceholder />}</div>
        <div className="x-actions"><MessageCircle size={16} /> <RefreshCw size={16} /> <Eye size={16} /></div>
        <span className="preview-foot">Promoted post on the X timeline</span>
      </div>
    );
  }

  return null;
}

function PreviewPlaceholder() {
  return <div className="preview-placeholder"><ImagePlus size={26} /></div>;
}

function ConnectAccountSheet({ platform, workspace, accounts, onClose, notify }: {
  platform: PlatformDef;
  workspace: Workspace;
  accounts: IntegrationAccount[];
  onClose: () => void;
  notify: (toast: Toast) => void;
}) {
  const account = accounts.find((entry) => entry.provider === platform.id);
  const connected = account?.status === "CONNECTED";
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    try {
      const result = await platform.connect(workspace.id);
      if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
        return;
      }
      notify({ type: "info", message: result.message });
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not start connection" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <FullSheet onClose={onClose} title={platform.name} subtitle={platform.short}>
      <div className="sheet-body">
        <section className="connect-hero" style={{ background: `linear-gradient(135deg, ${platform.accent}, ${platform.accent}cc)` }}>
          <span className="connect-hero-glyph">{platform.glyph}</span>
          <div>
            <strong>{platform.name}</strong>
            <span>{platform.short}</span>
          </div>
          <span className={`connect-hero-status ${connected ? "ok" : ""}`}>{connected ? "Connected" : "Not connected"}</span>
        </section>

        <section className="card">
          <header className="card-head"><div><strong>Surfaces</strong></div></header>
          <ul className="check-list">
            {platform.surfaces.map((surface) => (
              <li key={surface}><BadgeCheck size={16} /> {surface}</li>
            ))}
          </ul>
        </section>

        <section className="card">
          <header className="card-head"><div><strong>What we'll need</strong></div></header>
          <ul className="req-list">
            {platform.requirements.map((requirement) => (
              <li key={requirement.key}>
                <span className="req-bullet" />
                <div>
                  <strong>{requirement.label}</strong>
                  {requirement.hint ? <span>{requirement.hint}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="sheet-footer">
        <button className="ghost-button" onClick={onClose}>Close</button>
        <button className="filled-button" onClick={() => void connect()} disabled={busy} style={{ background: platform.accent, color: "#fff" }}>
          {busy ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
          {connected ? "Re-link" : `Connect ${platform.name}`}
        </button>
      </footer>
    </FullSheet>
  );
}

function CampaignDetailSheet({ campaign, onClose, onChange, notify }: {
  campaign: Campaign;
  onClose: () => void;
  onChange: () => void | Promise<void>;
  notify: (toast: Toast) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [optimization, setOptimization] = useState<Record<string, string[]> | null>(null);
  const [metrics, setMetrics] = useState<Array<{ date: string; impressions: number; clicks: number; leads: number; spend: number }>>([]);
  const [optimizing, setOptimizing] = useState(false);
  const platforms = campaignPlatforms(campaign);
  const goal = campaignGoals.find(([value]) => value === campaign.goal);
  const live = campaign.status === "ACTIVE";

  useEffect(() => {
    api.campaignMetrics(campaign.id).then((rows) => setMetrics(rows.map((row) => ({ ...row, spend: Number(row.spend) })))).catch(() => undefined);
  }, [campaign.id]);

  async function run(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    try {
      await action();
      notify({ type: "success", message: `${label} done` });
      await onChange();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : `${label} failed` });
    } finally {
      setBusy(null);
    }
  }

  async function fetchOptimization() {
    setOptimizing(true);
    try {
      const result = await api.optimizeCampaign(campaign.id);
      setOptimization(result);
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Optimization failed" });
    } finally {
      setOptimizing(false);
    }
  }

  const totals = metrics.reduce((sum, metric) => ({
    impressions: sum.impressions + metric.impressions,
    clicks: sum.clicks + metric.clicks,
    leads: sum.leads + metric.leads,
    spend: sum.spend + metric.spend
  }), { impressions: 0, clicks: 0, leads: 0, spend: 0 });

  return (
    <FullSheet onClose={onClose} title={campaign.name} subtitle={goal?.[1] ?? campaign.goal}>
      <div className="sheet-body">
        <section className="card">
          <header className="card-head">
            <div className="card-head-left">
              {platforms.map((platform) => (
                <span key={platform.id} className="platform-pill compact" style={{ ['--accent' as never]: platform.accent }}>
                  <span className="platform-pill-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
                  {platform.name}
                </span>
              ))}
            </div>
            <StatusPill value={campaign.status} compact />
          </header>
          <div className="quick-row">
            <button className="ghost-button" disabled={busy !== null} onClick={() => run("AI generation", () => api.generateCampaign(campaign.id))}>{busy === "AI generation" ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />} Regenerate</button>
            <button className="ghost-button" disabled={busy !== null} onClick={() => run("Policy review", () => api.reviewCampaign(campaign.id))}>{busy === "Policy review" ? <Loader2 className="spin" size={16} /> : <Shield size={16} />} Re-check policy</button>
            {campaign.status === "READY_TO_LAUNCH" ? (
              <button className="filled-button compact" disabled={busy !== null} onClick={() => run("Approval", () => api.approveCampaign(campaign.id))}>{busy === "Approval" ? <Loader2 className="spin" size={16} /> : <BadgeCheck size={16} />} Approve</button>
            ) : null}
            {campaign.status === "READY_TO_LAUNCH" || campaign.status === "PAUSED" ? (
              <button className="filled-button compact success" disabled={busy !== null} onClick={() => run("Launch", () => api.launchCampaign(campaign.id))}>{busy === "Launch" ? <Loader2 className="spin" size={16} /> : <Send size={16} />} Launch</button>
            ) : null}
            {live ? (
              <button className="ghost-button" disabled={busy !== null} onClick={() => run("Pause", () => api.pauseCampaign(campaign.id))}>{busy === "Pause" ? <Loader2 className="spin" size={16} /> : <Pause size={16} />} Pause</button>
            ) : null}
            {campaign.status === "PAUSED" ? (
              <button className="ghost-button" disabled={busy !== null} onClick={() => run("Resume", () => api.resumeCampaign(campaign.id))}>{busy === "Resume" ? <Loader2 className="spin" size={16} /> : <Play size={16} />} Resume</button>
            ) : null}
          </div>
        </section>

        <section className="card">
          <header className="card-head"><div><strong>Performance</strong><span>Last {metrics.length} day{metrics.length === 1 ? "" : "s"}</span></div></header>
          <div className="kpi-grid four">
            <KPI label="Impressions" value={totals.impressions.toLocaleString()} />
            <KPI label="Clicks" value={totals.clicks.toLocaleString()} />
            <KPI label="Leads" value={totals.leads.toLocaleString()} accent="success" />
            <KPI label="Spend" value={`NGN ${totals.spend.toLocaleString()}`} />
          </div>
          {metrics.length > 0 ? (
            <div className="spark">
              {metrics.slice().reverse().map((metric, index) => {
                const max = Math.max(...metrics.map((row) => row.impressions), 1);
                return <span key={index} className="spark-bar" style={{ height: `${Math.max(6, (metric.impressions / max) * 100)}%` }} title={`${metric.date}: ${metric.impressions} impressions`} />;
              })}
            </div>
          ) : <p className="muted small">Performance starts flowing in once the ad goes live.</p>}
        </section>

        <section className="card">
          <header className="card-head">
            <div><strong>AI optimization</strong></div>
            <button className="filled-button compact" onClick={() => void fetchOptimization()} disabled={optimizing}>
              {optimizing ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />} {optimization ? "Regenerate" : "Get suggestions"}
            </button>
          </header>
          {optimization ? (
            <ul className="optim-list">
              {Object.entries(optimization).map(([section, suggestions]) => (
                <li key={section}>
                  <strong>{section.replaceAll("_", " ")}</strong>
                  <ul>
                    {(Array.isArray(suggestions) ? suggestions : [String(suggestions)]).map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : <p className="muted small">Tap to generate suggestions on copy, creative, audience, budget, and follow-up.</p>}
        </section>
      </div>

      <footer className="sheet-footer">
        <button className="ghost-button" onClick={onClose}>Close</button>
        <button className="ghost-button danger" disabled={busy !== null} onClick={() => run("Archive", () => api.archiveCampaign(campaign.id)).then(onClose)}><Trash2 size={16} /> Archive</button>
      </footer>
    </FullSheet>
  );
}

function LeadDetailSheet({ lead, onClose, onChange, notify }: {
  lead: Lead;
  onClose: () => void;
  onChange: () => void | Promise<void>;
  notify: (toast: Toast) => void;
}) {
  const [channel, setChannel] = useState<"WHATSAPP" | "SMS" | "EMAIL" | "CALL">("WHATSAPP");
  const [generated, setGenerated] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [note, setNote] = useState("");

  async function generate() {
    setGenerating(true);
    try {
      const result = await api.generateLeadFollowUp(lead.id, channel);
      setGenerated(result.message ?? null);
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not generate follow-up" });
    } finally {
      setGenerating(false);
    }
  }

  async function moveStage() {
    try {
      await api.updateLead(lead.id, { status: nextStage(lead.status) });
      notify({ type: "success", message: "Lead moved" });
      await onChange();
      onClose();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not move lead" });
    }
  }

  async function saveNote() {
    if (!note.trim()) return;
    try {
      await api.addLeadNote(lead.id, note.trim());
      setNote("");
      notify({ type: "success", message: "Note saved" });
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not save note" });
    }
  }

  function copyMessage() {
    if (!generated) return;
    void navigator.clipboard.writeText(generated);
    notify({ type: "success", message: "Copied" });
  }

  function openChannel() {
    const text = generated ? encodeURIComponent(generated) : "";
    if (channel === "WHATSAPP" && lead.whatsappNumber) {
      window.open(`https://wa.me/${lead.whatsappNumber.replace(/[^0-9]/g, "")}?text=${text}`, "_blank");
    } else if (channel === "SMS" && lead.phone) {
      window.location.href = `sms:${lead.phone}?body=${text}`;
    } else if (channel === "EMAIL" && lead.email) {
      window.location.href = `mailto:${lead.email}?body=${text}`;
    } else if (channel === "CALL" && (lead.phone || lead.whatsappNumber)) {
      window.location.href = `tel:${lead.phone ?? lead.whatsappNumber}`;
    }
  }

  return (
    <FullSheet onClose={onClose} title={lead.fullName} subtitle={lead.interest ?? "Lead"}>
      <div className="sheet-body">
        <section className="card">
          <header className="card-head">
            <div><strong>Contact</strong><span>{timeAgo(lead.createdAt)}</span></div>
            <StatusPill value={lead.status} compact />
          </header>
          <ul className="contact-list">
            {lead.whatsappNumber ? <li><MessageCircle size={16} /> {lead.whatsappNumber}</li> : null}
            {lead.phone ? <li><Phone size={16} /> {lead.phone}</li> : null}
            {lead.email ? <li><Mail size={16} /> {lead.email}</li> : null}
          </ul>
        </section>

        <section className="card">
          <header className="card-head"><div><strong>AI follow-up</strong></div></header>
          <div className="segmented">
            {(["WHATSAPP", "SMS", "EMAIL", "CALL"] as const).map((value) => (
              <button key={value} className={channel === value ? "active" : ""} onClick={() => setChannel(value)}>{value === "WHATSAPP" ? "WhatsApp" : value === "EMAIL" ? "Email" : value === "SMS" ? "SMS" : "Call"}</button>
            ))}
          </div>
          <div className="follow-actions">
            <button className="filled-button compact" onClick={() => void generate()} disabled={generating}>
              {generating ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />} Generate
            </button>
            {generated ? (
              <>
                <button className="ghost-button" onClick={copyMessage}>Copy</button>
                <button className="filled-button compact success" onClick={openChannel}><Send size={16} /> Send</button>
              </>
            ) : null}
          </div>
          {generated ? <pre className="follow-message">{generated}</pre> : null}
        </section>

        <section className="card">
          <header className="card-head"><div><strong>Notes</strong></div></header>
          <Field label="Add a note">
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Spoke with them on WhatsApp at 4pm" />
          </Field>
          <div className="row-end">
            <button className="ghost-button" onClick={() => void saveNote()} disabled={!note.trim()}>Save note</button>
          </div>
        </section>
      </div>

      <footer className="sheet-footer">
        <button className="ghost-button" onClick={onClose}>Close</button>
        <button className="filled-button" onClick={() => void moveStage()}>Move to {nextStage(lead.status).replaceAll("_", " ").toLowerCase()} <ArrowRight size={16} /></button>
      </footer>
    </FullSheet>
  );
}

function IssueFixSheet({ campaign, onClose, onResolved, notify }: { campaign: Campaign; onClose: () => void; onResolved: () => void; notify: (toast: Toast) => void }) {
  const [busy, setBusy] = useState(false);
  const platforms = campaignPlatforms(campaign);
  const issue = summarizeIssue(campaign);
  const review = campaign.policyReviews?.[0];

  async function retry() {
    setBusy(true);
    try {
      await api.reviewCampaign(campaign.id);
      await api.launchCampaign(campaign.id);
      onResolved();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Retry failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <FullSheet onClose={onClose} title="Fix the issue" subtitle={campaign.name}>
      <div className="sheet-body">
        <section className="card issue-card">
          <header className="card-head"><div><strong>Why we paused</strong><span>{issue}</span></div><AlertTriangle size={22} /></header>
          {review?.flaggedReasons?.length ? (
            <ul className="reason-list">{review.flaggedReasons.map((reason) => <li key={reason}><AlertTriangle size={14} /> {reason}</li>)}</ul>
          ) : null}
        </section>

        {platforms.map((platform) => (
          <section key={platform.id} className="card">
            <header className="card-head">
              <div className="card-head-left">
                <span className="platform-pill" style={{ ['--accent' as never]: platform.accent }}>
                  <span className="platform-pill-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
                  {platform.name}
                </span>
              </div>
            </header>
            <div className="form-stack">
              {platform.requirements.map((requirement) => (
                <Field key={requirement.key} label={requirement.label}>
                  {requirement.type === "select" && requirement.options ? (
                    <select><option value="">Choose...</option>{requirement.options.map((option) => <option key={option}>{option}</option>)}</select>
                  ) : (
                    <input type={requirement.type ?? "text"} placeholder={requirement.hint} />
                  )}
                </Field>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="sheet-footer">
        <button className="ghost-button" onClick={onClose}>Close</button>
        <button className="filled-button success" onClick={() => void retry()} disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />} Resubmit
        </button>
      </footer>
    </FullSheet>
  );
}

function FullSheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <section className="sheet" onClick={(event) => event.stopPropagation()}>
        <header className="sheet-head">
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
          <div><strong>{title}</strong>{subtitle ? <span>{subtitle}</span> : null}</div>
        </header>
        {children}
      </section>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="feed">
      <div className="skeleton hero" />
      <div className="skeleton-rail">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton story" />)}</div>
      <div className="skeleton metric-row">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton chip" />)}</div>
      <div className="skeleton card" />
      <div className="skeleton card" />
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="splash">
      <Brand large />
      <Loader2 className="spin" size={22} />
    </div>
  );
}

function StatusPill({ value, compact }: { value: string; compact?: boolean }) {
  const map: Record<string, { label: string; tone: string }> = {
    DRAFT: { label: "Draft", tone: "muted" },
    PENDING_REVIEW: { label: "Reviewing", tone: "info" },
    READY_TO_LAUNCH: { label: "Ready", tone: "info" },
    SUBMITTED: { label: "Submitted", tone: "info" },
    ACTIVE: { label: "Live", tone: "success" },
    PAUSED: { label: "Paused", tone: "muted" },
    REJECTED: { label: "Rejected", tone: "danger" },
    FAILED: { label: "Failed", tone: "danger" },
    APPROVED: { label: "Approved", tone: "success" },
    COMPLETED: { label: "Completed", tone: "success" },
    ARCHIVED: { label: "Archived", tone: "muted" }
  };
  const entry = map[value] ?? { label: value.replaceAll("_", " ").toLowerCase(), tone: "muted" };
  return <span className={`status ${entry.tone} ${compact ? "compact" : ""}`}>{entry.label}</span>;
}

function AdminConsole({ user, logout, notify }: { user: { firstName: string; email: string; role: string }; logout: () => void; notify: (toast: Toast) => void }) {
  const [tab, setTab] = useState<AdminTab>("admin-home");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; role: string; isActive: boolean }>>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [flagged, setFlagged] = useState<Array<{ id: string; riskLevel: string; humanStatus: string; campaign?: Campaign }>>([]);

  async function load() {
    setLoading(true);
    try {
      const [userRows, workspaceRows, campaignRows, flaggedRows] = await Promise.all([
        api.adminUsers(),
        api.adminWorkspaces(),
        api.adminCampaigns(),
        api.adminFlaggedCampaigns()
      ]);
      setUsers(userRows);
      setWorkspaces(workspaceRows);
      setCampaigns(campaignRows);
      setFlagged(flaggedRows);
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not load admin data." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="shell admin">
      <AppBar
        title={tab === "admin-home" ? "Sart34 Admin" : adminLabel(tab)}
        subtitle="System operator"
        right={
          <>
            <IconBtn onClick={() => void load()} label="Refresh"><RefreshCw size={20} /></IconBtn>
            <button className="avatar-chip admin" onClick={() => setTab("admin-profile")}><span>{user.firstName[0]?.toUpperCase()}</span></button>
          </>
        }
      />
      <main className="main">
        {loading ? <FeedSkeleton /> : null}
        {!loading && tab === "admin-home" ? (
          <div className="page">
            <div className="kpi-grid four">
              <KPI label="Users" value={String(users.length)} />
              <KPI label="Workspaces" value={String(workspaces.length)} />
              <KPI label="Ads" value={String(campaigns.length)} />
              <KPI label="Review queue" value={String(flagged.length)} accent="warn" />
            </div>
            <section className="card">
              <header className="card-head"><div><strong>Recent ads</strong></div></header>
              <ul className="mini-list">
                {campaigns.slice(0, 8).map((campaign) => (
                  <li className="mini-row" key={campaign.id}><strong>{campaign.name}</strong><StatusPill value={campaign.status} compact /></li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
        {!loading && tab === "admin-review" ? (
          <div className="page">
            <h2 className="page-title">Policy review</h2>
            <section className="card">
              <ul className="action-list">
                {flagged.map((flag) => (
                  <li key={flag.id}>
                    <div className="action-icon"><Shield size={20} /></div>
                    <div className="action-text"><strong>{flag.campaign?.name ?? flag.id}</strong><span>{flag.riskLevel} · {flag.humanStatus}</span></div>
                  </li>
                ))}
                {flagged.length === 0 ? <div className="empty"><ShieldCheck size={26} /><strong>Queue is clear</strong></div> : null}
              </ul>
            </section>
          </div>
        ) : null}
        {!loading && tab === "admin-users" ? (
          <div className="page">
            <h2 className="page-title">Users</h2>
            <section className="card">
              <ul className="lead-list">
                {users.map((entry) => (
                  <li key={entry.id}>
                    <span className="lead-avatar">{entry.firstName[0]?.toUpperCase()}</span>
                    <div className="lead-text">
                      <strong>{entry.firstName} {entry.lastName}</strong>
                      <span>{entry.email}</span>
                      <span className="lead-meta">{entry.role.replaceAll("_", " ").toLowerCase()}</span>
                    </div>
                    <span className={`status ${entry.isActive ? "success" : "danger"} compact`}>{entry.isActive ? "Active" : "Suspended"}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
        {!loading && tab === "admin-profile" ? (
          <div className="page">
            <section className="profile-hero">
              <div className="profile-hero-bg" />
              <div className="profile-hero-row">
                <div className="profile-avatar admin">{user.firstName[0]?.toUpperCase()}</div>
                <div className="profile-hero-meta">
                  <strong>{user.firstName}</strong>
                  <span>{user.email}</span>
                  <span className="profile-pill"><Shield size={14} /> Super admin</span>
                </div>
              </div>
            </section>
            <button className="ghost-button danger full" onClick={logout}><LogOut size={18} /> Sign out</button>
          </div>
        ) : null}
      </main>
      <nav className="bottom-nav admin" aria-label="Admin">
        <BottomTab active={tab === "admin-home"} onClick={() => setTab("admin-home")} icon={<Home />} label="Home" />
        <BottomTab active={tab === "admin-review"} onClick={() => setTab("admin-review")} icon={<Shield />} label="Review" badge={flagged.length} />
        <span className="bottom-spacer" aria-hidden="true" />
        <BottomTab active={tab === "admin-users"} onClick={() => setTab("admin-users")} icon={<Users />} label="Users" />
        <BottomTab active={tab === "admin-profile"} onClick={() => setTab("admin-profile")} icon={<UserRound />} label="You" />
      </nav>
    </div>
  );
}

function tabLabel(tab: BusinessTab): string {
  return ({ home: "Home", library: "Library", inbox: "Inbox", profile: "Profile" } as const)[tab];
}

function adminLabel(tab: AdminTab): string {
  return ({ "admin-home": "Home", "admin-review": "Policy review", "admin-users": "Users", "admin-profile": "Profile" } as const)[tab];
}

function nextStage(stage: string) {
  const index = leadStages.indexOf(stage);
  return leadStages[Math.min(index + 1, leadStages.length - 1)];
}

function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(value).toLocaleDateString();
}

function campaignPlatforms(campaign: Campaign): PlatformDef[] {
  const meta = (campaign.aiStrategyJson as { targetPlatforms?: string[] } | undefined)?.targetPlatforms
    ?? ((campaign as { productDetails?: { targetPlatforms?: string[] } }).productDetails?.targetPlatforms);
  const ids = meta && meta.length ? meta : [campaign.platform];
  return ids
    .map((id) => PLATFORM_BY_ID[id])
    .filter((value): value is PlatformDef => Boolean(value));
}

function summarizeIssue(campaign: Campaign): string {
  const review = campaign.policyReviews?.[0];
  if (review?.flaggedReasons?.[0]) return review.flaggedReasons[0];
  if (campaign.status === "REJECTED") return "Platform rejected this ad. Update and resubmit.";
  if (campaign.status === "FAILED") return "Launch failed. Provide the missing details and Sart34 will retry.";
  return "Action required to continue.";
}
