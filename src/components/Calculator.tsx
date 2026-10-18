"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ASSUMPTION_LABELS,
  type Assumptions,
  CATEGORIES,
  type Category,
  DEFAULT_ASSUMPTIONS,
  MILESTONES,
  PRICES_CHECKED,
  SERVICES,
  type Stack,
  breakdown,
  compact,
  encodeState,
  money,
  total,
} from "@/lib/pricing";
import { CATEGORY_COLORS } from "./colors";


// Log-scale slider: position 0..1000 maps to 100..10M users.
const toUsers = (pos: number) => {
  const raw = 10 ** (2 + (5 * pos) / 1000);
  const mag = 10 ** Math.floor(Math.log10(raw) - 1);
  return Math.round(raw / mag) * mag;
};
const toPos = (users: number) => ((Math.log10(users) - 2) / 5) * 1000;

type Props = { initialStack: Stack; initialUsers: number; initialAssumptions: Assumptions };

export default function Calculator({ initialStack, initialUsers, initialAssumptions }: Props) {
  const [stack, setStack] = useState<Stack>(initialStack);
  const [users, setUsers] = useState(initialUsers);
  const [a, setA] = useState<Assumptions>(initialAssumptions);
  const [copied, setCopied] = useState(false);

  const query = encodeState(stack, users, a);
  useEffect(() => {
    window.history.replaceState(null, "", `?${query}`);
  }, [query]);

  const rows = useMemo(() => breakdown(stack, users, a), [stack, users, a]);
  const sum = rows.reduce((s, r) => s + r.cost, 0);
  const biggest = rows.reduce<(typeof rows)[number] | null>(
    (top, r) => (!top || r.cost > top.cost ? r : top),
    null,
  );

  const shareUrl = () => `${window.location.origin}/?${query}`;
  const open = (url: string) => window.open(url, "_blank", "noopener,noreferrer");
  const shareText = `My stack costs ${money(sum)}/mo at ${users.toLocaleString("en-US")} users${
    biggest && sum > 0 ? ` — ${biggest.service.name} is ${Math.round((biggest.cost / sum) * 100)}% of it` : ""
  }. What does yours cost?`;

  const pick = (cat: Category, id: string) =>
    setStack((s) => {
      const next = { ...s };
      if (s[cat] === id) delete next[cat];
      else next[cat] = id;
      return next;
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      {/* Left: inputs */}
      <section className="space-y-6">
        {CATEGORIES.map(({ id, label }) => (
          <div key={id}>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[id] }} />
              {label}
            </h3>
            <div className="flex flex-wrap gap-2">
              {SERVICES.filter((s) => s.category === id).map((s) => {
                const on = stack[id] === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => pick(id, s.id)}
                    title={s.note}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-line hover:border-foreground/40"
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Monthly active users</h3>
            <span className="font-mono text-lg font-semibold">{users.toLocaleString("en-US")}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            value={toPos(users)}
            onChange={(e) => setUsers(toUsers(Number(e.target.value)))}
            className="w-full accent-foreground"
            aria-label="Monthly active users"
          />
          <div className="flex justify-between font-mono text-xs text-muted">
            <span>100</span>
            <span>1K</span>
            <span>10K</span>
            <span>100K</span>
            <span>1M</span>
            <span>10M</span>
          </div>
        </div>

        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Usage assumptions <span className="text-muted">(tweak to match your app)</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.keys(ASSUMPTION_LABELS) as (keyof Assumptions)[]).map((key) => (
              <label key={key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">{ASSUMPTION_LABELS[key]}</span>
                <input
                  type="number"
                  min={0}
                  value={a[key]}
                  onChange={(e) => setA({ ...a, [key]: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-24 rounded-md border border-line bg-transparent px-2 py-1 text-right font-mono"
                />
              </label>
            ))}
          </div>
          <button
            onClick={() => setA(DEFAULT_ASSUMPTIONS)}
            className="mt-3 text-xs text-muted underline hover:text-foreground"
          >
            Reset to defaults
          </button>
        </details>
      </section>

      {/* Right: result card */}
      <aside className="h-fit space-y-5 rounded-2xl border border-line bg-card p-6 lg:sticky lg:top-6">
        <div>
          <p className="text-sm text-muted">Your stack at {users.toLocaleString("en-US")} users</p>
          <p className="font-mono text-5xl font-bold tracking-tight">
            {money(sum)}
            <span className="text-xl font-normal text-muted">/mo</span>
          </p>
          {biggest && sum > 0 && (
            <p className="mt-1 text-sm">
              Biggest cost: <strong>{biggest.service.name}</strong> (
              {Math.round((biggest.cost / sum) * 100)}%)
            </p>
          )}
        </div>

        {sum > 0 && (
          <div className="flex h-3 overflow-hidden rounded-full">
            {rows.map(({ service, cost }) => (
              <div
                key={service.id}
                style={{ width: `${(cost / sum) * 100}%`, background: CATEGORY_COLORS[service.category] }}
                title={`${service.name}: ${money(cost)}`}
              />
            ))}
          </div>
        )}

        <ul className="space-y-1.5 text-sm">
          {rows.map(({ service, cost }) => (
            <li key={service.id} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[service.category] }} />
                <a href={service.url} target="_blank" rel="noreferrer" className="hover:underline" title={service.note}>
                  {service.name}
                </a>
              </span>
              <span className="font-mono">{money(cost)}</span>
            </li>
          ))}
          {rows.length === 0 && <li className="text-muted">Pick at least one service.</li>}
        </ul>

        <div className="border-t border-line pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">As you grow</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            {MILESTONES.map((m) => (
              <button
                key={m}
                onClick={() => setUsers(m)}
                className="rounded-lg border border-line px-1 py-2 hover:border-foreground/40"
              >
                <div className="text-xs text-muted">{compact(m)}</div>
                <div className="font-mono text-sm font-semibold">{money(total(stack, m, a))}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            onClick={() =>
              open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl())}`)
            }
            className="rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background"
          >
            Share on LinkedIn
          </button>
          <button
            onClick={() =>
              open(
                `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl())}`,
              )
            }
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium"
          >
            Post on X
          </button>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(`${shareText}\n${shareUrl()}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <p className="text-xs text-muted">
          Estimates from public pricing (checked {PRICES_CHECKED}). Hover a service for what&apos;s included. Taxes,
          seats and discounts not included.
        </p>
      </aside>
    </div>
  );
}
