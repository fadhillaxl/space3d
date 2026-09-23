/* =====================================================================
   kratos-poin.js — dua belas titik komponen
   =====================================================================

   Satu-satunya salinan daftar poin. Halaman memakainya untuk dua hal
   sekaligus — titik bernomor di atas model dan daftar yang bisa diklik
   di bawahnya — jadi tidak ada daftar kedua yang bisa ikut basi.

   Tiap poin menempel pada model dengan salah satu dari dua cara:

     ikut  nama mesh pada model. Titiknya mengikuti benda itu ke mana pun
           ia bergerak. Wajib dipakai untuk apa pun yang ada pada sayap,
           karena sayapnya melipat dan membentang.
     pos   koordinat tetap di ruang model, untuk bagian yang memang tidak
           pernah bergerak.

   Isi keterangannya disalin dari lembar resmi EXA di folder ini dan
   dari buku panduan (_nano/dokumen/manual-book-kratos.pdf). Yang
   bukan kutipan - penjelasan tambahan - ditulis sebagai kalimat biasa
   dan tidak mengaku sebagai spesifikasi.
   ===================================================================== */

window.KRATOS_POIN = [
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
