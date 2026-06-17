import { createFileRoute } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  getCopilotMessages,
  sendCopilotMessage,
  clearCopilot,
} from "@/lib/atlas.functions";
import { Panel } from "@/components/atlas/Panel";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const messagesQuery = queryOptions({
  queryKey: ["atlas", "copilot"],
  queryFn: () => getCopilotMessages(),
});

export const Route = createFileRoute("/_authenticated/copilot")({
  head: () => ({
    meta: [{ title: "AI Copilot · ATLAS AI" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(messagesQuery),
  component: Copilot,
});

const STARTERS = [
  "How can I improve my sleep this week?",
  "What's my biggest health weakness right now?",
  "Suggest a hydration plan based on my data.",
  "Why is my recovery score fluctuating?",
];

function Copilot() {
  const qc = useQueryClient();
  const { data: messages } = useSuspenseQuery(messagesQuery);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMut = useMutation({
    mutationFn: (message: string) => sendCopilotMessage({ data: { message } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atlas", "copilot"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMut = useMutation({
    mutationFn: () => clearCopilot(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atlas", "copilot"] }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sendMut.isPending]);

  const submit = () => {
    const trimmed = input.trim();
    if (!trimmed || sendMut.isPending) return;
    setInput("");
    sendMut.mutate(trimmed);
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)]">
      <div className="flex items-end justify-between gap-3 shrink-0">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary/80 mb-1">
            AI Health Copilot
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">
            ATLAS <span className="text-gradient">knows your data</span>
          </h1>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearMut.mutate()}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Clear
          </Button>
        )}
      </div>

      <Panel className="flex-1 flex flex-col min-h-0 !p-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 md:p-6 space-y-4"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-5 py-10">
              <div className="h-14 w-14 rounded-full grid place-items-center bg-gradient-to-br from-primary to-accent glow-cyan float">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="max-w-md">
                <div className="font-display text-lg font-semibold mb-1">
                  Ask ATLAS anything about your health.
                </div>
                <p className="text-sm text-muted-foreground">
                  I see your last 7 days of data and your long-term patterns. I won't diagnose or
                  prescribe — for that, see a clinician.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 w-full max-w-xl">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMut.mutate(s)}
                    disabled={sendMut.isPending}
                    className="text-left p-3 rounded-lg border border-border bg-background/40 hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}

          {sendMut.isPending && <TypingBubble />}
        </div>

        {/* INPUT */}
        <div className="border-t border-border p-3 md:p-4 bg-background/40">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask about your sleep, hydration, recovery…"
              rows={1}
              className="flex-1 resize-none bg-input/40 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 max-h-32"
            />
            <Button
              size="icon"
              onClick={submit}
              disabled={!input.trim() || sendMut.isPending}
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            <ShieldAlert className="h-3 w-3" />
            Not a medical device · informational only
          </div>
        </div>
      </Panel>
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] md:max-w-[70%] rounded-2xl rounded-tr-sm bg-primary/15 border border-primary/30 px-4 py-2.5 text-sm">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 shrink-0 rounded-lg grid place-items-center bg-gradient-to-br from-primary to-accent">
        <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
      </div>
      <div className="max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tl-sm bg-background/60 border border-border px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 shrink-0 rounded-lg grid place-items-center bg-gradient-to-br from-primary to-accent">
        <Sparkles className="h-3.5 w-3.5 text-primary-foreground animate-pulse" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-background/60 border border-border px-4 py-3 flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
      </div>
    </div>
  );
}
