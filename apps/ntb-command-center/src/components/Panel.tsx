import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, description, action, children }: PanelProps) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="panelBody">{children}</div>
    </section>
  );
}
