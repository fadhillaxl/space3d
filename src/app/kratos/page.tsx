'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NanoViewerStage, { NanoPoint, NanoTourStep } from '@/components/viewer/NanoViewerStage';
import Link from 'next/link';
import { withBasePath } from '@/utils/basePath';

const kratosPoints: NanoPoint[] = [
  {
    n: 1, label: 'Perisai SEAM/NEMEA', lapisan: 'perisai',
    pos: [0, 0.6, -5.5], pandang: { yaw: Math.PI, pitch: 0.12 },
    teks: 'Lembaran emas pada satu muka badan bukan pelapis termal biasa, melainkan perisai SEAM/NEMEA yang dipasang EXA sebagai bagian dari bus.',
    rinci: ['Menjaga suhu di dalam wahana pada 10 °C konstan',
            'Melindungi dari Alpha, Beta, Gamma, sinar-X, dan neutron']
  },
  {
    n: 2, label: 'ICEPS All-in-one System Core', lapisan: 'dalam',
    ikut: 'iceps-prosesor', pandang: { yaw: -0.9, pitch: 0.25 },
    teks: 'Satu papan yang memuat komputer, radio, daya, penyimpanan, dan kendali sikap sekaligus. Inilah alasan bus ini bisa dijual sebagai satu barang, bukan rakitan subsistem.',
    rinci: ['Xlink ARM9 733 MHz OBC', 'SDR radio 70 MHz – 6 GHz',
            'SSD radshard 32 GB – 512 GB', 'EPS 100 W dengan 4 rel daya',
            'UMPPT solar manager dengan pengisi cepat',
            'Pemancar LASER 10 Mbps', 'ADCS terpadu dengan magnetorquer Z',
            'USB untuk 8 perangkat, bus I²C, ruang 32 GPIO',
            'Buku panduan: kartu 96 × 96 × 25 mm, 100 g, suhu operasi −50 s.d. +125 °C',
            'Buku panduan: OBC Sidekiq Z2 — ARM Cortex-A9 dua inti 733 MHz, 512 MB RAM']
  },
  {
    n: 3, label: 'Baterai 25 Whr Slim BAO3', lapisan: 'dalam',
    ikut: 'baterai-bao3', pandang: { yaw: -1.2, pitch: 0.18 },
    teks: 'Paket baterai tipis yang menopang wahana saat berada di sisi malam Bumi. Pada orbit rendah, gelapnya berlangsung sekitar sepertiga dari tiap putaran.',
    rinci: ['Kapasitas 25 Whr', 'Tipe Slim BAO3 (buku panduan menulis BA03)',
            'Batas kerja di K/OS: 3,6 – 4,2 V, suhu paket 23 – 52 °C',
            'Keluaran APU langsung dari baterai: sampai 4,2 V, 20 A']
  },
  {
    n: 4, label: 'Susunan surya DMSA 5 W', lapisan: 'surya',
    ikut: 'panel-kanan-1-papan', pandang: { yaw: -0.5, pitch: 0.35 },
    teks: 'Tiap sisi membawa rantai tiga panel. Panel pertama adalah dinding badan itu sendiri, jadi begitu sayapnya membentang, bagian dalam wahana ikut terbuka — persis seperti pada foto EXA.',
    rinci: ['Daya 5 W, tipe DMSA', 'Enam panel yang membentang sendiri',
            'Geser penggeser di bawah panggung untuk melipat dan membentangkannya']
  },
  {
    n: 5, label: 'Artificial muscles', lapisan: 'engsel',
    ikut: 'engsel-kanan-1-atas', pandang: { yaw: -0.35, pitch: 0.3 },
    teks: 'Mekanisme pelepas sayap tidak memakai kawat bakar sekali pakai. EXA menyebutnya artificial muscles: dapat dilepas berulang kali, dan tidak perlu dirakit ulang setelah diuji.',
    rinci: ['Pelepasan berulang', 'Tanpa perlu dirakit ulang',
            'Kendali deploy/release otomatis dari ICEPS',
            'Buku panduan: RELEASE digerakkan dulu, DEPLOY baru menyusul setelah sensor melapor lepas']
  },
  {
    n: 6, label: 'Rangka Al T6061 anodisasi', lapisan: 'rangka',
    pos: [4.6, 4.9, 4.6], pandang: { yaw: -0.8, pitch: 0.45 },
    teks: 'Empat rel sudut dan bingkai ujung dari aluminium T6061 yang dianodisasi. Rel inilah yang bersentuhan dengan dinding deployer saat wahana didorong keluar.',
    rinci: ['Paduan Al T6061', 'Permukaan anodisasi',
            'Seluruh wahana 500 gram, sudah termasuk semuanya']
  },
  {
    n: 7, label: 'Magnetorquer di empat sisi', lapisan: 'surya',
    ikut: 'panel-kiri-0-papan', pandang: { yaw: 1.5, pitch: 0.2 },
    teks: 'Kumparan magnetorquer ditanam di dalam papan dinding pada keempat sisi, bukan sebagai perangkat terpisah. Bersama magnetorquer sumbu Z di ICEPS, itulah yang mengatur arah hadap wahana.',
    rinci: ['Tertanam pada keempat sisi', 'Ditambah magnetorquer sumbu Z pada ICEPS']
  },
  {
    n: 8, label: 'Antena tertanam VHF – L-band', lapisan: 'antena',
    ikut: 'konektor-sma', pandang: { yaw: -0.6, pitch: 0.55 },
    teks: 'Antenanya tertanam pada struktur, mencakup rentang VHF sampai L-band. Tidak ada pita logam panjang yang harus digulung seperti pada CubeSat generasi awal.',
    rinci: ['Rentang VHF sampai L-band', 'Tertanam pada struktur',
            'Dilayani SDR 70 MHz – 6 GHz di ICEPS',
            'Uji EM: uplink 434 MHz BPSK, downlink 144 MHz QPSK']
  },
  {
    n: 9, label: 'Sensor suhu dan matahari', lapisan: 'sensor',
    ikut: 'sensor-0', pandang: { yaw: -0.2, pitch: 0.3 },
    teks: 'Sensor suhu dan matahari dipasang pada keenam sisi. Karena ada di semua sisi, wahana selalu tahu ke mana Matahari berada tanpa perlu berputar mencarinya.',
    rinci: ['Pada keenam sisi', '24 sensor terpasang di seluruh bus']
  },
  {
    n: 10, label: 'Ruang muatan ¾ U', lapisan: 'dalam',
    ikut: 'papan-muatan', pandang: { yaw: -1.0, pitch: 0.4 },
    teks: 'Seluruh bus — komputer, radio, daya, kendali sikap, baterai — hanya memakai seperempat volume. Sisanya tiga perempat U, dan itu milik pengguna.',
    rinci: ['Kapasitas ¾ dari satu U', 'Sampai 6 papan muatan tipis',
            'Sampai 3 kamera']
  },
  {
    n: 11, label: 'Remove before launch', lapisan: 'rbf',
    ikut: 'rbf-pita', pandang: { yaw: 0.2, pitch: 0.15 },
    teks: 'Pin pengaman beserta talinya menahan sayap tetap terlipat dan memutus daya selama penanganan di darat. Tali merah itu wajib terlihat mencolok, dan memang itu tujuannya.',
    rinci: ['Menahan sayap tetap terlipat sebelum peluncuran',
            'Buku panduan: memutus baterai dari pengisi daya dan seluruh sistem',
            'Harus dicabut agar sakelar aktivasi bisa menyalakan ICEPS']
  },
  {
    n: 12, label: 'Massa total 500 gram', lapisan: 'rangka',
    pos: [0, -5.9, 0], pandang: { yaw: -0.7, pitch: -0.35 },
    teks: 'Angka 500 gram itu untuk bus lengkap: struktur, perisai, elektronik, baterai, dan susunan surya. Batas massa 1U yang lazim dipakai adalah sekitar 1,33 kilogram, jadi sisanya tersedia untuk muatan.',
    rinci: ['500 gram, semua termasuk']
  }
];

const kratosLayers = {
  rangka: 'Rangka',
  surya: 'Panel surya',
  perisai: 'Perisai emas',
  engsel: 'Engsel',
  dalam: 'Bagian dalam',
  antena: 'Antena',
  sensor: 'Sensor',
  rbf: 'Tali RBF'
};

const kratosViews = {
  depan:   { yaw: 0.0001,       pitch: 0.12 },
  samping: { yaw: -Math.PI / 2, pitch: 0.10 },
  atas:    { yaw: 0.0001,       pitch: 1.25 },
  perisai: { yaw: Math.PI,      pitch: 0.12 }
};

const kratosTourSteps: NanoTourStep[] = [
  {
    n: 11,
    judul: 'Terlipat, siap masuk deployer',
    deploy: 0,
    teks: 'Beginilah Kratos sebelum diluncurkan: keenam panel surya terlipat rapat ke badan sehingga seluruh wahana muat dalam kotak 1U. Tali merah remove before launch memutus baterai dari seluruh sistem selama penanganan di darat, dan dicabut sesaat sebelum wahana dimasukkan ke deployer.'
  },
  {
    n: 6,
    deploy: 0,
    teks: 'Empat rel sudut dari aluminium T6061 anodisasi inilah yang bergesekan dengan dinding deployer ketika wahana didorong keluar di orbit. Begitu terpisah, sebatang titanium 1 mm di dalam struktur melepas sakelar aktivasi, dan ICEPS menyala sendiri.'
  },
  {
    n: 5,
    deploy: 1,
    teks: 'Setelah di orbit, sayap dilepas dulu (RELEASE), baru dibentangkan (DEPLOY) begitu sensornya melapor sudah lepas. EXA memakai artificial muscles yang bisa diulang, jadi mekanismenya dapat diuji berkali-kali di darat tanpa dirakit ulang.'
  },
  {
    n: 4,
    deploy: 1,
    teks: 'Enam panel DMSA sekarang terbentang menghadap Matahari. ICEPS memanen daya dari semua panel sekaligus lewat pengelola surya UMPPT empat kanal, sambil mengisi baterai pada saat yang sama.'
  },
  {
    n: 1,
    teks: 'Satu muka badan dilapisi lembaran emas perisai SEAM/NEMEA. Perisai ini menjaga bagian dalam tetap 10 °C dan menahan radiasi. Menurut buku panduan, dengan NEMEA elektroniknya tahan minimal 10 tahun di orbit rendah, dua kali lipat dari tanpa perisai.'
  },
  {
    n: 2,
    teks: 'ICEPS adalah otak sekaligus jantung Kratos: satu kartu 96 × 96 × 25 mm seberat 100 gram yang memuat catu daya, komputer Sidekiq Z2 dengan ARM Cortex-A9 733 MHz, radio SDR 70 MHz – 6 GHz, penyimpanan SSD, dan komunikasi laser 10 Mbps.'
  },
  {
    n: 3,
    teks: 'Baterai tipis 25 Whr menopang wahana saat melintasi sisi malam Bumi, kira-kira sepertiga dari tiap putaran orbit rendah. Perangkat lunak K/OS menjaganya di antara 3,6 dan 4,2 volt.'
  },
  {
    n: 8,
    teks: 'Antena tertanam pada struktur, mencakup VHF sampai L-band, jadi tidak ada pita logam yang harus digulung. Dalam uji laboratorium, perintah naik pada 434 MHz dan data turun pada 144 MHz.'
  },
  {
    n: 7,
    teks: 'Kumparan magnetorquer tertanam di papan dinding pada keempat sisi. Dengan mengalirkan arus, kumparan ini bertolak-tarik dengan medan magnet Bumi dan memutar wahana ke arah yang diinginkan, tanpa bahan bakar sama sekali.'
  },
  {
    n: 9,
    teks: 'Sensor suhu dan matahari ada di keenam sisi, jadi wahana selalu tahu dari arah mana Matahari datang. Bila satu nilai keluar dari batas, K/OS langsung mencatatnya sebagai galat.'
  },
  {
    n: 10,
    teks: 'Seluruh bus tadi hanya memakan seperempat volume. Tiga perempat sisanya milik pengguna: sampai enam papan muatan tipis atau tiga kamera, dihubungkan lewat USB atau I²C.'
  },
  {
    n: 12,
    teks: 'Semuanya — rangka, perisai, elektronik, baterai, dan panel surya — hanya 500 gram. Batas massa 1U yang lazim sekitar 1,33 kilogram, jadi masih ada lebih dari 800 gram untuk muatan. Tur selesai; klik nomor mana pun untuk menjelajah sendiri.'
  }
];

export default function KratosPage() {
  return (
    <div data-mission="kratos">
      <Header currentMission="kratos" />

      <main id="main">
        {/* Hero Section */}
        <div className="wrap hero">
          <p className="eyebrow"><b>Modul 04 · Kelas CubeSat 1U</b> · bus wahana siap pakai</p>
          <h1>Kratos <span>Spacecraft Bus 1B</span></h1>
          <p className="hero__sub">
            Bus satelit 1U buatan EXA: rangka aluminium anodisasi, perisai SEAM/NEMEA, satu inti sistem terpadu ICEPS, dan enam panel surya yang membentang sendiri — seluruhnya 500 gram, dengan tiga perempat U masih tersisa untuk muatan.
          </p>

          <div className="facts">
            <div><span className="k">Massa total</span><span className="v">500 g</span></div>
            <div><span className="k">Daya surya</span><span className="v">5 W DMSA</span></div>
            <div><span className="k">Baterai</span><span className="v">25 Whr</span></div>
            <div><span className="k">Ruang muatan</span><span className="v">¾ U</span></div>
            <div><span className="k">Suhu dalam</span><span className="v">10 °C tetap</span></div>
          </div>
        </div>

        {/* 3D Model Stage */}
        <div className="wrap stage-wrap" id="model">
          <NanoViewerStage
            modelType="kratos"
            cornerText="Kratos Bus 1B · model 3D"
            points={kratosPoints}
            layers={kratosLayers}
            views={kratosViews}
            initialView={{ yaw: -0.72, pitch: 0.28 }}
            tourSteps={kratosTourSteps}
            hasDeploySlider={true}
          />
        </div>

        {/* 12 Poin Section */}
        <div className="wrap" id="poin">
          <div className="sec-head">
            <p className="eyebrow">Dua belas poin</p>
            <h2>Klik nomornya, modelnya berputar ke bagian itu</h2>
            <p>
              Setiap poin diambil dari keterangan pada lembar resmi EXA dan buku panduan Kratos yang ada di folder ini — bukan tafsiran. Nomor yang sama muncul pada model di atas.
            </p>
          </div>
          <div className="poin" id="daftar-poin">
            {kratosPoints.map((pt) => (
              <button
                key={pt.n}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`spot-${pt.n}`);
                  if (el) (el as HTMLElement).click();
                  else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                <span className="n">{String(pt.n).padStart(2, '0')}</span>
                <div>
                  <span className="t">{pt.label}</span>
                  <span className="d">{pt.teks}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Subsistem */}
        <section id="subsistem">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Subsistem</p>
              <h2>Apa saja yang sudah termasuk</h2>
              <p>Kratos 1B dijual sebagai bus utuh: komputer, radio, daya, kendali sikap, dan struktur sudah menjadi satu. Yang tersisa untuk pengguna adalah muatannya.</p>
            </div>

            <div className="grid2">
              <div className="kartu">
                <span className="eyebrow">Inti sistem</span>
                <h3>ICEPS All-in-one System Core</h3>
                <ul>
                  <li><b>Xlink ARM9 733 MHz</b> OBC</li>
                  <li><b>SDR radio</b> 70 MHz sampai 6 GHz</li>
                  <li><b>32 GB sampai 512 GB</b> penyimpanan SSD radshard</li>
                  <li>Kendali <b>deploy/release otomatis</b></li>
                  <li><b>UMPPT</b> solar manager dengan pengisi cepat</li>
                  <li><b>EPS 100 W</b> dengan 4 rel daya</li>
                  <li><b>24 sensor</b> terpasang, ruang untuk 32 GPIO</li>
                  <li>Pemancar <b>komunikasi LASER 10 Mbps</b></li>
                  <li><b>ADCS terpadu</b> dengan magnetorquer sumbu Z</li>
                  <li><b>USB</b> untuk 8 perangkat, plus bus I²C</li>
                </ul>
              </div>

              <div className="kartu">
                <span className="eyebrow">Perisai</span>
                <h3>SEAM/NEMEA</h3>
                <ul>
                  <li>Menjaga suhu di dalam wahana pada <b>10 °C konstan</b></li>
                  <li>Melindungi dari <b>Alpha, Beta, Gamma, sinar-X, dan neutron</b></li>
                  <li>Lembaran emas yang terlihat pada foto adalah perisai ini, bukan pelapis termal biasa</li>
                </ul>
              </div>

              <div className="kartu">
                <span className="eyebrow">Struktur dan mekanisme</span>
                <h3>Rangka Al T6061 anodisasi</h3>
                <ul>
                  <li><b>Artificial muscles</b> — pelepasan berulang, tanpa perlu dirakit ulang</li>
                  <li><b>Magnetorquer tertanam</b> pada keempat sisi</li>
                  <li><b>Antena tertanam</b>, VHF sampai L-band</li>
                  <li>Sensor <b>suhu dan matahari pada keenam sisi</b></li>
                  <li>Susunan surya <b>DMSA 5 W</b> yang membentang sendiri</li>
                  <li><b>500 gram</b> total, sudah termasuk semuanya</li>
                </ul>
              </div>

              <div className="kartu">
                <span className="eyebrow">Daya dan muatan</span>
                <h3>Baterai dan ruang muatan</h3>
                <ul>
                  <li>Baterai <b>25 Whr Slim BAO3</b></li>
                  <li>Kapasitas muatan besar: <b>tiga perempat dari satu U</b></li>
                  <li>Sampai <b>6 papan muatan tipis</b></li>
                  <li>Sampai <b>3 kamera</b></li>
                </ul>
              </div>
            </div>

            <div className="nota">
              <b>Catatan penyalinan</b>
              <p>Dua istilah ditulis ulang apa adanya dari lembar EXA: <span style={{ fontFamily: 'var(--mono)' }}>radshard</span> (kemungkinan besar maksudnya <em>radhard</em>, tahan radiasi) dan <span style={{ fontFamily: 'var(--mono)' }}>12C bus</span> yang di halaman ini ditulis <span style={{ fontFamily: 'var(--mono)' }}>I²C</span>. Keduanya dicatat supaya tidak ada angka atau nama yang berubah diam-diam saat disalin.</p>
            </div>
          </div>
        </section>

        {/* Spesifikasi */}
        <section id="spesifikasi">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Spesifikasi</p>
              <h2>Angka yang tercetak pada lembar resmi</h2>
              <p>Hanya yang benar-benar tertulis. Yang tidak disebut EXA dibiarkan kosong, bukan dikira-kira.</p>
            </div>
            <div className="tablewrap">
              <table>
                <caption>Kratos Spacecraft Bus 1B</caption>
                <tbody>
                  <tr><th>Kelas</th><td>CubeSat 1U</td></tr>
                  <tr><th>Massa total</th><td>500 g, semua termasuk</td></tr>
                  <tr><th>Struktur</th><td>Al T6061, anodisasi</td></tr>
                  <tr><th>Perisai</th><td>SEAM/NEMEA</td></tr>
                  <tr><th>Suhu internal</th><td>10 °C konstan</td></tr>
                  <tr><th>Proteksi radiasi</th><td>Alpha, Beta, Gamma, sinar-X, neutron</td></tr>
                  <tr><th>Komputer</th><td>Xlink ARM9 733 MHz</td></tr>
                  <tr><th>Radio</th><td>SDR 70 MHz – 6 GHz</td></tr>
                  <tr><th>Komunikasi optis</th><td>LASER 10 Mbps</td></tr>
                  <tr><th>Penyimpanan</th><td>SSD 32 GB – 512 GB</td></tr>
                  <tr><th>Daya</th><td>EPS 100 W, 4 rel</td></tr>
                  <tr><th>Surya</th><td>DMSA 5 W, membentang sendiri</td></tr>
                  <tr><th>Baterai</th><td>25 Whr Slim BAO3</td></tr>
                  <tr><th>Kendali sikap</th><td>ADCS terpadu, magnetorquer Z + 4 sisi</td></tr>
                  <tr><th>Antena</th><td>Tertanam, VHF – L-band</td></tr>
                  <tr><th>Sensor</th><td>24 onboard; suhu dan matahari di 6 sisi; ruang 32 GPIO</td></tr>
                  <tr><th>Antarmuka pengguna</th><td>USB 8 perangkat, bus I²C</td></tr>
                  <tr><th>Ruang muatan</th><td>¾ U · 6 papan tipis · 3 kamera</td></tr>
                  <tr><th>Mekanisme lepas</th><td>Artificial muscles, berulang, tanpa rakit ulang</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Buku Panduan Navigation */}
        <section id="buku-panduan">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow"><b>Buku panduan</b> · Akademi Angkatan Udara</p>
              <h2>Isi Manual Book CubeSat EXA Kratos</h2>
              <p>Bagian berikut diringkas dari buku panduan berbahasa Indonesia yang diterima AAU bersama unitnya. Buku itu terdiri atas dua dokumen: <em>ICEPS 8.1K — ICD dan Panduan Pengguna v1.0</em> untuk perangkat kerasnya, dan <em>Operasi Kratos Sistem V 4.5 — ICD Perangkat Lunak untuk Kratos EM</em> (revisi 2.0, QAS/EXA, 03/2026). Angka-angkanya disalin dari buku itu, sedangkan kalimatnya dirapikan dari terjemahan mesin aslinya.</p>
              <nav className="lompat" aria-label="Isi buku panduan">
                <a href="#iceps">ICEPS 8.1K</a>
                <a href="#obc">OBC &amp; SDR</a>
                <a href="#konektor">Konektor</a>
                <a href="#operasi">Operasi darat</a>
                <a href="#kos">Perangkat lunak K/OS</a>
                <a href="#telemetri">Telemetri</a>
                <a href="#tautan">Uji tautan radio</a>
                <a href="#pengujian">Pengujian</a>
                <a href={withBasePath('/_nano/dokumen/manual-book-kratos.pdf')} target="_blank" rel="noopener">Buka PDF asli ↗</a>
              </nav>
            </div>
          </div>
        </section>

        {/* ICEPS */}
        <section id="iceps">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Buku panduan · ICEPS 8.1K</p>
              <h2>Seluruh avionik dalam satu kartu setebal 25 mm</h2>
              <p>ICEPS (<em>Irvine-Class Electric Power Supply</em>) adalah inti sistem Kratos. Satu kartu ini mengerjakan fungsi yang biasanya tersebar di banyak kartu: catu daya, komputer, radio, penyimpanan, komunikasi laser, dan kendali mekanisme. Menurut buku panduan, seluruh avionik wahana muat dalam 0,25 unit CubeSat. Kartunya dirancang untuk 1U, tetapi siap dipakai pada CubeSat sampai 27U.</p>
            </div>

            <div className="grid2">
              <div className="kartu">
                <span className="eyebrow">Fisik dan lingkungan</span>
                <h3>96 × 96 × 25 mm, 100 gram</h3>
                <ul>
                  <li>Suhu operasi <b>−50 °C sampai +125 °C</b></li>
                  <li>Toleransi radiasi minimal <b>5 tahun di LEO</b>, minimal <b>10 tahun</b> bila wahana memakai perisai NEMEA</li>
                  <li>Bahan kelas antariksa, sesuai standar CubeSat</li>
                  <li>Dokumentasi tersedia sebagai PDF 3D, berkas STEP, dan cetak biru</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Catu daya (EPS)</span>
                <h3>Tiga rel teratur dan satu APU</h3>
                <ul>
                  <li>Rel <b>3,3 V @ 3,6 A</b>, <b>5 V @ 3 A</b>, <b>12 V @ 3 A</b>, dapat disesuaikan sesuai permintaan</li>
                  <li><b>APU</b>: keluaran tak teratur langsung dari baterai, puncak <b>4,2 V</b>, arus sampai <b>20 A</b>. Untuk muatan yang membawa pengatur dayanya sendiri, misalnya konverter DC/DC 28 V untuk penguat radio atau propulsi</li>
                  <li>Sensor tegangan: satu per susunan surya (empat) dan satu per bus</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Pengelola surya</span>
                <h3>UMPPT, empat kanal</h3>
                <ul>
                  <li>Mengelola sampai <b>4 susunan surya</b>, masing-masing hingga <b>3 panel</b> dan <b>50 W</b></li>
                  <li>Empat kanal UMPPT <b>16 V @ 2 A</b> masing-masing</li>
                  <li>Memanen energi dari semua panel <b>sekaligus</b></li>
                  <li>Mengisi dan mengosongkan baterai <b>bersamaan</b></li>
                  <li>Rilis dan pembentangan sayap dapat diulang, dengan sensor pada setiap tahap</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Data dan komunikasi</span>
                <h3>Arsitektur bintang di atas USB 2.0</h3>
                <ul>
                  <li>Bus <b>USB 480 Mbps</b> dan bus <b>I²C 1 Mb/s</b></li>
                  <li>Jaringan hub USB 2.0 dengan total <b>12 port</b>, dan OBC berada di port hulu hub utama</li>
                  <li>Jaringan ADC dengan ruang untuk <b>32 sensor</b></li>
                  <li>SSD USB 2.0 sampai <b>1024 GB</b>, baca-tulis <b>60 MB/dtk</b></li>
                  <li>Komunikasi <b>laser 10 Mbps</b>, panjang gelombang <b>400–450 nm</b> (biru/ungu), apertur berkas dapat diatur, dengan kendali termal terpadu</li>
                  <li>IMU 6 sumbu, port USB-C</li>
                </ul>
              </div>
            </div>

            <div className="nota">
              <b>Kawan sekerja ICEPS</b>
              <p>ICEPS bisa bekerja dengan perangkat USB atau I²C apa pun yang kompatibel. Kinerjanya paling baik bila dipasangkan dengan perangkat keras EXA sendiri: baterai BA03, susunan surya bentang DMSA (<em>Deployable Multi-function Solar Array</em>), dan perisai SEAM/NEMEA. Gabungan keempatnya itulah yang disebut sistem KRATOS.</p>
            </div>
          </div>
        </section>

        {/* OBC & SDR */}
        <section id="obc">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Buku panduan · OBC dan radio</p>
              <h2>Komputer dan radio dalam satu modul Mini PCIe</h2>
              <p>Komputer terbang (OBC) sekaligus radio SDR Kratos adalah <b>Sidekiq Z2</b> buatan Epiq Solutions. Modul ini terpasang langsung ke ICEPS lewat konektor tepi Mini PCIe. Semua perangkat lunak penerbangan berjalan langsung di atasnya, mulai dari akuisisi tautan, pengodean telemetri, dan buffer data, sampai perintah muatan dan operasi otonom.</p>
            </div>

            <div className="grid2">
              <div className="kartu">
                <span className="eyebrow">Komputer</span>
                <h3>Xilinx Zynq XC7Z010-2I</h3>
                <ul>
                  <li>CPU <b>ARM Cortex-A9 dua inti</b>, sampai <b>733 MHz</b>, ditambah logika terprogram (FPGA)</li>
                  <li>RAM <b>512 MB DDR3L</b></li>
                  <li>Flash QSPI <b>32 MB</b> untuk u-boot, kernel Linux, dan sistem berkas akar</li>
                  <li>Linux 4.11, waktu boot sekitar <b>2 detik</b></li>
                  <li>Pemakaian FPGA pada desain acuan: sekitar 40% sel logika, 3% blok RAM, 90% irisan DSP48</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Radio</span>
                <h3>Transceiver Analog Devices AD9364</h3>
                <ul>
                  <li>Transceiver 1×1, <b>70 MHz – 6 GHz</b>, frekuensi Tx dan Rx terpisah, arsitektur zero-IF</li>
                  <li>Laju sampel <b>233 kS/s – 61,44 MS/s</b>, I/Q 12 bit</li>
                  <li>Bank filter pra-pilih Rx empat pita dan filter Tx dua pita</li>
                  <li>Daya keluar Tx <b>+5 dBm</b>, atau <b>+28,45 dBm</b> dengan penguat luar</li>
                  <li>Sensitivitas Rx <b>−110 dBm</b>, ambang rusak masukan <b>+20 dBm</b></li>
                  <li>Bentuk gelombang, modulasi, dan rencana frekuensi UHF/VHF/S-band bisa diganti lewat perangkat lunak saja</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Mekanik dan termal</span>
                <h3>30 × 51 × 5 mm, termasuk pelindung RF</h3>
                <ul>
                  <li>Suhu operasi <b>−30 °C sampai +85 °C</b> (masih bisa jalan sampai −40 °C, tetapi akurasi TCVCXO dapat melebihi ±1 ppm di bawah −30 °C)</li>
                  <li>Sensor suhu TI <b>TMP103</b> di papan, akurasi sekitar ±1 °C</li>
                  <li>Panas dibuang lewat pelindung RF dan bantalan termal ke sirkuit termal Kratos</li>
                  <li>Perangkat lunak dapat memicu <em>watchdog</em> bila suhu mendekati +85 °C</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Antarmuka ke bus</span>
                <h3>Semuanya lewat konektor tepi</h3>
                <ul>
                  <li><b>USB 2.0 OTG</b>, tulang punggung arsitektur data Kratos</li>
                  <li>Konsol serial Linux (UART 1,8 V), JTAG</li>
                  <li>GPIO 1,8 V (3 PL + 4 PS) dan GPIO 3,3 V</li>
                  <li>Daya masuk <b>+3,3 V</b></li>
                  <li>LED daya, LED FPGA siap, dan LED detak jantung untuk telemetri kesehatan</li>
                  <li>Tiga port U.FL. Pada Kratos EM, port #1 (Rx) diarahkan ke antena UHF dan port #3 (Tx/Rx) ke antena VHF</li>
                </ul>
              </div>
            </div>

            <div className="tablewrap">
              <table className="tabel">
                <caption>Konsumsi daya Sidekiq Z2 · semua dari rel +3,3 V</caption>
                <thead><tr><th>Konfigurasi</th><th>Daya</th><th>Keterangan</th></tr></thead>
                <tbody>
                  <tr><td className="txt">Boot ke Linux, menganggur, tanpa USB</td><td>0,96 W</td><td className="txt">Dasar menganggur</td></tr>
                  <tr><td className="txt">Menganggur + USB Ethernet + SSH</td><td>0,96 W</td><td className="txt">Tautan perintah/telemetri biasa</td></tr>
                  <tr><td className="txt">Rx @ 5 MS/s</td><td>1,53 W</td><td className="txt">Penerimaan sedang</td></tr>
                  <tr><td className="txt">Rx @ 61,44 MS/s</td><td>2,2 W</td><td className="txt">Streaming Rx maksimum</td></tr>
                  <tr><td className="txt">Tx @ 5 MS/s</td><td>2,0 W</td><td className="txt">Transmisi sedang</td></tr>
                  <tr><td className="txt">Tx @ 61,44 MS/s</td><td>2,7 W</td><td className="txt">Tx maksimum</td></tr>
                  <tr><td className="txt">xcvr_benchmark @ 61,44 MS/s</td><td>2,1 W</td><td className="txt">Streaming full-duplex (Rx + Tx) bersamaan</td></tr>
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '.88rem', marginTop: '.8rem' }}>
              Operasi misi yang stabil (perintah, telemetri, dan data berkecepatan sedang) tetap jauh di bawah 2 W. Angka itu masih longgar untuk susunan surya dan baterai CubeSat pada umumnya.
            </p>
          </div>
        </section>

        {/* Konektor */}
        <section id="konektor">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Buku panduan · antarmuka</p>
              <h2>Konektor pada papan ICEPS</h2>
              <p>Muka depan papan membawa header daya dan komunikasi untuk seluruh tumpukan. Muka belakang membawa semua sambungan ke susunan surya dan mekanisme lepas-bentang.</p>
            </div>
            <div className="tablewrap">
              <table className="tabel">
                <caption>Muka depan dan atas</caption>
                <thead><tr><th>Konektor</th><th>Fungsi</th><th>Rating / jenis</th></tr></thead>
                <tbody>
                  <tr><td>BUS UTAMA PWR</td><td className="txt">Header daya tumpukan. Semua pin positif, kecuali pin 13–20 yang negatif (ground sistem).</td><td className="txt">—</td></tr>
                  <tr><td>BUS USB UTAMA</td><td className="txt">DM/DP USB 2.0. Pin 3–4 bebas untuk sinyal pengguna, pin 5–6 adalah SDA/SCL I²C. Pemetaannya sama di sisi bawah dan tembus ke seluruh tumpukan.</td><td className="txt">—</td></tr>
                  <tr><td>Header baterai</td><td className="txt">Positif dan negatif baterai, 5 V untuk sensor suhu baterai atas dan bawah, serta jalur data sensornya.</td><td className="txt">—</td></tr>
                  <tr><td>Sakelar aktivasi</td><td className="txt">Menyalakan ICEPS setelah wahana terpisah dari deployer di orbit. Pada struktur Kratos, sakelar ini ditekan batang titanium setebal 1 mm.</td><td className="txt">—</td></tr>
                  <tr><td>APU</td><td className="txt">Keluaran tak teratur langsung dari baterai, setelah RBF dan sakelar aktivasi. Polaritas ditandai ++ dan −−.</td><td className="txt">4,2 V, s.d. 20 A · Molex 87438-04</td></tr>
                  <tr><td>BH-TEMP1 / BH-TEMP2</td><td className="txt">Sensor suhu LM50C di sisi port (1) dan sisi kanan (2) wahana. Pin: GND, Vo (0–1,75 V), Vs (tengah, maks 5 V).</td><td className="txt">—</td></tr>
                  <tr><td>Radio SDR ×3</td><td className="txt">TRx (kirim/terima), Rx1 dan Rx2 (terima).</td><td className="txt">U.FL</td></tr>
                </tbody>
              </table>
            </div>
            <div className="tablewrap">
              <table className="tabel">
                <caption>Muka belakang</caption>
                <thead><tr><th>Konektor</th><th>Fungsi</th><th>Rating / jenis</th></tr></thead>
                <tbody>
                  <tr><td>DSA-PWR1 / DSA-PWR2</td><td className="txt">Masukan daya susunan surya ke konverter UMPPT. Pin +P1…+P4 dan −P1…−P4 untuk panel 1–4.</td><td className="txt">1 A/pin, 25 V · Molex 53261-04</td></tr>
                  <tr><td>AUX-UMPPT</td><td className="txt">Masukan pengisian tambahan langsung ke bus UMPPT. Dipakai di darat saat port USB sedang terisi dongle Ethernet.</td><td className="txt">87438-02</td></tr>
                  <tr><td>DSA-ACTU1 / DSA-ACTU2</td><td className="txt">Keluaran aktuasi modul DSACTRL. Sisi <b>REL</b> menggerakkan pelepas HDRM (SMA, pisau termal, atau solenoid), sisi <b>DEP</b> menggerakkan pembentang (artificial muscle, motor, atau SMA).</td><td className="txt">3 A/pin, 25 V · Molex 53261-04</td></tr>
                  <tr><td>DSA-SNS-IN1 / DSA-SNS-IN2</td><td className="txt">Kontak kering 5 V dari susunan surya DSA/DMSA yang melaporkan apakah sayap sudah lepas (REL) dan sudah membentang (DEP).</td><td className="txt">0,5 A/pin, 5 V · Molex 53261-04</td></tr>
                  <tr><td>ACT-SGNL</td><td className="txt">Sinyal aktuasi DSACTRL dari OBC. Hanya untuk debugging EXA, bukan untuk pengguna.</td><td className="txt">—</td></tr>
                  <tr><td>DSATEMP1 / DSATEMP2</td><td className="txt">Sensor suhu LM50C pada panel dasar susunan surya.</td><td className="txt">—</td></tr>
                  <tr><td>PA-EN / PA-GND</td><td className="txt">Kendali penguat radio. Pada Kratos, port ini tersambung ke sekat antena S-band. Bila aktif, optoisolator memberi 5 V ke RF-switch dan penguat MGA2500 sehingga rantai antena masuk mode <b>TRANSMIT</b>. Bila mati, radio S-band kembali ke <b>RECEIVE</b>.</td><td className="txt">2,9–3,1 V, maks 0,5 A</td></tr>
                  <tr><td>Kunci RBF</td><td className="txt"><em>Remove before launch</em>: memutus baterai dari pengisi daya dan dari seluruh sistem. Harus dicabut agar sakelar aktivasi bisa bekerja.</td><td className="txt">—</td></tr>
                  <tr><td>USB-C</td><td className="txt">Komunikasi dengan OBC (lewat dongle USB-C ke Ethernet) dan pengisian baterai.</td><td className="txt">USB-C</td></tr>
                </tbody>
              </table>
            </div>

            <div className="nota nota--awas">
              <b>Peringatan dari buku panduan · urutan lepas lalu bentang</b>
              <p>Urutannya selalu sama. Sistem <b>RELEASE</b> digerakkan lebih dulu. Setelah sensornya melaporkan <em>released</em>, barulah sistem <b>DEPLOY</b> diaktifkan.</p>
              <p>Sensor DEPLOY hanya mengabarkan ke OBC bahwa operasi selesai. Perangkat lunak OBC wajib menindaklanjutinya dengan memutus daya ke modul DSACTRL. Kalau tidak, terjadi <b>pelarian baterai</b> (<em>battery runaway</em>), karena modul itu tersambung langsung ke baterai.</p>
            </div>
          </div>
        </section>

        {/* Operasi Darat */}
        <section id="operasi">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Buku panduan · operasi darat</p>
              <h2>Mengisi daya dan masuk ke ICEPS</h2>
              <p>Urutan menyala dasarnya pendek: <b>lepas kunci peluncuran → lepas sakelar aktivasi → unit siap menerima perintah</b>. Sebelum itu, unit perlu disiapkan dan baterainya diisi.</p>
            </div>

            <p className="sub">Mengisi baterai lewat USB-C</p>
            <ol className="langkah">
              <li><span>Tahan (tekan) <b>sakelar aktivasi</b> agar tidak terlepas sendiri, misalnya dengan pita Teflon atau Kapton.</span></li>
              <li><span>Lepaskan <b>kunci peluncuran</b>.</span></li>
              <li><span>Hubungkan kabel USB-C ke <b>Intelligent Charger Module (ICM)</b>.</span></li>
              <li><span>Hubungkan ICM ke hub USB bertenaga yang mampu memberi <b>minimal 2 A</b>. ICM punya aplikasi ponsel untuk memantau dan memerintah; kode QR-nya ada di kotak asli.</span></li>
              <li><span>Sambungkan kabel USB-C ke soket USB pada papan ICEPS.</span></li>
              <li><span>ICM menampilkan arus pengisian.</span></li>
              <li><span>Baterai penuh ketika ICM menunjukkan <b>0 A</b>.</span></li>
            </ol>

            <p className="sub">Bekerja berjam-jam sambil mengisi</p>
            <div className="grid2">
              <div className="kartu">
                <span className="eyebrow">Pengisian darat · AUX-UMPPT</span>
                <h3>Catu daya teratur 6 V, 3 A</h3>
                <ul>
                  <li>ICEPS dirancang untuk siklus isi-kosong di orbit, jadi baterainya tidak akan bertahan berjam-jam tanpa diisi saat dipakai mengembangkan perangkat lunak</li>
                  <li>Kabel pengisian darat pada port AUX-UMPPT <b>meniru arus dari susunan surya</b></li>
                  <li>Nyalakan catu daya <b>hanya setelah ICEPS selesai boot</b>, dan lepaskan <b>sebelum</b> ICEPS dimatikan</li>
                  <li>Warna kabel harus cocok: <b>merah ke merah, hitam ke hitam</b>. Konektor AUX-UMPPT tidak bisa terbalik, tetapi sisi catu daya bisa, dan salah pasang berisiko merusak unit serta memicu kebakaran</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Masuk ke ICEPS</span>
                <h3>ICEPS adalah mesin Linux</h3>
                <ul>
                  <li>Tanda siap: <b>3 LED hijau</b> menyala tetap dan <b>1 LED biru</b> menyala</li>
                  <li>Sambungkan dongle USB-C ke Ethernet ke ICEPS, lalu ke sakelar Ethernet yang juga tersambung ke komputer</li>
                  <li>IP ICEPS <b>192.168.1.1</b>, IP komputer <b>192.168.1.2</b>, netmask <b>255.255.255.0</b></li>
                  <li>Masuk lewat SSH: <b>PuTTY</b> di Windows, perintah <b>ssh</b> di Linux</li>
                  <li>Rincian login ada di ICD perangkat lunak K/OS</li>
                </ul>
              </div>
            </div>

            <div className="nota">
              <b>Isi paket</b>
              <p>ICEPS 8.1K dengan prosesor Epiq Z2 terpasang, kabel pengisian USB-C, pengisi daya digital pintar USB-C/A, adaptor USB-C ke Ethernet, kunci pengaman <em>remove before launch</em>, serta sertifikat CoO/UN38.3/MSDS/TR bila menyertakan baterai BA03. Dokumen yang disertakan: ICD perangkat keras dan panduan pengguna ICEPS 8.1K, ICD dan manual perangkat lunak K/OS (bila KOS dibeli), serta laporan kinerja dan kalibrasi saluran daya.</p>
            </div>
          </div>
        </section>

        {/* K/OS */}
        <section id="kos">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Buku panduan · perangkat lunak</p>
              <h2>K/OS, sistem operasi Kratos</h2>
              <p>Perangkat lunak penerbangan Kratos berjalan di bawah Linux pada kedua inti Sidekiq Z2. Kodenya memakai API POSIX standar, pustaka IIO Analog Devices, dan kendali GPIO lewat sysfs. Empat fungsi utamanya adalah Telemetri, Perintah, Komunikasi, dan Berkas. Semuanya disusun modular agar tanggung jawabnya terpisah jelas dan kesalahan tertangkap lewat pemantauan aktif.</p>
            </div>
            <div className="grid2">
              <div className="kartu">
                <span className="eyebrow">Modul</span>
                <h3>Tujuh blok yang saling bicara</h3>
                <ul>
                  <li><b>Telemetri</b>: mengumpulkan data lewat Modul Sensor, menghitung bidang telemetri, dan mencatat galat bila nilai keluar dari ambang</li>
                  <li><b>Komunikasi (SDR-FPGA)</b>: mengoperasikan FPGA dan transceiver Z2 setiap kali pesan atau berkas dikirim ke atau diterima dari stasiun bumi</li>
                  <li><b>Perintah</b>: menjalankan perintah yang dibongkar oleh Komunikasi, lalu mencatat hasil atau galatnya</li>
                  <li><b>Berkas</b>: menjaga akses bersama dan konsistensi data yang ditulis modul lain</li>
                  <li><b>Data</b>: membaca dan menulis ke kartu SD, berisi telemetri, log galat, dan perintah yang sudah dijalankan</li>
                  <li><b>Sensor</b>: mengambil data operasi lewat ADC</li>
                  <li><b>Aktuator</b>: menjalankan tindakan fisik atas perintah dari penerjemah perintah dan Komunikasi</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Jenis misi</span>
                <h3>Dasar dan lanjutan</h3>
                <ul>
                  <li><b>Misi dasar</b>: satu muatan, berkomunikasi lewat I²C atau USB 2.0 (terpisah atau bersamaan). Uplink membawa perintah dan jadwal misi, downlink membawa suar, balasan perintah, dan berkas muatan</li>
                  <li><b>Misi lanjutan</b>: lebih dari satu muatan, lazim pada Kratos 2U, 3U, dan yang lebih besar. Misi ini perlu komputer muatan buatan QAS yang mengurus pemrosesan, penyimpanan, aktuasi, dan komunikasi tumpukan muatan, dan bisa membawa beberapa saluran uplink dan downlink</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Kesehatan dan waktu</span>
                <h3>Pengawasan dan sinkronisasi</h3>
                <ul>
                  <li>Saat mulai, semua komponen diuji dan hasilnya dicatat di <b>log boot</b></li>
                  <li>Blok <em>try-except</em> di tiap modul mencegah satu galat menghentikan seluruh operasi</li>
                  <li>Suhu atau tegangan di luar batas memicu <b>log galat</b> yang ditangani modul Rumah Tangga</li>
                  <li>Waktu disinkronkan ke <b>RTC GPS</b>. Model Teknik tidak punya jam waktu nyata, jadi pengguna disarankan menyinkronkan waktu <b>setiap jam operasi</b> dengan perintah khusus</li>
                  <li>Pada Model Penerbangan, K/OS dipasang sebagai <b>citra firmware</b> agar lebih tangguh saat memulihkan kegagalan</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Versi Indo-Hub</span>
                <h3>Yang belum terpasang</h3>
                <ul>
                  <li>Pada versi Indo-Hub, <b>Modul Penginderaan</b> dan <b>ADCS</b> tidak diinstal</li>
                  <li>Keduanya bisa dipasang kelak agar pengoperasiannya lebih mirip misi orbit sungguhan</li>
                  <li>Kamus perintah dan algoritma perintah 1–18 dirinci di panduan pengguna K/OS (tersedia sebagai gambar di PDF asli)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Telemetri */}
        <section id="telemetri">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Buku panduan · telemetri</p>
              <h2>Lima belas nilai, satu putaran tiap ±20 detik</h2>
              <p>Telemetri disimpan sebagai larik 15 elemen. Elemen 0 adalah cap waktu (8 bit), sedangkan elemen lainnya masing-masing 4 bit. Elemen 1–7 dan 14 berisi suhu, elemen 8–13 berisi tegangan. Tiga belas nilai datang dari sensor ADC. Satu putaran pembacaan butuh sekitar 20 detik, lalu hasilnya disimpan ke memori, ke RAM Sidekiq Z2, dan ke kartu SD sebelum putaran berikutnya dimulai. Bila stasiun bumi meminta satu nilai tertentu, putaran dijeda sampai nilai itu terkirim.</p>
            </div>
            <div className="tablewrap">
              <table className="tabel">
                <caption>Batas tegangan yang dipakai K/OS</caption>
                <thead><tr><th>Mnemonik</th><th>Deskripsi</th><th>Maks</th><th>Min</th></tr></thead>
                <tbody>
                  <tr><td>S_VBAT (DCH)</td><td className="txt">Tegangan baterai</td><td>4,2 V</td><td>3,6 V</td></tr>
                  <tr><td>S_STEL1</td><td className="txt">Tegangan panel surya 1</td><td>6,2 V</td><td>0 V</td></tr>
                  <tr><td>S_STEL2</td><td className="txt">Tegangan panel surya 2</td><td>6,2 V</td><td>0 V</td></tr>
                  <tr><td>S_STEL3</td><td className="txt">Tegangan panel surya 3</td><td>6,2 V</td><td>0 V</td></tr>
                  <tr><td>S_STEL4</td><td className="txt">Tegangan panel surya 4</td><td>6,2 V</td><td>0 V</td></tr>
                </tbody>
              </table>
            </div>
            <div className="tablewrap">
              <table className="tabel">
                <caption>Batas suhu yang dipakai K/OS</caption>
                <thead><tr><th>Mnemonik</th><th>Deskripsi</th><th>Maks</th><th>Min</th></tr></thead>
                <tbody>
                  <tr><td>S_TEMP1</td><td className="txt">Suhu susunan surya 1</td><td>80 °C</td><td>−50 °C</td></tr>
                  <tr><td>S_TEMP2</td><td className="txt">Suhu susunan surya 2</td><td>80 °C</td><td>−50 °C</td></tr>
                  <tr><td>S_TEMP3</td><td className="txt">Suhu susunan surya 3</td><td>80 °C</td><td>−50 °C</td></tr>
                  <tr><td>STEMP_4</td><td className="txt">Suhu susunan surya 4</td><td>80 °C</td><td>−50 °C</td></tr>
                  <tr><td>S_TBAT1</td><td className="txt">Suhu paket baterai 1</td><td>52 °C</td><td>23 °C</td></tr>
                  <tr><td>S_TBAT2</td><td className="txt">Suhu paket baterai 2</td><td>52 °C</td><td>23 °C</td></tr>
                  <tr><td>S_TEMPLSR</td><td className="txt">Suhu laser</td><td>42 °C</td><td>25 °C</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Uji Tautan Radio */}
        <section id="tautan">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Buku panduan · telekomunikasi</p>
              <h2>Uji tautan radio di laboratorium QAS</h2>
              <p>Bangku ujinya adalah jaringan Ethernet yang menghubungkan Kratos EM, satu komputer konsol untuk Kratos, dekoder QAS sebagai stasiun bumi, satu komputer konsol untuk dekoder, serta dua antena log-periodik (satu kirim, satu terima). Kratos EM dan antena dekoder dipisah <b>minimal 10–15 meter</b>. Pengujiannya dimulai dengan pesan pendek, lalu berkas, di tiap tautan.</p>
            </div>
            <div className="tablewrap">
              <table className="tabel">
                <caption>Parameter RF · kiri Kratos EM, kanan dekoder (stasiun bumi)</caption>
                <thead><tr><th>Parameter</th><th>EM · Rx</th><th>EM · Tx</th><th>Darat · Rx</th><th>Darat · Tx</th></tr></thead>
                <tbody>
                  <tr><td>Frekuensi</td><td>434 MHz</td><td>144 MHz</td><td>144 MHz</td><td>434 MHz</td></tr>
                  <tr><td>Laju sampel</td><td>2,4 Msps</td><td>2,4 Msps</td><td>2,4 Msps</td><td>2,4 Msps</td></tr>
                  <tr><td>Lebar pita RF</td><td>20 kHz</td><td>0,5 MHz</td><td>0,5 MHz</td><td>20 kHz</td></tr>
                  <tr><td>Penguatan perangkat keras</td><td>60 dB</td><td>60 dB</td><td>60 dB</td><td>60 dB</td></tr>
                  <tr><td>Ukuran buffer</td><td>19 200</td><td>32 768</td><td>32 768</td><td>19 200</td></tr>
                  <tr><td>Modulasi</td><td>BPSK</td><td>QPSK</td><td>QPSK</td><td>BPSK</td></tr>
                  <tr><td>Pembingkaian</td><td>AX.25 + QAS</td><td>CCSDS + QAS</td><td>CCSDS + QAS</td><td>AX.25 + QAS</td></tr>
                  <tr><td>Enkripsi</td><td>Tidak</td><td>Tidak</td><td>Tidak</td><td>Tidak</td></tr>
                </tbody>
              </table>
            </div>
            <div className="nota">
              <b>Cara membacanya</b>
              <p>Uplink (perintah dan berkas jadwal) turun dari stasiun bumi pada <b>434 MHz, BPSK, pita sempit 20 kHz</b>. Downlink (suar, log, telemetri, berkas muatan) naik dari wahana pada <b>144 MHz, QPSK, 0,5 MHz</b>. Pita downlink lebih lebar karena datanya lebih banyak. Modulasi, pembingkaian, dan koreksi galat (FEC) ditambahkan di modul FPGA dengan C++, sedangkan AD9364 hanya menerima frekuensi, laju sampel, lebar pita, penguatan, dan ukuran buffer.</p>
            </div>
          </div>
        </section>

        {/* Pengujian */}
        <section id="pengujian">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Buku panduan · pengujian</p>
              <h2>Uji yang menyertai setiap unit</h2>
              <p>Setiap unit dikirim dengan laporan uji. Model Rekayasa (EM) hanya menjalani uji fungsi, sedangkan Model Penerbangan (FM) menjalani seluruhnya.</p>
            </div>
            <div className="tablewrap">
              <table className="tabel">
                <caption>Laporan uji ICEPS</caption>
                <thead><tr><th>Uji</th><th>Model rekayasa</th><th>Model penerbangan</th></tr></thead>
                <tbody>
                  <tr><td className="txt">Fungsional</td><td className="ya">Ya</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Getaran</td><td className="tidak">Tidak</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Siklus termal</td><td className="tidak">Tidak</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Vakum termal</td><td className="tidak">Tidak</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Proteksi penggembungan vakum (baterai)</td><td className="tidak">Tidak</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Integritas kabel/konektor</td><td className="ya">Ya</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Isi berlebih / kosong berlebih</td><td className="ya">Ya</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Fungsi MCU &amp; komunikasi</td><td className="ya">Ya</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Integritas sensor &amp; aktuator MCU</td><td className="ya">Ya</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">RBF &amp; sakelar aktivasi (100 kali)</td><td className="ya">Ya</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Lepas/bentang susunan surya &amp; keluaran sensor</td><td className="ya">Ya</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Pengelola surya UMPPT</td><td className="ya">Ya</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Kinerja</td><td className="ya">Ya</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Proteksi hubung singkat</td><td className="ya">Ya</td><td className="ya">Ya</td></tr>
                  <tr><td className="txt">Beku / panas berlebih</td><td className="tidak">Tidak</td><td className="ya">Ya</td></tr>
                </tbody>
              </table>
            </div>
            <div className="nota">
              <b>Panggang termal dan getaran</b>
              <p>Panggang termal dilakukan pada <b>10⁻⁷ mbar, 50 °C, selama 48 jam</b>. Uji getaran penuh tersedia untuk profil Falcon 9, Falcon Heavy, Soyuz, Electron, Vega, Ariane 5, PSLV, dan GSLV. Profil wahana peluncur lain tersedia atas permintaan.</p>
            </div>

            <div className="nota">
              <b>Beda angka antara lembar EXA dan buku panduan</b>
              <p>Beberapa angka di buku panduan tidak sama dengan lembar promosi EXA di bagian Spesifikasi. Keduanya dibiarkan apa adanya:</p>
              <p><b>Komputer</b>: lembar EXA menulis “Xlink ARM9 733 MHz”, buku panduan menulis ARM Cortex-A9 dua inti 733 MHz pada Xilinx Zynq. Kemungkinan besar keduanya menunjuk prosesor yang sama. <b>Penyimpanan</b>: lembar EXA menulis sampai 512 GB. Buku panduan menulis 512 GB di satu tempat dan 1024 GB di tempat lain. <b>Port USB</b>: lembar EXA menulis 8 perangkat pengguna. Buku panduan menyebut 8 port eksternal di satu tempat, dan di tempat lain hub 12 port dengan 8 dipakai ICEPS dan 6 tersedia (jumlahnya tidak genap 12). <b>Baterai</b>: lembar EXA menulis BAO3, buku panduan menulis BA03.</p>
            </div>
          </div>
        </section>

        {/* Galeri */}
        <section id="galeri">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Galeri</p>
              <h2>Galeri foto</h2>
              <p>Foto asli Kratos Bus 1B dari EXA dan dari buku panduan Kratos. Klik foto untuk melihatnya dalam ukuran penuh.</p>
            </div>
            <div className="galeri galeri--foto">
              <figure>
                <a href={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-main-600x400.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-main-600x400.jpg')} alt="Kratos 1B dengan sayap surya terbentang penuh" loading="lazy" />
                </a>
                <figcaption><b>Terbentang</b>Kratos 1B dengan keenam panel surya DMSA terbentang, seperti saat bekerja di orbit.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-2.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-2.jpg')} alt="Kratos 1B terlipat di samping jangka sorong" loading="lazy" />
                </a>
                <figcaption><b>Terlipat</b>Dalam keadaan terlipat, seluruh wahana muat dalam kotak 1U — jangka sorong di sampingnya memperlihatkan ukurannya.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-7.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-7.jpg')} alt="Kratos 1B terlipat dengan tali remove before launch" loading="lazy" />
                </a>
                <figcaption><b>Remove before launch</b>Tali merah pengaman memutus baterai dari seluruh sistem selama penanganan di darat.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/kratos-perisai-emas.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/kratos-perisai-emas.jpg')} alt="Kratos dengan perisai emas SEAM/NEMEA" loading="lazy" />
                </a>
                <figcaption><b>Perisai SEAM/NEMEA</b>Lembaran emas di satu muka badan adalah perisai yang menjaga suhu dalam 10 °C dan menahan radiasi.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-3.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-3.jpg')} alt="Lembar keterangan perisai SEAM/NEMEA dari EXA" loading="lazy" />
                </a>
                <figcaption><b>Lembar EXA · perisai</b>Keterangan resmi EXA tentang perisai SEAM/NEMEA.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-4.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-4.jpg')} alt="Bagian dalam Kratos dengan papan ICEPS dan baterai" loading="lazy" />
                </a>
                <figcaption><b>Bagian dalam</b>Papan ICEPS dan baterai BAO3 di dalam badan wahana.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/kratos-iceps-papan.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/kratos-iceps-papan.jpg')} alt="Papan ICEPS 8.1K" loading="lazy" />
                </a>
                <figcaption><b>ICEPS 8.1K</b>Satu kartu 96 × 96 × 25 mm yang memuat catu daya, komputer, radio SDR, penyimpanan, dan komunikasi laser.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/kratos-iceps-pegang.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/kratos-iceps-pegang.jpg')} alt="Papan ICEPS terpasang pada unit" loading="lazy" />
                </a>
                <figcaption><b>ICEPS terpasang</b>ICEPS dengan komputer Sidekiq Z2 terpasang — foto dari buku panduan.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/kratos-menyala.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/kratos-menyala.jpg')} alt="Unit Kratos menyala dengan LED biru" loading="lazy" />
                </a>
                <figcaption><b>Siap menerima perintah</b>Tiga LED hijau dan satu LED biru menyala: ICEPS sudah boot dan siap dimasuki lewat SSH.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/kratos-pengisi-icm.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/kratos-pengisi-icm.jpg')} alt="Intelligent Charger Module menampilkan arus pengisian" loading="lazy" />
                </a>
                <figcaption><b>Mengisi baterai</b>Intelligent Charger Module menampilkan tegangan dan arus. Baterai penuh ketika arusnya menunjukkan 0 A.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-5.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-5.jpg')} alt="Lembar keterangan struktur, magnetorquer, antena, dan sensor" loading="lazy" />
                </a>
                <figcaption><b>Lembar EXA · struktur</b>Rangka Al T6061, artificial muscles, magnetorquer, antena tertanam, dan massa 500 gram.</figcaption>
              </figure>
              <figure>
                <a href={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-6.jpg')} target="_blank" rel="noopener">
                  <img src={withBasePath('/_nano/foto/KRATOS-1U-CubeSat-Platform-6.jpg')} alt="Lembar keterangan kapasitas muatan" loading="lazy" />
                </a>
                <figcaption><b>Lembar EXA · muatan</b>Ruang muatan ¾ U: sampai enam papan tipis atau tiga kamera.</figcaption>
              </figure>
            </div>
          </div>
        </section>
      </main>

      <Footer moduleName="Kratos Bus 1B" />
    </div>
  );
}
