// Types and calls for the BudgetWise API (app.py). The browser never talks to the model directly.

export type Status = "green" | "amber" | "red";

export interface Bill {
  name: string;
  amount: number;
  average: number;
  category: string;
  every: string;
  next_due: string;
  days_until: number;
  source: string;
  monthly_cost: number;
}
export interface Insight {
  id: string;
  severity: "high" | "medium" | "low" | "good";
  icon: string;
  title: string;
  detail: string;
  category?: string;
}
export interface ForecastPoint {
  date: string;
  balance: number;
  bill: number | null;
  income: number | null;
  payday: boolean;
}
export interface MonthRow {
  category: string;
  label: string;
  this_month: number;
  last_month_same_days: number;
  change: number;
  change_pct: number | null;
}
export interface Goal {
  saved_known: boolean;
  days_remaining: number;
  pace_amount: number;
  pace_unit: "day" | "week";
  name: string;
  target: number;
  saved: number;
  remaining: number;
  percent: number;
  deadline: string;
  weeks_left: number;
  needed_per_day: number;
  needed_per_week: number;
  needed_per_month: number;
  weekly_safe_to_spend: number;
  fits: boolean | null;
  plan_level: "starter" | "estimated" | "personalized";
  missing: string[];
  next_question: string | null;
}
export interface LastPlan {
  week_start: string;
  daily_limit: number;
  actual_daily_average: number;
  focus_category: string;
  focus_category_cap: number;
  actual_focus_spent: number;
  stuck_to_plan: boolean;
  stuck_to_daily_limit: boolean;
  stuck_to_focus_cap: boolean;
  summary: string;
}
export interface Snapshot {
  readiness: {
    ready: boolean;
    missing: string[];
    payday_known: boolean;
    spending_history_days: number;
  };
  account: { id: string; name: string; kind: "demo" | "personal" };
  setup_needed: boolean;
  use_case: string | null;
  balance_info: { as_of: string | null; source: string | null };
  estimates: { count: number; total: number };
  told: Schedule[];
  checkins: { spend_today: boolean; income_week: boolean };
  as_of: string;
  data_is_old: boolean;
  balance: number;
  savings_buffer: number;
  next_payday: string;
  days_until_payday: number;
  expected_next_paycheck: number | null;
  bills_before_payday: Bill[];
  bills_before_payday_total: number;
  next_cycle: {
    ends: string;
    bills: Bill[];
    bills_total: number;
    expected_income: number;
    held_back: number;
  };
  held_back_for_next_cycle: number;
  planning_horizon_days: number;
  planning_horizon_end: string;
  safe_to_spend_window_days: number;
  safe_to_spend_window_end: string;
  weekly_safe_to_spend: number;
  safe_to_spend_total: number;
  safe_per_day: number;
  per_day_after_today: number;
  spent_today: number;
  left_today: number;
  typical_daily_spending: number;
  status: Status;
  income: {
    sources: {
      source: string;
      count: number;
      average: number;
      lowest: number;
      highest: number;
      every_days: number | null;
      last_date: string;
    }[];
    monthly: { month: string; income: number }[];
    average_monthly: number;
    lowest_month: number;
    swing_percent: number;
    irregular: boolean;
    next_payday: string;
    next_payday_confidence: string;
    expected_next_paycheck: number | null;
    projected_income: { date: string; amount: number; source: string }[];
    main_source: string | null;
    pay_every_days: number | null;
  };
  upcoming_bills: Bill[];
  subscriptions: { count: number; monthly_total: number; items: Bill[] };
  spending_last_30_days: { category: string; label: string; amount: number }[];
  month: {
    this_month_label: string;
    last_month_label: string;
    days_compared: number;
    this_month_total: number;
    last_month_same_days_total: number;
    last_month_full_total: number;
    categories: MonthRow[];
  };
  forecast: {
    points: ForecastPoint[];
    lowest_before_payday: number;
    lowest: number;
    lowest_date: string;
    assumes_daily_spending: number;
  };
  goal: Goal | null;
  last_plan: LastPlan | null;
  insights: Insight[];
}
export interface Txn {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  category: string;
  source: "csv" | "chat" | "checkin" | "setup" | "demo";
  approx: boolean;
  payment_method:
    "available_money" | "credit_card" | "cash_other" | "bank" | "demo";
  affects_balance: boolean;
  batch_id: string | null;
}
export interface Account {
  id: string;
  name: string;
  kind: "demo" | "personal";
  tagline: string;
  emoji: string;
}
export interface Schedule {
  id: string;
  kind: "bill" | "income";
  name: string;
  amount: number | null;
  low: number | null;
  high: number | null;
  every: string;
  day_of_month: number | null;
  next_date: string | null;
  category: string | null;
  varies: boolean;
}
export interface Saved {
  batch_id: string;
  count: number;
  goal: {
    name: string;
    target: number;
    saved: number;
    deadline: string;
  } | null;
  transactions: {
    id: string;
    date: string;
    description: string;
    amount: number;
    category: string;
    approx: boolean;
  }[];
  schedules: Schedule[];
  balances: { balance: number; as_of: string }[];
  typical_weekly_spend: number | null;
  safe_per_day: number;
  left_today: number;
  balance: number;
  next_payday: string;
  has_balance: boolean;
}
export interface Persona {
  id: string;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
}
export interface Category {
  id: string;
  label: string;
  kind: string;
}
export interface DevelopmentLogStatus {
  enabled: boolean;
  active_path: string;
  has_active_log: boolean;
}
export interface ConversationState {
  question_key: string | null;
  question: string | null;
  choices: string[];
  skipped: string[];
  welcome_seen: boolean;
  conversation_started: boolean;
  guidance_complete: boolean;
  history: {
    role: "user" | "assistant";
    text: string;
    saved?: Saved;
    plan?: Plan;
  }[];
}

export interface Plan {
  week_start: string;
  week_end: string;
  weekly_safe_to_spend: number;
  save_this_week: number;
  weekly_spending_allowance: number;
  daily_limit: number;
  focus_category: string;
  focus_label: string;
  focus_weekly_average: number;
  cut_percent: number;
  focus_category_cap: number;
  freed_up_by_cut: number;
  goal_name: string | null;
  goal_needed_per_week: number | null;
  on_track_for_goal: boolean | null;
  headline: string;
  why: string[];
  today_action: string;
  tip_source: string;
  critic: {
    score: number;
    verdict: "approve" | "revise";
    grounded: boolean;
    realistic: boolean;
    actionable: boolean;
    feedback: string;
  };
  attempts: number;
  last_week: LastPlan | null;
  status_before: Status;
}
export interface Afford {
  item: string;
  amount: number;
  verdict: "yes" | "tight" | "no";
  reason: string;
  safe_to_spend_before: number;
  safe_to_spend_after: number;
  per_day_before: number;
  per_day_after: number;
  days_until_payday: number;
  next_payday: string;
  typical_daily_spending: number;
  lowest_balance_after: number;
}

// Events streamed from /api/chat and /api/plan/generate (Server-Sent Events)
export type AgentEvent =
  | { type: "session"; session_id: string }
  | {
      type: "step";
      agent: string;
      status: "running" | "done" | "error" | "blocked" | "revise";
      detail: string;
    }
  | {
      type: "tool";
      agent: string;
      name: string;
      status: "running" | "done";
      args?: Record<string, unknown>;
      summary?: string;
    }
  | {
      type: "check";
      name: string;
      status: "pass" | "retry" | "fail";
      detail: string;
    }
  | { type: "token"; text: string }
  | { type: "replace"; text: string }
  | { type: "card"; kind: "plan"; data: Plan }
  | { type: "card"; kind: "afford"; data: Afford }
  | { type: "card"; kind: "saved"; data: Saved }
  | { type: "plan"; plan: Plan }
  | {
      type: "done";
      answer?: string;
      intent?: string;
      elapsed: number;
      batch_id?: string | null;
    }
  | { type: "error"; message: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error((body as { detail?: string }).detail || res.statusText);
  return body as T;
}
const json = (method: string, data?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: data === undefined ? undefined : JSON.stringify(data),
});

export const api = {
  conversation: () => request<ConversationState>("/api/conversation"),
  snapshot: () => request<Snapshot>("/api/snapshot"),
  accounts: () =>
    request<{ active: string; accounts: Account[]; personas: Persona[] }>(
      "/api/accounts",
    ),
  setActive: (id: string) =>
    request("/api/accounts/active", json("POST", { id })),
  deleteAccount: (id: string) =>
    request(`/api/accounts/${id}`, { method: "DELETE" }),
  transactions: () =>
    request<{ account: string; transactions: Txn[] }>("/api/transactions"),
  categories: () => request<Category[]>("/api/categories"),
  setCategory: (id: string, category: string, apply_to_merchant = true) =>
    request<{ changed: number }>(
      `/api/transactions/${id}`,
      json("PATCH", { category, apply_to_merchant }),
    ),
  settings: () =>
    request<Record<string, unknown> & { schedules: Schedule[] }>(
      "/api/settings",
    ),
  developmentLogs: () => request<DevelopmentLogStatus>("/api/development-logs"),
  archiveDevelopmentLogs: () =>
    request<{
      archived: {
        path: string;
        filename: string;
        turns: number;
        bytes: number;
      } | null;
    }>("/api/development-logs/archive", { method: "POST" }),
  deleteSchedule: (id: string) =>
    request(`/api/schedules/${id}`, { method: "DELETE" }),
  deleteTxn: (id: string) =>
    request(`/api/transactions/${id}`, { method: "DELETE" }),
  undo: (batch_id: string) =>
    request<{ removed: number }>("/api/undo", json("POST", { batch_id })),
  checkin: (kind: "spend" | "income", amount: number | null) =>
    request<{
      batch_id: string | null;
      left_today: number;
      safe_per_day: number;
    }>("/api/checkin", json("POST", { kind, amount })),
  newAccount: (name: string) =>
    request<{ id: string }>("/api/accounts/new", json("POST", { name })),
  saveSettings: (data: Record<string, unknown>) =>
    request("/api/settings", json("PATCH", data)),
  plans: () =>
    request<{
      current: (Plan & { accepted_at?: string }) | null;
      progress: {
        days_in: number;
        flexible_spent: number;
        allowance_so_far: number;
        focus_spent: number;
        focus_cap: number;
      } | null;
      last_week: LastPlan | null;
      history: (Plan & { accepted_at?: string })[];
    }>("/api/plans"),
  acceptPlan: (plan: Plan) =>
    request("/api/plan/accept", json("POST", { plan })),
  resetChat: (sid: string) =>
    request(`/api/chat/reset?session_id=${encodeURIComponent(sid)}`, {
      method: "POST",
    }),
  importPreview: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{
      token: string;
      detected: Record<string, string | number | boolean | null>;
      balance: number | null;
      sample: { date: string; description: string; amount: number }[];
    }>("/api/import/preview", { method: "POST", body: fd });
  },
  importCommit: (
    token: string,
    name: string,
    balance: number,
    target: "new" | "active",
  ) =>
    request<{
      account: string;
      transactions: number;
      merchants_sent_to_ai: number;
      how_categorized: Record<string, number>;
      seconds: number;
      added: number;
      duplicates_skipped: number;
      estimates_replaced: number;
      first_date: string;
      last_date: string;
    }>("/api/import/commit", json("POST", { token, name, balance, target })),
};

/** POST and read a Server-Sent Events stream, calling onEvent for each event. */
export async function stream(
  path: string,
  body: unknown,
  onEvent: (e: AgentEvent) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(path, { ...json("POST", body), signal });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { detail?: string }).detail || `Request failed (${res.status})`,
    );
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, i).trim();
      buf = buf.slice(i + 2);
      if (chunk.startsWith("data:")) {
        try {
          onEvent(JSON.parse(chunk.slice(5)));
        } catch {
          /* ignore a malformed line */
        }
      }
    }
  }
}
