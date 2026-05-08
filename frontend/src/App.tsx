import {
  Archive,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  DatabaseZap,
  Inbox,
  Loader2,
  LogOut,
  MailCheck,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
  X
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { api, Campaign, Lead, Workspace } from "./api";

type Toast = { type: "success" | "error" | "info"; message: string };
type BusinessView = "overview" | "ads" | "leads" | "wallet" | "profile";
type AdminView = "admin-overview" | "admin-users" | "admin-workspaces" | "admin-campaigns" | "admin-review" | "admin-profile";
type ModalKind = "campaign" | "lead" | null;

const campaignGoals = [
  ["WHATSAPP_MESSAGES", "WhatsApp messages"],
  ["GENERATE_LEADS", "Lead generation"],
  ["GET_CALLS", "Calls"],
  ["WEBSITE_TRAFFIC", "Website traffic"],
  ["REAL_ESTATE_LISTING", "Real estate listing"],
  ["BOOK_APPOINTMENTS", "Appointments"],
  ["EVENT_REGISTRATION", "Event registration"]
];

const leadStages = ["NEW_LEAD", "CONTACTED", "INTERESTED", "FOLLOW_UP", "APPOINTMENT_SCHEDULED", "NEGOTIATION", "WON", "LOST"];

export function App() {
  const [sessionReady, setSessionReady] = useState(api.authenticated);
  const [toast, setToast] = useState<Toast | null>(null);

  return (
    <>
      {sessionReady ? <ConsoleApp onLogout={() => setSessionReady(false)} notify={setToast} /> : <AuthPanel onReady={() => setSessionReady(true)} notify={setToast} />}
      {toast ? <div className={`toast ${toast.type}`}>{toast.message}</div> : null}
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
      notify({ type: "success", message: "Welcome to Sart34." });
      onReady();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Authentication failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <Brand />
        <div className="login-copy">
          <h1>Manage ads and leads like an inbox.</h1>
          <p>Plan campaigns, track every opportunity, and keep your team moving from one clean command center.</p>
        </div>
        <div className="segmented">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Sign up</button>
        </div>
        <form onSubmit={submit} className="form-stack">
          {mode === "register" ? (
            <label>
              Name
              <input name="name" required placeholder="Your name" />
            </label>
          ) : null}
          <label>
            Email
            <input name="email" type="email" required placeholder="you@company.com" />
          </label>
          {mode === "login" ? (
            <label>
              Password
              <input name="password" type="password" required placeholder="Your password" />
            </label>
          ) : null}
          <button className="blue-button" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : null}
            {mode === "login" ? "Continue" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
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

  useEffect(() => {
    void loadUser();
  }, []);

  function logout() {
    api.clearSession();
    onLogout();
  }

  if (loading) return <LoadingScreen />;
  if (user?.role === "SUPER_ADMIN") return <AdminConsole user={user} logout={logout} notify={notify} />;
  return <BusinessConsole user={user} logout={logout} notify={notify} />;
}

function BusinessConsole({ user, logout, notify }: { user: { firstName: string; email: string; role: string } | null; logout: () => void; notify: (toast: Toast) => void }) {
  const [view, setView] = useState<BusinessView>("overview");
  const [modal, setModal] = useState<ModalKind>(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; provider: string; accountName?: string; status: string }>>([]);
  const [overview, setOverview] = useState<{ walletBalance: number; campaigns: Array<{ status: string; _count: number }>; leads: Array<{ status: string; _count: number }> } | null>(null);

  async function ensureWorkspace() {
    const existing = await api.workspaces();
    if (existing[0]) return existing[0];
    return api.createWorkspace({
      name: `${user?.firstName ?? "My"} Business`,
      type: "BUSINESS",
      email: user?.email,
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

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="app-shell">
      <TopBar user={user} onProfile={() => setView("profile")} onRefresh={() => void load()} />
      <aside className="side-rail">
        <button className="compose-button" onClick={() => setModal("campaign")}><Plus size={20} /> Create ad</button>
        <NavButton active={view === "overview"} icon={<Inbox />} label="Overview" count={campaigns.length + leads.length} onClick={() => setView("overview")} />
        <NavButton active={view === "ads"} icon={<Send />} label="Ads" count={campaigns.length} onClick={() => setView("ads")} />
        <NavButton active={view === "leads"} icon={<MessageSquareText />} label="Leads" count={leads.length} onClick={() => setView("leads")} />
        <NavButton active={view === "wallet"} icon={<CreditCard />} label="Credits" onClick={() => setView("wallet")} />
      </aside>
      <section className="content-pane">
        <div className="content-toolbar">
          <div>
            <strong>{viewTitle(view)}</strong>
            <span>{workspace?.name ?? "Sart34"}</span>
          </div>
          <div className="toolbar-actions">
            {view === "ads" ? <button className="text-button" onClick={() => setModal("campaign")}><Plus size={18} /> New ad</button> : null}
            {view === "leads" ? <button className="text-button" onClick={() => setModal("lead")}><Plus size={18} /> Add lead</button> : null}
            <button className="icon-button" onClick={() => void load()} title="Refresh"><RefreshCw size={18} /></button>
          </div>
        </div>
        {loading ? <LoadingScreen /> : null}
        {!loading && view === "overview" ? <Overview campaigns={campaigns} leads={leads} accounts={accounts} overview={overview} /> : null}
        {!loading && view === "ads" ? <AdsList campaigns={campaigns} reload={load} notify={notify} /> : null}
        {!loading && view === "leads" ? <LeadInbox leads={leads} reload={load} notify={notify} /> : null}
        {!loading && view === "wallet" && workspace ? <Wallet workspaceId={workspace.id} notify={notify} /> : null}
        {!loading && view === "profile" ? <ProfileView user={user} workspace={workspace} accounts={accounts} logout={logout} /> : null}
      </section>
      {modal === "campaign" && workspace ? <CampaignModal workspaceId={workspace.id} close={() => setModal(null)} onDone={() => { setModal(null); void load(); notify({ type: "success", message: "Ad draft created." }); }} notify={notify} /> : null}
      {modal === "lead" && workspace ? <LeadModal workspaceId={workspace.id} close={() => setModal(null)} onDone={() => { setModal(null); void load(); notify({ type: "success", message: "Lead added." }); }} notify={notify} /> : null}
    </main>
  );
}

function AdminConsole({ user, logout, notify }: { user: { firstName: string; email: string; role: string }; logout: () => void; notify: (toast: Toast) => void }) {
  const [view, setView] = useState<AdminView>("admin-overview");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; role: string; isActive: boolean }>>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [flagged, setFlagged] = useState<Array<{ id: string; riskLevel: string; humanStatus: string; campaign?: Campaign }>>([]);

  async function load() {
    setLoading(true);
    try {
      const [userRows, workspaceRows, campaignRows, flaggedRows] = await Promise.all([api.adminUsers(), api.adminWorkspaces(), api.adminCampaigns(), api.adminFlaggedCampaigns()]);
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

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="app-shell admin">
      <TopBar user={user} onProfile={() => setView("admin-profile")} onRefresh={() => void load()} />
      <aside className="side-rail">
        <div className="admin-badge"><ShieldCheck size={18} /> Admin</div>
        <NavButton active={view === "admin-overview"} icon={<Inbox />} label="Overview" onClick={() => setView("admin-overview")} />
        <NavButton active={view === "admin-users"} icon={<Users />} label="Users" count={users.length} onClick={() => setView("admin-users")} />
        <NavButton active={view === "admin-workspaces"} icon={<DatabaseZap />} label="Accounts" count={workspaces.length} onClick={() => setView("admin-workspaces")} />
        <NavButton active={view === "admin-campaigns"} icon={<Send />} label="Ads" count={campaigns.length} onClick={() => setView("admin-campaigns")} />
        <NavButton active={view === "admin-review"} icon={<ShieldCheck />} label="Review" count={flagged.length} onClick={() => setView("admin-review")} />
      </aside>
      <section className="content-pane">
        <div className="content-toolbar">
          <div><strong>{adminTitle(view)}</strong><span>Sart34 system account</span></div>
          <button className="icon-button" onClick={() => void load()}><RefreshCw size={18} /></button>
        </div>
        {loading ? <LoadingScreen /> : null}
        {!loading && view === "admin-overview" ? <MetricGrid cards={[["Users", String(users.length), <Users />], ["Accounts", String(workspaces.length), <DatabaseZap />], ["Ads", String(campaigns.length), <Send />], ["Review", String(flagged.length), <ShieldCheck />]]} /> : null}
        {!loading && view === "admin-users" ? <MailTable columns={["Name", "Email", "Role", "Status"]} rows={users.map((row) => [`${row.firstName} ${row.lastName}`, row.email, row.role, row.isActive ? "Active" : "Suspended"])} /> : null}
        {!loading && view === "admin-workspaces" ? <MailTable columns={["Account", "Type", "Industry", "Currency"]} rows={workspaces.map((row) => [row.name, row.type, row.industry ?? "-", row.defaultCurrency])} /> : null}
        {!loading && view === "admin-campaigns" ? <AdsList campaigns={campaigns} reload={load} notify={notify} readonly /> : null}
        {!loading && view === "admin-review" ? <MailTable columns={["Ad", "Risk", "Status"]} rows={flagged.map((row) => [row.campaign?.name ?? row.id, row.riskLevel, row.humanStatus])} /> : null}
        {!loading && view === "admin-profile" ? <ProfileView user={user} workspace={null} accounts={[]} logout={logout} /> : null}
      </section>
    </main>
  );
}

function TopBar({ user, onProfile, onRefresh }: { user: { firstName: string; email: string; role: string } | null; onProfile: () => void; onRefresh: () => void }) {
  return (
    <header className="topbar">
      <Brand />
      <label className="search-box"><Search size={18} /><input placeholder="Search ads, leads, messages" /></label>
      <button className="icon-button desktop-only" onClick={onRefresh}><RefreshCw size={18} /></button>
      <button className="account-chip" onClick={onProfile} title={user?.email ?? "Profile"}>{user?.firstName?.[0] ?? "S"}</button>
    </header>
  );
}

function Brand() {
  return <div className="brand"><span>S34</span><strong>Sart34</strong></div>;
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      {icon}<span>{label}</span>{typeof count === "number" ? <b>{count}</b> : null}
    </button>
  );
}

function Overview({ campaigns, leads, accounts, overview }: { campaigns: Campaign[]; leads: Lead[]; accounts: Array<{ status: string }>; overview: { walletBalance: number } | null }) {
  const activeAds = campaigns.filter((ad) => ["ACTIVE", "SUBMITTED", "READY_TO_LAUNCH"].includes(ad.status)).length;
  const pendingLeads = leads.filter((lead) => !["WON", "LOST"].includes(lead.status)).length;
  const connected = accounts.filter((account) => account.status === "CONNECTED").length;

  return (
    <div className="page-stack">
      <MetricGrid cards={[["Connected accounts", String(connected), <DatabaseZap />], ["Active ads", String(activeAds), <Send />], ["Open leads", String(pendingLeads), <Users />], ["Credits", String(overview?.walletBalance ?? 0), <CircleDollarSign />]]} />
      <section className="section-card">
        <SectionHeader title="Account analytics" action="Last synced from Sart34" />
        <div className="analytics-grid">
          <AnalyticsItem label="Impressions" value="0" />
          <AnalyticsItem label="Clicks" value="0" />
          <AnalyticsItem label="Leads" value={String(leads.length)} />
          <AnalyticsItem label="Cost per lead" value="-" />
        </div>
      </section>
      <section className="section-card">
        <SectionHeader title="Recent ads" action={`${campaigns.length} total`} />
        <AdsList campaigns={campaigns.slice(0, 6)} reload={() => Promise.resolve()} notify={() => undefined} compact />
      </section>
      <section className="section-card">
        <SectionHeader title="Lead inbox" action={`${leads.length} opportunities`} />
        <LeadRows leads={leads.slice(0, 6)} />
      </section>
    </div>
  );
}

function MetricGrid({ cards }: { cards: Array<[string, string, ReactNode]> }) {
  return (
    <section className="metric-grid">
      {cards.map(([label, value, icon]) => <article className="metric-card" key={label}>{icon}<span>{label}</span><strong>{value}</strong></article>)}
    </section>
  );
}

function AnalyticsItem({ label, value }: { label: string; value: string }) {
  return <div className="analytics-item"><span>{label}</span><strong>{value}</strong></div>;
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return <header className="section-header"><strong>{title}</strong>{action ? <span>{action}</span> : null}</header>;
}

function AdsList({ campaigns, reload, notify, readonly = false, compact = false }: { campaigns: Campaign[]; reload: () => void | Promise<void>; notify: (toast: Toast) => void; readonly?: boolean; compact?: boolean }) {
  const [busyId, setBusyId] = useState("");

  async function runAction(id: string, label: string, action: () => Promise<unknown>) {
    setBusyId(id);
    try {
      await action();
      notify({ type: "success", message: `${label} completed.` });
      await reload();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : `${label} failed.` });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className={`mail-list ${compact ? "compact" : ""}`}>
      {campaigns.map((campaign) => (
        <article className="mail-row" key={campaign.id}>
          <button className="star-button" title="Star"><Star size={17} /></button>
          <div className="mail-title">
            <strong>{campaign.name}</strong>
            <span>Meta Ads - {campaign.goal.replaceAll("_", " ")} - {campaign.objective ?? "No objective yet"}</span>
          </div>
          <StatusPill value={campaign.status} />
          <time>{new Date(campaign.createdAt).toLocaleDateString()}</time>
          {!readonly && !compact ? (
            <div className="quick-actions">
              <button disabled={busyId === campaign.id} onClick={() => runAction(campaign.id, "AI generation", () => api.generateCampaign(campaign.id))}><Bot size={16} /> AI</button>
              <button disabled={busyId === campaign.id} onClick={() => runAction(campaign.id, "Review", () => api.reviewCampaign(campaign.id))}><ShieldCheck size={16} /> Review</button>
              <button disabled={busyId === campaign.id} onClick={() => runAction(campaign.id, "Approval", () => api.approveCampaign(campaign.id))}><CheckCircle2 size={16} /> Done</button>
              <button disabled={busyId === campaign.id} onClick={() => runAction(campaign.id, "Launch", () => api.launchCampaign(campaign.id))}>{busyId === campaign.id ? <Loader2 className="spin" size={16} /> : <Send size={16} />} Launch</button>
            </div>
          ) : null}
        </article>
      ))}
      {campaigns.length === 0 ? <EmptyState title="No ads yet" text="Create your first ad when you are ready." icon={<Send />} /> : null}
    </div>
  );
}

function LeadInbox({ leads, reload, notify }: { leads: Lead[]; reload: () => void | Promise<void>; notify: (toast: Toast) => void }) {
  async function move(lead: Lead) {
    try {
      await api.updateLead(lead.id, { status: nextStage(lead.status) });
      await reload();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not update lead." });
    }
  }

  return (
    <div className="page-stack">
      <LeadRows leads={leads} move={move} />
    </div>
  );
}

function LeadRows({ leads, move }: { leads: Lead[]; move?: (lead: Lead) => void }) {
  return (
    <div className="mail-list">
      {leads.map((lead) => (
        <article className={`mail-row ${lead.status === "NEW_LEAD" ? "unread" : ""}`} key={lead.id}>
          <button className="star-button" title="Star"><Star size={17} /></button>
          <div className="mail-title">
            <strong>{lead.fullName}</strong>
            <span>{lead.whatsappNumber ?? lead.phone ?? lead.email ?? "No contact"} - {lead.interest ?? "No interest recorded"}</span>
          </div>
          <StatusPill value={lead.status} />
          <time>{new Date(lead.createdAt).toLocaleDateString()}</time>
          {move ? (
            <div className="quick-actions">
              <button onClick={() => move(lead)}><MailCheck size={16} /> Done</button>
              <button><Clock3 size={16} /> Follow up</button>
              <button><Archive size={16} /> Archive</button>
            </div>
          ) : null}
        </article>
      ))}
      {leads.length === 0 ? <EmptyState title="No leads yet" text="New opportunities will arrive here like unread messages." icon={<MessageSquareText />} /> : null}
    </div>
  );
}

function ProfileView({ user, workspace, accounts, logout }: { user: { firstName: string; email: string; role: string } | null; workspace: Workspace | null; accounts: Array<{ id: string; provider: string; accountName?: string; status: string }>; logout: () => void }) {
  return (
    <div className="page-stack">
      <section className="profile-hero">
        <div className="profile-avatar">{user?.firstName?.[0] ?? "S"}</div>
        <div>
          <span>Profile</span>
          <strong>{user?.firstName ?? "Sart34 user"}</strong>
          <p>{user?.email}</p>
        </div>
        <button className="danger-button" onClick={logout}><LogOut size={18} /> Logout</button>
      </section>
      <section className="section-card">
        <SectionHeader title="Account" action={workspace?.name ?? "Sart34"} />
        <div className="profile-grid">
          <ProfileFact icon={<UserRound />} label="Role" value={user?.role.replaceAll("_", " ") ?? "User"} />
          <ProfileFact icon={<DatabaseZap />} label="Workspace" value={workspace?.name ?? "System account"} />
          <ProfileFact icon={<CreditCard />} label="Currency" value={workspace?.defaultCurrency ?? "NGN"} />
          <ProfileFact icon={<MailCheck />} label="Email" value={workspace?.email ?? user?.email ?? "-"} />
        </div>
      </section>
      <section className="section-card">
        <SectionHeader title="Linked ad accounts" action={`${accounts.length} saved`} />
        <MailTable columns={["Provider", "Account", "Status"]} rows={accounts.map((row) => [row.provider, row.accountName ?? row.id, row.status])} />
      </section>
    </div>
  );
}

function ProfileFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <article className="profile-fact">{icon}<span>{label}</span><strong>{value}</strong></article>;
}

function Wallet({ workspaceId, notify }: { workspaceId: string; notify: (toast: Toast) => void }) {
  const [wallet, setWallet] = useState<{ balance: number; transactions: Array<{ id: string; amount: number; reason: string; createdAt: string }> } | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setWallet(await api.wallet(workspaceId));
  }

  useEffect(() => {
    void load();
  }, [workspaceId]);

  async function buy() {
    setLoading(true);
    try {
      await api.buyCredits(workspaceId);
      notify({ type: "success", message: "Credits added or checkout started." });
      await load();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not buy credits." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="connect-notice">
        <CreditCard size={22} />
        <div><strong>{wallet?.balance ?? 0} credits</strong><span>Sart34 credits are separate from ad spend.</span></div>
        <button className="blue-button" onClick={buy} disabled={loading}>{loading ? <Loader2 className="spin" size={18} /> : <Plus size={18} />} Buy credits</button>
      </section>
      <MailTable columns={["Reason", "Amount", "Date"]} rows={(wallet?.transactions ?? []).map((row) => [row.reason, String(row.amount), new Date(row.createdAt).toLocaleDateString()])} />
    </div>
  );
}

function CampaignModal({ workspaceId, close, onDone, notify }: { workspaceId: string; close: () => void; onDone: () => void; notify: (toast: Toast) => void }) {
  const [step, setStep] = useState(0);
  const steps = ["Offer", "Audience", "Budget"];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const productName = String(form.get("productName") ?? "").trim();
    const objective = String(form.get("objective") ?? "").trim();
    const audience = String(form.get("audience") ?? "").trim();
    const location = String(form.get("location") ?? "").trim();
    const offer = String(form.get("offer") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const startDate = String(form.get("startDate") ?? "");
    try {
      await api.createCampaign({
        workspaceId,
        name,
        goal: String(form.get("goal") ?? "GENERATE_LEADS"),
        platform: "META",
        objective,
        durationDays: Number(form.get("durationDays") ?? 14),
        startDate: startDate || undefined,
        productDetails: {
          productName,
          audience,
          location,
          offer,
          description,
          dailyBudget: Number(form.get("dailyBudget") ?? 5000),
          callToAction: String(form.get("callToAction") ?? "Send WhatsApp message"),
          creativeDirection: String(form.get("creativeDirection") ?? "")
        }
      });
      onDone();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not create ad." });
    }
  }

  return (
    <Modal title="Create ad" close={close}>
      <form className="ad-flow" onSubmit={submit}>
        <div className="flow-steps">
          {steps.map((label, index) => <button type="button" key={label} className={step === index ? "active" : ""} onClick={() => setStep(index)}>{index + 1}<span>{label}</span></button>)}
        </div>
        <div className="flow-panel">
          <div className="flow-copy">
            <Sparkles size={20} />
            <strong>{steps[step]} setup</strong>
            <span>{step === 0 ? "Name the campaign and clarify the offer." : step === 1 ? "Define who should see the ad." : "Set the spend, timing, and action."}</span>
          </div>
          <div className={step === 0 ? "form-section active" : "form-section"}>
            <label>Ad name<input name="name" required defaultValue="New lead campaign" /></label>
            <label>Goal<select name="goal" defaultValue="GENERATE_LEADS">{campaignGoals.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Product or service<input name="productName" required defaultValue="Service offer" /></label>
            <label>Offer<input name="offer" placeholder="Free inspection, 10% discount, limited slots" /></label>
          </div>
          <div className={step === 1 ? "form-section active" : "form-section"}>
            <label>Target audience<input name="audience" placeholder="Home owners, founders, students, parents" /></label>
            <label>Location<input name="location" placeholder="Lagos, Abuja, Port Harcourt" /></label>
            <label>Campaign objective<input name="objective" placeholder="Generate qualified WhatsApp leads" /></label>
            <label>Creative direction<textarea name="creativeDirection" placeholder="Visual style, tone, proof points, objections to handle" /></label>
          </div>
          <div className={step === 2 ? "form-section active" : "form-section"}>
            <label>Description<textarea name="description" required defaultValue="Describe the product, audience, location, and offer." /></label>
            <div className="field-pair">
              <label>Duration<input name="durationDays" type="number" min="1" defaultValue="14" /></label>
              <label>Daily budget<input name="dailyBudget" type="number" min="1" defaultValue="5000" /></label>
            </div>
            <div className="field-pair">
              <label>Start date<input name="startDate" type="date" /></label>
              <label>Call to action<input name="callToAction" defaultValue="Send WhatsApp message" /></label>
            </div>
          </div>
        </div>
        <footer className="flow-actions">
          <button type="button" className="text-button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>
          {step < steps.length - 1 ? <button type="button" className="blue-button" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>Continue</button> : <button className="blue-button"><Plus size={18} /> Save draft</button>}
        </footer>
      </form>
    </Modal>
  );
}

function LeadModal({ workspaceId, close, onDone, notify }: { workspaceId: string; close: () => void; onDone: () => void; notify: (toast: Toast) => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.createLead({ workspaceId, fullName: form.get("fullName"), whatsappNumber: form.get("whatsappNumber"), interest: form.get("interest"), sourcePlatform: "META" });
      onDone();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Could not add lead." });
    }
  }

  return (
    <Modal title="Add lead" close={close}>
      <form className="form-stack" onSubmit={submit}>
        <label>Full name<input name="fullName" required /></label>
        <label>WhatsApp<input name="whatsappNumber" /></label>
        <label>Interest<input name="interest" /></label>
        <button className="blue-button"><Plus size={18} /> Add lead</button>
      </form>
    </Modal>
  );
}

function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div className="modal-backdrop"><section className="compose-modal"><header><strong>{title}</strong><button onClick={close}><X size={18} /></button></header>{children}</section></div>;
}

function MailTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length}>No records yet</td></tr>}</tbody></table>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill ${value.toLowerCase()}`}>{value.replaceAll("_", " ")}</span>;
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="empty-state">{icon}<strong>{title}</strong><span>{text}</span></div>;
}

function LoadingScreen() {
  return <div className="loading-screen"><Loader2 className="spin" size={24} />Loading Sart34</div>;
}

function viewTitle(view: BusinessView) {
  return ({ overview: "Overview", ads: "Recent ads", leads: "Lead inbox", wallet: "Credits", profile: "Profile" } as const)[view];
}

function adminTitle(view: AdminView) {
  return view.replace("admin-", "").replace("-", " ");
}

function nextStage(stage: string) {
  const index = leadStages.indexOf(stage);
  return leadStages[Math.min(index + 1, leadStages.length - 1)];
}
