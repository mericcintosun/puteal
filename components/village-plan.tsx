"use client";

import { useMemo, type MouseEvent } from "react";
import type { Pt, Village, Well } from "@/lib/data";
import { boundsOf, type Solution } from "@/lib/engine";
import { cn } from "@/lib/utils";

interface VillagePlanProps {
  village: Village;
  wells: Well[];
  solution: Solution;
  showLines?: boolean;
  route?: Pt[];
  selected?: number | null;
  onPick?: (p: Pt) => void;
  onHouse?: (index: number) => void;
  label: string;
  className?: string;
}

const PAD = 70;

/** The live village plan: footpaths, households, wells and who walks where. */
export function VillagePlan({ village, wells, solution, showLines = true, route, selected, onPick, onHouse, label, className }: VillagePlanProps) {
  const b = useMemo(() => boundsOf(village), [village]);
  const W = b.maxX - b.minX + PAD * 2;
  const H = b.maxY - b.minY + PAD * 2;
  const X = (p: Pt) => p.x - b.minX + PAD;
  const Y = (p: Pt) => b.maxY - p.y + PAD;
  const wellById = useMemo(() => new Map(wells.map((w) => [w.id, w])), [wells]);

  function handleClick(e: MouseEvent<SVGSVGElement>) {
    if (!onPick) return;
    const ctm = e.currentTarget.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    onPick({ x: pt.x + b.minX - PAD, y: b.maxY + PAD - pt.y });
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      onClick={handleClick}
      className={cn("block w-full select-none", onPick && "cursor-crosshair", className)}
    >
      <rect width={W} height={H} className="fill-card" />

      <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-border" strokeWidth={12}>
        {village.paths.map((p) => (
          <polyline key={p.id} points={p.pts.map((q) => `${X(q)},${Y(q)}`).join(" ")} />
        ))}
      </g>

      {village.hamlets.length > 1 &&
        village.hamlets.map((h) => (
          <text key={h.id} x={X(h.center)} y={Y(h.center) - h.spread - 18} textAnchor="middle" fontSize={30} className="fill-muted-foreground">
            {h.name}
          </text>
        ))}

      {showLines && (
        <g strokeWidth={3}>
          {village.households.map((h, i) => {
            const a = solution.assign[i];
            const w = a?.wellId ? wellById.get(a.wellId) : undefined;
            if (!w) return null;
            return (
              <line
                key={h.id}
                x1={X(h.pos)}
                y1={Y(h.pos)}
                x2={X(w.pos)}
                y2={Y(w.pos)}
                className={a.far ? "stroke-bad" : "stroke-ok"}
                strokeOpacity={a.far ? 0.85 : 0.45}
                strokeDasharray={a.far ? "10 10" : undefined}
              />
            );
          })}
        </g>
      )}

      {route && route.length > 1 && (
        <polyline
          points={route.map((q) => `${X(q)},${Y(q)}`).join(" ")}
          fill="none"
          className="stroke-primary"
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      <g>
        {village.households.map((h, i) => {
          const a = solution.assign[i];
          return (
            <rect
              key={h.id}
              x={X(h.pos) - 8}
              y={Y(h.pos) - 8}
              width={16}
              height={16}
              className={cn(selected === i ? "fill-primary" : a?.far ? "fill-bad" : "fill-foreground", onHouse && "cursor-pointer")}
              fillOpacity={selected === i ? 1 : 0.8}
              onClick={
                onHouse
                  ? (e) => {
                      e.stopPropagation();
                      onHouse(i);
                    }
                  : undefined
              }
            >
              <title>{`${h.label}: ${a?.far ? "more than 500 m from a safe well" : "within 500 m of a safe well"}`}</title>
            </rect>
          );
        })}
      </g>

      <g>
        {wells.map((w) => {
          const st = solution.state[w.id];
          const load = solution.load[w.id] ?? 0;
          const pct = load / w.capacity;
          return (
            <g key={w.id}>
              {st !== "unsafe" && pct > 1 && <circle cx={X(w.pos)} cy={Y(w.pos)} r={36} fill="none" className="stroke-warn" strokeWidth={8} />}
              {st !== "unsafe" && pct >= 0.9 && pct <= 1 && (
                <circle cx={X(w.pos)} cy={Y(w.pos)} r={34} fill="none" className="stroke-warn" strokeWidth={4} strokeDasharray="8 6" />
              )}
              <circle
                cx={X(w.pos)}
                cy={Y(w.pos)}
                r={st === "proposed" ? 24 : 20}
                className={cn(st === "safe" && "fill-ok", st === "unsafe" && "fill-bad", st === "proposed" && "fill-primary", "stroke-background")}
                strokeWidth={5}
              >
                <title>{`${w.name}: ${w.scenario ? "proposed deep well" : `${w.arsenic} µg/L`}, ${Math.round(load)} of ${w.capacity} people`}</title>
              </circle>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** Legend for the plan and the map, drawn with the same tokens. */
export function PlanLegend({ className }: { className?: string }) {
  const item = "inline-flex items-center gap-1.5";
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground", className)}>
      <li className={item}>
        <svg width="10" height="10" aria-hidden="true">
          <rect width="10" height="10" className="fill-foreground" />
        </svg>
        household
      </li>
      <li className={item}>
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="5" className="fill-ok" />
        </svg>
        safe well
      </li>
      <li className={item}>
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="5" className="fill-bad" />
        </svg>
        over the limit
      </li>
      <li className={item}>
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="5" className="fill-primary" />
        </svg>
        proposed deep well
      </li>
      <li className={item}>
        <svg width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="5" fill="none" className="stroke-warn" strokeWidth="2" />
        </svg>
        at or over capacity
      </li>
      <li className={item}>
        <svg width="18" height="6" aria-hidden="true">
          <line x1="0" y1="3" x2="18" y2="3" className="stroke-bad" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
        walk over 500 m
      </li>
    </ul>
  );
}
