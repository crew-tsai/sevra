import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function ZebraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Head */}
      <ellipse cx="32" cy="34" rx="18" ry="20" fill="currentColor" />
      {/* Ears */}
      <ellipse cx="20" cy="14" rx="4" ry="6" fill="currentColor" transform="rotate(-20 20 14)" />
      <ellipse cx="44" cy="14" rx="4" ry="6" fill="currentColor" transform="rotate(20 44 14)" />
      {/* Mane */}
      <path d="M32 8 L28 18 L32 14 L36 18 Z" fill="currentColor" />
      {/* Stripes (cut-outs) */}
      <g stroke="hsl(var(--primary))" strokeWidth="2.2" strokeLinecap="round">
        <path d="M18 26 Q24 24 30 26" />
        <path d="M34 26 Q40 24 46 26" />
        <path d="M16 34 Q24 32 32 34" />
        <path d="M32 34 Q40 32 48 34" />
        <path d="M20 42 Q26 40 32 42" />
        <path d="M32 42 Q38 40 44 42" />
      </g>
      {/* Eyes */}
      <circle cx="25" cy="32" r="2" fill="hsl(var(--primary))" />
      <circle cx="39" cy="32" r="2" fill="hsl(var(--primary))" />
      {/* Nose */}
      <ellipse cx="32" cy="48" rx="6" ry="4" fill="hsl(var(--primary))" opacity="0.35" />
      <circle cx="29" cy="48" r="1" fill="hsl(var(--primary))" />
      <circle cx="35" cy="48" r="1" fill="hsl(var(--primary))" />
    </svg>
  );
}

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-stripes`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SUGGESTIONS = [
  "What do I do in the first 15 minutes of a crisis?",
  "Draft a holding statement for a product recall",
  "How are emails queued and sent in Sevra?",
  "Show me an L3 escalation playbook",
];

export default function AgentStripes() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm **Agent Stripes**. Ask me about emergencies, crisis strategy, emails in your Sevra database, past cases, or any platform issue.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (!resp.ok || !resp.body) {
        const errText = resp.status === 429
          ? "Too many requests. Please wait a moment."
          : resp.status === 402
          ? "AI credits exhausted. Top up your workspace to continue."
          : "Sorry, something went wrong.";
        setMessages((m) => [...m, { role: "assistant", content: errText }]);
        return;
      }

      let assistantSoFar = "";
      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last !== messages[messages.length - 1]) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(j);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating launcher - center bottom */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "flex items-center gap-3 rounded-full pl-4 pr-6 py-3",
          "bg-primary text-primary-foreground shadow-2xl shadow-primary/30",
          "hover:scale-105 transition-transform",
          open && "opacity-0 pointer-events-none",
        )}
        aria-label="Open Agent Stripes"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/15">
          <span className="absolute inset-0 rounded-full animate-ping bg-primary-foreground/20" />
          <ZebraIcon className="h-7 w-7 text-primary-foreground" />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-semibold">Ask Agent Stripes</span>
          <span className="block text-xs opacity-80">Your calm in the chaos — ready 24/7</span>
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden",
            "bottom-6 left-1/2 -translate-x-1/2 w-[min(420px,calc(100vw-2rem))] h-[min(600px,calc(100vh-3rem))]",
          )}
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                <ZebraIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Ask Agent Stripes</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your calm in the chaos — ready 24/7</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Agent Stripes is thinking…
              </div>
            )}
            {messages.length === 1 && !loading && (
              <div className="pt-2 space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-lg px-3 py-2 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-3 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a crisis, email, or case…"
              className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
