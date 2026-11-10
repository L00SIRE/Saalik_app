interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <article className="metricCard">
      <div className="metricLabel">{label}</div>
      <div className="metricValue">{value}</div>
      {hint ? <div className="metricHint">{hint}</div> : null}
    </article>
  );
}
