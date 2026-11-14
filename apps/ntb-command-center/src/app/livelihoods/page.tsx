import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { formatNpr, formatNumber } from "@/lib/data";
import { loadLiveDashboard } from "@/lib/live";

export default async function LivelihoodsPage() {
  const live = await loadLiveDashboard();
  const guides = live.guides;
  const zones = live.zones;
  const totalScans = guides.reduce((s, g) => s + g.scansAttributed7d, 0);
  const totalBookings = guides.reduce((s, g) => s + g.walkingToursBooked7d, 0);
  const totalTips = guides.reduce((s, g) => s + g.tipRevenueNpr7d, 0);
  const totalFees = guides.reduce((s, g) => s + g.tourFeeRevenueNpr7d, 0);
  const avgConversion = guides.reduce((s, g) => s + g.bookingConversionRate, 0) / Math.max(guides.length, 1);

  const byBody = ["NTB", "TAAN"].map((body) => {
    const rows = guides.filter((g) => g.credentialBody === body);
    return {
      body,
      count: rows.length,
      revenue: rows.reduce((s, g) => s + g.tipRevenueNpr7d + g.tourFeeRevenueNpr7d, 0),
      bookings: rows.reduce((s, g) => s + g.walkingToursBooked7d, 0),
    };
  });

  const zoneAttribution = zones.map((zone) => {
    const related = guides.filter((g) => g.zonesServed.includes(zone.zoneId));
    const share = related.reduce((s, g) => s + g.tourFeeRevenueNpr7d + g.tipRevenueNpr7d, 0) / Math.max(related.length, 1);
    return {
      zone,
      guideCount: related.length,
      avgRevenue: Math.round(share || 0),
    };
  });

  const ranked = [...guides].sort(
    (a, b) => b.tipRevenueNpr7d + b.tourFeeRevenueNpr7d - (a.tipRevenueNpr7d + a.tourFeeRevenueNpr7d),
  );

  return (
    <>
      <PageHeader
        title="Local Guide Economic Impact & Livelihood Tracker"
        description="Quantifies how AI monument scans convert into walking-tour bookings and tip revenue for licensed local guides trained under NTB and TAAN digital tourism programs. Designed for B2G reporting on inclusive heritage livelihoods."
      />

      <div className="metricGrid">
        <MetricCard label="Attributed scans · 7d" value={formatNumber(totalScans)} hint="Scan events linked to guide handoff prompts" />
        <MetricCard
          label="Walking tours booked"
          value={formatNumber(totalBookings)}
          hint={`${(avgConversion * 100).toFixed(1)}% mean conversion`}
        />
        <MetricCard label="Tour fee revenue" value={formatNpr(totalFees)} hint="Licensed guide tour packages" />
        <MetricCard label="Tip revenue" value={formatNpr(totalTips)} hint="Post-tour gratitude economy" />
      </div>

      <div className="twoCol">
        <Panel title="Credential body performance" description="NTB vs TAAN licensed cohort outcomes this week.">
          <div className="gridCards">
            {byBody.map((row) => (
              <article key={row.body} className="softCard">
                <h3>{row.body}</h3>
                <p>
                  {row.count} guides · {row.bookings} bookings · {formatNpr(row.revenue)} combined revenue
                </p>
                <div className="barTrack" style={{ marginTop: 10 }}>
                  <div
                    className={row.body === "NTB" ? "barFill" : "barFill barFillBrick"}
                    style={{ width: `${Math.min(100, (row.revenue / Math.max(totalFees + totalTips, 1)) * 100)}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: "0.85rem" }}>
            Conversion funnel: tourist scans monument → bilingual audio hook ends with hire-guide prompt → licensed guide
            accepts walking-tour booking → tip recorded after tour closeout.
          </p>
        </Panel>

        <Panel title="Zone livelihood coverage" description="Average guide revenue where the zone appears in a guide’s service area.">
          <div className="stackList">
            {zoneAttribution.map(({ zone, guideCount, avgRevenue }) => (
              <div key={zone.zoneId} className="zoneRow">
                <div className="zoneMeta">
                  <strong>{zone.nameEn.replace(/ \(.*\)/, "")}</strong>
                  <span>{guideCount} guides serving</span>
                </div>
                <div>
                  <div className="barTrack">
                    <div
                      className="barFill barFillBrass"
                      style={{ width: `${Math.min(100, (avgRevenue / 120000) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 650 }}>
                  {formatNpr(avgRevenue)}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Guide roster & conversion ledger" description="Full licensed cohort with languages, zones, and livelihood index.">
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Guide</th>
                <th>License</th>
                <th>Languages</th>
                <th>Zones served</th>
                <th>Scans</th>
                <th>Conv.</th>
                <th>Bookings</th>
                <th>Fees</th>
                <th>Tips</th>
                <th>Index</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((guide) => (
                <tr key={guide.id}>
                  <td>
                    <strong>{guide.name}</strong>
                    <div className="small muted">{guide.homeBase}</div>
                  </td>
                  <td>
                    <span className="badge badgeUnesco">{guide.credentialBody}</span>
                    <div className="small mono">{guide.licenseId}</div>
                  </td>
                  <td className="small">{guide.languages.join(", ")}</td>
                  <td className="small">
                    {guide.zonesServed
                      .map((id) => zones.find((z) => z.zoneId === id)?.nameEn.replace(/ \(.*\)/, "").replace("Hidden Gems: ", "") ?? id)
                      .join(" · ")}
                  </td>
                  <td>{guide.scansAttributed7d}</td>
                  <td>{(guide.bookingConversionRate * 100).toFixed(1)}%</td>
                  <td>{guide.walkingToursBooked7d}</td>
                  <td>{formatNpr(guide.tourFeeRevenueNpr7d)}</td>
                  <td>{formatNpr(guide.tipRevenueNpr7d)}</td>
                  <td>
                    <strong>{guide.livelihoodIndex}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
