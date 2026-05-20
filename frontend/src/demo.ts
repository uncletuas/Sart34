/**
 * In-memory demo backend. Active when no VITE_API_BASE_URL is configured
 * (e.g. the static Vercel deployment). Lets the whole prototype be clicked
 * through — auth, feed, ad creation, cross-posting, CRM, wallet — with no
 * server, database, or platform credentials.
 */

type Json = Record<string, unknown>;

let counter = 1;
const id = (prefix: string) => `${prefix}_${(counter++).toString(36)}${Date.now().toString(36).slice(-4)}`;
const iso = (daysAgo = 0) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const DEMO_TEMPLATES = [
  { id: "real-estate-listing", industry: "Real Estate", name: "New listing announcement", goal: "REAL_ESTATE_LISTING", description: "Showcase a new property to qualified buyers nearby.", defaultDurationDays: 14, defaultDailyBudget: 8000, callToAction: "Send WhatsApp message", audienceHints: "Home buyers within 25 km of the listing", copyExamples: [], recommendedPlatforms: ["META", "GOOGLE"] },
  { id: "school-enrolment", industry: "Schools & Training", name: "School enrolment drive", goal: "GENERATE_LEADS", description: "Bring parents and students into the admissions inbox.", defaultDurationDays: 21, defaultDailyBudget: 5000, callToAction: "Sign up", audienceHints: "Parents 28-55 in the catchment area", copyExamples: [], recommendedPlatforms: ["META", "GOOGLE"] },
  { id: "training-course", industry: "Schools & Training", name: "Training course launch", goal: "EVENT_REGISTRATION", description: "Fill seats for a cohort, bootcamp, or workshop.", defaultDurationDays: 10, defaultDailyBudget: 4000, callToAction: "Sign up", audienceHints: "Working professionals or students", copyExamples: [], recommendedPlatforms: ["META", "TIKTOK", "LINKEDIN"] },
  { id: "restaurant-promo", industry: "Restaurants", name: "Daily special promotion", goal: "WHATSAPP_MESSAGES", description: "Drive walk-ins or delivery orders for a special menu item.", defaultDurationDays: 7, defaultDailyBudget: 3000, callToAction: "Send WhatsApp message", audienceHints: "Foodies within 5 km, age 18-45", copyExamples: [], recommendedPlatforms: ["META", "TIKTOK"] },
  { id: "fashion-collection", industry: "Fashion", name: "New collection drop", goal: "SELL_PRODUCTS", description: "Sell out a new fashion drop with vertical video and shop links.", defaultDurationDays: 14, defaultDailyBudget: 6000, callToAction: "Shop now", audienceHints: "Style-conscious 18-34 in major cities", copyExamples: [], recommendedPlatforms: ["META", "TIKTOK"] },
  { id: "beauty-booking", industry: "Beauty", name: "Salon and spa booking", goal: "BOOK_APPOINTMENTS", description: "Fill chairs at a salon, spa, or beauty studio.", defaultDurationDays: 14, defaultDailyBudget: 4000, callToAction: "Book now", audienceHints: "Women 22-45 within 10 km", copyExamples: [], recommendedPlatforms: ["META", "TIKTOK"] },
  { id: "event-registration", industry: "Events", name: "Event registration", goal: "EVENT_REGISTRATION", description: "Sell out a launch, workshop, conference, or party.", defaultDurationDays: 14, defaultDailyBudget: 5000, callToAction: "Get tickets", audienceHints: "People interested in the topic in the city", copyExamples: [], recommendedPlatforms: ["META", "GOOGLE", "X"] },
  { id: "ecommerce-catalog", industry: "E-commerce", name: "Catalog sales", goal: "SELL_PRODUCTS", description: "Run dynamic shopping ads for an entire product catalog.", defaultDurationDays: 30, defaultDailyBudget: 10000, callToAction: "Shop now", audienceHints: "Past visitors and lookalikes of buyers", copyExamples: [], recommendedPlatforms: ["META", "GOOGLE", "TIKTOK"] },
  { id: "service-leads", industry: "Services", name: "Local service leads", goal: "GET_CALLS", description: "Capture call and WhatsApp leads for local service providers.", defaultDurationDays: 14, defaultDailyBudget: 4000, callToAction: "Call now", audienceHints: "Homeowners and renters in the area", copyExamples: [], recommendedPlatforms: ["GOOGLE", "META"] }
];

function metricsFor(campaignId: string, days: number, base: number) {
  return Array.from({ length: days }).map((_, index) => {
    const drift = 0.7 + Math.random() * 0.7;
    const impressions = Math.round(base * drift);
    const clicks = Math.round(impressions * (0.02 + Math.random() * 0.03));
    const leads = Math.round(clicks * (0.1 + Math.random() * 0.18));
    const spend = Math.round(base * 0.9 * drift);
    return {
      id: id("met"),
      campaignId,
      date: iso(days - index),
      impressions,
      reach: Math.round(impressions * 0.78),
      clicks,
      leads,
      spend,
      costPerLead: leads ? Math.round(spend / leads) : 0,
      conversions: Math.round(leads * 0.4)
    };
  });
}

function aiStrategy(targetPlatforms: string[]): Json {
  return {
    campaign_name: "AI generated campaign",
    objective: "lead_generation",
    targetPlatforms,
    audiences: [{ name: "Local high-intent buyers", description: "People likely to enquire about the offer." }],
    ad_copies: targetPlatforms.map((platform) => ({
      platform,
      primary_text: "Discover this offer and request details today. Limited availability.",
      headline: "Request details today",
      description: "Chat with the business for availability and next steps.",
      cta: "Send message"
    })),
    budget_recommendation: { daily_budget: 5000, currency: "NGN" }
  };
}

type Store = {
  user: { id: string; firstName: string; lastName: string; email: string; role: string };
  workspace: Json;
  walletBalance: number;
  transactions: Json[];
  integrations: Json[];
  campaigns: Json[];
  metrics: Record<string, Json[]>;
  leads: Json[];
  creatives: Json[];
  posts: Json[];
  members: Json[];
};

function seed(): Store {
  const workspaceId = "ws_demo";
  const user = { id: "usr_demo", firstName: "Ada", lastName: "Okafor", email: "ada@demo.sart34.app", role: "USER" };
  const workspace = { id: workspaceId, name: "Ada Studio", type: "BUSINESS", industry: "Fashion", email: user.email, defaultCurrency: "NGN", whatsappNumber: "+2348000000000" };

  const c1 = id("camp");
  const c2 = id("camp");
  const c3 = id("camp");
  const c4 = id("camp");

  const campaigns: Json[] = [
    {
      id: c1, workspaceId, name: "June sneaker drop", goal: "SELL_PRODUCTS", platform: "META",
      status: "ACTIVE", objective: "Sell out the new sneaker line",
      productDetails: { targetPlatforms: ["META", "TIKTOK"], dailyBudget: 6000, location: "Lagos, Abuja", callToAction: "Shop now" },
      aiStrategyJson: aiStrategy(["META", "TIKTOK"]),
      policyReviews: [{ riskLevel: "LOW", humanStatus: "NOT_REQUIRED", flaggedReasons: [] }],
      creatives: [{ id: id("cr"), fileUrl: "https://picsum.photos/seed/sart-sneaker/640/800", fileName: "sneaker.jpg", fileType: "image/jpeg", fileSize: 184000, status: "APPROVED" }],
      approvedAt: iso(9), createdAt: iso(10)
    },
    {
      id: c2, workspaceId, name: "Weekend home viewing", goal: "REAL_ESTATE_LISTING", platform: "META",
      status: "READY_TO_LAUNCH", objective: "Book viewings for the 3-bed listing",
      productDetails: { targetPlatforms: ["META", "GOOGLE"], dailyBudget: 8000, location: "Lekki", callToAction: "Send WhatsApp message" },
      aiStrategyJson: aiStrategy(["META", "GOOGLE"]),
      policyReviews: [{ riskLevel: "LOW", humanStatus: "NOT_REQUIRED", flaggedReasons: [] }],
      creatives: [{ id: id("cr"), fileUrl: "https://picsum.photos/seed/sart-home/640/800", fileName: "home.jpg", fileType: "image/jpeg", fileSize: 201000, status: "APPROVED" }],
      createdAt: iso(4)
    },
    {
      id: c3, workspaceId, name: "Skincare bundle promo", goal: "GENERATE_LEADS", platform: "META",
      status: "FAILED", objective: "Collect leads for the skincare bundle",
      productDetails: { targetPlatforms: ["META"], dailyBudget: 4000, location: "Lagos", callToAction: "Learn more" },
      aiStrategyJson: aiStrategy(["META"]),
      policyReviews: [{ riskLevel: "HIGH", humanStatus: "PENDING", flaggedReasons: ["Avoid before-and-after style claims for skincare results."] }],
      creatives: [{ id: id("cr"), fileUrl: "https://picsum.photos/seed/sart-skin/640/800", fileName: "skincare.jpg", fileType: "image/jpeg", fileSize: 167000, status: "PENDING" }],
      createdAt: iso(6)
    },
    {
      id: c4, workspaceId, name: "Free fitness class", goal: "EVENT_REGISTRATION", platform: "META",
      status: "DRAFT", objective: "Sign-ups for the Saturday class",
      productDetails: { targetPlatforms: ["META", "TIKTOK"], dailyBudget: 3000, location: "Abuja", callToAction: "Sign up" },
      creatives: [],
      createdAt: iso(1)
    }
  ];

  const metrics: Record<string, Json[]> = {
    [c1]: metricsFor(c1, 10, 4200),
    [c2]: [],
    [c3]: metricsFor(c3, 3, 1100),
    [c4]: []
  };

  const leads: Json[] = [
    { id: id("lead"), workspaceId, fullName: "Tunde Bello", whatsappNumber: "+2348023456789", interest: "Sneakers — size 43", status: "NEW_LEAD", temperature: "HOT", createdAt: iso(0) },
    { id: id("lead"), workspaceId, fullName: "Grace Eze", whatsappNumber: "+2348034567890", interest: "Home viewing this weekend", status: "CONTACTED", temperature: "WARM", createdAt: iso(1) },
    { id: id("lead"), workspaceId, fullName: "Sam Idris", phone: "+2348045678901", interest: "Fitness class", status: "FOLLOW_UP", temperature: "WARM", createdAt: iso(2) },
    { id: id("lead"), workspaceId, fullName: "Joy Ada", email: "joy@example.com", interest: "Skincare bundle", status: "NEGOTIATION", temperature: "HOT", createdAt: iso(3) },
    { id: id("lead"), workspaceId, fullName: "Peter Obi", whatsappNumber: "+2348056789012", interest: "Sneakers — bulk order", status: "WON", temperature: "HOT", createdAt: iso(5) }
  ];

  const creatives: Json[] = [
    { id: id("cr"), workspaceId, fileUrl: "https://picsum.photos/seed/sart-a/600/600", fileName: "lookbook-1.jpg", fileType: "image/jpeg", fileSize: 158000, status: "APPROVED", createdAt: iso(8) },
    { id: id("cr"), workspaceId, fileUrl: "https://picsum.photos/seed/sart-b/600/600", fileName: "studio-flatlay.jpg", fileType: "image/jpeg", fileSize: 142000, status: "APPROVED", createdAt: iso(7) },
    { id: id("cr"), workspaceId, fileUrl: "https://picsum.photos/seed/sart-c/600/600", fileName: "promo-banner.jpg", fileType: "image/jpeg", fileSize: 176000, status: "APPROVED", createdAt: iso(5) }
  ];

  const posts: Json[] = [
    {
      id: id("post"), workspaceId, caption: "New arrivals just landed. Tap in and tell us your favourite. 👟\n\n#newdrop #shoplocal #lagos",
      mediaUrl: "https://picsum.photos/seed/sart-post/720/720", mediaType: "image/jpeg",
      platforms: ["META", "TIKTOK"], status: "PUBLISHING",
      results: [
        { platform: "META", status: "QUEUED", note: "Queued for META." },
        { platform: "TIKTOK", status: "QUEUED", note: "Queued for TIKTOK." }
      ],
      publishedAt: iso(2), createdAt: iso(2)
    },
    {
      id: id("post"), workspaceId, caption: "Behind the scenes of this week's shoot. Which look should we drop first?",
      platforms: ["META", "LINKEDIN"], status: "DRAFT", createdAt: iso(0)
    }
  ];

  return {
    user,
    workspace,
    walletBalance: 240,
    transactions: [
      { id: id("txn"), amount: 300, reason: "Starter credit purchase", type: "CREDIT", createdAt: iso(11) },
      { id: id("txn"), amount: -20, reason: "AI campaign generation", type: "DEDUCTION", createdAt: iso(10) },
      { id: id("txn"), amount: -50, reason: "Campaign publishing", type: "DEDUCTION", createdAt: iso(9) },
      { id: id("txn"), amount: 60, reason: "Referral bonus", type: "CREDIT", createdAt: iso(4) }
    ],
    integrations: [
      { id: `${workspaceId}-meta`, provider: "META", accountName: "Ada Studio", status: "CONNECTED" },
      { id: `${workspaceId}-tiktok`, provider: "TIKTOK", accountName: "@adastudio", status: "CONNECTED" }
    ],
    campaigns,
    metrics,
    leads,
    creatives,
    posts,
    members: [
      { id: id("mem"), role: "OWNER", user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } },
      { id: id("mem"), role: "MARKETING_MANAGER", user: { id: id("u"), firstName: "Kemi", lastName: "Lawal", email: "kemi@demo.sart34.app" } }
    ]
  };
}

let store = seed();

const FOLLOW_UPS: Record<string, string> = {
  WHATSAPP: "Hi {{name}}, thanks for reaching out about {{interest}}. Would you like more details, or should I hold one for you?",
  SMS: "Hi {{name}}, following up on your interest in {{interest}}. Reply YES and we'll send the details.",
  EMAIL: "Hi {{name}},\n\nThanks for your interest in {{interest}}. I'd love to share a few options that fit what you're looking for. When is a good time for a quick chat?\n\nBest,\nAda Studio",
  CALL: "Call script: greet {{name}}, confirm interest in {{interest}}, answer questions, offer to reserve, agree a next step."
};

function leadName(lead: Json) {
  return String(lead.fullName ?? "there");
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 130));
}

function ok<T>(value: T): Promise<T> {
  return delay(value);
}

function notFound(): never {
  throw new Error("Demo endpoint not found");
}

export function demoRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://demo.local");
  const segments = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  const body = typeof options.body === "string" ? (JSON.parse(options.body) as Json) : undefined;
  const result = route(method, segments, url.searchParams, body, options.body);
  return ok(result) as Promise<T>;
}

function route(method: string, seg: string[], query: URLSearchParams, body: Json | undefined, rawBody: BodyInit | null | undefined): unknown {
  const [root, a, b] = seg;

  if (root === "auth") {
    if (a === "login" || a === "register") return { accessToken: "demo-access", refreshToken: "demo-refresh" };
    if (a === "me") return { ...store.user, memberships: [{ workspace: store.workspace }] };
  }

  if (root === "workspaces") {
    if (!a && method === "GET") return [store.workspace];
    if (!a && method === "POST") return store.workspace;
    if (a && method === "GET") return { ...store.workspace, members: store.members };
    if (a && b === "invitations") return { success: true, email: body?.email };
  }

  if (root === "reports" && a === "overview") {
    return {
      campaigns: groupCount(store.campaigns, "status"),
      leads: groupCount(store.leads, "status"),
      walletBalance: store.walletBalance
    };
  }

  if (root === "templates") return DEMO_TEMPLATES;

  if (root === "campaigns") {
    if (!a && method === "GET") return store.campaigns.map(withMetrics);
    if (!a && method === "POST") return createCampaign(body ?? {});
    const campaign = store.campaigns.find((item) => item.id === a);
    if (!campaign) notFound();
    if (!b && method === "GET") return withMetrics(campaign);
    if (!b && method === "DELETE") { campaign.status = "ARCHIVED"; return campaign; }
    if (b === "generate-ai") {
      const platforms = (campaign.productDetails as Json | undefined)?.targetPlatforms as string[] | undefined;
      campaign.aiStrategyJson = aiStrategy(platforms ?? ["META"]);
      campaign.status = "PENDING_REVIEW";
      return campaign.aiStrategyJson;
    }
    if (b === "review-policy") {
      campaign.policyReviews = [{ riskLevel: "LOW", humanStatus: "NOT_REQUIRED", flaggedReasons: [] }];
      campaign.status = "READY_TO_LAUNCH";
      return (campaign.policyReviews as Json[])[0];
    }
    if (b === "approve") { campaign.approvedAt = iso(0); return campaign; }
    if (b === "launch") {
      campaign.status = "ACTIVE";
      if (!store.metrics[campaign.id as string]?.length) {
        store.metrics[campaign.id as string] = metricsFor(campaign.id as string, 3, 1600);
      }
      return { id: id("job"), status: "SUCCESS", campaignId: campaign.id };
    }
    if (b === "pause") { campaign.status = "PAUSED"; return campaign; }
    if (b === "resume") { campaign.status = "ACTIVE"; return campaign; }
    if (b === "creatives") return campaign;
    if (b === "metrics") return store.metrics[campaign.id as string] ?? [];
    if (b === "optimize") {
      return {
        copy: ["Open with a sharper 3-word hook", "Add a clear price anchor"],
        creative: ["Test a 9:16 vertical cut for Reels and TikTok", "Try a UGC talking-head against the studio shot"],
        audience: ["Narrow age to 25-45 if cost per lead climbs", "Add a 1% lookalike of recent leads"],
        budget: ["Hold spend steady for the first 4 days", "Shift 30% to the top ad set after day 5"],
        follow_up: ["Reply within 5 minutes to double conversion", "Send a morning-after nudge if no reply in 24h"]
      };
    }
  }

  if (root === "leads") {
    if (!a && method === "GET") return store.leads;
    if (!a && method === "POST") return createLead(body ?? {});
    const lead = store.leads.find((item) => item.id === a);
    if (!lead) notFound();
    if (!b && method === "PATCH") { Object.assign(lead, body); return lead; }
    if (!b && method === "DELETE") { store.leads = store.leads.filter((item) => item.id !== a); return { success: true }; }
    if (b === "notes") return { success: true };
    if (b === "generate-follow-up") {
      const channel = String(body?.channel ?? "WHATSAPP");
      const message = (FOLLOW_UPS[channel] ?? FOLLOW_UPS.WHATSAPP)
        .replace(/\{\{name\}\}/g, leadName(lead).split(" ")[0])
        .replace(/\{\{interest\}\}/g, String(lead.interest ?? "your enquiry"));
      return { message, suggested_next_action: "Agree a clear next step", temperature: "WARM" };
    }
  }

  if (root === "wallet") {
    if (!a && method === "GET") return { balance: store.walletBalance, transactions: store.transactions };
    if (a === "transactions") return store.transactions;
    if (a === "buy-credits") {
      store.walletBalance += 300;
      store.transactions.unshift({ id: id("txn"), amount: 300, reason: "Credit top-up", type: "CREDIT", createdAt: iso(0) });
      return { status: "SUCCESS", credits: 300 };
    }
  }

  if (root === "integrations") {
    if (!a && method === "GET") return store.integrations;
    if (b === "connect") {
      const provider = a!.toUpperCase();
      const existing = store.integrations.find((item) => item.provider === provider);
      if (existing) existing.status = "CONNECTED";
      else store.integrations.push({ id: `${store.workspace.id}-${a}`, provider, accountName: "Demo account", status: "CONNECTED" });
      return { authorizationUrl: null, message: `${provider} connected in demo mode.` };
    }
    if (a && method === "DELETE") { store.integrations = store.integrations.filter((item) => item.id !== a); return { success: true }; }
    if (b === "sync") return { success: true };
  }

  if (root === "creatives") {
    if (a === "upload") return createCreative(rawBody);
    if (!a && method === "GET") return store.creatives;
    if (a && method === "DELETE") { store.creatives = store.creatives.filter((item) => item.id !== a); return { success: true }; }
  }

  if (root === "posts") {
    if (!a && method === "GET") return store.posts;
    if (!a && method === "POST") return createPost(body ?? {});
    const post = store.posts.find((item) => item.id === a);
    if (!post) notFound();
    if (b === "publish") {
      const connected = new Set(store.integrations.filter((i) => i.status === "CONNECTED").map((i) => i.provider));
      const results = (post.platforms as string[]).map((platform) =>
        connected.has(platform)
          ? { platform, status: "QUEUED", note: `Queued for ${platform}.` }
          : { platform, status: "SKIPPED", note: `Connect ${platform} to cross-post here.` }
      );
      const queued = results.filter((r) => r.status === "QUEUED").length;
      post.results = results;
      post.status = queued === 0 ? "FAILED" : queued === results.length ? "PUBLISHING" : "PARTIAL";
      post.publishedAt = queued ? iso(0) : undefined;
      return post;
    }
    if (method === "DELETE") { store.posts = store.posts.filter((item) => item.id !== a); return { success: true }; }
  }

  if (root === "ai" && a === "post-draft") {
    const prompt = String(body?.prompt ?? "your update");
    return {
      caption: `${capitalize(prompt)} — here's what's new. Take a look and let us know what you think. 👇`,
      hashtags: ["smallbusiness", "newdrop", "shoplocal"],
      variants: []
    };
  }

  if (root === "admin") {
    if (a === "users") return [{ id: store.user.id, firstName: store.user.firstName, lastName: store.user.lastName, email: store.user.email, role: store.user.role, isActive: true }];
    if (a === "workspaces") return [store.workspace];
    if (a === "campaigns") return store.campaigns;
    if (a === "flagged-campaigns") return [];
  }

  notFound();
}

function withMetrics(campaign: Json): Json {
  return { ...campaign, metrics: store.metrics[campaign.id as string] ?? [] };
}

function groupCount(rows: Json[], key: string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key]);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].map(([status, count]) => ({ status, _count: count }));
}

function createCampaign(body: Json): Json {
  const campaign: Json = {
    id: id("camp"),
    workspaceId: store.workspace.id,
    name: body.name ?? "New campaign",
    goal: body.goal ?? "GENERATE_LEADS",
    platform: body.platform ?? "META",
    status: "DRAFT",
    objective: body.objective ?? "",
    productDetails: body.productDetails ?? {},
    creatives: [],
    createdAt: iso(0)
  };
  store.campaigns.unshift(campaign);
  store.metrics[campaign.id as string] = [];
  return campaign;
}

function createLead(body: Json): Json {
  const lead: Json = {
    id: id("lead"),
    workspaceId: store.workspace.id,
    fullName: body.fullName ?? "New lead",
    whatsappNumber: body.whatsappNumber,
    phone: body.phone,
    email: body.email,
    interest: body.interest,
    status: "NEW_LEAD",
    temperature: "WARM",
    createdAt: iso(0)
  };
  store.leads.unshift(lead);
  return lead;
}

function createCreative(rawBody: BodyInit | null | undefined): Json {
  let fileUrl = "https://picsum.photos/seed/upload" + counter + "/600/600";
  let fileName = "upload.jpg";
  let fileType = "image/jpeg";
  let fileSize = 120000;
  if (rawBody instanceof FormData) {
    const file = rawBody.get("file");
    if (file instanceof File) {
      fileUrl = URL.createObjectURL(file);
      fileName = file.name;
      fileType = file.type || "image/jpeg";
      fileSize = file.size;
    }
  }
  const creative: Json = { id: id("cr"), workspaceId: store.workspace.id, fileUrl, fileName, fileType, fileSize, status: "PENDING", createdAt: iso(0) };
  store.creatives.unshift(creative);
  return creative;
}

function createPost(body: Json): Json {
  const post: Json = {
    id: id("post"),
    workspaceId: store.workspace.id,
    caption: body.caption ?? "",
    mediaUrl: body.mediaUrl,
    mediaType: body.mediaType,
    platforms: body.platforms ?? [],
    status: "DRAFT",
    createdAt: iso(0)
  };
  store.posts.unshift(post);
  return post;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
