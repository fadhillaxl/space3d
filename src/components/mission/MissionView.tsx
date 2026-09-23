'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import SpaceModelViewer from '@/components/3d/SpaceModelViewer';
import { MissionData } from '@/data/spaceData';
import styles from './MissionView.module.css';

interface Props {
  mission: MissionData;
}

export default function MissionView({ mission }: Props) {
  const [selectedVariant, setSelectedVariant] = useState(mission.variants[0].id);

  const currentLayers = mission.layers[selectedVariant] || mission.layers[mission.id] || [];
  const currentHotspots = mission.hotspots[selectedVariant] || mission.hotspots[mission.id] || [];
  const currentTour = mission.tours[selectedVariant] || mission.tours[mission.id] || [];

  return (
    <article className={styles.missionContainer}>
      {/* Hero Header */}
      <section className={styles.heroSection}>
        <div className="wrap">
          <div className={styles.heroContent}>
            <div className={styles.heroKicker}>
              <span
                className={styles.countryBadge}
                style={{ borderColor: mission.accentColor, color: mission.accentColor }}
              >
                {mission.countryCode}
              </span>
              <span className={styles.agencyText}>{mission.agency}</span>
            </div>

            <h1 className={styles.heroTitle}>{mission.title}</h1>
            <p className={styles.heroSubtitle}>{mission.subtitle}</p>

            {/* Variant Switcher if multiple available */}
            {mission.variants.length > 1 && (
              <div className={styles.variantTabs}>
                <span className={styles.variantLabel}>Pilih Konfigurasi 3D:</span>
                <div className={styles.tabsList}>
                  {mission.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`${styles.tabBtn} ${selectedVariant === v.id ? styles.tabBtnActive : ''}`}
                      onClick={() => setSelectedVariant(v.id)}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3D Interactive Stage */}
      <section className={styles.stageSection}>
        <div className="wrap">
          <SpaceModelViewer
            variant={selectedVariant}
            hotspots={currentHotspots}
            layers={currentLayers}
            tour={currentTour}
            missionName={mission.title.split('(')[0].trim()}
          />
        </div>
      </section>

      {/* Technical Specifications Grid & Overview */}
      <section className={styles.specsSection}>
        <div className="wrap">
          <div className={styles.twoColGrid}>
            {/* Left Column: Overview & Insights */}
            <div className={styles.overviewCol}>
              <div className="eyebrow">Profil & Arsitektur</div>
              <h2 className={styles.sectionHeading}>Ikhtisar Rekayasa Wahana</h2>
              <p className={styles.leadText}>{mission.overview}</p>

              {/* Facts Card */}
              <div className={styles.factsCard}>
                <h4 className={styles.factsTitle}>💡 Fakta & Rekor Sejarah</h4>
                <ul className={styles.factsList}>
                  {mission.facts.map((fact, idx) => (
                    <li key={idx}>{fact}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column: Telemetry Specs Matrix */}
            <div className={styles.specsCol}>
              <div className="eyebrow">Data Telemetri</div>
              <h2 className={styles.sectionHeading}>Spesifikasi Teknis</h2>
              <div className={styles.specsMatrix}>
                {mission.specs.map((spec, idx) => (
                  <div key={idx} className={styles.specCard}>
                    <span className={styles.specLabel}>{spec.label}</span>
                    <div className={styles.specValueGroup}>
                      <span className={styles.specValue}>{spec.value}</span>
                      {spec.unit && <span className={styles.specUnit}>{spec.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Quick Launch Bar */}
      <section className={styles.quickLaunchSection}>
        <div className="wrap">
          <div className={styles.quickLaunchBox}>
            <div>
              <h3 className={styles.qlTitle}>Jelajahi Wahana Antariksa Lainnya</h3>
              <p className={styles.qlDesc}>Pelajari perbedaan arsitektur, teknologi pendorong, dan perbandingan sains antariksa.</p>
            </div>
            <div className={styles.qlLinks}>
              {mission.id !== 'discovery' && <Link href="/discovery" className="btn btnSecondary">🚀 Space Shuttle</Link>}
              {mission.id !== 'buran' && <Link href="/buran" className="btn btnSecondary">⭐ Pesawat Buran</Link>}
              {mission.id !== 'satria-1' && <Link href="/satria-1" className="btn btnSecondary">🛰️ Satelit SATRIA-1</Link>}
              {mission.id !== 'cubesat' && <Link href="/cubesat" className="btn btnSecondary">📦 Nanosatelit CubeSat</Link>}
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
