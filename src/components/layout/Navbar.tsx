'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

const NAV_ITEMS = [
  { href: '/', label: 'Pusat Edukasi', badge: 'Hub' },
  { href: '/discovery', label: 'Discovery', tag: 'USA', color: 'var(--usa)' },
  { href: '/buran', label: 'Buran', tag: 'USSR', color: 'var(--ussr)' },
  { href: '/satria-1', label: 'SATRIA-1', tag: 'IDN', color: 'var(--geo)' },
  { href: '/cubesat', label: 'CubeSat', tag: 'EDU', color: 'var(--nano)' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className={styles.topbar}>
      <div className={`wrap ${styles.wrapIn}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandDot} />
          <span className={styles.brandText}>SPACE<b>3D</b></span>
          <span className={styles.brandSub}>Edu Antariksa</span>
        </Link>

        <nav className={styles.navLinks}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                {item.tag && (
                  <span
                    className={styles.missionTag}
                    style={{ borderColor: item.color, color: item.color }}
                  >
                    {item.tag}
                  </span>
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.rightActions}>
          <div className={styles.statusLive}>
            <span className={styles.livePulse} />
            <span className={styles.liveText}>PWA Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}
