'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SpaceViewerStage, { VariantOption } from '@/components/viewer/SpaceViewerStage';
import QuickNav from '@/components/shared/QuickNav';
import PhasesTracker from '@/components/shared/PhasesTracker';
import { withBasePath } from '@/utils/basePath';

export default function DiscoveryPage() {
  const [selectedVariant, setSelectedVariant] = useState('discovery');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEra, setSelectedEra] = useState('all');

  const variants: VariantOption[] = [
    { id: 'discovery', label: 'Orbiter', mission: 'discovery' },
    { id: 'stack', label: 'Tumpukan peluncuran', mission: 'discovery' },
  ];

  const quickNavChips = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'spesifikasi', label: 'Struktur Orbiter' },
    { id: 'tumpukan', label: 'Tumpukan Peluncuran' },
    { id: 'penerbangan', label: '39 Catatan Misi' },
    { id: 'sorotan', label: 'Misi Bersejarah' },
    { id: 'arsip', label: 'Rujukan & Pindaian' },
  ];

  const flightPhases = [
    {
      id: 'p1',
      meta: 'FASE 01 · T-0 s/d T+2:05',
      title: 'Peluncuran & Pembakaran SRB',
      text: 'Tiga mesin utama RS-25 menyala pada T-6.6 detik. Dua Solid Rocket Booster (SRB) berbahan bakar padat menyala pada T-0 menghasilkan daya dorong total 31.000 kN. Pada T+2 menit 5 detik di ketinggian 45 km, SRB kehabisan bahan bakar dan dilepaskan menggunakan motor pemisah roket kecil, jatuh ke Atlantik dengan parasut untuk dipungut kembali.',
    },
    {
      id: 'p2',
      meta: 'FASE 02 · T+2:05 s/d T+8:30',
      title: 'Pendakian Menuju Orbit Rendah (MECO)',
      text: 'Mesin utama membakar hidrogen dan oksigen cair dari Tangki Eksternal (ET) selama 8,5 menit hingga mencapai kecepatan 28.000 km/jam (Mach 25). Setelah Main Engine Cutoff (MECO), tangki luar dilepas dan hancur di atas Samudra Hindia.',
    },
    {
      id: 'p3',
      meta: 'FASE 03 · Ketinggian 300–600 km',
      title: 'Operasi di Orbit & Ruang Muatan',
      text: 'Dua mesin Orbital Maneuvering System (OMS) di buritan melakukan pembakaran sirkularisasi orbit. Pintu ruang kargo sepanjang 18 meter dibuka untuk pelepasan satelit, deployment Teleskop Hubble, atau docking modul ISS menggunakan lengan robotik Canadarm.',
    },
    {
      id: 'p4',
      meta: 'FASE 04 · Mach 25 Menuju Landasan',
      title: 'Reentry Atmosfer & Pendaratan Glider',
      text: 'Orbiter melakukan deorbit burn mundur, lalu menghadap atmosfer pada sudut serang 40 derajat. Ubin silika hitam HRSI dan kerucut hidung RCC menahan panas gesekan hingga 1.650°C. Discovery meluncur tanpa mesin aktif (unpowered glider) menuju landasan KSC sepanjang 4,5 km.',
    },
  ];

  const missionLogs = [
    { flight: 'STS-41-D', date: '30 Agu 1984', dur: '6h 00m', payload: 'Penerbangan perdana Discovery, deployment 3 satelit komunikasi & panel surya OAST-1.', era: 'early' },
    { flight: 'STS-51-A', date: '08 Nov 1984', dur: '7h 23m', payload: 'Misi penyelamatan pertama di orbit: mengambil satelit Palapa B2 & Westar VI untuk dibawa pulang ke Bumi.', era: 'early' },
    { flight: 'STS-51-C', date: '24 Jan 1985', dur: '3h 01m', payload: 'Misi Departemen Pertahanan AS pertama dengan muatan rahasia.', era: 'early' },
    { flight: 'STS-51-D', date: '12 Apr 1985', dur: '6h 23m', payload: 'Meluncurkan Anik C-1 dan Syncom IV-3; spacewalk perbaikan darurat pertama.', era: 'early' },
    { flight: 'STS-51-G', date: '17 Jun 1985', dur: '7h 01m', payload: 'Membawa astronot internasional pertama: Pangeran Sultan Salman Al Saud dari Arab Saudi.', era: 'early' },
    { flight: 'STS-51-I', date: '27 Agu 1985', dur: '7h 02m', payload: 'Peluncuran 3 satelit dan penyelamatan Syncom IV-3 di orbit.', era: 'early' },
    { flight: 'STS-26', date: '29 Sep 1988', dur: '4h 01m', payload: 'Return to Flight setelah tragedi Challenger; awak memakai pakaian bertekanan penuh peluncuran TDRS-3.', era: 'challenger' },
    { flight: 'STS-29', date: '13 Mar 1989', dur: '4h 23m', payload: 'Peluncuran satelit pelacak TDRS-4 dan eksperimen biologi gravitasi mikro.', era: 'challenger' },
    { flight: 'STS-31', date: '24 Apr 1990', dur: '5h 01m', payload: 'Pelepasan Teleskop Luar Angkasa Hubble ke orbit 612 km — tonggak terbesar astronomi modern.', era: 'challenger' },
    { flight: 'STS-41', date: '06 Okt 1990', dur: '4h 02m', payload: 'Peluncuran wahana antariksa antariksa Ulysses menuju kutub Matahari.', era: 'challenger' },
    { flight: 'STS-39', date: '28 Apr 1991', dur: '8h 07m', payload: 'Misi Departemen Pertahanan kedua dengan observasi aurora dan inframerah bumi.', era: 'challenger' },
    { flight: 'STS-48', date: '12 Sep 1991', dur: '5h 08m', payload: 'Peluncuran Upper Atmosphere Research Satellite (UARS) untuk riset ozon.', era: 'challenger' },
    { flight: 'STS-60', date: '03 Feb 1994', dur: '7h 06m', payload: 'Kosmonot Rusia pertama terbang di Space Shuttle (Sergei Krikalev); pembawa tameng Wake Shield Facility.', era: 'iss' },
    { flight: 'STS-63', date: '03 Feb 1995', dur: '8h 06m', payload: 'Pertemuan Near-Mir pertama; Eileen Collins menjadi wanita pertama yang menjadi pilot Shuttle.', era: 'iss' },
    { flight: 'STS-82', date: '11 Feb 1997', dur: '9h 23m', payload: 'Misi Servis Hubble ke-2: penggantian spektrograf dan instalasi instrumen STIS & NICMOS.', era: 'iss' },
    { flight: 'STS-95', date: '29 Okt 1998', dur: '8h 21m', payload: 'Legenda antariksa John Glenn (usia 77) kembali terbang ke orbit untuk riset gerontologi.', era: 'iss' },
    { flight: 'STS-96', date: '27 Mei 1999', dur: '9h 19m', payload: 'Pendaratan pertama Space Shuttle pada Stasiun Luar Angkasa Internasional (ISS).', era: 'iss' },
    { flight: 'STS-103', date: '19 Des 1999', dur: '7h 23m', payload: 'Misi Servis Hubble 3A darurat untuk mengganti 6 giroskop yang rusak.', era: 'iss' },
    { flight: 'STS-92', date: '11 Okt 2000', dur: '12h 21m', payload: 'Penerbangan Space Shuttle ke-100; instalasi Z1 Truss dan PMA-3 ke ISS.', era: 'iss' },
    { flight: 'STS-114', date: '26 Jul 2005', dur: '13h 21m', payload: 'Return to Flight pasca-Columbia: uji keselamatan sensor boom OBSS dan perbaikan ubin di orbit.', era: 'columbia' },
    { flight: 'STS-121', date: '04 Jul 2006', dur: '12h 18m', payload: 'Uji keselamatan kedua, pengiriman modul logistik Raffaello dan awak Expedition 13.', era: 'columbia' },
    { flight: 'STS-116', date: '09 Des 2006', dur: '12h 20m', payload: 'Pemasangan truss P5 ISS dan rekonfigurasi sistem kelistrikan tenaga surya stasiun.', era: 'columbia' },
    { flight: 'STS-120', date: '23 Okt 2007', dur: '15h 02m', payload: 'Pemasangan modul Harmony (Node 2) dan perbaikan dramatis panel surya ISS yang robek.', era: 'columbia' },
    { flight: 'STS-124', date: '31 Mei 2008', dur: '13h 18m', payload: 'Pemasangan modul laboratorium Jepang Kibo (JEM-PM) dan lengan robotnya.', era: 'columbia' },
    { flight: 'STS-119', date: '15 Mar 2009', dur: '12h 19m', payload: 'Pemasangan rangkaian panel surya S6 terakhir untuk melengkapi sayap daya ISS.', era: 'columbia' },
    { flight: 'STS-128', date: '28 Agu 2009', dur: '13h 20m', payload: 'Modul kargo Leonardo dengan rak sains FIR dan MELFI untuk ISS.', era: 'columbia' },
    { flight: 'STS-131', date: '05 Apr 2010', dur: '15h 02m', payload: 'Pengiriman tangki amonia dan perlengkapan sains multi-ton ke ISS.', era: 'columbia' },
    { flight: 'STS-133', date: '24 Feb 2011', dur: '12h 19m', payload: 'Penerbangan ke-39 dan terakhir Discovery; pengiriman modul PMM Leonardo dan Robonaut 2.', era: 'columbia' },
  ];

  const filteredLogs = missionLogs.filter((m) => {
    const matchesEra = selectedEra === 'all' || m.era === selectedEra;
    const matchesSearch =
      !searchQuery ||
      m.flight.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.payload.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.date.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEra && matchesSearch;
  });

  return (
    <div data-mission="discovery">
      <Header currentMission="discovery" />

      <main id="main">
        {/* Hero & 3D Stage */}
        <section className="hero">
          <div className="wrap hero__grid">
            <div>
              <p className="hero__kicker">Modul 01 · Amerika Serikat</p>
              <h1>Space Shuttle Discovery</h1>
              <p className="hero__sub">
                Orbiter ketiga NASA. Terbang 39 kali selama hampir 27 tahun — lebih sering daripada orbiter mana pun — dan dua kali dipilih untuk mengembalikan armada ke penerbangan setelah kecelakaan fatal.
              </p>
              <ul className="hero__facts">
                <li><span className="k">Kode kendaraan</span><span className="v">OV-103</span></li>
                <li><span className="k">Masa dinas</span><span className="v">1984–2011</span></li>
                <li><span className="k">Penerbangan pertama</span><span className="v">STS-41D</span></li>
                <li><span className="k">Penerbangan terakhir</span><span className="v">STS-133</span></li>
              </ul>
            </div>

            <div>
              <SpaceViewerStage
                initialVariant="discovery"
                availableVariants={variants}
                accentColor="var(--usa)"
                onVariantChange={(v) => setSelectedVariant(v)}
              />
            </div>
          </div>
        </section>

        {/* Quicknav Bar */}
        <QuickNav chips={quickNavChips} />

        {/* Content Sections */}
        <div className="wrap">
          {/* Ringkasan */}
          <section id="ringkasan" className="sec">
            <p className="eyebrow">Ringkasan &amp; Angka Kunci</p>
            <h2 className="sec__title">Kuda Penarik Armada Antariksa Amerika</h2>
            <p className="lede">
              Dibangun di Palmdale, California oleh Rockwell International, Discovery diserahkan ke Kennedy Space Center pada November 1983. Namanya diambil dari kapal penjelajah legendaris HMS Discovery milik Kapten James Cook dan kapal ekspedisi Henry Hudson.
            </p>

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Parameter Teknis</th>
                    <th>Spesifikasi Orbiter Discovery</th>
                    <th>Tumpukan Peluncuran Lengkap</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Panjang Total</strong></td>
                    <td>37,24 meter (122,17 kaki)</td>
                    <td>56,1 meter (184 kaki)</td>
                  </tr>
                  <tr>
                    <td><strong>Bentang Sayap</strong></td>
                    <td>23,79 meter (78,06 kaki)</td>
                    <td>23,79 meter (pada sayap orbiter)</td>
                  </tr>
                  <tr>
                    <td><strong>Berat Kosong / Lepas Landas</strong></td>
                    <td>68.950 kg (berat kosong orbiter)</td>
                    <td>2.050.000 kg (2.050 ton tumpukan penuh)</td>
                  </tr>
                  <tr>
                    <td><strong>Daya Dorong Lepas Landas</strong></td>
                    <td>3x RS-25 SSME (5.250 kN total di permukaan laut)</td>
                    <td>31.000 kN (~7,8 juta pon dorongan bersama SRB)</td>
                  </tr>
                  <tr>
                    <td><strong>Kapasitas Muatan (Payload)</strong></td>
                    <td>24.400 kg ke orbit rendah (LEO 28,5°)</td>
                    <td>Dimensi ruang kargo: 18,3 x 4,57 meter</td>
                  </tr>
                  <tr>
                    <td><strong>Kecepatan Orbit / Reentry</strong></td>
                    <td>28.000 km/jam (Mach 25 / 7,8 km/detik)</td>
                    <td>Kecepatan pemisahan SRB: 4.800 km/jam (Mach 4,5)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Struktur Orbiter */}
          <section id="spesifikasi" className="sec">
            <p className="eyebrow">Anatomi &amp; Material</p>
            <h2 className="sec__title">Ketahanan Panas dan Rekayasa Struktural</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div style={{ background: 'var(--panel)', padding: '1.4rem', border: '1px solid var(--line)', borderRadius: '4px' }}>
                <h3 style={{ color: 'var(--usa)', marginBottom: '.6rem' }}>Ubin Silika HRSI &amp; Kerucut RCC</h3>
                <p style={{ fontSize: '.9rem' }}>
                  Perut orbiter dilapisi lebih dari 20.000 ubin High-Temperature Reusable Surface Insulation (HRSI) dari serat silika 99,8% murni berlapis kaca borosilikat hitam. Ubin ini dapat dipegang dengan tangan kosong beberapa detik setelah keluar dari tungku 1.200°C karena konduktivitas termalnya yang sangat rendah. Kerucut hidung dan tepi depan sayap dilindungi komposit Reinforced Carbon-Carbon (RCC) tahan panas 1.650°C.
                </p>
              </div>

              <div style={{ background: 'var(--panel)', padding: '1.4rem', border: '1px solid var(--line)', borderRadius: '4px' }}>
                <h3 style={{ color: 'var(--usa)', marginBottom: '.6rem' }}>Tiga Mesin Utama RS-25 (SSME)</h3>
                <p style={{ fontSize: '.9rem' }}>
                  Mesin roket siklus pembakaran bertahap berbahan bakar hidrogen dan oksigen cair dengan tekanan ruang bakar 20 MPa. Mengubah energi kimia menjadi kecepatan gas buang 4.440 m/s dengan efisiensi impuls spesifik 452 detik di ruang hampa. Ketiganya dapat dimiringkan hingga ±10,5 derajat menggunakan aktuator hidrolik untuk mengendalikan arah tumpukan peluncuran.
                </p>
              </div>

              <div style={{ background: 'var(--panel)', padding: '1.4rem', border: '1px solid var(--line)', borderRadius: '4px' }}>
                <h3 style={{ color: 'var(--usa)', marginBottom: '.6rem' }}>Ruang Kargo &amp; Canadarm</h3>
                <p style={{ fontSize: '.9rem' }}>
                  Ruang kargo silinder selebar 4,57 meter dan sepanjang 18,3 meter dilengkapi pintu komposit serat karbon berkulit ganda yang juga berfungsi sebagai radiator pendingin saat terbuka di orbit. Dilengkapi Remote Manipulator System (RMS) Canadarm sepanjang 15,2 meter dengan 6 derajat kebebasan untuk menangkap dan melepas satelit.
                </p>
              </div>
            </div>
          </section>

          {/* Profil Misi Bertahap */}
          <section id="tumpukan" className="sec">
            <p className="eyebrow">Profil Peluncuran</p>
            <h2 className="sec__title">Empat Fase Penerbangan Space Shuttle</h2>
            <p className="lede">
              Dari pelepasan di landasan Pad 39A hingga kembali mendarat sebagai pesawat layang tanpa tenaga mesin.
            </p>
            <PhasesTracker phases={flightPhases} />
          </section>

          {/* 39 Catatan Misi */}
          <section id="penerbangan" className="sec">
            <p className="eyebrow">Log Penerbangan Lengkap</p>
            <h2 className="sec__title">Catatan 39 Misi Penerbangan Discovery (1984–2011)</h2>

            <div className="filter">
              <input
                type="search"
                className="search"
                placeholder="Cari misi, muatan, atau tahun…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'Semua Era' },
                  { id: 'early', label: '1984–1985' },
                  { id: 'challenger', label: 'Pasca-Challenger' },
                  { id: 'iss', label: 'Era Mir & ISS' },
                  { id: 'columbia', label: 'Pasca-Columbia' },
                ].map((era) => (
                  <button
                    key={era.id}
                    type="button"
                    className={`tool ${selectedEra === era.id ? 'tool--active' : ''}`}
                    aria-pressed={selectedEra === era.id}
                    onClick={() => setSelectedEra(era.id)}
                  >
                    {era.label}
                  </button>
                ))}
              </div>
              <span className="mono" style={{ color: 'var(--muted)' }}>
                {filteredLogs.length} dari {missionLogs.length} misi
              </span>
            </div>

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Misi</th>
                    <th>Tanggal Peluncuran</th>
                    <th>Durasi</th>
                    <th>Muatan Utama &amp; Capaian Bersejarah</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.flight}>
                      <td><strong style={{ color: 'var(--usa)' }}>{log.flight}</strong></td>
                      <td>{log.date}</td>
                      <td>{log.dur}</td>
                      <td>{log.payload}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sorotan Misi */}
          <section id="sorotan" className="sec">
            <p className="eyebrow">Tonggak Sejarah</p>
            <h2 className="sec__title">Lima Misi Penentu Peradaban Antariksa</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.4rem', marginTop: '1.5rem' }}>
              <div style={{ background: 'var(--panel)', padding: '1.4rem', border: '1px solid var(--line)', borderRadius: '4px' }}>
                <span className="mono" style={{ color: 'var(--usa)' }}>STS-31 · 1990</span>
                <h3 style={{ margin: '.4rem 0 .6rem' }}>Penempatan Teleskop Luar Angkasa Hubble</h3>
                <p style={{ fontSize: '.88rem' }}>
                  Discovery membawa muatan paling berharga dalam sejarah astronomi ke ketinggian 612 km di atas Bumi. Komandan Loren Shriver dan pilot Charlie Bolden memosisikan Discovery dengan akurasi sentimeter sementara Canadarm mengangkat teleskop seberat 11 ton ke angkasa.
                </p>
              </div>

              <div style={{ background: 'var(--panel)', padding: '1.4rem', border: '1px solid var(--line)', borderRadius: '4px' }}>
                <span className="mono" style={{ color: 'var(--usa)' }}>STS-95 · 1998</span>
                <h3 style={{ margin: '.4rem 0 .6rem' }}>Kembalinya Legenda John Glenn</h3>
                <p style={{ fontSize: '.88rem' }}>
                  Pada usia 77 tahun, John Glenn (orang Amerika pertama yang mengorbit Bumi pada 1962) kembali terbang dengan Discovery untuk mempelajari efek penuaan dalam kondisi gayaberat mikro, membuktikan bahwa eksplorasi ruang angkasa tidak mengenal batas usia.
                </p>
              </div>

              <div style={{ background: 'var(--panel)', padding: '1.4rem', border: '1px solid var(--line)', borderRadius: '4px' }}>
                <span className="mono" style={{ color: 'var(--usa)' }}>STS-26 &amp; STS-114</span>
                <h3 style={{ margin: '.4rem 0 .6rem' }}>Dua Kali Memulihkan Harapan NASA</h3>
                <p style={{ fontSize: '.88rem' }}>
                  Discovery dipilih secara terhormat dua kali sebagai wahana Return to Flight: pada STS-26 (1988) setelah bencana Challenger, dan pada STS-114 (2005) setelah musibah Columbia. Keberhasilan kedua misi ini memulihkan kelangsungan seluruh program penerbangan antariksa berawak AS.
                </p>
              </div>
            </div>
          </section>

          {/* Galeri Foto */}
          <section id="gallery" className="sec">
            <p className="eyebrow"><b>17</b> Gallery</p>
            <h2 className="sec__title">Galeri foto</h2>
            <p className="lede">Foto asli Discovery di landasan peluncuran dan gambar teknis resminya. Klik gambar untuk melihatnya dalam ukuran penuh.</p>
            <div className="galeri-foto reveal">
              <figure>
                <a href={withBasePath('/_shuttle/foto/discovery-landasan-malam.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/discovery-landasan-malam.jpg')} alt="Discovery di landasan peluncuran pada malam hari" loading="lazy" />
                </a>
                <figcaption><b>Landasan · STS-41-D</b>Discovery di landasan menjelang STS-41-D, penerbangan pertamanya pada 1984, terpasang pada External Tank dan dua Solid Rocket Booster.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_shuttle/foto/discovery-landasan-siang.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/discovery-landasan-siang.jpg')} alt="Discovery di landasan peluncuran pada siang hari" loading="lazy" />
                </a>
                <figcaption><b>Landasan</b>Konfigurasi lengkap Space Transportation System: orbiter, External Tank oranye, dan dua Solid Rocket Booster.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_shuttle/foto/discovery-tampak-samping.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/discovery-tampak-samping.jpg')} alt="Gambar teknis tampak samping kanan Discovery OV-103" loading="lazy" />
                </a>
                <figcaption><b>Tampak samping</b>Panjang orbiter 37,24 m (122 ft 2 in), dengan tulisan United States dan Discovery di badan.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_shuttle/foto/discovery-tampak-depan-belakang.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/discovery-tampak-depan-belakang.jpg')} alt="Gambar teknis tampak depan dan belakang Discovery" loading="lazy" />
                </a>
                <figcaption><b>Tampak depan &amp; belakang</b>Rentang sayap 23,79 m (78 ft 1 in). Dari belakang tampak tiga nosel SSME dan dua polong OMS.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_shuttle/foto/discovery-isometrik-komponen.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/discovery-isometrik-komponen.jpg')} alt="Isometrik komponen orbiter Discovery" loading="lazy" />
                </a>
                <figcaption><b>Isometrik komponen</b>Orbiter diurai per bagian beserta pabrik pembuatnya di seluruh Amerika Serikat, dari badan depan sampai sirip tegak.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_shuttle/foto/discovery-kabin-awak.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_shuttle/foto/discovery-kabin-awak.jpg')} alt="Isometrik kabin awak Discovery" loading="lazy" />
                </a>
                <figcaption><b>Kabin awak</b>Dek penerbangan di atas dan dek tengah di bawah: kursi komandan dan pilot, stasiun muatan, loker, dan pintu samping.</figcaption>
              </figure>
            </div>
          </section>

          {/* Rujukan & Pindaian */}
          <section id="arsip" className="sec">
            <p className="eyebrow">Rujukan &amp; Model 3D</p>
            <h2 className="sec__title">Pindaian Fotogrametri Digital Smithsonian</h2>
            <p className="lede">
              Model 3D orbiter Discovery pada modul ini dipetakan dari data pindaian fotogrametri laser 3D Smithsonian National Air and Space Museum di Steven F. Udvar-Hazy Center, Chantilly, Virginia.
            </p>
            <ul className="reflist" style={{ marginTop: '1.4rem' }}>
              <li>
                <span className="reflist__t">3D Scan</span>
                <a href="https://3d.si.edu/object/3d/space-shuttle-discovery:d8c636ce-4ebc-11ea-b77f-2e728ce88125" target="_blank" rel="noopener noreferrer">
                  Smithsonian 3D Digitization Program — Discovery OV-103 High-Fidelity Photogrammetry Mesh
                </a>
              </li>
              <li>
                <span className="reflist__t">NASA Doc</span>
                <a href="https://www.nasa.gov/centers/kennedy/shuttle/discovery/" target="_blank" rel="noopener noreferrer">
                  NASA Kennedy Space Center — Space Shuttle Discovery (OV-103) Technical Archive
                </a>
              </li>
              <li>
                <span className="reflist__t">Arsip</span>
                <span>Dimensi dan sudut elevon, sirip penstabil, dan polong OMS diukur langsung dari data koordinat pabrikan Rockwell International.</span>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <Footer moduleName="Modul 01: Space Shuttle Discovery" />
    </div>
  );
}
