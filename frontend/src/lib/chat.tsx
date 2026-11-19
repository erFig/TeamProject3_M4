import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  stream,
  api,
  type AgentEvent,
  type Afford,
  type Plan,
  type Saved,
} from "./api";

// One line in the "how I got this" timeline under each answer.
export interface TimelineItem {
  key: string;
  kind: "step" | "tool" | "check";
  who: string; // agent or check name
  label: string; // what happened
  status: string; // running | done | error | blocked | revise | pass | retry | fail
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timeline: TimelineItem[];
  afford?: Afford;
  plan?: Plan;
  saved?: Saved;
  pending?: boolean;
  elapsed?: number;
  intent?: string;
  error?: string;
}

const TOOL_LABELS: Record<string, string> = {
  search_transactions: "Searched your transactions",
  get_spending_by_category: "Added up spending by category",
  check_affordability: "Checked affordability",
  get_income_details: "Looked at your paychecks",
  search_budget_knowledge: "Searched the budgeting guides",
  build_weekly_plan: "Calculated the weekly plan",
  log_spending: "Saved spending",
  log_income: "Saved income",
  set_bill: "Saved a bill",
  set_pay_schedule: "Saved your pay schedule",
  set_balance: "Updated your balance",
  set_savings_goal: "Saved your goal",
  update_savings_goal: "Updated your goal",
  set_typical_weekly_spending: "Saved your usual weekly spending",
  fix_last_entry: "Fixed the last entry",
  undo_last: "Undid the last entry",
};

/** Fold one streamed event into a timeline (shared by chat and the plan page). */
export function applyEvent(
  timeline: TimelineItem[],
  ev: AgentEvent,
): TimelineItem[] {
  if (ev.type === "step") {
    const item: TimelineItem = {
      key: `step-${ev.agent}-${timeline.length}`,
      kind: "step",
      who: ev.agent,
      label: ev.detail,
      status: ev.status,
    };
    // When an agent finishes, tick off its "running" line, then add the result in order.
    const i = timeline.findIndex(
      (t) => t.kind === "step" && t.who === ev.agent && t.status === "running",
    );
    if (i >= 0) {
      const ticked = timeline.map((t, j) =>
        j === i
          ? {
              ...t,
              status:
                ev.status === "running"
                  ? "done"
                  : ev.status === "error"
                    ? "error"
                    : "done",
            }
          : t,
      );
      if (ev.status === "running") return [...ticked, item];
      if (ev.detail === "Answer written")
        return ticked.map((t, j) =>
          j === i
            ? { ...t, label: "Read your numbers and wrote the answer" }
            : t,
        );
      return [...ticked, item];
    }
    return [...timeline, item];
  }
  if (ev.type === "tool") {
    if (ev.status === "running") {
      const args = ev.args
        ? Object.entries(ev.args)
            .filter(([, v]) => v !== "" && v !== null)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "";
      return [
        ...timeline,
        {
          key: `tool-${timeline.length}`,
          kind: "tool",
          who: ev.agent,
          label: `${TOOL_LABELS[ev.name] ?? ev.name}${args ? ` (${args})` : ""}`,
          status: "running",
        },
      ];
    }
    const i = [...timeline]
      .reverse()
      .findIndex((t) => t.kind === "tool" && t.status === "running");
    if (i >= 0) {
      const idx = timeline.length - 1 - i;
      return timeline.map((t, j) =>
        j === idx
          ? {
              ...t,
              status: "done",
              label: `${t.label.split(" (")[0]}: ${ev.summary}`,
            }
          : t,
      );
    }
    return [
      ...timeline,
      {
        key: `tool-${timeline.length}`,
        kind: "tool",
        who: ev.agent,
        label: `${TOOL_LABELS[ev.name] ?? ev.name}: ${ev.summary ?? ""}`,
        status: "done",
      },
    ];
  }
  if (ev.type === "check") {
    return [
      ...timeline,
      {
        key: `check-${timeline.length}`,
        kind: "check",
        who: ev.name,
        label: ev.detail,
        status: ev.status,
      },
    ];
  }
  return timeline;
}

interface ChatState {
  messages: ChatMessage[];
  busy: boolean;
  send: (text: string) => Promise<void>;
  reset: (clearHistory?: boolean) => void;
}
const Ctx = createContext<ChatState | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const session = useRef<string | null>(null);
  const qc = useQueryClient();
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.accounts,
  });
  const { data: conversation } = useQuery({
    queryKey: ["conversation", accounts?.active],
    queryFn: api.conversation,
    enabled: !!accounts?.active,
  });
  const hydrated = useRef<string | null>(null);
  const sending = useRef(false);
  useEffect(() => {
    if (
      accounts?.active &&
      conversation &&
      hydrated.current !== accounts.active
    ) {
      hydrated.current = accounts.active;
      session.current = null;
      // A reload resumes from saved financial facts instead of replaying an
      // ever-growing transcript. The full transcript remains available from Home.
      setMessages([]);
      const savedPlan = [...conversation.history]
        .reverse()
        .find((m) => m.plan)?.plan;
      if (savedPlan) qc.setQueryData(["draftPlan"], savedPlan);
    }
  }, [accounts?.active, conversation, qc]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || sending.current) return;
      sending.current = true;
      setBusy(true);
      const id = crypto.randomUUID?.() ?? String(Date.now());
      const user: ChatMessage = {
        id: `${id}-u`,
        role: "user",
        text: q,
        timeline: [],
      };
      const bot: ChatMessage = {
        id: `${id}-a`,
        role: "assistant",
        text: "",
        timeline: [],
        pending: true,
      };
      setMessages((m) => [...m, user, bot]);
      const update = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((all) => all.map((m) => (m.id === bot.id ? fn(m) : m)));
      try {
        await stream(
          "/api/chat",
          { message: q, session_id: session.current },
          (ev) => {
            if (ev.type === "session") session.current = ev.session_id;
            else if (ev.type === "token")
              update((m) => ({ ...m, text: m.text + ev.text }));
            else if (ev.type === "replace")
              update((m) => ({ ...m, text: ev.text }));
            else if (ev.type === "card" && ev.kind === "afford")
              update((m) => ({ ...m, afford: ev.data }));
            else if (ev.type === "card" && ev.kind === "saved")
              update((m) => ({ ...m, saved: ev.data }));
            else if (ev.type === "card" && ev.kind === "plan") {
              update((m) => ({ ...m, plan: ev.data }));
              qc.setQueryData(["draftPlan"], ev.data); // the Plan page picks it up so it can be started
            } else if (ev.type === "done")
              update((m) => ({
                ...m,
                text: ev.answer ?? m.text,
                pending: false,
                elapsed: ev.elapsed,
                intent: ev.intent,
              }));
            else if (ev.type === "error")
              update((m) => ({ ...m, pending: false, error: ev.message }));
            else
              update((m) => ({ ...m, timeline: applyEvent(m.timeline, ev) }));
          },
        );
      } catch (e) {
        update((m) => ({ ...m, pending: false, error: (e as Error).message }));
      } finally {
        update((m) => ({ ...m, pending: false }));
        setBusy(false);
        sending.current = false;
        qc.invalidateQueries(); // anything logged in chat changes the numbers everywhere
      }
    },
    [busy, qc],
  );

  const reset = useCallback(
    (clearHistory = true) => {
      if (clearHistory)
        api
          .resetChat(session.current || "current")
          .then(() => qc.invalidateQueries({ queryKey: ["conversation"] }))
          .catch(() => undefined);
      if (!clearHistory) hydrated.current = null;
      session.current = null;
      setMessages([]);
    },
    [qc],
  );

  return (
    <Ctx.Provider value={{ messages, busy, send, reset }}>
      {children}
    </Ctx.Provider>
  );
}

export const useChat = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useChat outside ChatProvider");
  return c;
};
