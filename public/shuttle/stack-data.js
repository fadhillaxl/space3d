/* =====================================================================
   stack-data.js — data pendamping model tumpukan peluncuran
   =====================================================================

   Viewer hanya butuh TIGA hal dari halaman induk:

       SpaceViewer.LAYERS.stack      daftar lapisan komponen
       SpaceViewer.HOTSPOTS.stack    sembilan titik bernomor
       SpaceViewer.KATEGORI          warna dan label kategori

   Berkas ini menyediakan ketiganya sebagai objek berdiri sendiri, jadi
   paket ini hidup tanpa discovery.html. Isinya DISALIN OTOMATIS dari
   discovery.html, bukan diketik ulang, supaya tidak bisa melenceng dari
   yang benar-benar dipakai situs.

   Kalau paket ini digabungkan ke proyek yang SUDAH punya window.SpaceViewer
   sendiri, berkas ini tidak menimpanya: ia hanya mengisi bagian yang belum
   ada. Jadi aman dimuat berdampingan.
   ===================================================================== */

(function () {
  'use strict';

  var HOTSPOTS_STACK = [
      { n: 1, pos: [22.0, 0, 0],     layer: 'et',      label: 'Tangki oksigen cair',
        note: 'Bagian depan External Tank menampung sekitar 616.500 kg oksigen cair pada suhu -182 derajat Celsius. Panjangnya sekitar 16,6 meter.' },
      { n: 2, pos: [8.0, 4.6, 0],    layer: 'et',      label: 'Intertank',
        note: 'Penghubung antara kedua tangki. Di sinilah beban dari dua booster diteruskan ke struktur tangki, dan di sini pula sebagian besar instrumen dipasang.' },
      { n: 3, pos: [-8.0, -4.6, 0], layer: 'et',      label: 'Tangki hidrogen cair',
        note: 'Bagian belakang tangki, panjang sekitar 29,5 meter. Volumenya 2,5 kali tangki oksigen, tetapi bobot isinya hanya sepertiga karena hidrogen cair jauh lebih ringan.' },
      { n: 4, pos: [0.0, 0, 7.0],    layer: 'srb',     label: 'Solid Rocket Booster',
        note: 'Dua booster ini menyumbang sekitar 71 sampai 83 persen daya dorong saat lepas landas. Keduanya adalah motor roket padat terbesar yang pernah diterbangkan.' },
      { n: 5, pos: [-29.0, 0, 7.0],  layer: 'srb',     label: 'Nosel booster',
        note: 'Setelah membakar propelan selama sekitar 123 detik, booster dilepas pada ketinggian sekitar 45,7 km, turun dengan parasut, dan dipungut dari laut untuk dipakai lagi.' },
      { n: 6, pos: [16.0, 0, 7.0],   layer: 'srb',     label: 'Hidung booster',
        note: 'Berisi sistem parasut pemulihan. Dari 270 booster yang pernah diluncurkan, hanya empat yang gagal dipulihkan.' },
      { n: 7, pos: [-4.0, 9.4, 0],   layer: 'orbiter', label: 'Orbiter Discovery',
        note: 'Dipasang di sisi tangki, bukan di puncaknya. Posisi menyamping inilah yang membuat serpihan dari tangki bisa mengenai pelindung panas orbiter.' },
      { n: 8, pos: [-26.5, 6.9, 0],  layer: 'orbiter', label: 'Tiga mesin utama',
        note: 'Space Shuttle Main Engine mengambil bahan bakar dari External Tank melalui saluran besar, dan menyala sekitar 480 detik hingga tangki dilepas.' },
      { n: 9, pos: [6.5, 6.2, 0],    layer: 'strut',   label: 'Penopang depan',
        note: 'Batang penghubung yang menahan hidung orbiter pada tangki. Dilepas bersamaan saat pemisahan tangki.' }
    ];

  var LAYERS_STACK = [
    { id: 'orbiter', label: 'Orbiter', groups: ['orb', 'orbEngine'],
      note: 'Discovery sendiri — satu-satunya bagian berawak dalam tumpukan.' },
    { id: 'et', label: 'External Tank', groups: ['etLH2', 'etInter', 'etLOX'],
      note: 'Tangki hidrogen dan oksigen cair, satu-satunya komponen yang tidak dipakai ulang.' },
    { id: 'srb', label: 'Solid Rocket Booster', groups: ['srb', 'srbNozzle'],
      note: 'Dua roket padat yang memberi sebagian besar daya dorong saat lepas landas.' },
    { id: 'strut', label: 'Penopang', groups: ['strut'],
      note: 'Batang struktural yang mengikat orbiter dan booster ke tangki.' }
  ];

  var KATEGORI = {
    awak:     { label: 'Awak dan kabin',     warna: '#E0A458' },
    navigasi: { label: 'Navigasi dan sikap', warna: '#5FBF8E' },
    struktur: { label: 'Struktur dan kendali', warna: '#7FA8D9' },
    tps:      { label: 'Pelindung panas',    warna: '#C77BB5' },
    mesin:    { label: 'Penggerak',          warna: '#E0705A' },
    muatan:   { label: 'Ruang muatan',       warna: '#59B8C4' },
    daya:     { label: 'Sistem daya',        warna: '#E8C34A' },
    termal:   { label: 'Kendali termal',     warna: '#8FD8C4' },
    antena:   { label: 'Antena',             warna: '#59B8C4' },
    komputer: { label: 'Elektronik',         warna: '#8FB4E8' },
    uji:      { label: 'Perangkat uji',      warna: '#C9A0DC' }
  };

  var SV = window.SpaceViewer = window.SpaceViewer || {};
  SV.HOTSPOTS = SV.HOTSPOTS || {};
  SV.LAYERS = SV.LAYERS || {};
  if (!SV.HOTSPOTS.stack) SV.HOTSPOTS.stack = HOTSPOTS_STACK;
  if (!SV.LAYERS.stack) SV.LAYERS.stack = LAYERS_STACK;
  if (!SV.KATEGORI) SV.KATEGORI = KATEGORI;
})();
