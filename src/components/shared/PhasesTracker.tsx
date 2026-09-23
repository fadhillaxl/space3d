'use client';

import { useState } from 'react';

export interface PhaseItem {
  id: string;
  meta: string;
  title: string;
  text: string;
}

interface PhasesTrackerProps {
  phases: PhaseItem[];
}

export default function PhasesTracker({ phases }: PhasesTrackerProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (!phases.length) return null;
  const current = phases[activeIdx] || phases[0];

  return (
    <div className="phases">
      <div className="phases__track" role="tablist">
        {phases.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={activeIdx === i}
            onClick={() => setActiveIdx(i)}
          >
            {p.title}
          </button>
        ))}
      </div>
      <div className="phases__body" role="tabpanel">
        <span className="phases__meta">{current.meta}</span>
        <h4>{current.title}</h4>
        <p>{current.text}</p>
      </div>
    </div>
  );
}
