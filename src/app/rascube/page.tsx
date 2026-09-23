'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NanoViewerStage, { NanoPoint, NanoTourStep } from '@/components/viewer/NanoViewerStage';
import Link from 'next/link';
import { withBasePath } from '@/utils/basePath';

const rascubePoints: NanoPoint[] = [
  {
    n: 1, label: 'Antena cambuk',
    pos: [2.5, 11.8, -0.3], pandang: { yaw: -0.55, pitch: 0.32 },
    teks: 'Batang tunggal pada dudukan berulir di dek, dipasang menepi supaya tidak menaungi antena patch. Pada kit kelas, antena inilah yang mengirim data sensor ke perangkat lunak Mission Control di meja sebelah — bukan ke stasiun bumi.',
    rinci: [
      'Dudukan berulir di dek atas',
      'Mengirim data ke Mission Control secara nirkabel',
      'QSG: radio LoRa 915 MHz, frekuensinya sedikit beda per nomor seri',
      'QSG: jangan nyalakan kit tanpa antena terpasang, karena pemancarnya bisa rusak'
    ]
  },
  {
    n: 2, label: 'Antena patch',
    pos: [-2.2, 5.5, -0.3], pandang: { yaw: -0.4, pitch: 0.95 },
    teks: 'Pelat tembaga yang menempel rata pada dek dan menyerong beberapa derajat agar bebas dari dudukan cambuk. Bentuk rata seperti ini yang dipakai satelit sungguhan untuk penerima navigasi.',
    rinci: [
      'Menempel rata pada dek',
      'Posisi GPS termasuk data yang dikumpulkan kit',
      'QSG: papan antena punya dua konektor, “GPS” dari Modul Sensor dan “Telem” dari Modul Telemetri'
    ]
  },
  {
    n: 3, label: 'Bidang sablon',
    pos: [0, 2.2, 5.1], pandang: { yaw: 0.12, pitch: 0.12 },
    teks: 'Nama pembuat disablon langsung pada dinding depan — dinding yang tetap terbaca ketika kit sudah berdiri di meja. Dua baris kecil di bawahnya tidak terbaca pada render sumber, jadi tidak ikut dibangun di model ini.',
    rinci: ['Robinson Aerospace Systems, Australia Selatan']
  },
  {
    n: 4, label: 'Konektor depan',
    pos: [0, -0.3, 5.6], pandang: { yaw: 0.25, pitch: 0.05 },
    teks: 'Empat konektor dikumpulkan pada satu dinding: satu bundar besar di tengah, dua persegi mengapitnya, satu lonjong kecil di bawah. Mengumpulkannya di satu sisi membuat urutan mencolok selalu sama, dan itu penting saat satu kit dipakai bergantian oleh banyak kelompok.',
    rinci: [
      'Satu bundar, dua persegi, satu lonjong',
      'Label cetaknya tidak terbaca pada render sumber',
      'QSG: konektor USB dan kamera berada pada satu sisi yang sama',
      'QSG: pin RBF masuk ke lubang bertanda “ON/OFF”, dan dicabut untuk menyalakan kit'
    ]
  },
  {
    n: 5, label: 'Panel berlubang',
    pos: [-5.1, -2.1, 0], pandang: { yaw: -1.35, pitch: 0.1 },
    teks: 'Dua panel berlubang pada tiap dinding samping, dibenamkan ke dalam dinding dan bukan ditempel di atasnya. Lubangnya mengalirkan udara saat kit bekerja di meja — hal yang justru tidak berguna di orbit, tempat panas hanya bisa keluar sebagai radiasi.',
    rinci: [
      'Dua per dinding samping',
      'Untuk aliran udara di meja, bukan untuk orbit',
      'QSG: dinding samping ada dua tipe, A (bertakik, tanpa ulir) dan B (berulir perak)'
    ]
  },
  {
    n: 6, label: 'Tiang sudut',
    pos: [4.7, -3.4, 4.7], pandang: { yaw: 0.8, pitch: 0.15 },
    teks: 'Empat tiang inilah rangka kit: dinding, dek, dan pelat dasar semuanya disekrupkan padanya. Susunannya meniru rel sudut CubeSat sungguhan, tetapi tujuannya berbeda — supaya bisa dibongkar pasang berulang kali.',
    rinci: [
      'Rangka aluminium yang dirakit siswa sendiri',
      'Bagian pertama dalam urutan perakitan',
      'QSG: empat rel tepi dengan sisipan ulir kuningan, kaki flanel di dasarnya'
    ]
  }
];

const rascubeTourSteps: NanoTourStep[] = [
  {
    judul: 'Ini RASCube V2',
    pandang: { yaw: -0.62, pitch: 0.26 },
    teks: 'RASCube V2 adalah kit satelit pendidikan berbentuk CubeSat 1U buatan Robinson Aerospace Systems, Australia Selatan. Siswa merakitnya sendiri dalam delapan belas langkah. Tur ini mengikuti urutan yang sama: rangka dulu, lalu dinding, konektor, dan terakhir antena.'
  },
  {
    n: 6,
    teks: 'Perakitan dimulai dari rangka: empat rel tepi aluminium dengan sisipan ulir kuningan. Dinding samping disekrupkan ke rel ini, lalu kaki flanel ditempel di dasarnya supaya kit tidak menggores meja.'
  },
  {
    n: 5,
    teks: 'Dinding samping ada dua tipe: A bertakik tanpa ulir, B dengan ulir perak mengkilap. Panel berlubangnya mengalirkan udara saat kit menyala di meja — satelit sungguhan di orbit hanya bisa membuang panas sebagai radiasi.'
  },
  {
    n: 4,
    teks: 'Di dalam, tumpukan elektronik tersusun dari bawah ke atas: EPS dengan dua baterai 18650, OBC dengan kartu microSD, Modul Sensor, dan Modul Telemetri. Konektor USB dan kamera menghadap ke satu sisi, dan pin RBF masuk ke lubang bertanda ON/OFF.'
  },
  {
    n: 2,
    teks: 'Papan antena dipasang di puncak. Kabel RF dari Modul Sensor masuk ke konektor GPS-nya. Antena patch yang rata seperti ini adalah bentuk yang lazim dipakai penerima navigasi, juga pada satelit sungguhan.'
  },
  {
    n: 1,
    teks: 'Antena cambuk mengirim data ke komputer lewat LoRa 915 MHz. Tiap nomor seri memakai frekuensi yang sedikit berbeda, jadi banyak kit bisa menyala di satu kelas tanpa saling mengganggu. Jangan pernah menyalakan kit tanpa antena ini terpasang.'
  },
  {
    n: 3,
    teks: 'Nama pembuatnya tercetak di dinding depan. Untuk menyalakan kit: tancapkan penerima USB, buka ui.robinson-aerospace.com di Chrome atau Edge, ketik nomor seri, lalu cabut pin RBF dan jangan sentuh kit selama 5 detik. Tur selesai; klik nomor mana pun untuk menjelajah sendiri.'
  }
];

const rascubeLayers = {
  rangka: 'Rangka dan tiang',
  dinding: 'Dinding',
  jala: 'Panel berlubang',
  dek: 'Dek atas',
  antena: 'Antena',
  konektor: 'Konektor'
};

const rascubeViews = {
  depan: { yaw: 0.0001, pitch: 0.10 },
  samping: { yaw: -Math.PI / 2, pitch: 0.10 },
  atas: { yaw: 0.0001, pitch: 1.25 },
  belakang: { yaw: Math.PI, pitch: 0.12 }
};

export default function RasCubePage() {
  return (
    <div data-mission="rascube">
      <Header currentMission="rascube" />

      <main id="main">
        {/* Hero Section */}
        <div className="wrap hero">
          <p className="eyebrow"><b>Modul 03 · Kit latihan</b> · replika CubeSat 1U</p>
          <h1>RASCube <span>V2</span></h1>
          <p className="hero__sub">
            Kit satelit pendidikan buatan Robinson Aerospace Systems, dirancang dan diproduksi sendiri di Australia Selatan. Siswa merakitnya dari rangka aluminium sampai antena — urutan yang sama dengan perakitan satelit sungguhan — lalu membaca datanya langsung di perangkat lunak Mission Control.
          </p>

          <div className="facts">
            <div><span className="k">Pembuat</span><span className="v">Robinson Aerospace</span></div>
            <div><span className="k">Bentuk</span><span className="v">Replika 1U</span></div>
            <div><span className="k">Jenis data</span><span className="v">50+ macam</span></div>
            <div><span className="k">Pemrograman</span><span className="v">Arduino</span></div>
            <div><span className="k">Terpakai</span><span className="v">1.500+ kit</span></div>
            <div><span className="k">Radio</span><span className="v">LoRa 915 MHz</span></div>
            <div><span className="k">Baterai</span><span className="v">2 × 18650</span></div>
          </div>
        </div>

        {/* 3D Stage & Hotspots */}
        <NanoViewerStage
          modelType="rascube"
          cornerText="RASCube V2 · model 3D"
          points={rascubePoints}
          layers={rascubeLayers}
          views={rascubeViews}
          initialView={{ yaw: -0.62, pitch: 0.26 }}
          tourSteps={rascubeTourSteps}
          hasDeploySlider={false}
        />

        {/* Kit Latihan Section */}
        <section id="kit">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Kit latihan</p>
              <h2>Dirakit sendiri, dibaca seperti satelit sungguhan</h2>
              <p>RASCube V2 adalah replika CubeSat 1U yang dirakit sendiri oleh siswa. Yang dilatih bukan penerbangannya, melainkan urutan kerja dan penanganan data satelit.</p>
            </div>
            <div className="grid2">
              <div className="kartu">
                <span className="eyebrow">Urutan perakitan</span>
                <h3>Sama dengan satelit sungguhan</h3>
                <ul>
                  <li>Mulai dari <b>rangka aluminium</b></li>
                  <li>Lalu <b>elektronik</b> di dalamnya</li>
                  <li><b>Panel surya</b> di luarnya</li>
                  <li>Terakhir <b>antena</b></li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Data</span>
                <h3>Lebih dari 50 macam</h3>
                <ul>
                  <li>Pemakaian daya, orientasi, percepatan</li>
                  <li>Kuat medan magnet, posisi GPS, suhu</li>
                  <li>Citra dari kamera</li>
                  <li>Dikirim <b>nirkabel</b> ke <b>Mission Control</b> dan tampil sebagai grafik langsung</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Yang baru di V2</span>
                <h3>Dibanding versi sebelumnya</h3>
                <ul>
                  <li><b>Kamera</b></li>
                  <li><b>Kartu SD</b></li>
                  <li>Komunikasi <b>nirkabel dua arah</b></li>
                  <li><b>Sensor tambahan</b></li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Pemakai</span>
                <h3>Dari kelas sampai industri</h3>
                <ul>
                  <li>SMA dan perguruan tinggi</li>
                  <li>Pelatihan industri</li>
                  <li>Diprogram dengan <b>Arduino</b> dan pustaka RASCube</li>
                  <li>Lebih dari <b>1.500 kit</b> terpakai di berbagai negara</li>
                </ul>
              </div>
            </div>

            <div className="nota">
              <b>Batasnya perlu diketahui</b>
              <p>
                RASCube V2 dirancang sebagai replika dan <strong>tidak dimaksudkan untuk terbang ke orbit</strong>. Menurut panduan resminya, kit ini dibuat untuk dipakai di kelas, di atas meja, dan tidak akan bertahan terhadap suhu dan radiasi antariksa. Kit ini boleh dibawa terbang dengan balon cuaca, tetapi pembuatnya tidak menganjurkannya dan belum pernah mengujinya. Pemulihan kit yang diterbangkan menjadi tanggung jawab pemakai. Pembuatnya menyatakan pernah menerbangkan versi yang dimodifikasi, RASCube-1, ke orbit pada Juni 2025 — tetapi itu wahana tersendiri, bukan kit kelas yang dijual.
              </p>
              <p style={{ marginTop: '0.6rem' }}>
                Perbedaan ini penting saat mengajar: kit ini melatih urutan kerja, cara berpikir, dan penanganan data satelit — bukan menyiapkan perangkat yang akan diterbangkan. Bandingkan dengan <Link href="/kratos">Kratos Bus 1B</Link> di modul berikutnya, yang memang bus wahana untuk terbang.
              </p>
            </div>
          </div>
        </section>

        {/* Spesifikasi Section */}
        <section id="spesifikasi">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Spesifikasi</p>
              <h2>Menurut keterangan pembuatnya</h2>
              <p>Hanya yang dinyatakan Robinson Aerospace Systems, di situs mereka dan di Quick Start Guide V2.0. Angka yang tidak mereka sebut dibiarkan kosong, bukan dikira-kira.</p>
            </div>
            <div className="tablewrap">
              <table>
                <caption>RASCube V2</caption>
                <tbody>
                  <tr><th>Pembuat</th><td>Robinson Aerospace Systems, Australia Selatan</td></tr>
                  <tr><th>Bentuk</th><td>Replika CubeSat 1U, dirakit sendiri</td></tr>
                  <tr><th>Sasaran pengguna</th><td>SMA, perguruan tinggi, pelatihan industri</td></tr>
                  <tr><th>Jenis data</th><td>Lebih dari 50 macam dari sensor di dalamnya</td></tr>
                  <tr><th>Pemrograman</th><td>Arduino, dengan pustaka RASCube</td></tr>
                  <tr><th>Perangkat lunak</th><td>Mission Control, menampilkan data langsung</td></tr>
                  <tr><th>Tambahan pada V2</th><td>Kamera, kartu SD, nirkabel dua arah, sensor tambahan</td></tr>
                  <tr><th>Jumlah terpakai</th><td>Lebih dari 1.500 kit di berbagai negara</td></tr>
                  <tr><th>Modul elektronik</th><td>EPS, OBC, Sensor, Telemetri, Prototyping, papan antena</td></tr>
                  <tr><th>Radio</th><td>LoRa 915 MHz, frekuensi sedikit berbeda per nomor seri</td></tr>
                  <tr><th>Catu daya</th><td>2 × sel Li-ion 18650 berproteksi, 3 panel surya</td></tr>
                  <tr><th>Penyimpanan</th><td>Kartu microSD pada OBC</td></tr>
                  <tr><th>Antarmuka pengguna</th><td>Peramban (Chrome, Edge) lewat penerima USB</td></tr>
                  <tr><th>Usia pemakai</th><td>12 tahun ke atas</td></tr>
                  <tr><th>Garansi</th><td>2 tahun (pembelian baru di Australia)</td></tr>
                  <tr><th>Tujuan terbang</th><td>Kelas dan meja kerja; balon cuaca mungkin tetapi tidak dianjurkan dan belum diuji; bukan untuk orbit</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Panduan Resmi Section */}
        <section id="panduan">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow"><b>Panduan resmi</b> · Quick Start Guide V2.0, Nov 2024</p>
              <h2>Isi Quick Start Guide RASCube</h2>
              <p>Bagian berikut diringkas dan diterjemahkan dari <em>Quick Start Guide</em> (QSG) V2.0 yang disertakan Robinson Aerospace Systems di dalam kotak kit. Panduan aslinya berbahasa Inggris dan sebagian besar berupa foto langkah demi langkah, jadi ringkasan ini paling berguna bila dibaca berdampingan dengan PDF-nya.</p>
              <nav className="lompat" aria-label="Isi panduan" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <a href="#isi-kit" className="btn">Isi kit</a>
                <a href="#perakitan" className="btn">Perakitan</a>
                <a href="#menyalakan" className="btn">Menyalakan &amp; nirkabel</a>
                <a href="#keselamatan" className="btn">Keselamatan</a>
                <a href={withBasePath('/_nano/dokumen/rascube-qsg-v2.pdf')} target="_blank" rel="noopener noreferrer" className="btn" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>Buka PDF asli ↗</a>
              </nav>
            </div>
            <div className="grid2">
              <div className="kartu">
                <span className="eyebrow">Glosarium</span>
                <h3>Istilah yang dipakai panduan</h3>
                <ul>
                  <li><b>EPS</b>: <em>Electrical Power System</em>, modul yang mengisi baterai dan membagi daya</li>
                  <li><b>OBC</b>: <em>On-Board Computer</em>, modul yang mengerjakan sebagian besar pemrosesan satelit</li>
                  <li><b>RBF</b>: <em>Remove Before Flight</em>, pin pengaman yang dicabut sebelum terbang</li>
                  <li><b>RF</b>: <em>Radio Frequency</em>, frekuensi radio</li>
                  <li><b>UI</b>: <em>User Interface</em>, perangkat lunak komputer untuk menampilkan data</li>
                  <li><b>Telemetri</b>: pengiriman data tanpa kabel</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Sebelum mulai</span>
                <h3>Empat pesan dari pembuatnya</h3>
                <ul>
                  <li><b>Pelan-pelan saja.</b> RASCube adalah satelit, dan satelit sungguhan dirakit dengan sangat hati-hati dalam waktu lama</li>
                  <li><b>Baca teks dan panahnya.</b> Teks tiap langkah menentukan hasilnya, dan panah menunjukkan arah pemasangan. Jangan hanya melihat fotonya</li>
                  <li><b>Jangan terlalu kencang.</b> Sekrup cukup sampai tidak mudah berputar lagi, dan standoff cukup dikencangkan dengan tangan. Ulir bisa rusak bila dipaksa</li>
                  <li><b>Kenali dinding A dan B.</b> Tipe A tanpa ulir dan punya takik kecil, tipe B punya ulir perak mengkilap</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Isi Kit Section */}
        <section id="isi-kit">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Panduan · daftar komponen</p>
              <h2>Isi satu kotak kit</h2>
              <p>Isi kit bisa sedikit berbeda menurut nomor versi dan ketersediaan pemasok. Beberapa foto di panduan masih memakai komponen praproduksi.</p>
            </div>
            <div className="tablewrap">
              <table>
                <caption>Daftar komponen RASCube V2</caption>
                <thead><tr><th>Kelompok</th><th>Komponen</th></tr></thead>
                <tbody>
                  <tr><td>Struktur</td><td><b>4</b> rel tepi · <b>2</b> dinding samping A (tanpa ulir) · <b>2</b> dinding samping B (berulir) · <b>1</b> panel akses samping · <b>1</b> pelat dasar · <b>1</b> pelat atas · <b>6</b> kaki flanel · <b>1</b> baut mata (<em>eye bolt</em>)</td></tr>
                  <tr><td>Elektronik</td><td><b>1</b> Modul EPS · <b>1</b> Modul OBC · <b>1</b> Modul Sensor · <b>1</b> Modul Telemetri · <b>1</b> Modul Prototyping · <b>1</b> papan antena · <b>1</b> antena · <b>3</b> panel surya · kartu microSD</td></tr>
                  <tr><td>Daya</td><td><b>2</b> baterai 18650 · <b>1</b> pin RBF · <b>2</b> jumper 2P</td></tr>
                  <tr><td>Kabel</td><td><b>3</b> kabel pita (<em>ribbon</em>) · <b>2</b> kabel RF</td></tr>
                  <tr><td>Pengikat</td><td><b>15</b> standoff M-F 12 mm · <b>5</b> standoff F-F 19 mm · <b>25</b> sekrup 6 mm · <b>35</b> sekrup 8 mm</td></tr>
                  <tr><td>Ke komputer</td><td><b>1</b> penerima USB</td></tr>
                </tbody>
              </table>
            </div>

            <p className="eyebrow" style={{ marginTop: '2rem' }}>Tumpukan elektronik, dari bawah ke atas</p>
            <div className="grid2">
              <div className="kartu">
                <span className="eyebrow">Paling bawah</span>
                <h3>Modul EPS</h3>
                <ul>
                  <li>Memegang <b>dua baterai 18650</b> dan mengisi serta membagi daya</li>
                  <li>Tiga konektor surya di sisi kirinya tersambung ke tiga panel surya lewat kabel pita</li>
                  <li>Dipasang pada pelat dasar dengan standoff 19 mm dan 12 mm</li>
                  <li>Jumper 2P dipasang pada pin kecil di bawah modul ini</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Di atas EPS</span>
                <h3>Modul OBC</h3>
                <ul>
                  <li>Komputer utama kit, dengan <b>slot kartu microSD</b></li>
                  <li>Tersambung ke EPS lewat <b>40 pin</b> “Main Stack” yang harus lurus sempurna</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Di atas OBC</span>
                <h3>Modul Sensor</h3>
                <ul>
                  <li>Kabel RF-nya tersambung ke konektor <b>“GPS”</b> (kiri) pada papan antena</li>
                  <li>Konektor USB dan kamera tumpukan ini menghadap ke bawah saat dimasukkan ke rangka</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Paling atas</span>
                <h3>Modul Telemetri dan papan antena</h3>
                <ul>
                  <li>Kabel RF Modul Telemetri tersambung ke konektor <b>“Telem”</b> (kanan) pada papan antena</li>
                  <li>Papan antena disekrup ke pelat atas, lalu antena diputar ke konektornya dan baut mata dipasang di tengah</li>
                  <li>Panah <b>“on/off and program”</b> pada papan antena harus menunjuk ke sisi konektor USB</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 18 Langkah Perakitan */}
        <section id="perakitan">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Panduan · delapan belas langkah</p>
              <h2>Rangka dulu, lalu elektronik, lalu disatukan</h2>
              <p>Urutannya sama dengan satelit sungguhan: struktur dibangun lebih dulu, tumpukan elektronik dirakit terpisah, lalu keduanya disatukan dan ditutup dengan panel surya. Di tiap langkah, pasang sekrup longgar dulu sebelum dikencangkan, dan jangan terlalu kencang.</p>
            </div>

            <p className="eyebrow" style={{ color: 'var(--accent)' }}>Struktur · langkah 1–5</p>
            <div className="grid2" style={{ marginBottom: '2rem' }}>
              <div className="kartu">
                <span className="eyebrow">Langkah 01</span>
                <p>Sekrup <b>dinding A</b> (yang bertakik) ke <b>rel tepi</b> dengan sekrup 6 mm. Sisipan ulir kuningan pada rel harus menghadap ke kita. Buat <b>dua</b> rakitan seperti ini.</p>
              </div>
              <div className="kartu">
                <span className="eyebrow">Langkah 02</span>
                <p>Sekrup satu rel tepi lagi ke tiap rakitan langkah 1. Bila kaki flanel sudah terpasang, pastikan semuanya menghadap ke arah yang sama.</p>
              </div>
              <div className="kartu">
                <span className="eyebrow">Langkah 03</span>
                <p>Sekrup <b>dua dinding B</b> (berulir) ke salah satu rakitan langkah 2.</p>
              </div>
              <div className="kartu">
                <span className="eyebrow">Langkah 04 &amp; 05</span>
                <p>Satukan rakitan di sepanjang kedua rel tepi. Kunci L dimasukkan lewat takik. Tempelkan <b>kaki flanel</b> di dasar tiap rel tepi.</p>
              </div>
            </div>

            <p className="eyebrow" style={{ color: 'var(--accent)' }}>Elektronik · langkah 6–11</p>
            <div className="grid2" style={{ marginBottom: '2rem' }}>
              <div className="kartu">
                <span className="eyebrow">Langkah 06</span>
                <p>Pasang <b>dua baterai 18650</b> ke Modul EPS. Perhatikan kutub +. Salah pasang bisa merusak elektronik atau membahayakan.</p>
              </div>
              <div className="kartu">
                <span className="eyebrow">Langkah 07 &amp; 08</span>
                <p>Sekrup empat standoff 19 mm ke pelat dasar aluminium, lalu pasang Modul EPS di atasnya dengan standoff 12 mm. Sekrup ujung siku kabel RF ke Modul Sensor dan Telemetri.</p>
              </div>
              <div className="kartu">
                <span className="eyebrow">Langkah 09 &amp; 10</span>
                <p>Tumpuk <b>Modul OBC</b> di atas EPS dengan standoff 12 mm, lalu masukkan kartu microSD. Sambungkan kabel pita ke 3 konektor surya di kiri EPS.</p>
              </div>
              <div className="kartu">
                <span className="eyebrow">Langkah 11</span>
                <p>Tambahkan <b>Modul Sensor</b>, lalu <b>Modul Telemetri</b> dengan standoff di antaranya. Tumpukan elektronik selesai setelah Modul Telemetri disekrup.</p>
              </div>
            </div>

            <p className="eyebrow" style={{ color: 'var(--accent)' }}>Integrasi · langkah 12–18</p>
            <div className="grid2">
              <div className="kartu">
                <span className="eyebrow">Langkah 12 &amp; 13</span>
                <p>Sejajarkan tumpukan elektronik dengan rangka: konektor USB dan kamera menghadap ke bawah. Geser pelan-pelan ke dalam rangka dan kunci dengan 4 sekrup ke pelat dasar.</p>
              </div>
              <div className="kartu">
                <span className="eyebrow">Langkah 14 &amp; 15</span>
                <p>Sekrup papan antena ke pelat atas, putar antena ke konektornya, dan pasang baut mata. Sambungkan kabel RF: Sensor ke “GPS” (kiri), Telemetri ke “Telem” (kanan).</p>
              </div>
              <div className="kartu">
                <span className="eyebrow">Langkah 16 &amp; 17</span>
                <p>Sekrup papan antena ke puncak satelit. Sekrup panel akses samping, sambungkan kabel pita ke tiap panel surya, lalu sekrup ketiga panel suryanya.</p>
              </div>
              <div className="kartu">
                <span className="eyebrow">Langkah 18</span>
                <p>Masukkan <b>pin RBF</b> ke lubang bertanda “ON/OFF”, lalu pasang <b>jumper 2P</b> ke pin kecil di bawah Modul EPS. Kit selesai dirakit!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Menyalakan & Nirkabel */}
        <section id="menyalakan">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Panduan · menyambung ke komputer</p>
              <h2>Menyalakan RASCube dan membaca datanya</h2>
              <p>RASCube tidak butuh perangkat lunak yang dipasang. Datanya dibaca lewat peramban, dari penerima USB yang ditancapkan ke komputer.</p>
            </div>
            <div className="grid2" style={{ marginBottom: '1.5rem' }}>
              <div className="kartu">
                <span className="eyebrow">4 Langkah Aktivasi</span>
                <ul>
                  <li>1. Tancapkan <b>penerima USB</b> ke port USB komputer.</li>
                  <li>2. Buka peramban <b>Chrome</b> atau <b>Edge</b> dan kunjungi <b>ui.robinson-aerospace.com</b>.</li>
                  <li>3. Pilih penerima USB dari menu tarik-turun, lalu masukkan <b>nomor seri</b> kit Anda.</li>
                  <li>4. <b>Cabut pin RBF</b> untuk menyalakan satelit, lalu <b>jangan sentuh</b> selama 5 detik.</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Sistem Nirkabel LoRa</span>
                <h3>Komunikasi LoRa 915 MHz</h3>
                <ul>
                  <li>RASCube berkomunikasi lewat frekuensi <b>LoRa 915 MHz</b></li>
                  <li>Tiap nomor seri memakai frekuensi yang sedikit berbeda sehingga banyak kit dapat menyala bersamaan di satu ruang kelas</li>
                  <li>Tersedia opsi pengiriman data lewat <b>kabel USB langsung</b></li>
                </ul>
              </div>
            </div>

            <div className="nota">
              <b>Privasi Data Lokal</b>
              <p>Semua data yang dikirim ke antarmuka RASCube disimpan <b>secara lokal dan sementara</b> di komputer pengguna. Tidak ada data yang dikirim atau disimpan di server luar, termasuk lokasi koordinat GPS.</p>
            </div>
          </div>
        </section>

        {/* Keselamatan */}
        <section id="keselamatan">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Panduan · keselamatan &amp; garansi</p>
              <h2>Yang harus diperhatikan di ruang kelas</h2>
              <p>RASCube dirancang untuk pengguna usia <b>12 tahun ke atas</b> dengan penanganan modul secara berhati-hati.</p>
            </div>
            <div className="grid2">
              <div className="kartu">
                <span className="eyebrow">Baterai 18650</span>
                <h3>Penanganan Baterai Li-ion</h3>
                <ul>
                  <li>Gunakan hanya sel baterai 18650 <b>dengan proteksi sirkuit</b></li>
                  <li>Jangan menghubung-singkatkan kutub positif dan negatif</li>
                  <li>Jangan gunakan pada suhu lingkungan di atas 50 °C</li>
                  <li>Selalu matikan RASCube sebelum melepas baterai</li>
                </ul>
              </div>
              <div className="kartu">
                <span className="eyebrow">Perangkat Keras</span>
                <h3>Elektronik &amp; Antena</h3>
                <ul>
                  <li><b>Jangan pernah menyalakan kit tanpa antena terpasang</b> karena pemancar RF bisa rusak</li>
                  <li>Pastikan ke-40 pin header tumpukan selalu lurus sebelum dirangkai</li>
                  <li>Kunci L hanya digunakan untuk sekrup kit</li>
                  <li>Jauhkan dari air dan kelembapan berlebih</li>
                </ul>
              </div>
            </div>

            <div className="nota nota--awas">
              <b>Bukan untuk Peluncuran Antariksa Nyata</b>
              <p>RASCube dirancang khusus sebagai alat latih edukasi di ruang kelas atau meja laboratorium. Wahana ini tidak dilapisi pelindung radiasi tinggi dan tidak akan bertahan terhadap lingkungan hampa udara ekstrem di orbit Bumi.</p>
            </div>

            <div className="nota">
              <b>Dukungan &amp; Garansi</b>
              <p>Kit resmi Robinson Aerospace Systems bergaransi pabrik selama 2 tahun untuk cacat produksi dan material komponen, dengan kantor pusat di Adelaide, Australia Selatan.</p>
            </div>
          </div>
        </section>

        {/* Galeri Foto Resmi */}
        <section id="galeri">
          <div className="wrap">
            <div className="sec-head">
              <p className="eyebrow">Galeri</p>
              <h2>Galeri foto perakitan asli</h2>
              <p>Foto dokumentasi resmi RASCube V2 dari Quick Start Guide Robinson Aerospace Systems. Klik gambar untuk melihat ukuran penuh.</p>
            </div>
            <div className="galeri--foto">
              <figure>
                <a href={withBasePath('/_nano/foto/rascube-utuh.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_nano/foto/rascube-utuh.jpg')} alt="RASCube V2 yang sudah dirakit" loading="lazy" />
                </a>
                <figcaption>
                  <b>RASCube V2</b>
                  Kit yang sudah dirakit utuh, dengan antena cambuk, panel surya, dan panel akses samping.
                </figcaption>
              </figure>

              <figure>
                <a href={withBasePath('/_nano/foto/rascube-rangka.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_nano/foto/rascube-rangka.jpg')} alt="Rangka aluminium RASCube" loading="lazy" />
                </a>
                <figcaption>
                  <b>Langkah 1–5 · Rangka</b>
                  Empat rel tepi dan dinding samping A dan B disekrup menjadi satu kubus aluminium presisi.
                </figcaption>
              </figure>

              <figure>
                <a href={withBasePath('/_nano/foto/rascube-eps-baterai.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_nano/foto/rascube-eps-baterai.jpg')} alt="Modul EPS dengan baterai 18650" loading="lazy" />
                </a>
                <figcaption>
                  <b>Langkah 6 · EPS</b>
                  Dua baterai Li-ion 18650 dipasang ke Modul EPS dengan polaritas kutub yang tepat.
                </figcaption>
              </figure>

              <figure>
                <a href={withBasePath('/_nano/foto/rascube-tumpukan.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_nano/foto/rascube-tumpukan.jpg')} alt="Tumpukan elektronik RASCube" loading="lazy" />
                </a>
                <figcaption>
                  <b>Langkah 7–11 · Elektronik</b>
                  EPS, OBC, Modul Sensor, dan Modul Telemetri ditumpuk dengan standoff 40 pin presisi.
                </figcaption>
              </figure>

              <figure>
                <a href={withBasePath('/_nano/foto/rascube-papan-antena.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_nano/foto/rascube-papan-antena.jpg')} alt="Papan antena dengan konektor RF" loading="lazy" />
                </a>
                <figcaption>
                  <b>Langkah 14 · Papan Antena</b>
                  Papan antena di pelat atas dengan antena patch GPS dan antena cambuk pemancar LoRa.
                </figcaption>
              </figure>

              <figure>
                <a href={withBasePath('/_nano/foto/rascube-panel-surya.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_nano/foto/rascube-panel-surya.jpg')} alt="Panel surya RASCube" loading="lazy" />
                </a>
                <figcaption>
                  <b>Langkah 17 · Panel Surya</b>
                  Tiga panel surya fotovoltaik dan panel akses samping siap dipasang ke dinding luar.
                </figcaption>
              </figure>

              <figure>
                <a href={withBasePath('/_nano/foto/rascube-selesai-rbf.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_nano/foto/rascube-selesai-rbf.jpg')} alt="RASCube dengan pin RBF" loading="lazy" />
                </a>
                <figcaption>
                  <b>Langkah 18 · Pin RBF</b>
                  Pin Remove Before Flight masuk ke lubang ON/OFF; mencabut pin ini mengaktifkan satelit.
                </figcaption>
              </figure>

              <figure>
                <a href={withBasePath('/_nano/foto/rascube-ui-laptop.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_nano/foto/rascube-ui-laptop.jpg')} alt="Telemetri RASCube di laptop" loading="lazy" />
                </a>
                <figcaption>
                  <b>Telemetri Komputer</b>
                  Grafik telemetri sensor langsung dibaca melalui peramban via penerima stasiun USB.
                </figcaption>
              </figure>

              <figure>
                <a href={withBasePath('/_nano/foto/rascube-kemasan.jpg')} target="_blank" rel="noopener noreferrer">
                  <img src={withBasePath('/_nano/foto/rascube-kemasan.jpg')} alt="Kotak kit RASCube" loading="lazy" />
                </a>
                <figcaption>
                  <b>Kemasan Kit</b>
                  Seluruh komponen tersimpan rapi dalam kompartemen spons pelindung untuk penggunaan kelas berulang.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>
      </main>

      <Footer moduleName="RASCube V2" />
    </div>
  );
}
