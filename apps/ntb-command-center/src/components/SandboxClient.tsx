"use client";

import { useMemo, useState } from "react";
import type { MonumentRecord, SandboxQuery } from "@/lib/types";
import { loreCategoryLabel } from "@/lib/data";

const PALETTES = [
  "linear-gradient(145deg, #1f4034, #3a6b55 45%, #8a4a32)",
  "linear-gradient(145deg, #2f343a, #5c6570 40%, #a85a3c)",
  "linear-gradient(145deg, #163028, #4f575f 50%, #c46d4a)",
  "linear-gradient(145deg, #234a3a, #7a5a3a 55%, #a8844f)",
  "linear-gradient(145deg, #1c2f28, #6b4a38 48%, #d4b67a)",
  "linear-gradient(145deg, #24362f, #3d5a73 42%, #8a4a32)",
  "linear-gradient(145deg, #10241c, #2a5443 50%, #b7791f)",
  "linear-gradient(145deg, #1b2e27, #5a6460 46%, #c4784a)",
];

interface SandboxClientProps {
  queries: SandboxQuery[];
  monuments: MonumentRecord[];
}

export function SandboxClient({ queries, monuments }: SandboxClientProps) {
  const [activeId, setActiveId] = useState(queries[0]?.queryMonumentId ?? "");

  const active = useMemo(
    () => queries.find((q) => q.queryMonumentId === activeId) ?? queries[0],
    [queries, activeId],
  );

  const monument = useMemo(
    () => monuments.find((m) => m.id === active?.queryMonumentId),
    [monuments, active],
  );

  if (!active || !monument) {
    return <p className="muted">No sandbox monuments available.</p>;
  }

  return (
    <div className="splitSandbox">
      <div className="stackList">
        <div className="panel">
          <div className="panelHeader">
            <div>
              <h2>Monument Photo Queries</h2>
              <p>Select a seeded field capture from each of the eight valley zones.</p>
            </div>
          </div>
          <div className="panelBody">
            <div className="photoGrid">
              {queries.map((q, index) => {
                const m = monuments.find((item) => item.id === q.queryMonumentId);
                const selected = q.queryMonumentId === active.queryMonumentId;
                return (
                  <button
                    key={q.queryMonumentId}
                    type="button"
                    className={`photoTile${selected ? " photoTileActive" : ""}`}
                    onClick={() => setActiveId(q.queryMonumentId)}
                  >
                    <div className="photoArt" style={{ background: PALETTES[index % PALETTES.length] }}>
                      {m?.nameEn ?? q.queryMonumentId}
                    </div>
                    <div className="photoCaption">
                      <strong>{q.photoLabel}</strong>
                      <span>{m?.zoneName}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div>
              <h2>Cosine Similarity Ranking</h2>
              <p>
                Query vector vs reference gallery for <strong>{monument.nameEn}</strong>. Top hit should resolve to the
                same monument with hierarchical lore citations.
              </p>
            </div>
          </div>
          <div className="panelBody">
            {active.matches.map((match) => (
              <div key={`${match.monumentId}-${match.cosineSimilarity}`} className="simRow">
                <div>
                  <strong style={{ fontSize: "0.88rem" }}>{match.nameEn}</strong>
                  <div className="small muted mono">{match.monumentId}</div>
                  <div className="barTrack" style={{ marginTop: 6 }}>
                    <div
                      className={`barFill${match.monumentId === active.queryMonumentId ? "" : " barFillBrick"}`}
                      style={{ width: `${Math.max(8, match.cosineSimilarity * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 650, color: "var(--forest-800)" }}>
                  {match.cosineSimilarity.toFixed(4)}
                </div>
              </div>
            ))}
            <p className="small muted" style={{ marginTop: "0.75rem" }}>
              Disambiguation tip: {monument.disambiguationTip}
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div>
              <h2>Hierarchical RAG Citations</h2>
              <p>Node path zone → monument → lore category with source registry IDs.</p>
            </div>
          </div>
          <div className="panelBody">
            <div className="citationList">
              {active.topCitations.map((cite) => (
                <article key={cite.nodePath} className="citationItem">
                  <strong>{cite.title}</strong>
                  <span className="mono">
                    {cite.nodePath} · {loreCategoryLabel(cite.category)} · {cite.confidence} · sources:{" "}
                    {cite.sourceIds.join(", ")}
                  </span>
                  <p>{cite.excerpt}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panelHeader">
          <div>
            <h2>Tourist Mobile Preview</h2>
            <p>Side-by-side pitch surface mirroring the Saalik scan → narrate → hire-guide flow.</p>
          </div>
        </div>
        <div className="panelBody">
          <div className="mobileFrame">
            <div className="mobileNotch" />
            <div className="mobileScreen">
              <div
                className="mobileHero"
                style={{
                  background: PALETTES[queries.findIndex((q) => q.queryMonumentId === active.queryMonumentId) % PALETTES.length],
                }}
              >
                <div>
                  <strong>{active.mobilePreview.headline}</strong>
                  <div style={{ fontSize: "0.82rem", opacity: 0.9, marginTop: 4 }}>{active.mobilePreview.headlineNe}</div>
                </div>
              </div>
              <div className="mobileBody">
                <div className="chip" style={{ alignSelf: "flex-start" }}>
                  Match {(active.matches[0]?.cosineSimilarity ?? 0).toFixed(3)} · {monument.dynasty}
                </div>
                <h3>Audio hook</h3>
                <p>{active.mobilePreview.audioHook}</p>
                <h3>नेपाली सार</h3>
                <p>{active.mobilePreview.nepaliSummary}</p>
                <div className="small muted">Suggested dwell · {active.mobilePreview.dwellSuggestionMin} minutes</div>
                <div className="mobileCta">{active.mobilePreview.guideCta}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
