import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bookmark,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Eye,
  Heart,
  Home,
  ImagePlus,
  Inbox,
  Loader2,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Unplug,
  Upload,
  UserRound,
  Users,
  Wallet,
  X,
  Zap
} from "lucide-react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, Campaign, Lead, Workspace } from "./api";

type Toast = { type: "success" | "error" | "info"; message: string };
type BusinessTab = "home" | "discover" | "inbox" | "profile";
type AdminTab = "admin-home" | "admin-review" | "admin-users" | "admin-profile";

type IntegrationAccount = { id: string; provider: string; accountName?: string; status: string };

type PlatformRequirement = {
  key: string;
  label: string;
  hint?: string;
  type?: "text" | "url" | "tel" | "select";
  options?: string[];
};

type PlatformDef = {
  id: string;
  name: string;
  short: string;
  tagline: string;
  surfaces: string[];
  accent: string;
  glyph: string;
  formats: string[];
  requirements: PlatformRequirement[];
  budgetHint: string;
  oauth: boolean;
};

const PLATFORMS: PlatformDef[] = [
  {
    id: "META",
    name: "Meta",
    short: "Facebook + Instagram",
    tagline: "Reels, Feed, Stories, Marketplace",
    surfaces: ["Instagram Feed", "Instagram Reels", "Facebook Feed", "Stories", "Marketplace"],
    accent: "#1877F2",
    glyph: "ƒ",
    formats: ["Image", "Video 9:16", "Carousel", "Collection"],
    requirements: [
      { key: "page", label: "Facebook Page", hint: "Required for Instagram + Facebook delivery" },
      { key: "adAccount", label: "Ad account", hint: "Used to bill spend and track delivery" },
      { key: "pixel", label: "Pixel / Conversions API", hint: "Optional but raises ROAS by 30 to 60 percent" },
      { key: "primaryText", label: "Primary text", hint: "125 characters keeps the most for Reels" },
      { key: "callToAction", label: "Call to action", type: "select", options: ["Send WhatsApp message", "Learn more", "Sign up", "Get quote", "Shop now"] }
    ],
    budgetHint: "Daily budget recommended above 2,000 NGN for stable learning phase",
    oauth: true
  },
  {
    id: "GOOGLE",
    name: "Google Ads",
    short: "Search + Display + YouTube + Performance Max",
    tagline: "Capture intent across Search, Maps, Gmail, YouTube",
    surfaces: ["Google Search", "YouTube", "Display Network", "Discover", "Maps"],
    accent: "#1A73E8",
    glyph: "G",
    formats: ["Responsive Search", "Performance Max", "Video", "Display"],
    requirements: [
      { key: "headlines", label: "5 to 15 headlines (30 chars each)" },
      { key: "descriptions", label: "2 to 4 descriptions (90 chars each)" },
      { key: "businessName", label: "Business name" },
      { key: "finalUrl", label: "Final URL", type: "url" },
      { key: "keywords", label: "Keyword themes", hint: "Group by intent: brand, category, competitor" }
    ],
    budgetHint: "Search needs at least 10x the average CPC per day to learn",
    oauth: false
  },
  {
    id: "TIKTOK",
    name: "TikTok",
    short: "For You + Spark Ads",
    tagline: "Native vertical video, sound on, fast hooks",
    surfaces: ["For You", "Top View", "Spark Ads", "Branded Hashtag"],
    accent: "#000000",
    glyph: "♪",
    formats: ["Video 9:16", "Spark Ad (boost organic post)", "Image carousel"],
    requirements: [
      { key: "identity", label: "TikTok identity / handle" },
      { key: "pixel", label: "TikTok Pixel", hint: "Required for conversion campaigns" },
      { key: "music", label: "Sound or original audio", hint: "Sound-on lifts watch time 50%+" },
      { key: "hashtags", label: "Hashtags", hint: "3 to 5 niche tags beat broad ones" },
      { key: "hook", label: "First 1.5 second hook", hint: "Native, ugly, real wins polished" }
    ],
    budgetHint: "Spend at least 20 USD / day per ad group to escape learning",
    oauth: false
  },
  {
    id: "LINKEDIN",
    name: "LinkedIn",
    short: "B2B + Recruiting",
    tagline: "Reach decision makers by job title, seniority, company",
    surfaces: ["Sponsored Content", "Message Ads", "Conversation Ads"],
    accent: "#0A66C2",
    glyph: "in",
    formats: ["Single image", "Video", "Document ad", "Lead gen form"],
    requirements: [
      { key: "companyPage", label: "LinkedIn Company Page" },
      { key: "audience", label: "Target by job title, seniority, function, industry" },
      { key: "headline", label: "Intro text + headline (under 150 chars)" },
      { key: "leadFormFields", label: "Lead form fields", hint: "Pre-filled from LinkedIn profile" }
    ],
    budgetHint: "Minimum 10 USD / day, expect higher CPM than Meta",
    oauth: false
  },
  {
    id: "X",
    name: "X",
    short: "Promoted posts",
    tagline: "Real-time reach for launches and announcements",
    surfaces: ["Home Timeline", "Search", "Profiles"],
    accent: "#000000",
    glyph: "𝕏",
    formats: ["Promoted Post", "Image", "Video", "Carousel"],
    requirements: [
      { key: "handle", label: "X handle to promote from" },
      { key: "interests", label: "Interest + keyword targeting" },
      { key: "tweet", label: "Post copy (280 chars)" }
    ],
    budgetHint: "Best for time-sensitive launches and trending moments",
    oauth: false
  },
  {
    id: "YOUTUBE",
    name: "YouTube",
    short: "Video reach + retargeting",
    tagline: "Skippable in-stream, Bumper, Shorts",
    surfaces: ["YouTube Watch", "YouTube Shorts", "YouTube Search"],
    accent: "#FF0000",
    glyph: "▶",
    formats: ["Skippable in-stream", "Bumper 6s", "In-feed", "Shorts"],
    requirements: [
      { key: "videoUrl", label: "Hosted YouTube video URL", type: "url" },
      { key: "channel", label: "Linked YouTube channel" },
      { key: "audience", label: "Topic, in-market, or custom audience" }
    ],
    budgetHint: "Bumpers reach cheap, skippables drive consideration",
    oauth: false
  },
  {
    id: "PINTEREST",
    name: "Pinterest",
    short: "Visual planners + shoppers",
    tagline: "High-intent home, beauty, weddings, decor",
    surfaces: ["Home feed", "Search", "Related pins"],
    accent: "#E60023",
    glyph: "P",
    formats: ["Standard Pin", "Idea Pin", "Video Pin", "Shopping Pin"],
    requirements: [
      { key: "businessAccount", label: "Pinterest Business account" },
      { key: "boardDestination", label: "Board destination" },
      { key: "feed", label: "Product feed", hint: "Required for Shopping campaigns" }
    ],
    budgetHint: "Skews female, plans purchases 1 to 3 months ahead",
    oauth: false
  },
  {
    id: "SNAPCHAT",
    name: "Snapchat",
    short: "Gen Z reach",
    tagline: "Snap Ads, Story Ads, AR Lenses",
    surfaces: ["Discover", "Stories", "Spotlight"],
    accent: "#FFFC00",
    glyph: "S",
    formats: ["Snap Ad 9:16", "Story Ad", "Collection", "AR Lens"],
    requirements: [
      { key: "publicProfile", label: "Public profile" },
      { key: "snapPixel", label: "Snap Pixel" },
      { key: "audience", label: "Lifestyle, behaviours, lookalikes" }
    ],
    budgetHint: "Vertical native creative, 3 to 5 second hook",
    oauth: false
  },
  {
    id: "WHATSAPP",
    name: "WhatsApp Business",
    short: "Click to chat + broadcast",
    tagline: "Highest reply rate, lowest cost per qualified lead in many regions",
    surfaces: ["Click to WhatsApp ads", "Catalog", "Broadcast"],
    accent: "#25D366",
    glyph: "✓",
    formats: ["Click to chat", "Catalog message", "Broadcast template"],
    requirements: [
      { key: "whatsappNumber", label: "Verified WhatsApp Business number", type: "tel" },
      { key: "openingMessage", label: "Pre-filled opening message" },
      { key: "businessProfile", label: "Business profile (logo, hours, address)" }
    ],
    budgetHint: "Pair with Meta ads for click-to-WhatsApp at lowest CPL",
    oauth: false
  }
];

const PLATFORM_BY_ID = Object.fromEntries(PLATFORMS.map((platform) => [platform.id, platform]));

const campaignGoals: Array<[string, string, string]> = [
  ["WHATSAPP_MESSAGES", "WhatsApp messages", "Best for service businesses and direct sales"],
  ["GENERATE_LEADS", "Lead generation", "Capture qualified leads into the inbox"],
  ["GET_CALLS", "Phone calls", "Drive direct calls from high-intent users"],
  ["WEBSITE_TRAFFIC", "Website traffic", "Send people to a landing page"],
  ["REAL_ESTATE_LISTING", "Property listing", "Promote a single listing or open house"],
  ["BOOK_APPOINTMENTS", "Book appointments", "Calendar slots, consultations, demos"],
  ["EVENT_REGISTRATION", "Event registration", "Workshops, launches, webinars"]
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
          : await api.register({ name: String(form.get("name")), email: String(form.get("email")) });
      api.saveSession(session);
      notify({ type: "success", message: "Welcome to Sart34" });
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
          <h1>Post once.<br />Run ads everywhere.</h1>
          <p>Upload a photo or video. Sart34 writes the copy, picks the audience, launches on every platform you connected, and shows you the results to approve.</p>
        </div>
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button>
          <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button>
        </div>
        <form onSubmit={submit} className="form-stack">
          {mode === "register" ? (
            <Field label="Your name"><input name="name" required placeholder="Ada Nwosu" autoComplete="name" /></Field>
          ) : null}
          <Field label="Email"><input name="email" type="email" required placeholder="you@business.com" autoComplete="email" /></Field>
          {mode === "login" ? (
            <Field label="Password"><input name="password" type="password" required placeholder="•••••••••" autoComplete="current-password" /></Field>
          ) : null}
          <button className="filled-button" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : null}
            {mode === "login" ? "Sign in" : "Create my account"}
          </button>
        </form>
        <p className="auth-fineprint">By continuing you agree to Sart34's terms and privacy policy. We never post to your accounts without approval.</p>
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
  const [createOpen, setCreateOpen] = useState(false);
  const [issueCampaign, setIssueCampaign] = useState<Campaign | null>(null);
  const [connectPlatform, setConnectPlatform] = useState<PlatformDef | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
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
      const [campaignRows, leadRows, summary, accountRows] = await Promise.all([
        api.campaigns(activeWorkspace.id),
        api.leads(activeWorkspace.id),
        api.overview(activeWorkspace.id),
        api.integrations(activeWorkspace.id)
      ]);
      setCampaigns(campaignRows);
      setLeads(leadRows);
      setOverview(summary);
      setAccounts(accountRows);
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not sync Sart34." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const issueCount = useMemo(
    () => campaigns.filter((campaign) => ["FAILED", "REJECTED", "NEEDS_INPUT", "POLICY_FLAGGED"].includes(campaign.status)).length,
    [campaigns]
  );

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
        {loading && tab === "home" ? <FeedSkeleton /> : null}
        {!loading && tab === "home" ? (
          <HomeFeed
            user={user}
            workspace={workspace}
            campaigns={campaigns}
            leads={leads}
            accounts={accounts}
            walletBalance={overview?.walletBalance ?? 0}
            onCreate={() => setCreateOpen(true)}
            onConnect={(platform) => setConnectPlatform(platform)}
            onFix={setIssueCampaign}
            onAction={async (id, label, action) => {
              try {
                await action();
                notify({ type: "success", message: `${label} done` });
                await load();
              } catch (error) {
                notify({ type: "error", message: error instanceof Error ? error.message : `${label} failed` });
              }
            }}
          />
        ) : null}
        {!loading && tab === "discover" ? <DiscoverPage campaigns={campaigns} leads={leads} accounts={accounts} /> : null}
        {!loading && tab === "inbox" ? (
          <InboxPage
            campaigns={campaigns}
            leads={leads}
            onFix={setIssueCampaign}
            onMoveLead={async (lead) => {
              try {
                await api.updateLead(lead.id, { status: nextStage(lead.status) });
                notify({ type: "success", message: "Lead moved" });
                await load();
              } catch (error) {
                notify({ type: "error", message: error instanceof Error ? error.message : "Could not update lead" });
              }
            }}
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
            onLogout={logout}
          />
        ) : null}
      </main>
      <BottomNav
        tab={tab}
        onTab={setTab}
        onCreate={() => setCreateOpen(true)}
        inboxBadge={leads.filter((lead) => lead.status === "NEW_LEAD").length + issueCount}
      />
      {createOpen && workspace ? (
        <CreateAdSheet
          workspace={workspace}
          accounts={accounts}
          onClose={() => setCreateOpen(false)}
          onConnect={(platform) => setConnectPlatform(platform)}
          onCreated={() => {
            setCreateOpen(false);
            notify({ type: "success", message: "Ad submitted to the AI for review" });
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
          onConnected={() => {
            setConnectPlatform(null);
            void load();
          }}
          notify={notify}
        />
      ) : null}
      {issueCampaign ? (
        <IssueFixSheet
          campaign={issueCampaign}
          onClose={() => setIssueCampaign(null)}
          onResolved={() => {
            setIssueCampaign(null);
            notify({ type: "success", message: "Sart34 retried the launch" });
            void load();
          }}
          notify={notify}
        />
      ) : null}
    </div>
  );
}

function AppBar({ title, subtitle, right, leading }: { title: string; subtitle?: string; right?: ReactNode; leading?: ReactNode }) {
  return (
    <header className="appbar">
      {leading ? <div className="appbar-leading">{leading}</div> : <Brand />}
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
      <BottomTab active={tab === "discover"} onClick={() => onTab("discover")} icon={<Compass />} label="Discover" />
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
  workspace,
  campaigns,
  leads,
  accounts,
  walletBalance,
  onCreate,
  onConnect,
  onFix,
  onAction
}: {
  user: { firstName: string };
  workspace: Workspace | null;
  campaigns: Campaign[];
  leads: Lead[];
  accounts: IntegrationAccount[];
  walletBalance: number;
  onCreate: () => void;
  onConnect: (platform: PlatformDef) => void;
  onFix: (campaign: Campaign) => void;
  onAction: (id: string, label: string, action: () => Promise<unknown>) => Promise<void>;
}) {
  const connectedIds = new Set(accounts.filter((account) => account.status === "CONNECTED").map((account) => account.provider));
  const pendingLeads = leads.filter((lead) => !["WON", "LOST"].includes(lead.status)).length;
  const totalImpressions = campaigns.reduce((sum) => sum + 0, 0);

  return (
    <div className="feed">
      <section className="hero-greeting">
        <div>
          <span>Welcome back</span>
          <h2>Hi {user.firstName}, what are we launching today?</h2>
        </div>
        <button className="filled-button compact" onClick={onCreate}><Plus size={18} /> New ad</button>
      </section>

      <section className="story-rail" aria-label="Connected platforms">
        {PLATFORMS.map((platform) => {
          const isConnected = connectedIds.has(platform.id);
          return (
            <button key={platform.id} className={`story ${isConnected ? "live" : "idle"}`} onClick={() => onConnect(platform)}>
              <span className="story-ring" style={{ background: isConnected ? `conic-gradient(${platform.accent}, ${platform.accent}80)` : "transparent" }}>
                <span className="story-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
              </span>
              <span className="story-label">{platform.name}</span>
              <span className="story-status">{isConnected ? "Live" : "Connect"}</span>
            </button>
          );
        })}
      </section>

      <section className="metric-row">
        <MetricChip icon={<Send size={18} />} label="Active ads" value={String(campaigns.filter((campaign) => ["ACTIVE", "READY_TO_LAUNCH", "SUBMITTED"].includes(campaign.status)).length)} />
        <MetricChip icon={<MessageCircle size={18} />} label="Open leads" value={String(pendingLeads)} accent="success" />
        <MetricChip icon={<Eye size={18} />} label="Impressions" value={totalImpressions.toLocaleString()} />
        <MetricChip icon={<Wallet size={18} />} label="Credits" value={String(walletBalance)} accent="warn" />
      </section>

      {connectedIds.size === 0 ? (
        <article className="connect-cta">
          <div>
            <Sparkles size={22} />
            <h3>Connect your first platform</h3>
            <p>Sart34 launches your ads natively on Meta, Google, TikTok and more. Connect one to start.</p>
          </div>
          <div className="connect-cta-grid">
            {PLATFORMS.slice(0, 6).map((platform) => (
              <button key={platform.id} className="platform-tile" style={{ ['--accent' as never]: platform.accent }} onClick={() => onConnect(platform)}>
                <span className="platform-tile-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
                <strong>{platform.name}</strong>
                <span>{platform.short}</span>
              </button>
            ))}
          </div>
        </article>
      ) : null}

      {campaigns.length === 0 ? (
        <EmptyFeed onCreate={onCreate} />
      ) : (
        <div className="feed-stack">
          {campaigns.map((campaign) => (
            <AdPostCard
              key={campaign.id}
              campaign={campaign}
              onFix={() => onFix(campaign)}
              onAction={(label, action) => onAction(campaign.id, label, action)}
            />
          ))}
        </div>
      )}
    </div>
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

function AdPostCard({ campaign, onFix, onAction }: { campaign: Campaign; onFix: () => void; onAction: (label: string, action: () => Promise<unknown>) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const platforms = campaignPlatforms(campaign);
  const status = campaign.status;
  const issue = ["FAILED", "REJECTED", "NEEDS_INPUT", "POLICY_FLAGGED"].includes(status);
  const live = ["ACTIVE", "READY_TO_LAUNCH", "SUBMITTED"].includes(status);
  const creative = campaign.creatives?.[0];
  const goal = campaignGoals.find(([value]) => value === campaign.goal);

  async function trigger(label: string, action: () => Promise<unknown>) {
    setBusy(label);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className={`post-card ${live ? "live" : ""} ${issue ? "issue" : ""}`}>
      <header className="post-head">
        <div className="post-author">
          <span className="post-avatar"><Sparkles size={16} /></span>
          <div>
            <strong>{campaign.name}</strong>
            <span>{goal?.[1] ?? campaign.goal} · {timeAgo(campaign.createdAt)}</span>
          </div>
        </div>
        <button className="ghost-icon" aria-label="More"><MoreHorizontal size={20} /></button>
      </header>

      <div className="post-creative" role="img" aria-label="Ad creative">
        {creative ? (
          /\.(mp4|mov|webm)$/i.test(creative.fileName) ? (
            <video src={creative.fileUrl} controls />
          ) : (
            <img src={creative.fileUrl} alt={campaign.name} />
          )
        ) : (
          <div className="post-creative-placeholder">
            <ImagePlus size={32} />
            <span>{campaign.objective ?? "AI is drafting your visual"}</span>
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

      {issue ? (
        <div className="post-issue">
          <AlertTriangle size={18} />
          <div>
            <strong>Sart34 needs your input</strong>
            <span>{summarizeIssue(campaign)}</span>
          </div>
          <button className="filled-button compact danger" onClick={onFix}>Fix now</button>
        </div>
      ) : null}

      <footer className="post-actions">
        <button className="post-action" disabled={busy !== null} onClick={() => trigger("AI", () => api.generateCampaign(campaign.id)).then(() => onAction("AI generation", async () => undefined))}>
          {busy === "AI" ? <Loader2 className="spin" size={18} /> : <Sparkles size={18} />}
          <span>Generate</span>
        </button>
        <button className="post-action" disabled={busy !== null} onClick={() => trigger("Review", () => api.reviewCampaign(campaign.id)).then(() => onAction("Policy review", async () => undefined))}>
          {busy === "Review" ? <Loader2 className="spin" size={18} /> : <Shield size={18} />}
          <span>Review</span>
        </button>
        <button className="post-action" disabled={busy !== null} onClick={() => trigger("Approve", () => api.approveCampaign(campaign.id)).then(() => onAction("Approval", async () => undefined))}>
          {busy === "Approve" ? <Loader2 className="spin" size={18} /> : <BadgeCheck size={18} />}
          <span>Approve</span>
        </button>
        <button className="post-action primary" disabled={busy !== null} onClick={() => trigger("Launch", () => api.launchCampaign(campaign.id)).then(() => onAction("Launch", async () => undefined))}>
          {busy === "Launch" ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
          <span>Launch</span>
        </button>
      </footer>
    </article>
  );
}

function EmptyFeed({ onCreate }: { onCreate: () => void }) {
  return (
    <article className="empty-feed">
      <div className="empty-feed-art" aria-hidden="true"><Sparkles size={28} /></div>
      <h3>Your feed is ready for its first ad</h3>
      <p>Tap the plus button. Upload one photo or video. Sart34 writes the headlines, picks the audience, lets you preview each platform, and you simply approve.</p>
      <button className="filled-button" onClick={onCreate}><Plus size={18} /> Create your first ad</button>
    </article>
  );
}

function DiscoverPage({ campaigns, leads, accounts }: { campaigns: Campaign[]; leads: Lead[]; accounts: IntegrationAccount[] }) {
  const connected = accounts.filter((account) => account.status === "CONNECTED").length;
  const won = leads.filter((lead) => lead.status === "WON").length;
  const open = leads.filter((lead) => !["WON", "LOST"].includes(lead.status)).length;
  return (
    <div className="page">
      <h2 className="page-title">Discover</h2>
      <p className="page-sub">Insights across every platform, in one place.</p>
      <section className="card">
        <header className="card-head">
          <div><strong>This week</strong><span>Combined performance</span></div>
          <span className="trend"><TrendingUp size={16} /> Live</span>
        </header>
        <div className="kpi-grid">
          <KPI label="Impressions" value="0" />
          <KPI label="Clicks" value="0" />
          <KPI label="Leads" value={String(leads.length)} accent="success" />
          <KPI label="Won deals" value={String(won)} accent="success" />
          <KPI label="Open leads" value={String(open)} />
          <KPI label="Connected" value={`${connected}/${PLATFORMS.length}`} />
        </div>
      </section>
      <section className="card">
        <header className="card-head">
          <div><strong>Best performing platforms</strong><span>Auto-rank by leads per credit</span></div>
        </header>
        <div className="rank-list">
          {PLATFORMS.slice(0, 5).map((platform, index) => (
            <div className="rank-row" key={platform.id}>
              <span className="rank-num">{index + 1}</span>
              <span className="platform-pill compact" style={{ ['--accent' as never]: platform.accent }}>
                <span className="platform-pill-glyph" style={{ background: platform.accent }}>{platform.glyph}</span>
                {platform.name}
              </span>
              <span className="rank-meta">{platform.budgetHint}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <header className="card-head"><div><strong>Recent ads</strong><span>{campaigns.length} total</span></div></header>
        <div className="mini-list">
          {campaigns.slice(0, 6).map((campaign) => (
            <div className="mini-row" key={campaign.id}>
              <strong>{campaign.name}</strong>
              <StatusPill value={campaign.status} compact />
            </div>
          ))}
          {campaigns.length === 0 ? <p className="muted">No ads yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: "success" | "warn" }) {
  return <div className={`kpi ${accent ?? ""}`}><strong>{value}</strong><span>{label}</span></div>;
}

function InboxPage({ campaigns, leads, onFix, onMoveLead }: { campaigns: Campaign[]; leads: Lead[]; onFix: (campaign: Campaign) => void; onMoveLead: (lead: Lead) => void }) {
  const [tab, setTab] = useState<"actions" | "leads">("actions");
  const issues = campaigns.filter((campaign) => ["FAILED", "REJECTED", "NEEDS_INPUT", "POLICY_FLAGGED"].includes(campaign.status));

  return (
    <div className="page">
      <h2 className="page-title">Inbox</h2>
      <p className="page-sub">Action required from you, leads from your ads.</p>
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
            <div className="empty">
              <ShieldCheck size={28} />
              <strong>All clear</strong>
              <span>No platform is asking for input right now.</span>
            </div>
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
            <div className="empty">
              <Inbox size={28} />
              <strong>No leads yet</strong>
              <span>New replies, calls, and form submissions arrive here.</span>
            </div>
          ) : (
            <ul className="lead-list">
              {leads.map((lead) => (
                <li key={lead.id} className={lead.status === "NEW_LEAD" ? "unread" : ""}>
                  <span className="lead-avatar">{lead.fullName.charAt(0)?.toUpperCase()}</span>
                  <div className="lead-text">
                    <strong>{lead.fullName}</strong>
                    <span>{lead.whatsappNumber ?? lead.phone ?? lead.email ?? "No contact"}</span>
                    <span className="lead-meta">{lead.interest ?? "—"} · {timeAgo(lead.createdAt)}</span>
                  </div>
                  <div className="lead-actions">
                    <StatusPill value={lead.status} compact />
                    <button className="ghost-button" onClick={() => onMoveLead(lead)}>Move <ArrowRight size={14} /></button>
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
  onBuyCredits,
  onLogout
}: {
  user: { firstName: string; email: string; role: string };
  workspace: Workspace | null;
  walletBalance: number;
  accounts: IntegrationAccount[];
  campaigns: Campaign[];
  leads: Lead[];
  onConnect: (platform: PlatformDef) => void;
  onBuyCredits: () => void;
  onLogout: () => void;
}) {
  const accountByProvider = useMemo(() => {
    const map = new Map<string, IntegrationAccount>();
    for (const account of accounts) map.set(account.provider, account);
    return map;
  }, [accounts]);

  const wonLeads = leads.filter((lead) => lead.status === "WON").length;
  const liveAds = campaigns.filter((campaign) => campaign.status === "ACTIVE").length;

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
          <div><strong>Connected accounts</strong><span>One tap to manage permissions on each platform</span></div>
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
                  ) : status === "EXPIRED" || status === "ERROR" ? (
                    <>
                      <AlertTriangle size={16} />
                      <span>Action needed</span>
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
        <header className="card-head"><div><strong>Wallet</strong><span>Sart34 credits are separate from ad spend</span></div></header>
        <div className="wallet-row">
          <div>
            <strong className="wallet-amount">{walletBalance}</strong>
            <span className="muted">credits available</span>
          </div>
          <button className="filled-button" onClick={onBuyCredits}><CircleDollarSign size={18} /> Top up</button>
        </div>
      </section>

      <section className="card">
        <header className="card-head"><div><strong>Settings</strong><span>{workspace?.name ?? "Studio"}</span></div></header>
        <ul className="setting-list">
          <SettingRow icon={<Settings size={18} />} title="Business profile" subtitle={workspace?.name ?? "Default workspace"} />
          <SettingRow icon={<CircleDollarSign size={18} />} title="Currency" subtitle={workspace?.defaultCurrency ?? "NGN"} />
          <SettingRow icon={<Bell size={18} />} title="Notifications" subtitle="WhatsApp, email, push" />
          <SettingRow icon={<Shield size={18} />} title="Permissions" subtitle={user.role.replaceAll("_", " ").toLowerCase()} />
        </ul>
      </section>

      <button className="ghost-button danger full" onClick={onLogout}><LogOut size={18} /> Sign out</button>
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
  onClose,
  onConnect,
  onCreated,
  notify
}: {
  workspace: Workspace;
  accounts: IntegrationAccount[];
  onClose: () => void;
  onConnect: (platform: PlatformDef) => void;
  onCreated: () => void;
  notify: (toast: Toast) => void;
}) {
  const steps = ["Upload", "Brief", "Platforms", "Audience", "Budget", "Preview", "Approve"] as const;
  const [step, setStep] = useState(0);
  const [media, setMedia] = useState<{ file: File; url: string; kind: "image" | "video" } | null>(null);
  const [brief, setBrief] = useState({ name: "", productName: "", offer: "", description: "", goal: "GENERATE_LEADS" });
  const connectedIds = new Set(accounts.filter((account) => account.status === "CONNECTED").map((account) => account.provider));
  const initialPlatforms = PLATFORMS.filter((platform) => connectedIds.has(platform.id)).map((platform) => platform.id);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialPlatforms.length ? initialPlatforms : ["META"]);
  const [audience, setAudience] = useState({ location: "", ageMin: 18, ageMax: 45, interests: "", gender: "ALL" });
  const [budget, setBudget] = useState({ daily: 5000, durationDays: 14, callToAction: "Send WhatsApp message" });
  const [submitting, setSubmitting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMedia({ file, url, kind: file.type.startsWith("video") ? "video" : "image" });
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  async function submit() {
    if (!brief.name) {
      notify({ type: "error", message: "Give your ad a name first." });
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      await api.createCampaign({
        workspaceId: workspace.id,
        name: brief.name,
        goal: brief.goal,
        platform: selectedPlatforms[0] ?? "META",
        objective: brief.description || brief.offer || brief.productName,
        durationDays: Number(budget.durationDays),
        productDetails: {
          productName: brief.productName,
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
          creativeName: media?.file.name
        }
      });
      onCreated();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not save the ad." });
    } finally {
      setSubmitting(false);
    }
  }

  function next() { setStep((current) => Math.min(steps.length - 1, current + 1)); }
  function back() { setStep((current) => Math.max(0, current - 1)); }

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
          <section className="upload-step">
            <button type="button" className="upload-drop" onClick={() => fileInput.current?.click()}>
              {media ? (
                media.kind === "video" ? <video src={media.url} controls /> : <img src={media.url} alt={media.file.name} />
              ) : (
                <>
                  <Upload size={28} />
                  <strong>Upload photo or video</strong>
                  <span>Use 9:16 vertical for Reels, TikTok, Shorts. 1:1 for feed. We auto-resize.</span>
                </>
              )}
            </button>
            <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={pickFile} />
            <p className="muted small">Tip: shoot once, distribute everywhere. Sart34 trims, captions, and reformats per platform.</p>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="form-step">
            <Field label="Ad name (only you see this)"><input value={brief.name} onChange={(event) => setBrief({ ...brief, name: event.target.value })} placeholder="June launch reels" /></Field>
            <Field label="What are you advertising?"><input value={brief.productName} onChange={(event) => setBrief({ ...brief, productName: event.target.value })} placeholder="Hair product, cleaning service, training" /></Field>
            <Field label="Offer or hook"><input value={brief.offer} onChange={(event) => setBrief({ ...brief, offer: event.target.value })} placeholder="20% off this week, free consultation" /></Field>
            <Field label="Tell Sart34 anything else (it writes the copy)">
              <textarea value={brief.description} onChange={(event) => setBrief({ ...brief, description: event.target.value })} placeholder="Tone, audience, objections, proof. The more you say, the better the AI." />
            </Field>
            <span className="field-label">Goal</span>
            <div className="chip-grid">
              {campaignGoals.map(([value, label, hint]) => (
                <button key={value} type="button" className={`chip ${brief.goal === value ? "active" : ""}`} onClick={() => setBrief({ ...brief, goal: value })}>
                  <strong>{label}</strong>
                  <span>{hint}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="form-step">
            <p className="muted">Pick where this should run. Sart34 reformats and rewrites for each one. Disconnected platforms are still pickable, you'll be asked to link them.</p>
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
                      {connected ? "Connected" : "Will ask to connect"}
                    </span>
                    {!connected ? (
                      <span className="platform-card-link" onClick={(event) => { event.stopPropagation(); onConnect(platform); }}>
                        Connect now <ArrowRight size={12} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="form-step">
            <Field label="Locations"><input value={audience.location} onChange={(event) => setAudience({ ...audience, location: event.target.value })} placeholder="Lagos, Abuja, Port Harcourt" /></Field>
            <Field label="Interests, behaviours, keywords"><input value={audience.interests} onChange={(event) => setAudience({ ...audience, interests: event.target.value })} placeholder="Home owners, founders, students" /></Field>
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
            <p className="muted small">Sart34 expands the audience automatically when delivery slows. You can tighten this later.</p>
          </section>
        ) : null}

        {step === 4 ? (
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

        {step === 5 ? (
          <section className="preview-step">
            <p className="muted">This is what each platform will show. Sart34 wrote the copy, picked the placement, and respects each platform's rules.</p>
            <div className="preview-stack">
              {selectedPlatforms.map((id) => {
                const platform = PLATFORM_BY_ID[id];
                if (!platform) return null;
                return <PlatformPreview key={id} platform={platform} media={media} brief={brief} budget={budget} audience={audience} />;
              })}
              {selectedPlatforms.length === 0 ? <p className="muted">No platforms selected.</p> : null}
            </div>
          </section>
        ) : null}

        {step === 6 ? (
          <section className="approve-step">
            <Sparkles size={28} />
            <h3>Ready to launch on {selectedPlatforms.length} platform{selectedPlatforms.length === 1 ? "" : "s"}</h3>
            <p>Sart34 will run a final policy review, then submit to each platform. If any of them need more info, we'll show you exactly what's needed in your inbox.</p>
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
            {submitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />} Approve & launch
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
  const body = brief.description || "Sart34 will write the body in your tone of voice.";

  if (platform.id === "META") {
    return (
      <div className="preview meta-preview">
        <div className="preview-chrome">
          <span className="preview-dot" /> <strong>your.brand</strong> · <span>Sponsored</span>
          <MoreHorizontal size={16} />
        </div>
        <div className="preview-media">
          {media ? (media.kind === "video" ? <video src={media.url} loop muted autoPlay /> : <img src={media.url} alt="" />) : <PreviewPlaceholder />}
        </div>
        <div className="preview-actions">
          <Heart size={20} /> <MessageCircle size={20} /> <Send size={20} /> <Bookmark size={20} className="right" />
        </div>
        <div className="preview-body">
          <strong>your.brand</strong> {headline}
          <p>{body}</p>
          <button className="preview-cta">{budget.callToAction}</button>
        </div>
        <span className="preview-foot">Instagram Reels · Facebook Feed · Stories</span>
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
        <span className="preview-foot">Search · YouTube · Display · Discover · Maps</span>
      </div>
    );
  }

  if (platform.id === "TIKTOK") {
    return (
      <div className="preview tiktok-preview">
        <div className="tt-frame">
          {media ? (media.kind === "video" ? <video src={media.url} loop muted autoPlay /> : <img src={media.url} alt="" />) : <PreviewPlaceholder />}
          <div className="tt-overlay">
            <div className="tt-text">
              <strong>@your.brand · Sponsored</strong>
              <p>{headline}</p>
              <span className="tt-music">♪ original sound</span>
            </div>
            <div className="tt-rail">
              <span><Heart size={20} /></span>
              <span><MessageCircle size={20} /></span>
              <span><Share2 size={20} /></span>
            </div>
          </div>
          <button className="preview-cta tt-cta">{budget.callToAction}</button>
        </div>
        <span className="preview-foot">For You · Spark Ads · 9:16 vertical</span>
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
        <div className="x-actions"><MessageCircle size={16} /> <RefreshCw size={16} /> <Heart size={16} /> <Eye size={16} /></div>
        <span className="preview-foot">Promoted post on X timeline</span>
      </div>
    );
  }

  if (platform.id === "YOUTUBE") {
    return (
      <div className="preview youtube-preview">
        <div className="yt-frame">
          {media ? (media.kind === "video" ? <video src={media.url} controls /> : <img src={media.url} alt="" />) : <PreviewPlaceholder />}
          <span className="yt-skip">Skip ad in 5s</span>
        </div>
        <div className="yt-meta">
          <strong>{headline}</strong>
          <span>your-business.com · {audience.location || "Global"}</span>
        </div>
        <span className="preview-foot">YouTube · Skippable in-stream · Bumper · Shorts</span>
      </div>
    );
  }

  if (platform.id === "PINTEREST") {
    return (
      <div className="preview pinterest-preview">
        <div className="pi-pin">
          {media ? <img src={media.url} alt="" /> : <PreviewPlaceholder />}
          <div className="pi-meta">
            <strong>{headline}</strong>
            <span>Promoted · your.brand</span>
          </div>
        </div>
        <span className="preview-foot">Idea Pin · Promoted Pin · Shopping</span>
      </div>
    );
  }

  if (platform.id === "SNAPCHAT") {
    return (
      <div className="preview snap-preview">
        <div className="sn-frame">
          {media ? (media.kind === "video" ? <video src={media.url} loop muted autoPlay /> : <img src={media.url} alt="" />) : <PreviewPlaceholder />}
          <div className="sn-overlay">
            <strong>your.brand</strong>
            <p>{headline}</p>
            <button className="preview-cta sn-cta">{budget.callToAction}</button>
          </div>
        </div>
        <span className="preview-foot">Snap Ads · Story Ads · 9:16</span>
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

  return null;
}

function PreviewPlaceholder() {
  return <div className="preview-placeholder"><ImagePlus size={26} /><span>Your media goes here</span></div>;
}

function ConnectAccountSheet({ platform, workspace, accounts, onClose, onConnected, notify }: {
  platform: PlatformDef;
  workspace: Workspace;
  accounts: IntegrationAccount[];
  onClose: () => void;
  onConnected: () => void;
  notify: (toast: Toast) => void;
}) {
  const account = accounts.find((entry) => entry.provider === platform.id);
  const connected = account?.status === "CONNECTED";
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    try {
      if (platform.id === "META") {
        const result = await api.metaConnect(workspace.id);
        if (result.authorizationUrl) {
          window.location.href = result.authorizationUrl;
          return;
        }
        notify({ type: "info", message: result.message });
      } else {
        notify({ type: "info", message: `${platform.name} OAuth opens here once Sart34 receives platform approval. Backend handles the token exchange.` });
      }
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : `Could not start ${platform.name} flow` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <FullSheet onClose={onClose} title={platform.name} subtitle={platform.tagline}>
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
          <header className="card-head"><div><strong>What Sart34 will do</strong><span>You stay in control. Approve every launch.</span></div></header>
          <ul className="check-list">
            <li><BadgeCheck size={16} /> Run ads on {platform.surfaces.join(", ")}</li>
            <li><BadgeCheck size={16} /> Auto-format your creative for {platform.formats.join(", ")}</li>
            <li><BadgeCheck size={16} /> Pull live results back into Sart34 every 30 minutes</li>
            <li><BadgeCheck size={16} /> Pause or stop your campaign with one tap from this app</li>
          </ul>
        </section>

        <section className="card">
          <header className="card-head"><div><strong>What we'll need</strong><span>{platform.budgetHint}</span></div></header>
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

        {connected ? (
          <section className="card connected-card">
            <header className="card-head">
              <div><strong>Connected as {account?.accountName ?? "—"}</strong><span>Account ID hidden for security</span></div>
              <BadgeCheck size={20} />
            </header>
            <button className="ghost-button danger" onClick={onClose}><Unplug size={16} /> Disconnect</button>
          </section>
        ) : null}
      </div>

      <footer className="sheet-footer">
        <button className="ghost-button" onClick={onClose}>Close</button>
        <button className="filled-button" onClick={() => void connect()} disabled={busy} style={{ background: platform.accent, color: "#fff", boxShadow: `0 12px 24px ${platform.accent}40` }}>
          {busy ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
          {connected ? "Re-link account" : `Connect ${platform.name}`}
        </button>
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
            <p className="muted small">{platform.name} typically asks for these when a launch fails. Fill the ones that apply, Sart34 will resubmit.</p>
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
          {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />} Resubmit launch
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
      <div className="skeleton-rail">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="skeleton story" />)}</div>
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
      <span>Loading your studio…</span>
    </div>
  );
}

function StatusPill({ value, compact }: { value: string; compact?: boolean }) {
  const map: Record<string, { label: string; tone: string }> = {
    DRAFT: { label: "Draft", tone: "muted" },
    READY_TO_LAUNCH: { label: "Ready", tone: "info" },
    SUBMITTED: { label: "Submitted", tone: "info" },
    ACTIVE: { label: "Live", tone: "success" },
    PAUSED: { label: "Paused", tone: "muted" },
    POLICY_FLAGGED: { label: "Action needed", tone: "warn" },
    NEEDS_INPUT: { label: "Action needed", tone: "warn" },
    REJECTED: { label: "Rejected", tone: "danger" },
    FAILED: { label: "Failed", tone: "danger" },
    APPROVED: { label: "Approved", tone: "success" },
    COMPLETED: { label: "Completed", tone: "success" }
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
              <header className="card-head"><div><strong>Recent ads</strong><span>{campaigns.length}</span></div></header>
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
  return ({ home: "Home", discover: "Discover", inbox: "Inbox", profile: "Profile" } as const)[tab];
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
  const meta = (campaign.aiStrategyJson as { targetPlatforms?: string[] } | undefined)?.targetPlatforms;
  const ids = meta && meta.length ? meta : [campaign.platform];
  return ids
    .map((id) => PLATFORM_BY_ID[id])
    .filter((value): value is PlatformDef => Boolean(value));
}

function summarizeIssue(campaign: Campaign): string {
  const review = campaign.policyReviews?.[0];
  if (review?.flaggedReasons?.[0]) return review.flaggedReasons[0];
  if (campaign.status === "REJECTED") return "A platform rejected this ad. Tap fix to update and resubmit.";
  if (campaign.status === "FAILED") return "The launch failed. Provide the missing details and Sart34 will retry.";
  if (campaign.status === "POLICY_FLAGGED") return "Sart34 flagged this for a quick policy review.";
  return "Action required to continue this launch.";
}
