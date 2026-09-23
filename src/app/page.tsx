'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SpaceViewerStage, { VariantOption } from '@/components/viewer/SpaceViewerStage';

export default function HomePage() {
  const [selectedVariant, setSelectedVariant] = useState('discovery');

  const variants: VariantOption[] = [
    { id: 'discovery', label: 'Discovery', mission: 'discovery' },
    { id: 'buran', label: 'Buran', mission: 'buran' },
    { id: 'rascube', label: 'RASCube', mission: 'rascube' },
    { id: 'kratos', label: 'Kratos', mission: 'kratos' },
  ];

  const labels: Record<string, { title: string; missionAttr: string }> = {
    discovery: { title: 'Space Shuttle Discovery (OV-103)', missionAttr: 'discovery' },
    buran: { title: 'Buran 1.01 (OK-1K1)', missionAttr: 'buran' },
    rascube: { title: 'RASCube V2 · kit satelit pendidikan', missionAttr: 'rascube' },
    kratos: { title: 'EXA Kratos Bus 1B · CubeSat 1U', missionAttr: 'kratos' },
  };

  const currentInfo = labels[selectedVariant] || labels.discovery;

  return (
    <div data-mission={currentInfo.missionAttr}>
      <Header currentMission="home" />

      <main id="main">
        <section className="hero">
          <div className="wrap hero__grid">
            <div>
              <p className="hero__kicker">Materi edukasi · empat modul</p>
              <h1>Mahakarya Rekayasa Antariksa: Dari Pesawat Ulang-Alik hingga Satelit Nano.</h1>
              <p className="hero__sub">
                Satu pesawat ulang-alik Amerika yang terbang 39 kali, satu pesawat ulang-alik Soviet yang terbang sekali, satu kit satelit yang dirakit siswa di kelas, dan satu bus satelit seberat 500 gram yang siap diterbangkan.
              </p>
              <p className="hero__sub" style={{ marginTop: '1.1rem' }}>
                <span className="mono" id="model-label">
                  {currentInfo.title}
                </span>
              </p>
            </div>

            <div>
              <SpaceViewerStage
                initialVariant="discovery"
                availableVariants={variants}
                isHome={true}
                onVariantChange={(v) => setSelectedVariant(v)}
              />
            </div>
          </div>
        </section>

        <div className="wrap" style={{ paddingBlock: 'clamp(2.4rem,6vw,4rem)' }}>
          <p className="eyebrow">Modul Wahana</p>
          <div className="modules">
            <Link className="module module--usa" href="/discovery">
              <span className="module__i">01</span>
              <h3>Space Shuttle Discovery</h3>
              <span className="module__meta">USA · 1984–2011</span>
              <p>
                Orbiter dengan penerbangan terbanyak dalam armada Space Shuttle. Meluncurkan Hubble, bertemu Mir, membangun ISS, dan dua kali mengembalikan NASA ke penerbangan setelah kecelakaan.
              </p>
              <span className="module__go">Buka modul →</span>
            </Link>

            <Link className="module module--ussr" href="/buran">
              <span className="module__i">02</span>
              <h3>Buran — Energia</h3>
              <span className="module__meta">Uni Soviet · 1970-an–1993</span>
              <p>
                Pesawat ulang-alik Soviet yang menyelesaikan peluncuran, dua orbit, reentry, dan pendaratan sepenuhnya otomatis tanpa satu pun manusia di dalam kabin — lalu tidak pernah terbang lagi.
              </p>
              <span className="module__go">Buka modul →</span>
            </Link>

            <Link className="module module--nano" href="/rascube">
              <span className="module__i">03</span>
              <h3>RASCube V2</h3>
              <span className="module__meta">Kit latihan · replika 1U</span>
              <p>
                Kit satelit pendidikan dari Australia Selatan yang dirakit sendiri oleh siswa, dari rangka aluminium sampai antena — dengan enam titik komponen pada model 3D-nya.
              </p>
              <span className="module__go">Buka modul →</span>
            </Link>

            <Link className="module module--geo" href="/kratos">
              <span className="module__i">04</span>
              <h3>Kratos Bus 1B</h3>
              <span className="module__meta">EXA · bus CubeSat 1U</span>
              <p>
                Bus satelit 1U seberat 500 gram dengan perisai emas SEAM/NEMEA dan enam panel surya yang membentang sendiri — dengan dua belas titik komponen dan model yang bisa dilipat.
              </p>
              <span className="module__go">Buka modul →</span>
            </Link>
          </div>

          <section style={{ paddingTop: 'clamp(2.6rem,6vw,4rem)' }}>
            <p className="eyebrow">Cara membaca</p>
            <h2>Setiap modul disusun dengan struktur yang sama</h2>
            <p className="lede">
              Sehingga dua wahana yang sangat berbeda bisa dibandingkan langsung, bagian per bagian.
            </p>

            <div className="stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '1rem', margin: '2rem 0' }}>
              <div style={{ background: 'var(--panel)', padding: '1rem', border: '1px solid var(--line)', borderRadius: '3px' }}>
                <span className="mono" style={{ display: 'block', color: 'var(--accent)', marginBottom: '.3rem' }}>01</span>
                <strong>Tujuan pembelajaran</strong>
              </div>
              <div style={{ background: 'var(--panel)', padding: '1rem', border: '1px solid var(--line)', borderRadius: '3px' }}>
                <span className="mono" style={{ display: 'block', color: 'var(--accent)', marginBottom: '.3rem' }}>02</span>
                <strong>Ringkasan &amp; angka kunci</strong>
              </div>
              <div style={{ background: 'var(--panel)', padding: '1rem', border: '1px solid var(--line)', borderRadius: '3px' }}>
                <span className="mono" style={{ display: 'block', color: 'var(--accent)', marginBottom: '.3rem' }}>03</span>
                <strong>Latar belakang &amp; pembangunan</strong>
              </div>
              <div style={{ background: 'var(--panel)', padding: '1rem', border: '1px solid var(--line)', borderRadius: '3px' }}>
                <span className="mono" style={{ display: 'block', color: 'var(--accent)', marginBottom: '.3rem' }}>04</span>
                <strong>Struktur &amp; teknologi</strong>
              </div>
              <div style={{ background: 'var(--panel)', padding: '1rem', border: '1px solid var(--line)', borderRadius: '3px' }}>
                <span className="mono" style={{ display: 'block', color: 'var(--accent)', marginBottom: '.3rem' }}>05</span>
                <strong>Seluruh penerbangan</strong>
              </div>
              <div style={{ background: 'var(--panel)', padding: '1rem', border: '1px solid var(--line)', borderRadius: '3px' }}>
                <span className="mono" style={{ display: 'block', color: 'var(--accent)', marginBottom: '.3rem' }}>06</span>
                <strong>Gallery &amp; sumber</strong>
              </div>
            </div>

            <div style={{ background: 'var(--deep)', border: '1px solid var(--line)', borderRadius: '4px', padding: '1.4rem', marginBottom: '1.2rem' }}>
              <p className="mono" style={{ color: 'var(--accent)', marginBottom: '.4rem' }}>MODEL 3D PINDAIAN PRESI</p>
              <p style={{ margin: 0, fontSize: '.92rem' }}>
                Model pada setiap halaman didukung data fotogrametri Smithsonian Discovery OV-103 dan perender Three.js mandiri, berjalan penuh dari berkas lokal maupun server container tanpa ketergantungan API pihak ketiga. Model dapat diputar 360°, diperbesar (pinch-to-zoom / scroll), dibuka pintu ruang muatannya, diubah mode rangkanya, serta ditinjau per titik komponen.
              </p>
            </div>

            <div style={{ background: 'var(--deep)', border: '1px solid var(--line)', borderRadius: '4px', padding: '1.4rem', marginBottom: '1.2rem' }}>
              <p className="mono" style={{ color: 'var(--accent)', marginBottom: '.4rem' }}>MODE LURING &amp; PWA</p>
              <p style={{ margin: 0, fontSize: '.92rem' }}>
                Aplikasi ini mendukung standar Progressive Web App (PWA) lengkap dengan Service Worker. Seluruh halaman, gambar, dan aset pindaian 3D disimpan di penyimpanan peramban untuk akses cepat tanpa jaringan internet (offline mode). Bila terdapat pembaruan materi edukasi saat daring, notifikasi pembaruan otomatis akan muncul.
              </p>
            </div>

            <div style={{ background: 'var(--deep)', border: '1px solid var(--line)', borderRadius: '4px', padding: '1.4rem' }}>
              <p className="mono" style={{ color: 'var(--accent)', marginBottom: '.4rem' }}>STATUS MATERI</p>
              <p style={{ margin: 0, fontSize: '.92rem' }}>
                Modul Discovery dan Buran disusun sepenuhnya dari dokumen sumber sejarah peluncuran. Modul RASCube V2 disusun dari keterangan pembuatnya dan Quick Start Guide V2.0; modul Kratos Bus 1B dari lembar dokumentasi resmi EXA dan buku panduan Kratos. Keempat model dapat dipilih langsung di panggung atas, lengkap dengan nama tiap titik komponennya.
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
