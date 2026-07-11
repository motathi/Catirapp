"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendConversationMessage, type ChatMessage } from "@/app/mensagens/actions";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

export default function Conversation({
  conversationId,
  currentUserId,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Realtime: novas mensagens (de qualquer um dos dois) entram na hora
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Rola para a última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    setError(null);
    setBody("");
    startTransition(async () => {
      const res = await sendConversationMessage(conversationId, text);
      if (!res.ok) {
        setError(res.error);
        setBody(text); // devolve o texto para não perder
        return;
      }
      setMessages((prev) =>
        prev.some((x) => x.id === res.message.id)
          ? prev
          : [...prev, res.message],
      );
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-2 px-4 py-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-mute">
            Nenhuma mensagem ainda. Diga olá!
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={mine ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                  mine
                    ? "rounded-br-sm bg-emerald-500 text-emerald-950"
                    : "rounded-bl-sm bg-card-2 text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <time
                  className={`mt-1 block text-[10px] ${
                    mine ? "text-emerald-900/70" : "text-mute"
                  }`}
                >
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t border-line bg-surface/95 p-3 backdrop-blur">
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder="Escreva uma mensagem…"
            className="max-h-32 flex-1 resize-none rounded-2xl border border-line bg-card px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
          <button
            onClick={submit}
            disabled={pending || !body.trim()}
            className="shrink-0 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
