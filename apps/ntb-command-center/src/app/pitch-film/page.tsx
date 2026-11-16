import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { AnimatedPitchFilm } from "@/components/pitch-film/AnimatedPitchFilm";
import { loadBenchmarkSummary } from "@/lib/benchmark";

export default function PitchFilmPage() {
  return (
    <>
      <PageHeader
        title="NTB Pitch Film"
        description="A ninety-second animated story in five scenes, drawn in code. Accuracy and latency figures on screen come from the latest benchmark run; visitor and revenue figures are seeded demonstration data."
      />
      <Panel title="Ninety seconds, five scenes" description="Optional spoken narration and singing-bowl audio start when you press play.">
        <AnimatedPitchFilm benchmark={loadBenchmarkSummary()} />
      </Panel>
    </>
  );
}
