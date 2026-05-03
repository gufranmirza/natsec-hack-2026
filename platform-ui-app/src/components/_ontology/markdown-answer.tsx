'use client';

// MarkdownAnswer renders an LLM-authored response as proper markdown
// (bold, numbered/bulleted lists, paragraphs) while keeping our
// inline callsign-chip behavior — recognized callsigns inside the text
// become clickable ObjectChips that select the underlying ontology
// object.
//
// Used by both the copilot chat panel (col-copilot) and the
// IntelligenceSurface "Mission answer" card.

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { ObjectChip } from '@/components/_ontology/object-chip';
import { lookupObject } from '@/lib/fixtures';
import type { AnyObject } from '@/types/ontology';

// ──────────────────────────────────────────────────────────────────
// Callsign map — these are the canonical handles the agent emits in
// prose. Adding more here makes them clickable from any AI surface.
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

// Walk a string and substitute clickable ObjectChips for known callsigns.
// Strings without a callsign pass through unchanged.
export function chipifyText(
  text: string,
  onSelect?: (o: AnyObject) => void
): React.ReactNode {
  if (!text) return text;
  const parts = text.split(/(\b[A-Z][A-Z0-9-]+\b)/);
  return parts.map((part, i) => {
    const ref = CALLSIGN_MAP[part];
    if (ref && lookupObject(ref._id)) {
      return (
        <ObjectChip
          key={i}
          objectRef={ref}
          onSelect={onSelect ?? noop}
          compact
        />
      );
    }
    return part;
  });
}

function noop() {
  /* fallback when no select handler is provided */
}

// Recursively map any string leaf in a React children tree through
// `chipify`, leaving non-string nodes (e.g. <strong>, <em>) untouched
// so their inner strings get processed when they render.
function chipifyChildren(
  children: React.ReactNode,
  onSelect?: (o: AnyObject) => void
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') return chipifyText(child, onSelect);
    return child;
  });
}

interface MarkdownAnswerProps {
  text: string;
  onSelect?: (o: AnyObject) => void;
  /** Optional className applied to the outer wrapper. */
  className?: string;
}

export function MarkdownAnswer({
  text,
  onSelect,
  className,
}: MarkdownAnswerProps) {
  return (
    <div className={className ?? 'markdown-answer space-y-2'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="leading-relaxed">
              {chipifyChildren(children, onSelect)}
            </p>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5">{children}</ol>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {chipifyChildren(children, onSelect)}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="text-foreground font-bold">
              {chipifyChildren(children, onSelect)}
            </strong>
          ),
          em: ({ children }) => (
            <em>{chipifyChildren(children, onSelect)}</em>
          ),
          code: ({ children }) => (
            <code className="bg-muted/60 rounded px-1 font-mono text-[11px]">
              {children}
            </code>
          ),
          // Strip anchors — we don't want models surfacing arbitrary URLs.
          a: ({ children }) => <span>{children}</span>,
          h1: ({ children }) => (
            <h3 className="text-foreground font-mono text-[12px] font-bold uppercase">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="text-foreground font-mono text-[11px] font-bold uppercase">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="text-foreground font-mono text-[11px] font-bold uppercase">
              {children}
            </h5>
          ),
          // GFM tables — agent often returns breakdowns as markdown tables.
          // Wrap in an overflow-x container so wide tables don't blow up
          // narrow surfaces (chat panel in col-3, etc.).
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="border-border w-full border-collapse border text-[12px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/40">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-border border-b last:border-b-0">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="border-border text-foreground border-r px-2 py-1 text-left font-mono text-[10px] font-bold uppercase tracking-wide last:border-r-0">
              {chipifyChildren(children, onSelect)}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-border text-foreground/90 border-r px-2 py-1 align-top last:border-r-0">
              {chipifyChildren(children, onSelect)}
            </td>
          ),
          // GFM also adds strikethrough and task-list checkboxes.
          del: ({ children }) => (
            <del className="text-muted-foreground/70 line-through">
              {children}
            </del>
          ),
          input: ({ checked, type }) =>
            type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={!!checked}
                readOnly
                className="mr-2 align-middle"
              />
            ) : null,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
