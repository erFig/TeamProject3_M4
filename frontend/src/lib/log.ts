import { stream, type Saved } from "@/lib/api";

/** What the Bookkeeper agent said and saved for one message typed into a log box. */
export interface LogResult {
  text: string;
  saved: Saved | null;
  batchId: string | null;
  error?: string;
}

let sessionId: string | null = null;

/** Send a plain-words message ("spent $40 on groceries and gas") to the Bookkeeper agent and collect its reply.
 *  onLive is called with the reply so far while it streams in. */
export async function logText(
  text: string,
  opts: { checkin?: "spend" | "income"; contextHint?: string } = {},
  onLive?: (soFar: string) => void,
): Promise<LogResult> {
  const r: LogResult = { text: "", saved: null, batchId: null };
  try {
    await stream(
      "/api/chat",
      {
        message: text,
        mode: "log",
        session_id: sessionId,
        checkin: opts.checkin,
        context_hint: opts.contextHint,
      },
      (e) => {
        const ev = e as { type: string; [k: string]: any };
        if (ev.type === "session") sessionId = ev.session_id;
        else if (ev.type === "token") {
          r.text += ev.text;
          onLive?.(r.text);
        } else if (ev.type === "replace") {
          r.text = ev.text;
          onLive?.(r.text);
        } else if (ev.type === "card" && ev.kind === "saved")
          r.saved = ev.data as Saved;
        else if (ev.type === "done") r.batchId = ev.batch_id ?? null;
        else if (ev.type === "error") r.error = ev.message;
      },
    );
  } catch (err) {
    r.error = (err as Error).message;
  }
  return r;
}
