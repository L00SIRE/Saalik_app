"use client";

import { useMemo, useState } from "react";
import type { AlertRecord, ZoneRecord } from "@/lib/types";
import { SeverityBadge } from "@/components/StatusBadge";

interface AlertConsoleProps {
  initialAlerts: AlertRecord[];
  zones: ZoneRecord[];
}

const emptyDraft = {
  severity: "advisory" as AlertRecord["severity"],
  category: "MONSOON_FLOOD",
  title: "",
  body: "",
  zoneId: "",
  audience: "tourists,site_managers",
};

export function AlertConsole({ initialAlerts, zones }: AlertConsoleProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [draft, setDraft] = useState({ ...emptyDraft, zoneId: zones[0]?.zoneId ?? "" });
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const visible = useMemo(() => {
    if (filter === "active") return alerts.filter((a) => a.active);
    if (filter === "inactive") return alerts.filter((a) => !a.active);
    return alerts;
  }, [alerts, filter]);

  function broadcast() {
    if (!draft.title.trim() || !draft.body.trim() || !draft.zoneId) return;
    const zone = zones.find((z) => z.zoneId === draft.zoneId);
    const now = new Date();
    const expires = new Date(now.getTime() + 36 * 60 * 60 * 1000);
    const next: AlertRecord = {
      id: `alert_live_${now.getTime()}`,
      severity: draft.severity,
      category: draft.category,
      title: draft.title.trim(),
      body: draft.body.trim(),
      zones: [draft.zoneId],
      geofenceIds: [`${draft.zoneId}_ops_ring`],
      active: true,
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      audience: draft.audience.split(",").map((s) => s.trim()).filter(Boolean),
    };
    setAlerts((prev) => [next, ...prev]);
    setDraft({ ...emptyDraft, zoneId: zone?.zoneId ?? zones[0]?.zoneId ?? "" });
  }

  function toggleActive(id: string) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
  }

  return (
    <div className="twoCol">
      <div className="panel">
        <div className="panelHeader">
          <div>
            <h2>Admin Broadcast Console</h2>
            <p>Compose geofenced advisories for monsoon routes, festival crowds, and Unseen Sites campaigns.</p>
          </div>
        </div>
        <div className="panelBody">
          <div className="formGrid">
            <div className="field">
              <label htmlFor="severity">Severity</label>
              <select
                id="severity"
                value={draft.severity}
                onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value as AlertRecord["severity"] }))}
              >
                <option value="info">Info</option>
                <option value="advisory">Advisory</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              >
                <option value="MONSOON_FLOOD">Monsoon / Flood</option>
                <option value="FESTIVAL_CROWD">Festival Crowd</option>
                <option value="DISPERSION_CAMPAIGN">Dispersion Campaign</option>
                <option value="DRILL">Preparedness Drill</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="zone">Target zone</label>
              <select id="zone" value={draft.zoneId} onChange={(e) => setDraft((d) => ({ ...d, zoneId: e.target.value }))}>
                {zones.map((z) => (
                  <option key={z.zoneId} value={z.zoneId}>
                    {z.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="audience">Audience (comma-separated)</label>
              <input
                id="audience"
                value={draft.audience}
                onChange={(e) => setDraft((d) => ({ ...d, audience: e.target.value }))}
              />
            </div>
            <div className="field fieldFull">
              <label htmlFor="title">Alert title</label>
              <input
                id="title"
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="e.g. Temporary one-way circuit at Taumadhi Square"
              />
            </div>
            <div className="field fieldFull">
              <label htmlFor="body">Message body</label>
              <textarea
                id="body"
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                placeholder="Include route alternatives, geofence rationale, and guide handoff instructions."
              />
            </div>
          </div>
          <div className="btnRow">
            <button type="button" className="btn btnPrimary" onClick={broadcast}>
              Broadcast to geofence
            </button>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={() => setDraft({ ...emptyDraft, zoneId: zones[0]?.zoneId ?? "" })}
            >
              Clear draft
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panelHeader">
          <div>
            <h2>Live Alert Feed</h2>
            <p>{alerts.filter((a) => a.active).length} active · {alerts.length} total in console memory</p>
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter alerts">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="panelBody">
          {visible.map((alert) => {
            const zoneNames = alert.zones
              .map((id) => zones.find((z) => z.zoneId === id)?.nameEn ?? id)
              .join(", ");
            return (
              <article key={alert.id} className="alertItem">
                <div className="alertTop">
                  <SeverityBadge severity={alert.severity} />
                  <span className="badge badgeInfo">{alert.category.replaceAll("_", " ")}</span>
                  <span className={`badge ${alert.active ? "badgeReady" : "badgeGap"}`}>
                    {alert.active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <h3>{alert.title}</h3>
                <p>{alert.body}</p>
                <div className="tagRow">
                  <span className="tag">{zoneNames}</span>
                  {alert.geofenceIds.map((g) => (
                    <span key={g} className="tag mono">
                      {g}
                    </span>
                  ))}
                  {alert.audience.map((a) => (
                    <span key={a} className="tag">
                      {a}
                    </span>
                  ))}
                </div>
                <div className="btnRow">
                  <button type="button" className="btn btnSecondary" onClick={() => toggleActive(alert.id)}>
                    {alert.active ? "Deactivate" : "Reactivate"}
                  </button>
                  <span className="small muted">
                    Issued {new Date(alert.issuedAt).toLocaleString("en-NP")} · Expires{" "}
                    {new Date(alert.expiresAt).toLocaleString("en-NP")}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
