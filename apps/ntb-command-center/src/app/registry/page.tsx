import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { DesignationBadge, RagBadge } from "@/components/StatusBadge";
import {
  angleLabel,
  formatNumber,
  getCaptureAngles,
  getMonuments,
  getOverview,
  getZones,
} from "@/lib/data";

export default function RegistryPage() {
  const monuments = getMonuments();
  const zones = getZones();
  const angles = getCaptureAngles();
  const overview = getOverview();

  const readyEn = monuments.filter((m) => m.embeddingHealth.ragStatusEn === "ready").length;
  const readyNe = monuments.filter((m) => m.embeddingHealth.ragStatusNe === "ready").length;
  const gapNe = monuments.filter((m) => m.embeddingHealth.ragStatusNe === "gap").length;
  const lowSeparation = monuments.filter((m) => m.embeddingHealth.vectorSeparationScore < 0.7).length;
  const fullAngle = monuments.filter((m) => m.embeddingHealth.meanAngleCoverage >= 0.9).length;

  const zoneHealth = zones.map((zone) => {
    const rows = monuments.filter((m) => m.zoneId === zone.zoneId);
    const meanSep =
      rows.reduce((s, m) => s + m.embeddingHealth.vectorSeparationScore, 0) / Math.max(rows.length, 1);
    const meanCov =
      rows.reduce((s, m) => s + m.embeddingHealth.meanAngleCoverage, 0) / Math.max(rows.length, 1);
    const bilingualReady = rows.filter(
      (m) => m.embeddingHealth.ragStatusEn === "ready" && m.embeddingHealth.ragStatusNe !== "gap",
    ).length;
    return { zone, meanSep, meanCov, bilingualReady, count: rows.length };
  });

  const priority = [...monuments]
    .sort((a, b) => {
      const score = (m: (typeof monuments)[number]) =>
        m.embeddingHealth.meanAngleCoverage * 0.4 +
        m.embeddingHealth.vectorSeparationScore * 0.35 +
        m.embeddingHealth.ragCompletenessNe * 0.25;
      return score(a) - score(b);
    })
    .slice(0, 12);

  const matrixSample = monuments
    .filter((m, index) => index % 4 === 0)
    .slice(0, 18);

  return (
    <>
      <PageHeader
        title="Digital Heritage Registry & Embedding Health Matrix"
        description="Multi-angle photo coverage, vector separation scores, and bilingual RAG readiness across the Saalik Nepal heritage corpus. Field teams use this matrix to prioritize capture days and lore verification before NTB VIP demos."
      />

      <div className="metricGrid">
        <MetricCard label="Cataloged monuments" value={formatNumber(overview.monumentCount)} hint={`${overview.zoneCount} zones represented`} />
        <MetricCard label="EN RAG ready" value={`${readyEn}/${overview.monumentCount}`} hint={`${Math.round((readyEn / overview.monumentCount) * 100)}% English lore complete`} />
        <MetricCard label="NE RAG ready" value={`${readyNe}/${overview.monumentCount}`} hint={`${gapNe} Nepali gaps remaining`} />
        <MetricCard label="Full 5-angle coverage" value={formatNumber(fullAngle)} hint={`${lowSeparation} monuments below 0.70 separation`} />
      </div>

      <Panel title="Zone embedding health" description="Mean angle coverage and vector separation aggregated per heritage zone.">
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Designation</th>
                <th>Monuments</th>
                <th>Mean angle coverage</th>
                <th>Mean separation</th>
                <th>Bilingual OK</th>
              </tr>
            </thead>
            <tbody>
              {zoneHealth.map(({ zone, meanSep, meanCov, bilingualReady, count }) => (
                <tr key={zone.zoneId}>
                  <td>
                    <strong>{zone.nameEn}</strong>
                    <div className="small muted">{zone.unescoReference ?? "Non-UNESCO satellite cluster"}</div>
                  </td>
                  <td>
                    <DesignationBadge designation={zone.designation} />
                  </td>
                  <td>{count}</td>
                  <td>
                    <div className="barTrack" style={{ width: 120, display: "inline-block", verticalAlign: "middle" }}>
                      <div className="barFill" style={{ width: `${meanCov * 100}%` }} />
                    </div>{" "}
                    {(meanCov * 100).toFixed(0)}%
                  </td>
                  <td className="matrixCell">{meanSep.toFixed(3)}</td>
                  <td>
                    {bilingualReady}/{count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Angle coverage × RAG matrix (sample)"
        description="Every monument requires ESTABLISHING_FRONT, LEFT_45, RIGHT_45, CLOSE_UP_ICONOGRAPHY, and WIDE_COURTYARD_CONTEXT reference vectors."
      >
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Monument</th>
                <th>Zone</th>
                {angles.map((angle) => (
                  <th key={angle}>{angleLabel(angle)}</th>
                ))}
                <th>Separation</th>
                <th>EN</th>
                <th>NE</th>
              </tr>
            </thead>
            <tbody>
              {matrixSample.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.nameEn}</strong>
                    <div className="small muted mono">{m.id}</div>
                  </td>
                  <td className="small">{m.zoneName.replace(/ \(.*\)/, "")}</td>
                  {angles.map((angle) => {
                    const v = m.embeddingHealth.angleCoverage[angle] ?? 0;
                    return (
                      <td key={angle} className="matrixCell">
                        <span
                          className="statusDot"
                          style={{
                            background: v >= 0.85 ? "var(--success)" : v >= 0.7 ? "var(--warning)" : "var(--danger)",
                          }}
                        />
                        {(v * 100).toFixed(0)}%
                      </td>
                    );
                  })}
                  <td className="matrixCell">{m.embeddingHealth.vectorSeparationScore.toFixed(3)}</td>
                  <td>
                    <RagBadge status={m.embeddingHealth.ragStatusEn} />
                  </td>
                  <td>
                    <RagBadge status={m.embeddingHealth.ragStatusNe} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="twoCol">
        <Panel title="Field capture priority queue" description="Lowest combined coverage / separation / Nepali completeness first.">
          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Monument</th>
                  <th>Verification</th>
                  <th>Coverage</th>
                  <th>Vectors</th>
                  <th>NE status</th>
                </tr>
              </thead>
              <tbody>
                {priority.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.nameEn}</strong>
                      <div className="small muted">
                        {m.monumentType.replaceAll("_", " ")} · {m.dynasty}
                      </div>
                    </td>
                    <td className="small">{m.verification.replaceAll("_", " ")}</td>
                    <td>{(m.embeddingHealth.meanAngleCoverage * 100).toFixed(0)}%</td>
                    <td>{m.embeddingHealth.referenceVectors}/5</td>
                    <td>
                      <RagBadge status={m.embeddingHealth.ragStatusNe} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Confusable monument pairs" description="Visual disambiguation tips from the seed corpus for retrieval QA.">
          <div className="stackList">
            {monuments
              .filter((m) => m.confusableWith.length > 0)
              .slice(0, 8)
              .map((m) => (
                <article key={m.id} className="softCard">
                  <h3>{m.nameEn}</h3>
                  <p>
                    Confusable with <span className="mono">{m.confusableWith.join(", ")}</span>
                  </p>
                  <p style={{ marginTop: 6 }}>{m.disambiguationTip}</p>
                </article>
              ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
