import type { AlertSeverity, Designation, RagStatus } from "@/lib/types";

export function DesignationBadge({ designation }: { designation: Designation }) {
  const unesco = designation === "UNESCO_MONUMENT_ZONE";
  return <span className={`badge ${unesco ? "badgeUnesco" : "badgeSatellite"}`}>{unesco ? "UNESCO" : "Satellite"}</span>;
}

export function RagBadge({ status }: { status: RagStatus }) {
  const cls = status === "ready" ? "badgeReady" : status === "partial" ? "badgePartial" : "badgeGap";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const map: Record<AlertSeverity, string> = {
    info: "badgeInfo",
    advisory: "badgeAdvisory",
    warning: "badgeWarning",
    critical: "badgeCritical",
  };
  return <span className={`badge ${map[severity]}`}>{severity}</span>;
}
