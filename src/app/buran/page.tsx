'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SpaceViewerStage, { VariantOption } from '@/components/viewer/SpaceViewerStage';
import QuickNav from '@/components/shared/QuickNav';
import PhasesTracker from '@/components/shared/PhasesTracker';
import { withBasePath } from '@/utils/basePath';

export default function BuranPage() {
  const [selectedVariant, setSelectedVariant] = useState('buran');

  const variants: VariantOption[] = [
    { id: 'buran', label: 'Orbiter', mission: 'buran' },
    { id: 'buranStack', label: 'Tumpukan peluncuran', mission: 'buran' },
  ];

  const quickNavChips = [
    { id: 'ringkasan', label: 'Ringkasan & Karakteristik' },
    { id: 'arsitektur', label: 'Buran vs Shuttle AS' },
    { id: 'otomatis', label: 'Penerbangan Otonom 1988' },
    { id: 'energia', label: 'Sistem Roket Energia' },
    { id: 'arsip', label: 'Rujukan Sejarah' },
  ];

  const flightPhases = [
    {
      id: 'p1',
      meta: '15 NOVEMBER 1988 · 03:00 UTC',
      title: 'Peluncuran Badai Salju di Baikonur',
      text: 'Roket super-berat Energia menyalakan 4 booster Zenit bertenaga RD-170 dan 4 mesin RD-0120 pada tahap inti. Tumpukan seberat 2.400 ton meluncur menembus awan tebal dan badai salju di Kosmodrom Baikonur, RSS Kazakstan.',
    },
    {
      id: 'p2',
      meta: 'DUA KALI MENGORBIT BUMI',
      title: 'Dua Putaran Tanpa Awak Manusia',
      text: 'Buran dipisahkan dari inti Energia di ambang batas luar angkasa dan menyalakan mesin manuvernya sendiri untuk memasuki orbit 251 x 263 km dengan inklinasi 51,6 derajat. Di dalam kabin kokpit tidak ada satu pun kosmonot; seluruh sistem kendali dikendalikan komputer Biser-4.',
    },
    {
      id: 'p3',
      meta: 'REENTRY & ANGIN SILANG 17 M/S',
      title: 'Manuver Pendaratan Darurat Otomatis',
      text: 'Saat mendekati landasan Yubileiny dengan kecepatan transonik, komputer onboard mendeteksi angin silang berbahaya 17 m/s (61 km/jam). Secara tak terduga oleh pengawas darat, autopilot Buran berinisiatif membelokkan wahana 180 derajat ke rute alternatif untuk meredam kelebihan energi potensial.',
    },
    {
      id: 'p4',
      meta: '06:25 UTC · SENTUHAN RODA SEMPURNA',
      title: 'Pendaratan Otonom Bersejarah',
      text: 'Buran menyentuh landasan pada kecepatan 260 km/jam, hanya meleset 1,5 meter ke kiri dan 1 detik lebih awal dari perhitungan simulasi. Ini menjadi pendaratan pesawat antariksa kelas 100 ton pertama dan satu-satunya di dunia yang dilakukan 100% otonom oleh komputer.',
    },
  ];

  return (
    <div data-mission="buran">
      <Header currentMission="buran" />

      <main id="main">
        {/* Hero & 3D Stage */}
        <section className="hero">
          <div className="wrap hero__grid">
            <div>
              <p className="hero__kicker">Modul 02 · Uni Soviet</p>
              <h1>Buran — Energia</h1>
              <p className="hero__sub">
                Terbang satu kali, tanpa awak, dan mendarat sendiri. Nama “Buran” berarti badai salju. Program ini bukan salinan Space Shuttle — arsitektur peluncurannya justru berbeda secara mendasar.
              </p>
              <ul className="hero__facts">
                <li><span className="k">Orbiter terbang</span><span className="v">Buran 1.01</span></li>
                <li><span className="k">Peluncur</span><span className="v">Energia</span></li>
                <li><span className="k">Penerbangan orbital</span><span className="v">15 Nov 1988</span></li>
                <li><span className="k">Program berakhir</span><span className="v">1993</span></li>
              </ul>
            </div>

            <div>
              <SpaceViewerStage
                initialVariant="buran"
                availableVariants={variants}
                accentColor="var(--ussr)"
                onVariantChange={(v) => setSelectedVariant(v)}
              />
            </div>
          </div>
        </section>

        {/* Quicknav Bar */}
        <QuickNav chips={quickNavChips} />

        <div className="wrap">
          {/* Ringkasan */}
          <section id="ringkasan" className="sec">
            <p className="eyebrow">Ringkasan &amp; Karakteristik</p>
            <h2 className="sec__title">Kuda Besi Soviet yang Berlayar dalam Kesendirian</h2>
            <p className="lede">
              Meskipun secara visual tampak mirip dengan Space Shuttle Amerika Serikat karena tuntutan aerodinamika hipersonik yang sama, Buran dibangun di atas filosofi arsitektur yang sama sekali berbeda: mesin peluncur utamanya tidak berada di badan orbiter, melainkan dipasang pada roket terpisah Energia.
            </p>

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Fitur &amp; Spesifikasi</th>
                    <th>Buran (Uni Soviet)</th>
                    <th>Space Shuttle (Amerika Serikat)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Mesin Utama Lepas Landas</strong></td>
                    <td>Terpasang pada roket Energia (orbiter hanya membawa mesin manuver orbital OMS/RCS)</td>
                    <td>3x RS-25 terpasang permanen pada buritan orbiter</td>
                  </tr>
                  <tr>
                    <td><strong>Kapasitas Muatan (LEO)</strong></td>
                    <td>30.000 kg (30 ton ke orbit rendah)</td>
                    <td>24.400 kg (24,4 ton ke orbit rendah)</td>
                  </tr>
                  <tr>
                    <td><strong>Sistem Pendaratan Otonom</strong></td>
                    <td>100% Otonom tanpa awak via sistem komputer Biser-4</td>
                    <td>Membutuhkan pilot manusia untuk fase pendaratan manual</td>
                  </tr>
                  <tr>
                    <td><strong>Kapasitas Muatan Kembali</strong></td>
                    <td>20.000 kg dapat dibawa pulang ke Bumi</td>
                    <td>14.400 kg kapasitas muatan turun</td>
                  </tr>
                  <tr>
                    <td><strong>Booster Peluncur</strong></td>
                    <td>4x Zenit cair bertenaga minyak tanah RG-1 + LOX (mesin RD-170)</td>
                    <td>2x Solid Rocket Booster (SRB) padat berbahan polibutadiena</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Arsitektur Buran vs AS */}
          <section id="arsitektur" className="sec">
            <p className="eyebrow">Filosofi Arsitektur</p>
            <h2 className="sec__title">Mengapa Mesin Utama Dipisahkan dari Orbiter?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div style={{ background: 'var(--panel)', padding: '1.4rem', border: '1px solid var(--line)', borderRadius: '4px' }}>
                <h3 style={{ color: 'var(--ussr)', marginBottom: '.6rem' }}>Struktur Orbiter Lebih Ringan &amp; Luas</h3>
                <p style={{ fontSize: '.9rem' }}>
                  Dengan memindahkan mesin utama ke roket peluncur, bobot buritan Buran berkurang drastis. Ruang kargonya dapat memuat 30 ton muatan—6 ton lebih banyak daripada Discovery—serta tidak perlu membawa beban mati mesin berat saat mendarat layang di landasan pacu.
                </p>
              </div>

              <div style={{ background: 'var(--panel)', padding: '1.4rem', border: '1px solid var(--line)', borderRadius: '4px' }}>
                <h3 style={{ color: 'var(--ussr)', marginBottom: '.6rem' }}>Energia sebagai Roket Mandiri Super-Berat</h3>
                <p style={{ fontSize: '.9rem' }}>
                  Roket Energia dapat meluncurkan muatan raksasa hingga 100 ton tanpa perlu membawa pesawat Buran, seperti pada peluncuran stasiun tempur militer Polyus (1987). Sebaliknya, Space Shuttle AS tidak dapat meluncur tanpa orbiter terpasang di sampingnya.
                </p>
              </div>

              <div style={{ background: 'var(--panel)', padding: '1.4rem', border: '1px solid var(--line)', borderRadius: '4px' }}>
                <h3 style={{ color: 'var(--ussr)', marginBottom: '.6rem' }}>Mesin Pendorong RD-170 Terkuat di Dunia</h3>
                <p style={{ fontSize: '.9rem' }}>
                  Keempat booster samping Zenit ditenagai mesin 4-ruang bakar RD-170 rancangan Valentin Glushko, yang memegang rekor mesin roket berbahan bakar cair paling bertenaga yang pernah dibangun manusia (daya dorong 7.900 kN per booster).
                </p>
              </div>
            </div>
          </section>

          {/* Penerbangan 1988 */}
          <section id="otomatis" className="sec">
            <p className="eyebrow">Rekor Dirgantara</p>
            <h2 className="sec__title">Penerbangan Tunggal 15 November 1988</h2>
            <p className="lede">
              Detik demi detik penerbangan otonom Buran yang membuktikan keandalan sistem kecerdasan komputer era Soviet.
            </p>
            <PhasesTracker phases={flightPhases} />
          </section>

          {/* Sistem Energia */}
          <section id="energia" className="sec">
            <p className="eyebrow">Wahana Peluncur Super-Berat</p>
            <h2 className="sec__title">Sistem Roket Peluncur Energia</h2>
            <p className="lede">
              Tumpukan Energia memiliki tinggi 58,8 meter dengan diameter inti 7,75 meter. Menggabungkan 4 booster cair berbahan bakar hidrokarbon dan tahap inti kriogenik hidrogen-oksigen cair (LOX/LH2).
            </p>
            <div style={{ background: 'var(--deep)', border: '1px solid var(--line)', borderRadius: '4px', padding: '1.4rem', marginTop: '1.4rem' }}>
              <p className="mono" style={{ color: 'var(--ussr)', marginBottom: '.4rem' }}>DATA TELEMETRI ENERGIA</p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '.92rem', lineHeight: '1.8' }}>
                <li><strong>Massa Lepas Landas:</strong> 2.400.000 kg (2.400 ton)</li>
                <li><strong>Daya Dorong Lepas Landas:</strong> 35.500 kN (~8,0 juta pon dorongan)</li>
                <li><strong>Mesin Inti:</strong> 4x RD-0120 (siklus gas generator hidrogen cair, 1.961 kN per mesin)</li>
                <li><strong>Booster Tali Pengikat:</strong> 4x Zenit (RD-170, tekanan ruang bakar rekor 24,5 MPa)</li>
              </ul>
            </div>
          </section>

          {/* Galeri Foto */}
          <section id="gallery" className="sec">
            <p className="eyebrow"><b>16</b> Gallery</p>
            <h2 className="sec__title">Galeri foto</h2>
            <p className="lede">Foto asli Energia–Buran, model koleksi museum, dan diagram teknisnya. Klik gambar untuk melihatnya dalam ukuran penuh.</p>
            <div className="galeri-foto reveal">
              <figure>
                <a href={withBasePath('/_shuttle/foto/buran-peluncuran.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/buran-peluncuran.jpg')} alt="Energia-Buran di landasan Baikonur saat mesin menyala" loading="lazy" />
                </a>
                <figcaption><b>Baikonur</b>Energia–Buran di landasan peluncuran Baikonur saat mesinnya menyala — satu-satunya penerbangan Buran, tanpa awak.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_shuttle/foto/buran-model-samping.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/buran-model-samping.jpg')} alt="Model Energia-Buran tampak samping" loading="lazy" />
                </a>
                <figcaption><b>Model museum · samping</b>Orbiter menempel di sisi tahap inti Energia, diapit booster. Mesin utama ada pada roketnya, bukan pada orbiter.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_shuttle/foto/buran-model-tegak.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/buran-model-tegak.jpg')} alt="Model Energia-Buran berdiri tegak" loading="lazy" />
                </a>
                <figcaption><b>Model museum · tegak</b>Berdiri seperti di landasan. Sirip vertikal orbiter model ini terlepas dan diletakkan di sampingnya.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_shuttle/foto/buran-model-atas.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/buran-model-atas.jpg')} alt="Model Energia-Buran tampak atas" loading="lazy" />
                </a>
                <figcaption><b>Model museum · atas</b>Sayap delta ganda, kanopi kokpit, dan tulisan «Энергия» pada tahap inti.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_shuttle/foto/buran-diagram-potongan.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/buran-diagram-potongan.jpg')} alt="Diagram potongan orbiter Buran 11F35 1K1" loading="lazy" />
                </a>
                <figcaption><b>Diagram potongan</b>Isi orbiter Buran (11F35 1K1): kabin, ruang muatan, sistem daya, tangki, dan mesin gabungan ODU di buritan, dengan tiga penampang melintang. Sumber: The Energia–Buran Archive.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_shuttle/foto/buran-pemisahan-tahap.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/buran-pemisahan-tahap.jpg')} alt="Poster karakteristik pemisahan tahap Energia-Buran" loading="lazy" />
                </a>
                <figcaption><b>Pemisahan tahap</b>Dibanding Space Shuttle, booster Energia memisah hanya 0,6–0,8 m dari sayap orbiter, pada sudut 10°, dengan massa 234 t. Sumber: The Energia–Buran Archive.</figcaption>
              </figure>
            </div>
          </section>

          {/* Rujukan Sejarah */}
          <section id="arsip" className="sec">
            <p className="eyebrow">Rujukan &amp; Arsip</p>
            <h2 className="sec__title">Dokumentasi Sejarah Program Buran-Energia</h2>
            <ul className="reflist" style={{ marginTop: '1.4rem' }}>
              <li>
                <span className="reflist__t">Arsip USSR</span>
                <a href="http://www.buran.ru" target="_blank" rel="noopener noreferrer">
                  Buran.ru — Arsip Resmi Desain dan Sejarah NPO Energia &amp; Molniya
                </a>
              </li>
              <li>
                <span className="reflist__t">3D Model</span>
                <span>Model Buran pada aplikasi ini menggunakan mesh pindaian fotogrametri presisi Smithsonian Discovery OV-103 dengan pemetaan tekstur livery Soviet CCCP asli.</span>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <Footer moduleName="Modul 02: Pesawat Ulang-Alik Buran" />
    </div>
  );
}
