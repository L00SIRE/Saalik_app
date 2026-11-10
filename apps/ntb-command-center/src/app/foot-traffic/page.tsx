import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { DesignationBadge } from "@/components/StatusBadge";
import { formatNumber, getHourlyScans, getZones } from "@/lib/data";

const ZONE_COLORS: Record<string, string> = {
  kathmandu_durbar: "#1f4034",
  patan_durbar: "#2a5443",
  bhaktapur_durbar: "#3a6b55",
  swayambhunath: "#4f575f",
  boudhanath: "#5c6570",
  pashupatinath: "#8a4a32",
  changu_narayan: "#a85a3c",
  hidden_gems_kirtipur_panauti_bungamati: "#c46d4a",
};

export default function FootTrafficPage() {
  const zones = getZones();
  const hourly = getHourlyScans();
  const unesco = zones.filter((z) => z.designation === "UNESCO_MONUMENT_ZONE");
  const satellite = zones.filter((z) => z.designation === "SATELLITE_HERITAGE_TOWNS");
  const unescoScans = unesco.reduce((s, z) => s + z.metrics.scansLast24h, 0);
  const satelliteScans = satellite.reduce((s, z) => s + z.metrics.scansLast24h, 0);
  const creatorVisits = zones.reduce((s, z) => s + z.metrics.unseenSitesCreatorVisits, 0);
  const maxHourTotal = Math.max(
    ...hourly.map((row) => zones.reduce((sum, z) => sum + Number(row[z.zoneId] ?? 0), 0)),
    1,
  );

  return (
    <>
      <PageHeader
        title="Tourist Foot-Traffic Dispersion Monitor"
        description="Scan density across congested UNESCO monument squares versus satellite heritage towns (Kirtipur, Bungamati, Panauti and peers). Supports NTB’s 200-Creator Unseen Sites initiative by quantifying where visitors concentrate and where dispersion campaigns should redirect attention."
      />

      <div className="metricGrid">
        <MetricCard label="UNESCO scans · 24h" value={formatNumber(unescoScans)} hint={`${unesco.length} monument zones`} />
        <MetricCard
          label="Satellite scans · 24h"
          value={formatNumber(satelliteScans)}
          hint="Hidden gems & ridge towns"
        />
        <MetricCard
          label="Concentration ratio"
          value={`${(unescoScans / Math.max(satelliteScans, 1)).toFixed(1)}×`}
          hint="UNESCO load relative to satellite towns"
        />
        <MetricCard
          label="Creator cohort visits"
          value={formatNumber(creatorVisits)}
          hint="Unseen Sites creator check-ins (7d window proxy)"
        />
      </div>

      <Panel
        title="Hourly scan stack · last 24h"
        description="Stacked zone contributions. Peak mid-morning and late afternoon mirror typical valley tour circuits."
      >
        <div className="legendRow" style={{ marginBottom: "0.85rem" }}>
          {zones.map((z) => (
            <span key={z.zoneId}>
              <span className="legendSwatch" style={{ background: ZONE_COLORS[z.zoneId] ?? "#7a828b" }} />
              {z.nameEn.replace(/ \(.*\)/, "").replace("Hidden Gems: ", "")}
            </span>
          ))}
        </div>
        <div className="chartBars" aria-hidden>
          {hourly.map((row) => {
            const segments = zones.map((z) => ({
              id: z.zoneId,
              value: Number(row[z.zoneId] ?? 0),
              color: ZONE_COLORS[z.zoneId] ?? "#7a828b",
            }));
            const total = segments.reduce((s, seg) => s + seg.value, 0);
            return (
              <div key={String(row.hour)} className="chartCol" title={`${row.hour}: ${total} scans`}>
                {segments.map((seg) => (
                  <div
                    key={seg.id}
                    className="chartSeg"
                    style={{
                      height: `${(seg.value / maxHourTotal) * 100}%`,
                      background: seg.color,
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
        <div className="chartLabels">
          {hourly.map((row) => (
            <span key={String(row.hour)}>{String(row.hour).slice(0, 2)}</span>
          ))}
        </div>
      </Panel>

      <div className="twoCol">
        <Panel title="Congested UNESCO squares" description="High congestion indexes indicate queueing pressure and weaker visitor experience quality.">
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Scans 24h</th>
                  <th>Congestion</th>
                  <th>Dispersion score</th>
                  <th>Avg dwell</th>
                </tr>
              </thead>
              <tbody>
                {unesco
                  .slice()
                  .sort((a, b) => b.metrics.congestionIndex - a.metrics.congestionIndex)
                  .map((zone) => (
                    <tr key={zone.zoneId}>
                      <td>
                        <strong>{zone.nameEn}</strong>
                        <div className="small muted">{zone.district}</div>
                      </td>
                      <td>{formatNumber(zone.metrics.scansLast24h)}</td>
                      <td>
                        <div className="barTrack" style={{ width: 110, display: "inline-block", verticalAlign: "middle" }}>
                          <div className="barFill" style={{ width: `${zone.metrics.congestionIndex * 100}%` }} />
                        </div>{" "}
                        {(zone.metrics.congestionIndex * 100).toFixed(0)}%
                      </td>
                      <td>{zone.metrics.dispersionScore.toFixed(2)}</td>
                      <td>{zone.metrics.avgDwellMinutes}m</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Satellite towns · Unseen Sites opportunity"
          description="Kirtipur, Bungamati, Panauti and peer towns absorb a fraction of valley scans despite rich monument density."
        >
          <div className="stackList">
            {satellite.map((zone) => (
              <article key={zone.zoneId} className="softCard">
                <div style={{ marginBottom: 6 }}>
                  <DesignationBadge designation={zone.designation} />
                </div>
                <h3>{zone.nameEn}</h3>
                <p>{zone.description}</p>
                <div className="tagRow">
                  <span className="tag">{formatNumber(zone.metrics.scansLast24h)} scans / 24h</span>
                  <span className="tag">Congestion {(zone.metrics.congestionIndex * 100).toFixed(0)}%</span>
                  <span className="tag">{zone.metrics.unseenSitesCreatorVisits} creator visits</span>
                  <span className="tag">{zone.monumentCount} monuments in seed</span>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="All-zone dispersion ledger" description="Unique visitor estimates and weekly scan totals for NTB planning desks.">
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Designation</th>
                <th>Unique visitors est.</th>
                <th>Scans 7d</th>
                <th>Walking tour</th>
                <th>Best start</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.zoneId}>
                  <td>
                    <strong>{zone.nameEn}</strong>
                    <div className="small muted">{zone.nameNe}</div>
                  </td>
                  <td>
                    <DesignationBadge designation={zone.designation} />
                  </td>
                  <td>{formatNumber(zone.metrics.uniqueVisitorsEst)}</td>
                  <td>{formatNumber(zone.metrics.scansLast7d)}</td>
                  <td>{zone.walkingTour.title}</td>
                  <td className="mono">{zone.walkingTour.bestStartTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
