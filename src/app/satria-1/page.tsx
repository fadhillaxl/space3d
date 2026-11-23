'use client';

import { useRef } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import QuickNav from '@/components/shared/QuickNav';
import SpaceViewerStage, { SpaceViewerStageHandle } from '@/components/viewer/SpaceViewerStage';
import SatriaModelGallery from '@/components/viewer/SatriaModelGallery';
import { withBasePath } from '@/utils/basePath';

const QUICK_NAV_CHIPS = [
  { id: 'tujuan', label: 'Tujuan' },
  { id: 'status', label: 'Status modul' },
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'latar', label: 'Latar belakang' },
  { id: 'pembangunan', label: 'Pembangunan' },
  { id: 'teknologi', label: 'Struktur & teknologi' },
  { id: 'subsistem', label: 'Subsistem' },
  { id: 'komponen', label: 'Komponen' },
  { id: 'operasi', label: 'Peluncuran & operasi' },
  { id: 'layanan', label: 'Cakupan layanan' },
  { id: 'linimasa', label: 'Garis waktu' },
  { id: 'foto', label: 'Galeri foto' },
  { id: 'gallery', label: 'Galeri model' },
  { id: 'sumber', label: 'Sumber' },
];

const SPOT_GROUPS = [
  {
    category: 'Sistem daya',
    color: '#E8C34A',
    items: [{ index: 0, label: '1 · Panel surya' }],
  },
  {
    category: 'Kendali termal',
    color: '#8FD8C4',
    items: [{ index: 2, label: '3 · Radiator OSR' }],
  },
  {
    category: 'Struktur dan kendali',
    color: '#7FA8D9',
    items: [{ index: 3, label: '4 · Tabung tengah' }],
  },
  {
    category: 'Antena',
    color: '#59B8C4',
    items: [
      { index: 5, label: '6 · Reflektor antena' },
      { index: 6, label: '7 · Reflektor bawah' },
    ],
  },
  {
    category: 'Penggerak',
    color: '#E0705A',
    items: [
      { index: 1, label: '2 · Tangki propelan' },
      { index: 4, label: '5 · Pendorong plasma' },
    ],
  },
];

const PHOTOS = [
  {
    file: 'satria-ruang-anechoic.jpg',
    alt: 'Satria-1 tergantung di ruang anechoic, dua reflektor terbentang di sebelahnya',
    title: 'Uji pola antena',
    caption:
      'Satelit digantung di ruang anechoic — dinding, lantai, dan langit-langitnya berlapis kerucut penyerap gelombang radio, supaya tidak ada pantulan yang mengacaukan pengukuran. Di sinilah pola pancaran tiap berkas dibuktikan sesuai rancangan.',
  },
  {
    file: 'satria-ruang-anechoic-skala.jpg',
    alt: 'Tiga orang berjas ruang bersih berdiri di bawah Satria-1 yang tergantung',
    title: 'Ukurannya',
    caption:
      'Foto yang sama dengan orang di bawahnya. Badan bus setinggi beberapa meter, dan kedua reflektor gelap itu masih lebih lebar lagi — padahal sayap suryanya belum terpasang.',
  },
  {
    file: 'satria-wadah-angkut.jpg',
    alt: 'Satria-1 terlipat rapat di samping wadah angkutnya',
    title: 'Terlipat untuk dikirim',
    caption: (
      <>
        Satelit siap masuk wadah angkut bertulisan <em>Spacebus Neosat S/C Transport Container</em>. Panel suryanya tertumpuk rapat di punggung badan dan reflektornya terlipat ke samping — begini jugalah bentuknya saat berada di dalam selubung roket.
      </>
    ),
  },
  {
    file: 'satria-reflektor-terbentang.jpg',
    alt: 'Satu reflektor Satria-1 terbentang menjauh dari badan satelit',
    title: 'Uji pembentangan',
    caption:
      'Satu reflektor dibuka menjauh dari badan. Mekanisme ini hanya bekerja sekali seumur hidup satelit, di orbit, tanpa kemungkinan diperbaiki — jadi di darat ia dibuka-tutup berulang kali sampai terbukti tidak akan macet.',
  },
  {
    file: 'satria-diangkat-derek.jpg',
    alt: 'Satria-1 diangkat derek di atas lantai ruang perakitan',
    title: 'Pindah antarpengujian',
    caption:
      'Satelit diangkat derek dengan balok pengangkat di ruang perakitan. Sebagian besar waktu pembangunan satelit geostasioner memang habis untuk berpindah dari satu ruang uji ke ruang uji berikutnya.',
  },
];

export default function SatriaPage() {
  const viewerRef = useRef<SpaceViewerStageHandle>(null);

  return (
    <div data-mission="satria">
      <Header currentMission="satria" />

      <main id="main">
        {/* Hero & 3D Stage */}
        <section className="hero">
          <div className="wrap hero__grid">
            <div>
              <p className="hero__kicker">Modul 03 · Indonesia · 2023</p>
              <h1>Satelit GEO Satria-1</h1>
              <p className="hero__sub">
                Satelit internet berkapasitas sangat tinggi pertama milik Indonesia: 150 Gbps pada pita Ka, dibangun Thales Alenia Space di atas wahana listrik penuh Spacebus NEO, dan diluncurkan Falcon 9 pada 19 Juni 2023 menuju slot 146° Bujur Timur.
              </p>
              <ul className="hero__facts">
                <li>
                  <span className="k">Jenis wahana</span>
                  <span className="v">Satelit GEO</span>
                </li>
                <li>
                  <span className="k">Wahana dasar</span>
                  <span className="v">Spacebus NEO</span>
                </li>
                <li>
                  <span className="k">Model 3D</span>
                  <span className="v">Pindaian</span>
                </li>
                <li>
                  <span className="k">Peluncuran</span>
                  <span className="v">19 Juni 2023</span>
                </li>
              </ul>
            </div>

            <div>
              <SpaceViewerStage
                ref={viewerRef}
                initialVariant="satria"
                accentColor="var(--geo)"
                cornerText="Satria-1 · model pindaian"
                initialReadout="Model tiga dimensi Satria-1: bus, dua sayap surya lima panel, tiga reflektor antena, dan nosel pendorong. Yang terekam hanya bagian luarnya — isi bus tidak ikut tergambar. Klik nomor pada model untuk membaca keterangan komponennya."
              />
            </div>
          </div>
        </section>

        {/* Quicknav Bar */}
        <QuickNav chips={QUICK_NAV_CHIPS} />

        {/* Article Content */}
        <div className="wrap layout">
          <div className="content satria-content">
            {/* 01 Tujuan pembelajaran */}
            <section id="tujuan">
              <p className="eyebrow">
                <b>01</b> Tujuan pembelajaran
              </p>
              <h2>Yang perlu dipahami dari modul ini</h2>
              <div className="objectives">
                <div className="objective">
                  <span className="objective__n">01</span>
                  <h3>Memahami orbit geostasioner</h3>
                  <p>
                    Mengapa satelit komunikasi ditempatkan pada ketinggian sekitar 35.786 km di atas khatulistiwa, dan apa arti &ldquo;diam di satu titik&rdquo; bila dilihat dari Bumi.
                  </p>
                </div>
                <div className="objective">
                  <span className="objective__n">02</span>
                  <h3>Mengenali bagian satelit</h3>
                  <p>
                    Membedakan bus dan muatan, memahami fungsi sayap surya, reflektor antena, serta pendorong, dan mengapa satelit harus dilipat sebelum diluncurkan.
                  </p>
                </div>
                <div className="objective">
                  <span className="objective__n">03</span>
                  <h3>Menghubungkan teknologi dan tujuan</h3>
                  <p>
                    Melihat kaitan antara pilihan teknis — pita Ka, propulsi listrik, arsitektur multi-beam — dengan tujuan programnya: menjangkau wilayah yang sulit dilayani jaringan darat.
                  </p>
                </div>
              </div>
            </section>

            {/* 02 Status modul */}
            <section id="status">
              <p className="eyebrow">
                <b>02</b> Status modul
              </p>
              <h2>Sumber dan batasannya</h2>
              <p>
                Modul ini disusun dari informasi Satria-1 yang <strong>sudah dipublikasikan luas</strong> — siaran pers, pemberitaan peluncuran, dan keterangan resmi program. Cakupannya karena itu lebih ringkas daripada dua modul lainnya.
              </p>
              <p>
                Sumber utamanya satu:{' '}
                <a
                  href="https://www.thalesaleniaspace.com/en/press-releases/indonesias-satria-communications-satellite-successfully-launched"
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  siaran pers Thales Alenia Space, Cape Canaveral, 19 Juni 2023
                </a>{' '}
                — diterbitkan pembuat wahananya sendiri pada hari peluncuran. Angka yang berasal dari sana dipakai apa adanya: 150 Gbps, pita Ka, 4,6 ton, slot 146° Bujur Timur, umur desain 15 tahun, dan wahana dasar Spacebus NEO. Angka lain yang hanya beredar di pemberitaan tetap ditandai.
              </p>

              <div className="note">
                <span className="note__label">Catatan kepatuhan</span>
                <p>
                  Dokumen pelatihan teknis dari pabrikan yang tersedia untuk proyek ini berlabel <em>proprietary</em> dan terkendali ekspor, dengan larangan tegas atas reproduksi, publikasi, maupun penerjemahan tanpa izin tertulis. Isinya karena itu <strong>tidak dipakai</strong> di halaman ini. Bila izin publikasi sudah diperoleh, bagian teknis dapat diperdalam dengan merujuk dokumen tersebut.
                </p>
              </div>

              <p>
                Beberapa angka di bawah ditandai <span className="verify">perlu verifikasi</span>. Angka bertanda itu beredar di banyak pemberitaan tetapi belum dicocokkan ke sumber primer, jadi mohon diperiksa sebelum materi dipakai mengajar.
              </p>
            </section>

            {/* 03 Ringkasan */}
            <section id="ringkasan">
              <p className="eyebrow">
                <b>03</b> Ringkasan
              </p>
              <h2>Satria-1 dalam angka</h2>
              <div className="stats">
                <div>
                  <span className="n">150</span>
                  <span className="l">Gbps kapasitas</span>
                </div>
                <div>
                  <span className="n">146°</span>
                  <span className="l">Bujur timur, slot orbit</span>
                </div>
                <div>
                  <span className="n">15</span>
                  <span className="l">Tahun umur desain</span>
                </div>
                <div>
                  <span className="n">2023</span>
                  <span className="l">Tahun peluncuran</span>
                </div>
                <div>
                  <span className="n">Ka</span>
                  <span className="l">Pita frekuensi</span>
                </div>
                <div>
                  <span className="n">GEO</span>
                  <span className="l">Orbit geostasioner</span>
                </div>
              </div>

              <p>
                Satria-1 — <em>Satelit Republik Indonesia</em> — adalah satelit komunikasi geostasioner yang dibangun untuk membawa layanan internet ke titik-titik layanan publik di wilayah yang belum terjangkau jaringan darat. Pembuatnya menggolongkannya sebagai <strong>VHTS</strong>, <em>very-high-throughput satellite</em>: yang pertama di Indonesia, dan pada saat peluncuran disebut yang paling bertenaga di kawasan Asia Tenggara.
              </p>

              <div className="tablewrap--prose">
                <table>
                  <caption>
                    Identitas wahana. Kecuali yang bertanda, seluruh isinya dari siaran pers Thales Alenia Space 19 Juni 2023.
                  </caption>
                  <thead>
                    <tr>
                      <th>Keterangan</th>
                      <th>Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Nama</td>
                      <td>Satria-1 (Satelit Republik Indonesia)</td>
                    </tr>
                    <tr>
                      <td>Jenis</td>
                      <td>Satelit komunikasi geostasioner VHTS, arsitektur multi-beam</td>
                    </tr>
                    <tr>
                      <td>Pembuat</td>
                      <td>Thales Alenia Space (patungan Thales 67% dan Leonardo 33%)</td>
                    </tr>
                    <tr>
                      <td>Kelas bus</td>
                      <td>Spacebus NEO, listrik penuh</td>
                    </tr>
                    <tr>
                      <td>Muatan</td>
                      <td>Digital sepenuhnya, dengan prosesor digital generasi kelima</td>
                    </tr>
                    <tr>
                      <td>Program</td>
                      <td>BAKTI, Kementerian Komunikasi dan Informatika</td>
                    </tr>
                    <tr>
                      <td>Pemesan</td>
                      <td>Konsorsium Satelit Nusantara Tiga (SNT), mewakili Kominfo</td>
                    </tr>
                    <tr>
                      <td>Anggota konsorsium</td>
                      <td>
                        PT Pasifik Satelit Nusantara (PSN) dan PT Pintar Nusantara Sejahtera sebagai pemegang saham mayoritas, bersama PT Nusantara Satelit Sejahtera dan PT Dian Semesta Sentosa
                      </td>
                    </tr>
                    <tr>
                      <td>Kapasitas</td>
                      <td>150 Gbps</td>
                    </tr>
                    <tr>
                      <td>Pita frekuensi</td>
                      <td>Ka-band</td>
                    </tr>
                    <tr>
                      <td>Slot orbit</td>
                      <td>146° Bujur Timur</td>
                    </tr>
                    <tr>
                      <td>Umur desain</td>
                      <td>15 tahun</td>
                    </tr>
                    <tr>
                      <td>Massa saat peluncuran</td>
                      <td>4,6 ton</td>
                    </tr>
                    <tr>
                      <td>Kendaraan peluncur</td>
                      <td>SpaceX Falcon 9</td>
                    </tr>
                    <tr>
                      <td>Tanggal peluncuran</td>
                      <td>19 Juni 2023 WIB (18 Juni waktu Amerika Serikat)</td>
                    </tr>
                    <tr>
                      <td>Lokasi peluncuran</td>
                      <td>Cape Canaveral, Florida</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 04 Latar belakang */}
            <section id="latar">
              <p className="eyebrow">
                <b>04</b> Latar belakang
              </p>
              <h2>Masalah geografi, bukan sekadar masalah teknologi</h2>
              <p>
                Indonesia terdiri dari ribuan pulau yang tersebar sepanjang lebih dari lima ribu kilometer. Membentangkan kabel serat optik ke setiap pulau berpenghuni memerlukan biaya dan waktu yang tidak sebanding dengan jumlah penggunanya, terutama di wilayah terdepan, terluar, dan tertinggal.
              </p>
              <p>
                Satelit mengubah perhitungan itu. Satu wahana di orbit geostasioner dapat menyinari seluruh kepulauan sekaligus, dan biaya melayani satu pulau terpencil menjadi hampir sama dengan melayani pulau yang ramai. Untuk sekolah, puskesmas, dan kantor pemerintahan di lokasi yang sulit dijangkau, satelit sering menjadi satu-satunya pilihan yang masuk akal secara ekonomi.
              </p>
              <p>
                Karena itu Satria-1 dirancang bukan sebagai satelit siaran, melainkan sebagai satelit <em>throughput</em> tinggi untuk layanan data — dengan sasaran <span className="verify">sekitar 50.000 titik layanan publik</span>.
              </p>

              <div className="plate">
                <p className="plate__label">Mengapa orbit geostasioner</p>
                <p>
                  Pada ketinggian sekitar 35.786 km di atas khatulistiwa, satu putaran orbit memakan waktu tepat satu hari — sama dengan periode rotasi Bumi. Akibatnya satelit tampak diam di satu titik di langit. Antena di darat cukup diarahkan sekali lalu dikunci, tanpa perlu mekanisme pelacak. Untuk layanan yang dipasang di ribuan lokasi terpencil, kesederhanaan itu jauh lebih berharga daripada latensi rendah yang ditawarkan orbit rendah.
                </p>
              </div>
            </section>

            {/* 05 Pembangunan */}
            <section id="pembangunan">
              <p className="eyebrow">
                <b>05</b> Pembangunan
              </p>
              <h2>Dari kontrak ke landasan</h2>
              <p>
                Satelit geostasioner umumnya memerlukan tiga sampai empat tahun sejak kontrak sampai siap diluncurkan. Sebagian besar waktu itu bukan untuk merakit, melainkan untuk menguji: setiap unit harus dibuktikan tahan getaran peluncuran, hampa udara, dan siklus panas–dingin selama bertahun-tahun tanpa kemungkinan diperbaiki.
              </p>
              <p>
                Satria-1 dipesan konsorsium Satelit Nusantara Tiga untuk Kementerian Komunikasi dan Informatika, dan dibangun Thales Alenia Space sebagai kontraktor utama. Yang diserahkan bukan hanya satelitnya: ikut di dalamnya dua pusat kendali satelit — utama dan cadangan — segmen bumi untuk muatan digitalnya, serta program pelatihan untuk insinyur SNT. Sebagian insinyur itu bergabung ke tim proyek di fasilitas Cannes dan Toulouse selama program berjalan, jadi pengetahuan mengoperasikan wahananya ikut berpindah, bukan hanya wahananya.
              </p>

              <div className="tablewrap--prose">
                <table>
                  <caption>
                    Tahapan umum pembangunan satelit geostasioner. Tanggal spesifik Satria-1 belum dicantumkan karena belum dicocokkan ke sumber primer.
                  </caption>
                  <thead>
                    <tr>
                      <th>Tahap</th>
                      <th>Isi pekerjaan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Perakitan modul</td>
                      <td>Modul muatan, modul avionik, dan modul propulsi dirakit terpisah, lalu disatukan.</td>
                    </tr>
                    <tr>
                      <td>Uji getaran dan akustik</td>
                      <td>Wahana digetarkan pada tiga sumbu dan dipapar suara bertekanan tinggi, menirukan kondisi peluncuran.</td>
                    </tr>
                    <tr>
                      <td>Uji vakum termal</td>
                      <td>Satelit dimasukkan ke ruang hampa dan dijalankan melewati siklus panas dan dingin ekstrem selama berminggu-minggu.</td>
                    </tr>
                    <tr>
                      <td>Uji antena</td>
                      <td>Pola pancaran diukur di ruang khusus untuk memastikan cakupan sesuai rancangan.</td>
                    </tr>
                    <tr>
                      <td>Pengisian propelan</td>
                      <td>Tangki diisi dan ditekan menjelang pengiriman ke lokasi peluncuran.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 06 Struktur dan teknologi */}
            <section id="teknologi">
              <p className="eyebrow">
                <b>06</b> Struktur dan teknologi
              </p>
              <h2>Bagian-bagian satelit</h2>
              <p>
                Satelit komunikasi terbagi dua secara mendasar. <strong>Bus</strong> adalah bagian yang membuat satelit tetap hidup dan tetap pada tempatnya: struktur, daya, kendali sikap, propulsi, dan komunikasi dengan stasiun bumi. <strong>Muatan</strong> adalah bagian yang mengerjakan tugas sebenarnya — pada Satria-1, menerima sinyal dari stasiun gerbang, memprosesnya, lalu memancarkannya kembali ke pengguna.
              </p>

              <h3>Sayap surya</h3>
              <p>
                Seluruh daya berasal dari Matahari. Panel surya dilipat rapat selama peluncuran, lalu dibentangkan setelah satelit terpisah dari roket. Panel berputar pelan mengikuti Matahari sepanjang hari, sementara badan satelit tetap menghadap Bumi. Selama gerhana — saat satelit masuk bayangan Bumi — daya diambil dari baterai.
              </p>

              <h3>Reflektor antena</h3>
              <p>
                Piringan besar di sisi satelit memusatkan gelombang radio, sama seperti cermin cekung memusatkan cahaya. Ukuran reflektor menentukan seberapa sempit berkas yang dihasilkan: makin besar reflektor, makin sempit berkasnya, dan makin besar pula kapasitas yang bisa dipakai ulang di wilayah berbeda.
              </p>

              <div className="plate">
                <p className="plate__label">Mengapa banyak berkas sempit</p>
                <p>
                  Satelit siaran generasi lama memakai satu berkas lebar yang menyinari seluruh negeri. Satelit throughput tinggi memakai puluhan berkas sempit. Karena dua berkas yang tidak saling bersinggungan boleh memakai frekuensi yang sama, kapasitas total berlipat sebanyak jumlah pengulangan itu. Inilah alasan Satria-1 mampu mencapai ratusan gigabit per detik, sementara satelit siaran dengan ukuran serupa hanya beberapa gigabit.
                </p>
              </div>

              <h3>Pita Ka</h3>
              <p>
                Satria-1 bekerja pada pita Ka, sekitar 20 sampai 30 GHz. Frekuensi setinggi itu menyediakan lebar pita jauh lebih besar daripada pita C atau Ku, sehingga cocok untuk layanan data. Konsekuensinya, sinyal pita Ka lebih terganggu hujan lebat — masalah nyata di iklim tropis, dan biasanya diatasi dengan menaikkan daya pancar secara otomatis saat hujan terdeteksi.
              </p>

              <h3>Muatan digital sepenuhnya</h3>
              <p>
                Muatan Satria-1 tidak memakai penyalur analog seperti satelit generasi sebelumnya. Sinyal yang masuk langsung diubah menjadi angka, diolah oleh prosesor digital generasi kelima, lalu diubah kembali menjadi gelombang radio sebelum dipancarkan. Karena pembagian kapasitas antarberkas dikerjakan perangkat lunak, peta kapasitasnya bisa digeser dari darat selama satelit bertugas — tanpa perangkat keras yang harus diganti. Thales Alenia Space juga membangun segmen bumi untuk muatan digital ini, beserta dua pusat kendali satelit: satu utama, satu cadangan.
              </p>

              <h3>Propulsi listrik</h3>
              <p>
                Spacebus NEO yang dipakai Satria-1 adalah wahana <em>listrik penuh</em>: baik kenaikan orbit maupun penjagaan posisi sehari-hari dikerjakan pendorong listrik, yang mendorong dengan cara mempercepat gas terionisasi. Daya dorongnya sangat kecil — setara dorongan selembar kertas di telapak tangan — tetapi jauh lebih hemat propelan daripada roket kimia.
              </p>
              <p>
                Pertukarannya adalah waktu. Satelit berpropulsi kimia bisa mencapai orbit akhirnya dalam hitungan hari; dengan propulsi listrik, kenaikan orbit memakan waktu berbulan-bulan. Sebagai gantinya, propelan yang dihemat dapat ditukar menjadi muatan yang lebih berat atau umur operasi yang lebih panjang.
              </p>

              <h3>Kendali sikap</h3>
              <p>
                Satelit harus menjaga arah antenanya ke Bumi dengan ketelitian tinggi. Orientasi diketahui melalui <em>star tracker</em>, kamera yang mengenali pola bintang dan menghitung arah hadap satelit dari situ. Koreksi dilakukan dengan roda reaksi — roda berat yang dipercepat atau diperlambat, memutar badan satelit ke arah berlawanan tanpa membuang propelan sedikit pun.
              </p>
            </section>

            {/* 07 Subsistem */}
            <section id="subsistem">
              <p className="eyebrow">
                <b>07</b> Subsistem
              </p>
              <h2>Enam subsistem yang bertumpu pada satu struktur</h2>
              <p>
                Satelit lazim dipandang sebagai kumpulan subsistem, bukan sebagai satu benda utuh. Semuanya bertumpu pada <strong>struktur</strong> — rangka dan tabung tengah yang memikul beban peluncuran dan menahan setiap perangkat tetap di tempatnya.
              </p>

              <div className="tablewrap--prose">
                <table>
                  <caption>Pembagian subsistem yang umum dipakai pada satelit komunikasi geostasioner.</caption>
                  <thead>
                    <tr>
                      <th>Subsistem</th>
                      <th>Tugasnya</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        Telemetri, perintah, dan penjejakan <span className="code-badge">TC&amp;R</span>
                      </td>
                      <td>
                        Menjaga hubungan dengan stasiun bumi: mengirim laporan kondisi wahana, menerima perintah, dan memungkinkan posisinya diukur dari darat.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Daya listrik <span className="code-badge">EPS</span>
                      </td>
                      <td>
                        Menghasilkan, menyimpan, dan membagikan listrik. Mencakup sayap surya, baterai, dan pengatur tegangan.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Pengolahan data <span className="code-badge">DHS</span>
                      </td>
                      <td>
                        Komputer wahana. Menjalankan perintah, mengumpulkan data sensor, dan menangani kegagalan secara mandiri saat tidak ada kontak dengan darat.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Kendali termal <span className="code-badge">THC</span>
                      </td>
                      <td>
                        Menjaga suhu setiap perangkat dalam batas kerjanya, memakai radiator, selimut isolasi, pemanas, dan pipa kalor.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Kendali sikap <span className="code-badge">ACS</span>
                      </td>
                      <td>
                        Menjaga arah hadap satelit. Memakai pelacak bintang dan giroskop sebagai indra, roda reaksi dan pendorong sebagai otot.
                      </td>
                    </tr>
                    <tr>
                      <td>
                        Propulsi <span className="code-badge">PROP</span>
                      </td>
                      <td>
                        Menaikkan orbit setelah lepas dari roket, menjaga posisi selama bertahun-tahun, dan memindahkan satelit ke orbit pembuangan di akhir masa operasi.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="plate">
                <p className="plate__label">Mengapa struktur diletakkan di tengah</p>
                <p>
                  Dalam bagan subsistem, struktur biasanya digambar sebagai batang tegak yang menghubungkan semua kotak lain. Itu bukan sekadar gaya gambar. Beban paling berat yang pernah dialami satelit terjadi selama beberapa menit peluncuran, dan seluruhnya disalurkan lewat struktur. Setelah di orbit, struktur pula yang menjaga antena tetap presisi arahnya dan menyalurkan panas antarbagian.
                </p>
              </div>

              <div className="note">
                <span className="note__label">Catatan sumber</span>
                <p>
                  Pembagian subsistem dan penamaan komponen di atas mengikuti kelaziman industri satelit dan bahan rujukan umum, termasuk gambaran platform satelit komunikasi geostasioner dari pabrikan lain. Rincian yang khusus berlaku bagi Satria-1 belum dimuat, karena dokumen teknis pabrikannya berlabel proprietary dan terkendali ekspor.
                </p>
              </div>
            </section>

            {/* 08 Komponen */}
            <section id="komponen">
              <p className="eyebrow">
                <b>08</b> Komponen
              </p>
              <h2>Titik komponen pada model</h2>
              <p>
                Klik nomor di bawah untuk menyorot komponen pada model 3D di bagian atas halaman. Warnanya menandai subsistem tempat komponen itu bernaung. Panel lapisan di bawah model dapat dipakai untuk mematikan bagian tertentu.
              </p>
              <div className="note">
                <p>
                  Model yang dipakai halaman ini merekam bagian luar satelit saja. Dua titik — <b>2 · Tangki propelan</b> dan <b>4 · Tabung tengah</b> — karena itu diletakkan di permukaan atas bus, menandai apa yang ada <em>di bawahnya</em>, bukan benda yang kelihatan. Pipa sistem propelannya memang ikut terekam: nyalakan tombol <b>Potongan</b> untuk melihatnya di dalam badan.
                </p>
              </div>
              <div className="spotgrid" role="group" aria-label="Sorot komponen pada model">
                {SPOT_GROUPS.map((group) => (
                  <div className="spotcat" key={group.category}>
                    <span
                      className="spotcat__label"
                      style={{ '--kat': group.color } as React.CSSProperties}
                    >
                      {group.category}
                    </span>
                    <div className="spotcat__list">
                      {group.items.map((item) => (
                        <button
                          key={item.index}
                          type="button"
                          className="btn btn--spot"
                          data-spot={item.index}
                          style={{ '--kat': group.color } as React.CSSProperties}
                          onClick={() => viewerRef.current?.selectSpotByIndex(item.index)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 09 Peluncuran dan operasi */}
            <section id="operasi">
              <p className="eyebrow">
                <b>09</b> Peluncuran dan operasi
              </p>
              <h2>Dari landasan ke slot orbit</h2>
              <p>
                Satria-1 diluncurkan dengan Falcon 9 dari Cape Canaveral, Florida, pada 19 Juni 2023 waktu Indonesia. Roket menempatkannya pada orbit transfer, bukan langsung pada orbit akhir — sisa perjalanannya menjadi tugas satelit itu sendiri.
              </p>

              <div className="phases">
                <ol>
                  <li>
                    <strong>Peluncuran</strong> — Falcon 9 membawa satelit keluar atmosfer dan melepasnya pada orbit transfer berbentuk elips.
                  </li>
                  <li>
                    <strong>Pembentangan awal</strong> — sayap surya dibuka agar satelit memperoleh daya, lalu kontak dengan stasiun bumi dibangun.
                  </li>
                  <li>
                    <strong>Kenaikan orbit</strong> — pendorong listrik dinyalakan berbulan-bulan, sedikit demi sedikit membulatkan orbit sampai mencapai ketinggian geostasioner.
                  </li>
                  <li>
                    <strong>Pembentangan penuh</strong> — reflektor antena dibuka setelah satelit mendekati posisi akhirnya.
                  </li>
                  <li>
                    <strong>Uji di orbit</strong> — seluruh sistem diperiksa dan pola pancaran antena diukur dari darat.
                  </li>
                  <li>
                    <strong>Operasi</strong> — satelit diserahkan ke operator dan mulai melayani.
                  </li>
                </ol>
              </div>

              <p>
                Setelah berada di slotnya, pekerjaan belum selesai. Tarikan Bulan, Matahari, dan bentuk Bumi yang tidak bulat sempurna terus menggeser satelit dari posisinya. Koreksi kecil dilakukan berkala sepanjang masa operasi — dan ketika propelan untuk koreksi itu habis, umur satelit berakhir meski seluruh elektroniknya masih berfungsi.
              </p>

              <div className="note">
                <span className="note__label">Akhir masa operasi</span>
                <p>
                  Satelit geostasioner tidak dibiarkan mati di slotnya, karena akan menghalangi satelit penggantinya. Menjelang propelan habis, satelit dinaikkan beberapa ratus kilometer ke orbit pembuangan, lalu dimatikan. Propelan untuk manuver terakhir ini harus disisihkan sejak awal.
                </p>
              </div>
            </section>

            {/* 10 Cakupan layanan */}
            <section id="layanan">
              <p className="eyebrow">
                <b>10</b> Cakupan layanan
              </p>
              <h2>Siapa yang dilayani</h2>
              <p>
                Satria-1 tidak dijual langsung ke rumah tangga. Sasarannya adalah <strong>titik layanan publik</strong>: sekolah, fasilitas kesehatan, kantor pemerintah daerah, dan pos keamanan di wilayah yang belum terjangkau jaringan darat memadai.
              </p>
              <p>
                Di setiap titik dipasang terminal kecil berupa antena parabola dan modem. Terminal itu berkomunikasi dengan satelit, dan satelit meneruskannya ke stasiun gerbang berukuran besar yang tersambung ke jaringan internet nasional. Sekolah di pulau terpencil dengan demikian terhubung ke internet melalui lompatan sejauh 36.000 km ke atas dan kembali turun.
              </p>
              <p>
                Latensinya lebih tinggi daripada serat optik — sinyal harus menempuh jarak itu dua kali, sehingga selalu ada jeda beberapa ratus milidetik. Untuk telepon video jeda ini terasa; untuk pembelajaran daring, administrasi, dan pelaporan kesehatan, dampaknya kecil.
              </p>
            </section>

            {/* 11 Garis waktu */}
            <section id="linimasa">
              <p className="eyebrow">
                <b>11</b> Garis waktu
              </p>
              <h2>Tonggak program</h2>
              <ol className="timeline">
                <li className="is-key">
                  <span className="y">2023</span>
                  <span className="t">Diluncurkan dengan Falcon 9 dari Cape Canaveral pada 19 Juni waktu Indonesia.</span>
                </li>
                <li>
                  <span className="y">2023</span>
                  <span className="t">Kenaikan orbit dengan propulsi listrik berlangsung berbulan-bulan menuju slot 146° Bujur Timur.</span>
                </li>
                <li>
                  <span className="y">2023–2024</span>
                  <span className="t">
                    Uji di orbit, lalu satelit dinyatakan siap melayani. <span className="verify">Tanggal persisnya perlu diverifikasi.</span>
                  </span>
                </li>
                <li>
                  <span className="y">± 2038</span>
                  <span className="t">Perkiraan akhir umur desain, bila mengikuti rancangan 15 tahun.</span>
                </li>
              </ol>
            </section>

            {/* 12 Galeri foto */}
            <section id="foto">
              <p className="eyebrow">
                <b>12</b> Galeri foto
              </p>
              <h2>Satria-1 sebelum diluncurkan</h2>
              <p>
                Foto satelitnya di fasilitas Thales Alenia Space di Cannes, sebelum dikirim ke Cape Canaveral. Klik gambar untuk melihatnya dalam ukuran penuh.
              </p>
              <div className="galeri-foto">
                {PHOTOS.map((photo) => {
                  const src = withBasePath(`/_satria/foto/${photo.file}`);
                  return (
                    <figure key={photo.file}>
                      <a href={src} target="_blank" rel="noopener noreferrer">
                        <img src={src} alt={photo.alt} loading="lazy" />
                      </a>
                      <figcaption>
                        <b>{photo.title}</b>
                        {photo.caption}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
              <div className="note">
                <p>
                  Kelima foto di atas <b>milik Thales Alenia Space</b> — pembuat Satria-1 — dan dipakai di sini apa adanya, lengkap dengan tanda airnya, untuk keperluan materi belajar. Keterangannya ditulis dari apa yang terlihat di gambar; tanggal dan nomor uji yang persis tidak disebutkan karena tidak ada di sumbernya.
                </p>
              </div>
            </section>

            {/* 13 Galeri model */}
            <section id="gallery">
              <p className="eyebrow">
                <b>13</b> Galeri model
              </p>
              <h2>Model dari empat sudut</h2>
              <p>
                Keempat gambar ini dirender saat halaman dibuka, dari model 3D yang sama dengan yang ada di atas — jadi isinya tidak bisa basi terhadap modelnya. Ini render model, bukan foto satelit Satria-1 yang sebenarnya.
              </p>
              <SatriaModelGallery />
            </section>

            {/* 14 Sumber */}
            <section id="sumber" className="sources">
              <p className="eyebrow">
                <b>14</b> Sumber
              </p>
              <h2>Daftar pustaka</h2>
              <p>
                Modul ini disusun dari informasi yang sudah dipublikasikan luas. Sumber berikut adalah titik awal verifikasi; angka bertanda <span className="verify">perlu verifikasi</span> di seluruh halaman sebaiknya dicocokkan ke sumber primer sebelum materi dipakai mengajar.
              </p>
              <ul className="reflist">
                <li>
                  <a
                    href="https://www.thalesaleniaspace.com/en/press-releases/indonesias-satria-communications-satellite-successfully-launched"
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    Thales Alenia Space — siaran pers peluncuran SATRIA, Cape Canaveral, 19 Juni 2023
                  </a>{' '}
                  — sumber utama angka di halaman ini
                </li>
                <li>
                  <a href="https://www.thalesgroup.com/en/worldwide/space" rel="noreferrer noopener" target="_blank">
                    Thales Alenia Space — pembuat wahana
                  </a>
                </li>
                <li>
                  <a href="https://www.psn.co.id/" rel="noreferrer noopener" target="_blank">
                    PSN — kelompok usaha operator satelit
                  </a>
                </li>
                <li>
                  <a href="https://www.kominfo.go.id/" rel="noreferrer noopener" target="_blank">
                    Kementerian Komunikasi dan Informatika — program BAKTI
                  </a>
                </li>
                <li>
                  <a href="https://www.spacex.com/launches/" rel="noreferrer noopener" target="_blank">
                    SpaceX — arsip peluncuran Falcon 9
                  </a>
                </li>
              </ul>

              <div className="note">
                <span className="note__label">Asal foto</span>
                <p>
                  Kelima foto di bagian <a href="#foto">Galeri foto</a> adalah gambar Thales Alenia Space, pembuat Satria-1, bertanda air <em>images courtesy of Thales Alenia Space</em>. Hak ciptanya tetap pada mereka; di sini foto-foto itu dipakai utuh sebagai bahan belajar, bukan diakui sebagai milik situs ini.
                </p>
              </div>

              <div className="note">
                <span className="note__label">Asal model 3D</span>
                <p>
                  Model yang dipakai halaman ini berasal dari berkas <code>Satelit_Satria_1.glb</code>, sebuah model 3D Satria-1 yang diunduh terpisah. Geometri dan teksturnya dipanggang ke <code>_satria/satria-data.js</code> supaya halaman tetap bisa berjalan mandiri tanpa permintaan berkas eksternal. Pemetaan tiap bagian model ke lapisan dan titik komponen dicatat di <code>_satria/pemetaan.md</code>, beserta dua hal yang tidak tergambar model ini: tabung tengah dan tangki propelan di dalam bus.
                </p>
              </div>

              <div className="note">
                <span className="note__label">Yang sengaja tidak dimuat</span>
                <p>
                  Dokumen pelatihan teknis dari pabrikan berlabel proprietary dan terkendali ekspor, dengan larangan reproduksi, publikasi, dan penerjemahan tanpa izin tertulis. Rincian seperti konfigurasi repeater, daftar pemasok unit, mode kendali sikap, strategi penanganan kegagalan, zona termal, dan alur perakitan tidak dimuat di sini. Bila izin publikasi diperoleh, bagian teknis dapat diperdalam.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer moduleName="Modul 03: Satelit GEO Satria-1" />
    </div>
  );
}
