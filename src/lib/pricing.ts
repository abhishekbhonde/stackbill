// Pricing data and cost model. Prices last checked: October 2026.
// Every formula is an estimate — the goal is "roughly right at scale", not an invoice.

export const PRICES_CHECKED = "Oct 2026";

export type Assumptions = {
  pageViews: number; // page views per user per month
  pageKB: number; // average KB transferred per page view (after caching)
  dbMB: number; // MB stored per user
  dbEgressMB: number; // MB of DB egress per user per month
  emails: number; // emails per user per month
  events: number; // analytics events per user per month
  aiRequests: number; // AI calls per user per month
  inTokens: number; // input tokens per AI call
  outTokens: number; // output tokens per AI call
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  pageViews: 30,
  pageKB: 500,
  dbMB: 2,
  dbEgressMB: 5,
  emails: 4,
  events: 100,
  aiRequests: 20,
  inTokens: 1500,
  outTokens: 400,
};

export const ASSUMPTION_LABELS: Record<keyof Assumptions, string> = {
  pageViews: "Page views / user / mo",
  pageKB: "KB per page view",
  dbMB: "DB storage / user (MB)",
  dbEgressMB: "DB egress / user / mo (MB)",
  emails: "Emails / user / mo",
  events: "Analytics events / user / mo",
  aiRequests: "AI calls / user / mo",
  inTokens: "Input tokens / AI call",
  outTokens: "Output tokens / AI call",
};

export type Category = "hosting" | "database" | "auth" | "ai" | "email" | "analytics";

export type Service = {
  id: string;
  name: string;
  category: Category;
  url: string;
  note: string;
  cost: (users: number, a: Assumptions) => number;
};

const over = (used: number, included: number) => Math.max(0, used - included);
const GB = (mb: number) => mb / 1024;

function llm(inPerM: number, outPerM: number) {
  return (users: number, a: Assumptions) => {
    const calls = users * a.aiRequests;
    return (calls * (a.inTokens * inPerM + a.outTokens * outPerM)) / 1_000_000;
  };
}

export const SERVICES: Service[] = [
  {
    id: "vercel",
    name: "Vercel Pro",
    category: "hosting",
    url: "https://vercel.com/pricing",
    note: "$20/seat incl. $20 usage credit, 1 TB transfer, 10M edge requests. Overage ~$0.15/GB, $2 per 1M requests.",
    cost: (u, a) => {
      const views = u * a.pageViews;
      const transferGB = GB((views * a.pageKB) / 1024);
      const edgeRequests = views * 8; // HTML + assets per page view
      const usage =
        over(transferGB, 1024) * 0.15 + (over(edgeRequests, 10_000_000) / 1_000_000) * 2;
      return 20 + Math.max(0, usage - 20);
    },
  },
  {
    id: "cloudflare",
    name: "Cloudflare Pages",
    category: "hosting",
    url: "https://www.cloudflare.com/plans/developer-platform/",
    note: "Static hosting with free bandwidth. Workers Paid $5/mo incl. 10M requests, then $0.30 per 1M.",
    cost: (u, a) => {
      const requests = u * a.pageViews; // only dynamic requests hit Workers
      return 5 + (over(requests, 10_000_000) / 1_000_000) * 0.3;
    },
  },
  {
    id: "supabase",
    name: "Supabase Pro",
    category: "database",
    url: "https://supabase.com/pricing",
    note: "$25/mo incl. 8 GB DB, 250 GB egress, $10 compute credit. Compute tier grows with users (estimate).",
    cost: (u, a) => {
      const storage = GB(u * a.dbMB);
      const egress = GB(u * a.dbEgressMB);
      const compute = u < 10_000 ? 10 : u < 50_000 ? 15 : u < 200_000 ? 60 : u < 500_000 ? 110 : 210;
      return 25 + Math.max(0, compute - 10) + over(storage, 8) * 0.125 + over(egress, 250) * 0.09;
    },
  },
  {
    id: "neon",
    name: "Neon Launch",
    category: "database",
    url: "https://neon.com/pricing",
    note: "Usage-based: $0.106 per CU-hour + $0.35/GB-month. Scales to zero when idle (compute size is an estimate).",
    cost: (u, a) => {
      const cu = u < 10_000 ? 0.25 : u < 50_000 ? 1 : u < 200_000 ? 2 : u < 500_000 ? 4 : 8;
      const hours = u < 10_000 ? 300 : 730;
      return cu * hours * 0.106 + GB(u * a.dbMB) * 0.35;
    },
  },
  {
    id: "clerk",
    name: "Clerk Pro",
    category: "auth",
    url: "https://clerk.com/pricing",
    note: "$25/mo incl. 50,000 monthly retained users, then $0.02 per user.",
    cost: (u) => 25 + over(u, 50_000) * 0.02,
  },
  {
    id: "supabase-auth",
    name: "Supabase Auth",
    category: "auth",
    url: "https://supabase.com/pricing",
    note: "Included with Supabase Pro up to 100,000 MAU, then $0.00325 per MAU.",
    cost: (u) => over(u, 100_000) * 0.00325,
  },
  {
    id: "sonnet",
    name: "Claude Sonnet 5.5",
    category: "ai",
    url: "https://www.anthropic.com/pricing",
    note: "$2 per 1M input tokens, $10 per 1M output tokens.",
    cost: llm(2, 10),
  },
  {
    id: "haiku",
    name: "Claude Haiku 4.5",
    category: "ai",
    url: "https://www.anthropic.com/pricing",
    note: "$1 per 1M input tokens, $5 per 1M output tokens.",
    cost: llm(1, 5),
  },
  {
    id: "gpt5mini",
    name: "GPT-5 mini",
    category: "ai",
    url: "https://openai.com/api/pricing/",
    note: "$0.25 per 1M input tokens, $2 per 1M output tokens.",
    cost: llm(0.25, 2),
  },
  {
    id: "resend",
    name: "Resend",
    category: "email",
    url: "https://resend.com/pricing",
    note: "Free up to 3,000 emails/mo. Pro $20 incl. 50,000, then $0.90 per 1,000.",
    cost: (u, a) => {
      const emails = u * a.emails;
      if (emails <= 3_000) return 0;
      return 20 + (over(emails, 50_000) / 1_000) * 0.9;
    },
  },
  {
    id: "posthog",
    name: "PostHog",
    category: "analytics",
    url: "https://posthog.com/pricing",
    note: "First 1M events free, then tiered from $0.00005 down to $0.0000218 per event.",
    cost: (u, a) => {
      const tiers: [number, number][] = [
        [1_000_000, 0],
        [2_000_000, 0.00005],
        [15_000_000, 0.0000343],
        [50_000_000, 0.0000295],
        [100_000_000, 0.0000218],
        [Infinity, 0.0000195],
      ];
      let events = u * a.events;
      let prev = 0;
      let total = 0;
      for (const [cap, rate] of tiers) {
        const inTier = Math.min(events, cap - prev);
        if (inTier <= 0) break;
        total += inTier * rate;
        events -= inTier;
        prev = cap;
      }
      return total;
    },
  },
];

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "hosting", label: "Hosting" },
  { id: "database", label: "Database" },
  { id: "auth", label: "Auth" },
  { id: "ai", label: "AI model" },
  { id: "email", label: "Email" },
  { id: "analytics", label: "Analytics" },
];

export type Stack = Partial<Record<Category, string>>; // category -> service id

export const DEFAULT_STACK: Stack = {
  hosting: "vercel",
  database: "supabase",
  auth: "clerk",
  ai: "sonnet",
  email: "resend",
  analytics: "posthog",
};

export const MILESTONES = [1_000, 10_000, 100_000, 1_000_000];

export function breakdown(stack: Stack, users: number, a: Assumptions) {
  return CATEGORIES.flatMap(({ id }) => {
    const service = SERVICES.find((s) => s.id === stack[id]);
    return service ? [{ service, cost: service.cost(users, a) }] : [];
  });
}

export function total(stack: Stack, users: number, a: Assumptions) {
  return breakdown(stack, users, a).reduce((sum, row) => sum + row.cost, 0);
}

// --- URL state (so a shared link reproduces the exact result) ---

export function encodeState(stack: Stack, users: number, a: Assumptions) {
  const p = new URLSearchParams();
  for (const { id } of CATEGORIES) p.set(id, stack[id] ?? "none");
  p.set("users", String(users));
  for (const key of Object.keys(a) as (keyof Assumptions)[]) {
    if (a[key] !== DEFAULT_ASSUMPTIONS[key]) p.set(key, String(a[key]));
  }
  return p.toString();
}

export function decodeState(params: Record<string, string | string[] | undefined>) {
  const get = (k: string) => {
    const v = params[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const stack: Stack = { ...DEFAULT_STACK };
  for (const { id } of CATEGORIES) {
    const v = get(id);
    if (v === "none") delete stack[id];
    else if (v && SERVICES.some((s) => s.id === v && s.category === id)) stack[id] = v;
  }
  const users = clamp(Number(get("users")) || 10_000, 100, 10_000_000);
  const assumptions = { ...DEFAULT_ASSUMPTIONS };
  for (const key of Object.keys(assumptions) as (keyof Assumptions)[]) {
    const n = Number(get(key));
    if (get(key) !== undefined && Number.isFinite(n) && n >= 0) assumptions[key] = n;
  }
  return { stack, users, assumptions };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function money(n: number) {
  if (n >= 100) return `$${Math.round(n).toLocaleString("en-US")}`;
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

export function compact(n: number) {
  return n >= 1_000_000 ? `${n / 1_000_000}M` : n >= 1_000 ? `${n / 1_000}K` : String(n);
}
