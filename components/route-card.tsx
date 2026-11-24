"use client";

import { Printer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Household, Well } from "@/lib/data";
import { fmtMeters, kitReading, walkMinutes, type Assignment } from "@/lib/engine";

interface RouteCardProps {
  household: Household;
  hamletName: string;
  villageName: string;
  assignment: Assignment;
  well: Well | undefined;
  nearest: Well | undefined;
  threshold: number;
  onClose: () => void;
}

function testedLabel(w: Well): string {
  if (w.scenario) return "proposed, not yet drilled";
  const d = new Date(`${w.testedOn}T00:00:00Z`);
  return `tested ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`;
}

/** The printable household route card. Print hides everything else on the page. */
export function RouteCard({ household, hamletName, villageName, assignment, well, nearest, threshold, onClose }: RouteCardProps) {
  return (
    <Card className="puteal-print">
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Route card for household {household.label}</CardTitle>
          <CardDescription>
            {hamletName}, {villageName} · about {household.people} people
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close route card" className="puteal-noprint -mr-2 -mt-1 h-7 w-7">
          <X />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        {!well ? (
          <p>
            No well passes the {threshold} µg/L limit within reach of this house. It needs a new source: drop a deep well nearby and
            watch the card update.
          </p>
        ) : (
          <>
            <p className="text-base">
              Walk <strong>{fmtMeters(assignment.meters)}</strong> {assignment.network ? "along the footpaths" : "across open ground"} to the{" "}
              <strong>{well.name}</strong>, about {walkMinutes(assignment.meters)} minutes each way.
            </p>
            <p className="flex flex-wrap items-center gap-2 text-muted-foreground">
              {well.scenario ? (
                <Badge variant="default">proposed deep well</Badge>
              ) : (
                <Badge variant="ok">{well.arsenic} µg/L, kit reads {kitReading(well.arsenic)}</Badge>
              )}
              <span>
                {well.depthM} m deep, {testedLabel(well)}
              </span>
            </p>
            {assignment.choice > 0 && nearest && (
              <p className="text-muted-foreground">
                The {nearest.name} is closer, but it already serves its limit of {nearest.capacity} people, so this family is sent on to
                the next safe pump.
              </p>
            )}
            {assignment.over && (
              <p className="text-warn">Every pump in reach is full. This household is listed on its nearest well, over the cap.</p>
            )}
            {assignment.far && <p className="text-bad">This walk is longer than 500 m. Flag the house for a new well.</p>}
            {!assignment.network && (
              <p className="text-xs text-muted-foreground">No mapped footpath connects this house, so the distance is the straight line times 1.3.</p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="puteal-noprint">
        <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!well}>
          <Printer /> Print card
        </Button>
      </CardFooter>
    </Card>
  );
}
