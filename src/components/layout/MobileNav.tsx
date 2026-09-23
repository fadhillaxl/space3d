'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MobileNav.module.css';

const ITEMS = [
  { href: '/', label: 'Home', icon: '🌌' },
  { href: '/discovery', label: 'Discovery', icon: '🚀' },
  { href: '/buran', label: 'Buran', icon: '⭐' },
  { href: '/satria-1', label: 'SATRIA-1', icon: '🛰️' },
  { href: '/cubesat', label: 'CubeSat', icon: '📦' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.mobileDock} aria-label="Navigasi Bawah">
      <div className={styles.dockContainer}>
        {ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.dockItem} ${isActive ? styles.dockItemActive : ''}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
              {isActive && <span className={styles.activeDot} />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
