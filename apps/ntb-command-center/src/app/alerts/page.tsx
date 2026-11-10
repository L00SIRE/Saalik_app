import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { AlertConsole } from "@/components/AlertConsole";
import { getAlerts, getMonuments, getZones } from "@/lib/data";

export default function AlertsPage() {
  const alerts = getAlerts();
  const zones = getZones();
  const monuments = getMonuments();
  const active = alerts.filter((a) => a.active).length;
  const critical = alerts.filter((a) => a.severity === "critical" && a.active).length;
  const geofences = new Set(alerts.flatMap((a) => a.geofenceIds)).size;
  const monsoonLinked = alerts.filter((a) => a.category === "MONSOON_FLOOD").length;

  const geofenceCatalog = monuments
    .filter((m) => m.geofenceRadiusM <= 80)
    .slice(0, 12)
    .map((m) => ({
      id: m.id,
      name: m.nameEn,
      zone: m.zoneName,
      radius: m.geofenceRadiusM,
      lat: m.lat,
      lng: m.lng,
    }));

  return (
    <>
      <PageHeader
        title="Crisis Preparedness & Geofenced Heritage Alerts"
        description="Administrative broadcast console for monsoon and flood route advisories, festival crowd management, and Unseen Sites campaign notices. Aligned with NTB digital agenda priorities for resilient heritage operations across Kathmandu Valley."
      />

      <div className="metricGrid">
        <MetricCard label="Active alerts" value={String(active)} hint={`${alerts.length} total in seed + console`} />
        <MetricCard label="Critical live" value={String(critical)} hint="Requires immediate site-manager acknowledgment" />
        <MetricCard label="Monsoon advisories" value={String(monsoonLinked)} hint="Flood corridor & approach-road notices" />
        <MetricCard label="Geofence IDs touched" value={String(geofences)} hint="Distinct heritage rings addressed" />
      </div>

      <AlertConsole initialAlerts={alerts} zones={zones} />

      <div className="twoCol">
        <Panel
          title="Geofence catalog (tight rings)"
          description="Monuments with ≤80m geofence radii suitable for fine-grained festival and flood messaging."
        >
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Monument</th>
                  <th>Zone</th>
                  <th>Radius</th>
                  <th>Centroid</th>
                </tr>
              </thead>
              <tbody>
                {geofenceCatalog.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <strong>{g.name}</strong>
                      <div className="small mono">{g.id}</div>
                    </td>
                    <td className="small">{g.zone}</td>
                    <td>{g.radius}m</td>
                    <td className="mono small">
                      {g.lat.toFixed(4)}, {g.lng.toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Preparedness playbook" description="Standard NTB / MoCTCA response lanes for heritage ops desks.">
          <div className="stackList">
            <article className="softCard">
              <h3>Monsoon / flood</h3>
              <p>
                Prioritize Bagmati approaches at Pashupatinath and low courtyards after extreme rainfall. Broadcast
                advisory → activate alternate pilgrim gates → notify licensed guides with reroute talking points.
              </p>
            </article>
            <article className="softCard">
              <h3>Festival crowd</h3>
              <p>
                When congestion index exceeds 0.85 in Durbar squares, enforce one-way pedestrian circuits, pause large
                group check-ins, and push Unseen Sites suggestions to nearby satellite towns.
              </p>
            </article>
            <article className="softCard">
              <h3>Drill hygiene</h3>
              <p>
                Tag all exercises as DRILL. Never leave drill alerts active past expiry. Log site-manager acknowledgments
                before closing the incident in the command center.
              </p>
            </article>
          </div>
        </Panel>
      </div>
    </>
  );
}
