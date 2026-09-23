'use client';

import { useEffect, useState } from 'react';

export interface NavChip {
  id: string;
  label: string;
}

interface QuickNavProps {
  chips: NavChip[];
}

export default function QuickNav({ chips }: QuickNavProps) {
  const [activeId, setActiveId] = useState<string>(chips[0]?.id || '');

  useEffect(() => {
    if (!chips.length) return;

    const targets = chips
      .map((c) => document.getElementById(c.id))
      .filter((el): el is HTMLElement => el !== null);

    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setActiveId(e.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 }
    );

    targets.forEach((t) => io.observe(t));

    return () => io.disconnect();
  }, [chips]);

  return (
    <nav className="quicknav" aria-label="Navigasi cepat halaman">
      <div className="wrap">
        <div className="quicknav__chips">
          {chips.map((chip) => (
            <a
              key={chip.id}
              href={`#${chip.id}`}
              className={activeId === chip.id ? 'is-active' : ''}
              aria-current={activeId === chip.id ? 'true' : undefined}
            >
              {chip.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
