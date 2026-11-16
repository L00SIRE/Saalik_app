import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { ThreeHeritageTwin } from "@/components/three/ThreeHeritageTwin";
import { loadTwinData } from "@/lib/twin/twinData";

export default function DigitalTwinPage() {
  return (
    <>
      <PageHeader
        title="3D Heritage Digital Twin"
        description="Procedural models of every monument in a zone, generated from the heritage seed with no external 3D assets. Use it to plan field photography before travelling."
      />
      <Panel
        title="Sun, shadows and capture cameras"
        description="Drag the December–January sun to see where shadows fall, which of the five field-capture cameras are front-lit, and which neighbours inside the 150 m candidate radius the vector index could confuse."
      >
        <ThreeHeritageTwin data={loadTwinData()} />
      </Panel>
    </>
  );
}
