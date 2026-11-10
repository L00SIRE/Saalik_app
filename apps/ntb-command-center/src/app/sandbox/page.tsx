import { MetricCard } from "@/components/MetricCard";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { SandboxClient } from "@/components/SandboxClient";
import { getMonuments, getSandboxQueries } from "@/lib/data";

export default function SandboxPage() {
  const queries = getSandboxQueries();
  const monuments = getMonuments().filter((m) => queries.some((q) => q.queryMonumentId === m.id));
  const meanTop = queries.reduce((s, q) => s + (q.matches[0]?.cosineSimilarity ?? 0), 0) / Math.max(queries.length, 1);
  const citationCount = queries.reduce((s, q) => s + q.topCitations.length, 0);

  return (
    <>
      <PageHeader
        title="Live Interactive Vector Pitch Sandbox"
        description="Split-screen demonstration for government stakeholders: click a monument photo, inspect cosine similarity against the reference gallery, review hierarchical RAG citations, and preview the tourist mobile experience that ends with a licensed local guide prompt."
      />

      <div className="metricGrid">
        <MetricCard label="Zone photo queries" value={String(queries.length)} hint="One seeded capture per valley zone" />
        <MetricCard label="Mean top cosine" value={meanTop.toFixed(4)} hint="Self-match confidence across sandbox set" />
        <MetricCard label="RAG citations loaded" value={String(citationCount)} hint="History, architecture, iconography slices" />
        <MetricCard label="Mobile previews" value={String(queries.length)} hint="EN audio hook + NE summary handoff" />
      </div>

      <SandboxClient queries={queries} monuments={monuments} />

      <Panel
        title="Pitch talking points"
        description="Use this surface in NTB VIP Demo Mode to show retrieval quality without exposing raw vector tables."
      >
        <div className="threeCol">
          <article className="softCard">
            <h3>Visual retrieval</h3>
            <p>
              DINOv2 / SigLIP-style embeddings separate confusable Malla temples by roof tier, guardian vahanas, and
              courtyard context—even under monsoon overcast lighting.
            </p>
          </article>
          <article className="softCard">
            <h3>Hierarchical citations</h3>
            <p>
              Lore is retrieved as zone → monument → category nodes with source registry IDs suitable for MoCTCA
              editorial review and IRD heritage partners.
            </p>
          </article>
          <article className="softCard">
            <h3>Livelihood close</h3>
            <p>
              Every tourist preview ends with a hire-guide call-to-action, tying recognition accuracy directly to NTB/TAAN
              licensed walking-tour income.
            </p>
          </article>
        </div>
      </Panel>
    </>
  );
}
