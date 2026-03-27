"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  MessageCircleIcon,
  SendIcon,
  PlusIcon,
  PhoneIcon,
  ArrowLeftIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conversation {
  phone: string;
  lastMessage: string;
  lastTime: string;
  direction: "inbound" | "outbound";
  count: number;
}

interface Message {
  direction: "inbound" | "outbound";
  body: string;
  timestamp: string;
  status?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Normalize a phone number to E.164 format (+1XXXXXXXXXX for US numbers) */
function toE164(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (input.startsWith("+")) return input.trim();
  return `+${digits}`;
}

/** Display a phone number nicely: +13502207696 → (350) 220-7696 */
function formatPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7);
    return `(${area}) ${prefix}-${line}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SMSPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composing, setComposing] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(async () => {
    setLoadingConvos(true);
    try {
      const res = await fetch("/api/twilio/sms");
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch { /* silent */ }
    setLoadingConvos(false);
  }, []);

  const fetchMessages = useCallback(async (phone: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/twilio/sms?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch { /* silent */ }
    setLoadingMessages(false);
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useEffect(() => { if (selectedPhone) fetchMessages(selectedPhone); }, [selectedPhone, fetchMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function selectConvo(phone: string) {
    setComposing(false);
    setNewPhone("");
    setSelectedPhone(phone);
    setDraft("");
    setError("");
  }

  function startCompose() {
    setSelectedPhone(null);
    setMessages([]);
    setComposing(true);
    setNewPhone("");
    setDraft("");
    setError("");
    setTimeout(() => document.getElementById("sms-to-input")?.focus(), 0);
  }

  function confirmPhone() {
    const cleaned = newPhone.trim();
    if (!cleaned) return;
    const e164 = toE164(cleaned);
    setSelectedPhone(e164);
    setNewPhone(e164);
    setComposing(false);
    fetchMessages(e164);
  }

  async function handleSend() {
    const rawPhone = composing ? newPhone.trim() : selectedPhone;
    if (!rawPhone || !draft.trim()) return;
    const phone = toE164(rawPhone);
    setSending(true);
    setError("");

    const text = draft.trim();
    const optimistic: Message = { direction: "outbound", body: text, timestamp: new Date().toISOString(), status: "sending" };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const res = await fetch("/api/twilio/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message: text }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setMessages((prev) => prev.map((m) => m === optimistic ? { ...m, status: "failed" } : m));
      } else {
        setMessages((prev) => prev.map((m) => m === optimistic ? { ...m, status: "sent" } : m));
        if (composing) { setSelectedPhone(phone); setComposing(false); }
        fetchConversations();
      }
    } catch {
      setError("Failed to send");
      setMessages((prev) => prev.map((m) => m === optimistic ? { ...m, status: "failed" } : m));
    }
    setSending(false);
    inputRef.current?.focus();
  }

  const activePhone = composing ? newPhone.trim() : selectedPhone;
  const showThread = activePhone || composing;

  return (
    <div className="px-3 py-3 overflow-hidden" style={{ height: "calc(100vh - 24px)" }}>
      <div className="flex h-full rounded-2xl border border-border/50 bg-surface-1/30 overflow-hidden">
      {/* ── Conversation List ── */}
      <div className={cn(
        "border-r border-border/50 bg-surface-1/50 flex flex-col",
        showThread ? "hidden md:flex w-[300px] shrink-0" : "flex-1 md:w-[300px] md:shrink-0"
      )}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircleIcon className="size-5 text-accent" />
            <h1 className="text-[15px] font-semibold text-foreground">Texts</h1>
          </div>
          <button
            type="button"
            onClick={startCompose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-accent hover:bg-accent/10 transition-colors cursor-pointer"
          >
            <PlusIcon className="size-3.5" />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvos ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-[60px] rounded-xl shimmer" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 text-center">
              <MessageCircleIcon className="size-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground/60">No conversations yet</p>
              <p className="text-xs text-muted-foreground/30 mt-1">Send a text to get started</p>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {conversations.map((c, idx) => (
                <button
                  key={`${c.phone}-${idx}`}
                  type="button"
                  onClick={() => selectConvo(c.phone)}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-xl transition-colors cursor-pointer",
                    selectedPhone === c.phone && !composing
                      ? "bg-accent/10 border border-accent/20"
                      : "hover:bg-surface-2/50 border border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[13px] font-medium text-foreground truncate mr-2">{formatPhone(c.phone)}</span>
                    <span className="text-[10px] text-muted-foreground/50 shrink-0">{relativeTime(c.lastTime)}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground/60 truncate">
                    {c.direction === "outbound" ? "You: " : ""}{c.lastMessage}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Thread Panel ── */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        !showThread ? "hidden md:flex" : "flex"
      )}>
        {!showThread ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <MessageCircleIcon className="size-12 text-muted-foreground/15 mb-4" />
            <p className="text-sm text-muted-foreground/40">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setSelectedPhone(null); setComposing(false); setError(""); }}
                className="md:hidden text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeftIcon className="size-5" />
              </button>
              <PhoneIcon className="size-4 text-muted-foreground/60" />
              <span className="text-[14px] font-medium text-foreground">
                {composing ? "New Message" : formatPhone(selectedPhone ?? "")}
              </span>
            </div>

            {/* To: input for compose */}
            {composing && (
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                <span className="text-[13px] text-muted-foreground/60 font-medium">To:</span>
                <input
                  id="sms-to-input"
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmPhone(); } }}
                  placeholder="+1 555 123 4567"
                  className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/30 outline-none"
                />
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {loadingMessages ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={cn("h-10 w-48 rounded-2xl shimmer", i % 2 === 0 ? "ml-auto" : "")} />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-xs text-muted-foreground/30">
                    {composing ? "Enter a number and send a message" : "No messages yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg, i) => {
                    const out = msg.direction === "outbound";
                    return (
                      <div key={`${msg.timestamp}-${i}`} className={cn("flex flex-col max-w-[70%]", out ? "ml-auto items-end" : "items-start")}>
                        <div className={cn(
                          "px-3.5 py-2 text-[14px] leading-relaxed",
                          out
                            ? "bg-accent text-white rounded-2xl rounded-br-md"
                            : "bg-surface-2 text-foreground rounded-2xl rounded-bl-md"
                        )}>
                          {msg.body}
                        </div>
                        <span className="text-[10px] text-muted-foreground/40 mt-1 px-1">
                          {formatTime(msg.timestamp)}
                          {out && msg.status === "sending" && " · Sending..."}
                          {out && msg.status === "failed" && <span className="text-destructive"> · Failed</span>}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-2 text-[12px] text-destructive bg-destructive/5 border-t border-destructive/10">
                {error}
              </div>
            )}

            {/* Compose bar */}
            <div className="border-t border-border/50 px-4 py-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Text message"
                  disabled={composing && !newPhone.trim()}
                  className="flex-1 bg-surface-1 border border-border/50 rounded-2xl px-4 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/20 disabled:opacity-30 transition-all"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || sending || (composing && !newPhone.trim())}
                  className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-full shrink-0 transition-colors cursor-pointer",
                    draft.trim() && !sending
                      ? "bg-accent text-white hover:bg-accent/80"
                      : "bg-surface-2 text-muted-foreground/30 cursor-not-allowed"
                  )}
                >
                  <SendIcon className="size-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
