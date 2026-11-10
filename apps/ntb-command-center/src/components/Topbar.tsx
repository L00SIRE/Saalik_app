import { getOverview } from "@/lib/data";

export function Topbar() {
  const overview = getOverview();

  return (
    <header className="topbar">
      <div>
        <strong style={{ fontFamily: "var(--font-display)", color: "var(--forest-900)" }}>
          Kathmandu Valley Heritage Ops
        </strong>
        <div className="small muted" style={{ marginTop: 2 }}>
          Synced {new Date(overview.generatedAt).toLocaleString("en-NP", { timeZone: "Asia/Kathmandu" })} NPT
        </div>
      </div>
      <div className="topbarMeta">
        <span className="chip chipStrong">{overview.mode}</span>
        <span className="chip">{overview.corpusVersion}</span>
        <span className="chip">{overview.monumentCount} monuments</span>
        <span className="chip">{overview.activeAlerts} active alerts</span>
      </div>
    </header>
  );
}
