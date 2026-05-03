'use client';

// Column 3 (25%) — split vertically 50/50.
//   TOP 50%: Recommendations panel (Anduril-shaped action cards)
//   BOTTOM 50%: Copilot chat panel (Cursor-shaped streaming chat
//               with Object chips inline + voice push-to-talk input)
//
// Built on shadcn primitives: ScrollArea (Radix), Input, Button, Card.

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Mic, Pencil, Send, X } from 'lucide-react';

import { ObjectChip } from '@/components/_ontology/object-chip';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { lookupObject } from '@/lib/fixtures';
import type { AnyObject, Recommendation } from '@/types/ontology';

// ──────────────────────────────────────────────────────────────────
// Auto-chip helper — converts callsigns ("BOGEY-7", "ROOK-1", ...)
// in plain text to clickable Object chips inline.
// ──────────────────────────────────────────────────────────────────
const CALLSIGN_MAP: Record<string, { _type: AnyObject['_type']; _id: string }> =
  {
    'ROOK-1': { _type: 'Unit', _id: 'unit_rook1' },
    'ROOK-2': { _type: 'Unit', _id: 'unit_rook2' },
    'BRAVO-3': { _type: 'Unit', _id: 'unit_bravo3' },
    'BOGEY-7': { _type: 'Entity', _id: 'ent_bogey7' },
    'V-117': { _type: 'Entity', _id: 'ent_v117' },
    'P-04': { _type: 'Entity', _id: 'ent_p04' },
  };

function withChips(
  text: string,
  onSelect: (o: AnyObject) => void
): React.ReactNode {
  return text.split(/(\b[A-Z][A-Z0-9-]+\b)/).map((part, i) => {
    const objRef = CALLSIGN_MAP[part];
    if (objRef && lookupObject(objRef._id)) {
      return (
        <ObjectChip key={i} objectRef={objRef} onSelect={onSelect} compact />
      );
    }
    return part;
  });
}

interface ColCopilotProps {
  recommendations: Recommendation[];
  onSelect: (o: AnyObject) => void;
  onApprove: (rec: Recommendation) => void;
  onReject: (rec: Recommendation) => void;
  onModify: (rec: Recommendation) => void;
}

export function ColCopilot({
  recommendations,
  onSelect,
  onApprove,
  onReject,
  onModify,
}: ColCopilotProps) {
  return (
    <aside className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      {/* TOP 50%: Recommendations */}
      <section className="border-border flex min-h-0 flex-1 flex-col overflow-hidden border-b">
        <RecommendationsPanel
          recommendations={recommendations}
          onSelect={onSelect}
          onApprove={onApprove}
          onReject={onReject}
          onModify={onModify}
        />
      </section>

      {/* BOTTOM 50%: Chat / Voice */}
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChatPanel onSelect={onSelect} />
      </section>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  RECOMMENDATIONS PANEL                                             */
/* ------------------------------------------------------------------ */

function RecommendationsPanel({
  recommendations,
  onSelect,
  onApprove,
  onReject,
  onModify,
}: {
  recommendations: Recommendation[];
  onSelect: (o: AnyObject) => void;
  onApprove: (rec: Recommendation) => void;
  onReject: (rec: Recommendation) => void;
  onModify: (rec: Recommendation) => void;
}) {
  const pendingCount = recommendations.filter(
    (rec) => rec.status === 'pending'
  ).length;
  return (
    <>
      <header className="border-border bg-muted/30 flex shrink-0 items-baseline justify-between border-b px-3 py-1">
        <h2 className="text-foreground/90 label-cap">Recommendations</h2>
        <span className="text-muted-foreground/80 font-mono text-[10px]">
          {pendingCount} pending · grounded
        </span>
      </header>

      {recommendations.length === 0 ? (
        <EmptyState message="No recommendations for this mission." />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-2">
            {recommendations.map((r, i) => (
              <RecommendationCard
                key={r._id}
                rec={r}
                active={i === 0}
                onSelect={onSelect}
                onApprove={onApprove}
                onReject={onReject}
                onModify={onModify}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );
}

function RecommendationCard({
  rec,
  active,
  onSelect,
  onApprove,
  onReject,
  onModify,
}: {
  rec: Recommendation;
  active?: boolean;
  onSelect: (o: AnyObject) => void;
  onApprove: (rec: Recommendation) => void;
  onReject: (rec: Recommendation) => void;
  onModify: (rec: Recommendation) => void;
}) {
  const conf = Math.round(rec.confidence * 8);
  const confTone =
    rec.confidence >= 0.8
      ? 'bg-primary'
      : rec.confidence >= 0.6
        ? 'bg-success'
        : 'bg-muted-foreground/60';

  const decided = rec.status === 'accepted' || rec.status === 'rejected';

  return (
    <Card
      className={[
        'hover:border-primary/60 mb-2 px-2.5 py-2.5 transition-colors last:mb-0',
        active && rec.status === 'pending' ? 'brackets relative' : '',
        rec.status === 'accepted' ? 'border-success/70 bg-success/5' : '',
        rec.status === 'rejected' ? 'opacity-55' : '',
      ].join(' ')}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-foreground/95 text-[13px] leading-snug">
          <span className="text-foreground mr-1 font-serif text-[15px] italic">
            {rec.verb}
          </span>
          {withChips(rec.short, onSelect)}
        </p>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <div className="flex items-center gap-[2px]">
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i}
                className={`block h-2.5 w-[3px] ${i < conf ? confTone : 'bg-border'}`}
              />
            ))}
          </div>
          <span className="text-muted-foreground font-mono text-[9px]">
            {(rec.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
        {rec.eta ? <span className="font-mono">{rec.eta}</span> : null}
      </div>

      {rec.why && rec.why.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {rec.why.map((w) => (
            <span
              key={w}
              className="border-border bg-muted/40 text-foreground/80 border px-1.5 py-0.5 font-mono text-[10px]"
            >
              {w}
            </span>
          ))}
        </div>
      ) : null}

      <div className="border-border mt-3 flex items-center justify-between border-t pt-2.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`size-1.5 ${
              rec.status === 'accepted'
                ? 'bg-success'
                : rec.status === 'rejected'
                  ? 'bg-threat'
                  : rec.gating === 'auto'
                    ? 'bg-success'
                    : rec.gating === 'confirm'
                      ? 'bg-warning'
                      : 'bg-threat'
            }`}
          />
          <span className="text-muted-foreground label-cap-sm">
            {rec.status === 'pending' ? rec.gating : rec.status}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Reject"
            disabled={decided}
            onClick={() => onReject(rec)}
          >
            <X className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={decided}
            onClick={() => onModify(rec)}
          >
            <Pencil className="size-3" />
            Modify
          </Button>
          <Button size="sm" disabled={decided} onClick={() => onApprove(rec)}>
            {rec.status === 'accepted' ? 'Approved' : 'Approve'}
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </div>
      {rec.status === 'accepted' ? (
        <div className="border-success/50 bg-success/10 text-success mt-2 border px-2 py-1 text-center font-mono text-[10px] font-bold uppercase">
          Approved · command written to mission audit
        </div>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  CHAT PANEL                                                        */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  ts: string; // "HH:MM:SS"
  body: React.ReactNode; // pre-rendered (so the seed turn can include chips)
  meta?: string;
}

function nowHMS(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function pad(n: number) {
  return n.toString().padStart(2, '0');
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function cannedReply(input: string): string {
  const t = input.toLowerCase();
  if (
    t.includes('rook') ||
    t.includes('intercept') ||
    t.includes('vector') ||
    t.includes('bogey')
  ) {
    return 'Acknowledged. Drafting tasking for ROOK-1 to intercept BOGEY-7. Stand-off 600m. Awaiting your approval in the recommendations panel.';
  }
  if (t.includes('v-117') || t.includes('vehicle') || t.includes('convoy')) {
    return 'Re-tasking ROOK-2 for visual confirmation of V-117. ETA on-station 6m 18s.';
  }
  if (t.includes('p-04') || t.includes('person') || t.includes('ground')) {
    return 'Hand-off cued to BRAVO-3 for ground confirmation. Bearing 311°, 1.2 NM.';
  }
  if (t.includes('what') || t.includes('?') || t.includes('status')) {
    return 'Current picture: 1 hostile (BOGEY-7), 1 unknown vehicle track (V-117), 1 person of interest (P-04). 2 friendly drones (ROOK-1, ROOK-2). 1 ground unit (BRAVO-3). See map for live state.';
  }
  return 'Acknowledged. Holding for further input.';
}

function ChatPanel({ onSelect }: { onSelect: (o: AnyObject) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'seed',
      role: 'assistant',
      ts: '14:23:08',
      meta: '3 tools · grounded',
      body: (
        <>
          Inbound contact{' '}
          <ObjectChip
            objectRef={{ _type: 'Entity', _id: 'ent_bogey7' }}
            onSelect={onSelect}
            compact
          />{' '}
          crossed the inner ring 46s ago, heading 225° descending.
          Cross-correlated with{' '}
          <ObjectChip
            objectRef={{ _type: 'Report', _id: 'rep_002' }}
            onSelect={onSelect}
            compact
          />{' '}
          — L-band emission consistent with UAV control link. Recommend
          stand-off intercept by{' '}
          <ObjectChip
            objectRef={{ _type: 'Unit', _id: 'unit_rook1' }}
            onSelect={onSelect}
            compact
          />
          .
        </>
      ),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the Radix ScrollArea viewport to the bottom on new
  // message. The viewport is queried via its data attribute since
  // ScrollArea doesn't expose it directly via ref.
  useEffect(() => {
    const root = scrollAreaRef.current;
    if (!root) return;
    const viewport = root.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLElement | null;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isThinking]);

  const send = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setMessages((m) => [
      ...m,
      { id: uid(), role: 'user', ts: nowHMS(), body: text },
    ]);
    setInput('');
    setIsThinking(true);
    window.setTimeout(() => {
      const replyText = cannedReply(text);
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: 'assistant',
          ts: nowHMS(),
          meta: 'grounded · canned',
          body: withChips(replyText, onSelect),
        },
      ]);
      setIsThinking(false);
    }, 650);
  };

  return (
    <>
      <header className="border-border bg-muted/30 flex shrink-0 items-baseline justify-between border-b px-4 py-1.5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-foreground/90 label-cap">Copilot</h2>
          <span className="text-muted-foreground/70 font-mono text-[10px]">
            grounded · GPT-class
          </span>
        </div>
        <span
          className={`font-mono text-[10px] ${isThinking ? 'text-warning' : 'text-success'}`}
        >
          {isThinking ? 'THINKING…' : 'READY'}
        </span>
      </header>

      <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1">
        {messages.map((m) =>
          m.role === 'assistant' ? (
            <AssistantTurn key={m.id} message={m} />
          ) : (
            <UserTurn key={m.id} message={m} />
          )
        )}
        {isThinking && <ThinkingDots />}
      </ScrollArea>

      <ChatInputBar
        value={input}
        onChange={setInput}
        onSend={send}
        disabled={isThinking}
      />
    </>
  );
}

function AssistantTurn({ message }: { message: ChatMessage }) {
  return (
    <div className="border-border border-b px-4 py-3">
      <div className="flex gap-2.5">
        <div
          aria-hidden
          className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center font-mono text-[10px] font-bold"
        >
          AI
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground/90 text-[12.5px] leading-relaxed">
            {message.body}
          </p>
          <span className="text-muted-foreground/60 mt-1 block font-mono text-[9px]">
            {message.ts}
            {message.meta ? ` · ${message.meta}` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

function UserTurn({ message }: { message: ChatMessage }) {
  return (
    <div className="border-border bg-muted/20 border-b px-4 py-2.5">
      <div className="flex gap-2.5">
        <div
          aria-hidden
          className="border-border text-foreground/80 bg-card flex size-5 shrink-0 items-center justify-center border font-mono text-[10px] font-bold"
        >
          OP
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground/95 text-[12.5px] leading-relaxed">
            {message.body}
          </p>
          <span className="text-muted-foreground/60 mt-1 block font-mono text-[9px]">
            {message.ts}
          </span>
        </div>
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="border-border border-b px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden
          className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center font-mono text-[10px] font-bold"
        >
          AI
        </div>
        <div className="text-muted-foreground flex items-center gap-1 font-mono text-[10px]">
          <span className="bg-muted-foreground/60 size-1 animate-pulse" />
          <span
            className="bg-muted-foreground/60 size-1 animate-pulse"
            style={{ animationDelay: '120ms' }}
          />
          <span
            className="bg-muted-foreground/60 size-1 animate-pulse"
            style={{ animationDelay: '240ms' }}
          />
          <span className="ml-1.5">thinking…</span>
        </div>
      </div>
    </div>
  );
}

function ChatInputBar({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border-border bg-muted/20 shrink-0 border-t">
      <div className="text-muted-foreground/70 flex items-center justify-between px-3 pt-1.5 font-mono text-[9px]">
        <span>
          Hold&nbsp;
          <kbd className="border-border bg-card text-foreground border px-1 font-mono text-[9px]">
            SPACE
          </kbd>
          &nbsp;to&nbsp;speak · brevity codes
        </span>
        <span>↵ send</span>
      </div>

      <form
        className="flex items-stretch gap-1 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            disabled ? 'Standing by…' : 'Ask the copilot, or describe the task…'
          }
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          aria-label="Push to talk"
          className="mic-breath"
          size="icon"
        >
          <Mic className="size-3.5" strokeWidth={2.2} />
        </Button>
        <Button
          type="submit"
          aria-label="Send"
          variant="outline"
          size="icon"
          disabled={disabled || !value.trim()}
        >
          <Send className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EMPTY STATE                                                       */
/* ------------------------------------------------------------------ */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground/70 flex min-h-0 flex-1 items-center justify-center px-6 text-center font-mono text-[11px]">
      {message}
    </div>
  );
}
