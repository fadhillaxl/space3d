/* =====================================================================
   kratos-model.js — EXA Kratos Spacecraft Bus 1B, model prosedural
   =====================================================================

   Dibangun dari tujuh foto resmi EXA di folder ini. Tidak ada mesh yang
   diunduh: semuanya primitif Three.js, dan seluruh teksturnya digambar
   ke kanvas saat halaman dibuka — syarat mati, karena halaman ini dipakai
   dengan klik dua kali lewat file:// dan tidak boleh mengambil apa pun
   saat berjalan.

   Sumbu dan satuan:

     1 satuan = 1 cm.  Badan 1U = 10 x 11,35 x 10 cm (standar CubeSat).
     +Y  atas (dek antena)        -Y  dek bawah
     +-X sisi tempat sayap surya berengsel
     +Z  muka panel surya badan   -Z  muka perisai emas

   Sayapnya bukan hiasan: tiap sisi punya RANTAI TIGA PANEL berengsel
   sungguhan - dinding badan yang membuka, lalu dua sambungan. Itulah
   sebabnya foto-foto EXA memperlihatkan bagian dalam wahana: panel
   pertama tiap sisi memang dinding badan yang berayun keluar.

   Nama grup dipakai tombol lapisan dan titik komponen di halaman:
   rangka, surya, perisai, engsel, dalam, antena, sensor, rbf.
   ===================================================================== */

window.createKratosModel = function () {
  'use strict';

  var HX = 5.0, HY = 5.675, HZ = 5.0;      // setengah ukuran badan 1U
  var PANEL_W = 10.6, PANEL_H = 11.0, PANEL_T = 0.34;

  var root = new THREE.Group();
  root.name = 'kratos-bus-1b';

  /* ---------------------------------------------------------------
     Tekstur — semuanya digambar, tidak ada berkas gambar yang dimuat
     --------------------------------------------------------------- */

  /* Sel surya: dasar nila gelap dengan jari-jari pengumpul arus yang
     sangat rapat. Garis halus itu yang membuat sel terbaca sebagai sel
     dan bukan sekadar kotak hitam - pada foto EXA itulah ciri yang
     paling langsung terlihat dari jarak jauh. */
  function texSel() {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 128, 128);
    /* Pada foto, selnya nyaris hitam dengan semburat biru yang baru
       terlihat pada pantulan. Percobaan pertama memakai nila terang dan
       hasilnya terbaca sebagai plastik biru, bukan sel surya. */
    grad.addColorStop(0, '#12141c');
    grad.addColorStop(0.5, '#0b0d13');
    grad.addColorStop(1, '#171b26');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(150,165,200,.22)';
    g.lineWidth = 1;
    for (var x = 2; x < 128; x += 4) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke();
    }
    g.strokeStyle = 'rgba(170,185,215,.38)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke();
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  /* Papan panel: PCB putih dengan sablon samar dan bantalan tembaga di
     tepi, seperti bingkai panel pada foto. */
  function texPapan() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#EDEDE8'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(120,125,130,.18)';
    for (var i = 0; i < 26; i++) {
      g.fillRect(((i * 37) % 230) + 8, ((i * 61) % 236) + 6, 14, 3);
    }
    g.fillStyle = 'rgba(186,124,58,.55)';                 // bantalan tembaga
    for (var j = 0; j < 8; j++) { g.fillRect(6, 16 + j * 30, 10, 12); g.fillRect(240, 16 + j * 30, 10, 12); }
    var t = new THREE.CanvasTexture(c);
    return t;
  }

  /* Perisai SEAM/NEMEA: lembaran emas. Kerutan halusnya dibuat sebagai
     guratan terang-gelap yang tidak beraturan, karena permukaan rata
     sempurna membuatnya terbaca sebagai plastik kuning. */
  function texEmas() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#E8B437');
    grad.addColorStop(0.45, '#C98C15');
    grad.addColorStop(1, '#F0C651');
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    var seed = 7;
    function acak() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    for (var i = 0; i < 90; i++) {
      g.strokeStyle = acak() > 0.5 ? 'rgba(255,238,170,.30)' : 'rgba(120,80,10,.22)';
      g.lineWidth = acak() * 2 + 0.4;
      g.beginPath();
      var x = acak() * 256, y = acak() * 256;
      g.moveTo(x, y);
      g.lineTo(x + (acak() - 0.5) * 120, y + (acak() - 0.5) * 120);
      g.stroke();
    }
    return new THREE.CanvasTexture(c);
  }

  /* Tali REMOVE BEFORE LAUNCH. Tulisannya dibuat sebagai tekstur, bukan
     huruf timbul: pada ukuran tampil hurufnya hanya beberapa piksel,
     sedangkan geometri huruf akan memakan ribuan segitiga. */
  function texRBF() {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 64;
    var g = c.getContext('2d');
    g.fillStyle = '#C21B17'; g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#FFFFFF';
    g.font = 'bold 30px Arial Black, Arial, sans-serif';
    g.textBaseline = 'middle';
    g.fillText('REMOVE BEFORE LAUNCH', 18, 34);
    return new THREE.CanvasTexture(c);
  }

  /* CATATAN LOGAM — jangan naikkan metalness di sini tanpa memasang peta
     lingkungan lebih dulu.

     Pada Three.js, permukaan dengan metalness mendekati 1 hampir tidak
     punya komponen difus: warnanya datang dari apa yang dipantulkannya.
     Halaman ini tidak boleh memuat berkas apa pun saat berjalan, jadi
     tidak ada peta lingkungan sama sekali — dan pada percobaan pertama
     engsel kuningan tergambar HITAM sementara perisai emas jadi cokelat
     lumpur. Nilai di bawah sengaja ditahan di kisaran 0,3-0,5 supaya
     warnanya tetap dibawa komponen difus. */
  var BAHAN = {
    sel:     new THREE.MeshStandardMaterial({ map: texSel(), roughness: 0.34, metalness: 0.15 }),
    papan:   new THREE.MeshStandardMaterial({ map: texPapan(), roughness: 0.82, metalness: 0.0 }),
    rangka:  new THREE.MeshStandardMaterial({ color: '#E2E5E9', roughness: 0.46, metalness: 0.34 }),
    rangka2: new THREE.MeshStandardMaterial({ color: '#C6CBD1', roughness: 0.52, metalness: 0.30 }),
    emas:    new THREE.MeshStandardMaterial({ map: texEmas(), color: '#FFFFFF', roughness: 0.34, metalness: 0.42 }),
    tembaga: new THREE.MeshStandardMaterial({ color: '#C77B3C', roughness: 0.40, metalness: 0.40 }),
    kuningan:new THREE.MeshStandardMaterial({ color: '#D2A03C', roughness: 0.38, metalness: 0.40 }),
    gelap:   new THREE.MeshStandardMaterial({ color: '#1A1D22', roughness: 0.6, metalness: 0.2 }),
    pcbMerah:new THREE.MeshStandardMaterial({ color: '#8E2B22', roughness: 0.75 }),
    pcbHijau:new THREE.MeshStandardMaterial({ color: '#1F5B3A', roughness: 0.75 }),
    baterai: new THREE.MeshStandardMaterial({ color: '#2A2F38', roughness: 0.55, metalness: 0.3 }),
    kabelO:  new THREE.MeshStandardMaterial({ color: '#D2711E', roughness: 0.6 }),
    kabelB:  new THREE.MeshStandardMaterial({ color: '#2E6FB8', roughness: 0.6 }),
    rbf:     new THREE.MeshStandardMaterial({ map: texRBF(), roughness: 0.85, side: THREE.DoubleSide })
  };

  function tambah(induk, geo, bahan, grup, nama, pos, rot) {
    var m = new THREE.Mesh(geo, bahan);
    m.name = nama || grup;
    m.userData.group = grup;
    if (pos) m.position.set(pos[0] || 0, pos[1] || 0, pos[2] || 0);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    induk.add(m);
    return m;
  }

  /* =========================================================
     1. Rangka: empat rel sudut dan bingkai atas-bawah
     =========================================================
     Rel sudut adalah bagian yang menyentuh dinding deployer, dan pada
     foto EXA rel itu jelas menonjol dari bidang panel. */
  var REL = 0.62;        // pada foto relnya tipis, bukan balok gemuk
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q, i) {
    var x = q[0] * (HX - REL / 2), z = q[1] * (HZ - REL / 2);
    tambah(root, new THREE.BoxGeometry(REL, HY * 2, REL), BAHAN.rangka,
           'rangka', 'rel-sudut-' + i, [x, 0, z]);
  });

  // bingkai melintang di kedua ujung, mengikat keempat rel
  [-1, 1].forEach(function (s) {
    var y = s * (HY - 0.42);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d, j) {
      var w = d[0] ? 0.8 : (HX - REL) * 2;
      var dp = d[0] ? (HZ - REL) * 2 : 0.8;
      tambah(root, new THREE.BoxGeometry(w || 0.8, 0.84, dp || 0.8), BAHAN.rangka2,
             'rangka', 'bingkai-' + (s > 0 ? 'atas' : 'bawah') + '-' + j,
             [d[0] * (HX - REL / 2), y, d[1] * (HZ - REL / 2)]);
    });
  });

  // dek atas dan dek bawah
  tambah(root, new THREE.BoxGeometry(HX * 2 - REL * 2, 0.3, HZ * 2 - REL * 2),
         BAHAN.papan, 'rangka', 'dek-atas', [0, HY - 0.15, 0]);
  tambah(root, new THREE.BoxGeometry(HX * 2 - REL * 2, 0.3, HZ * 2 - REL * 2),
         BAHAN.papan, 'rangka', 'dek-bawah', [0, -HY + 0.15, 0]);

  /* =========================================================
     2. Perisai SEAM/NEMEA pada muka -Z
     ========================================================= */
  tambah(root, new THREE.BoxGeometry(HX * 2 - 1.2, HY * 2 - 1.2, 0.22), BAHAN.emas,
         'perisai', 'perisai-seam', [0, 0, -HZ + 0.11]);
  // cip kecil yang terlihat menempel di tengah perisai pada foto
  tambah(root, new THREE.BoxGeometry(0.75, 0.75, 0.16), BAHAN.gelap,
         'perisai', 'perisai-cip', [0.2, 0.35, -HZ - 0.02]);
  // lekukan memanjang di bagian bawah perisai
  tambah(root, new THREE.BoxGeometry(5.4, 1.1, 0.14), BAHAN.emas,
         'perisai', 'perisai-lekuk', [-0.3, -2.3, -HZ - 0.02]);

  /* =========================================================
     3. Panel surya tetap pada muka +Z
     ========================================================= */
  (function () {
    var papan = tambah(root, new THREE.BoxGeometry(HX * 2 - 1.3, HY * 2 - 1.3, 0.3),
                       BAHAN.papan, 'surya', 'panel-badan', [0, 0, HZ - 0.15]);
    [1, -1].forEach(function (s) {
      tambah(root, new THREE.BoxGeometry(HX * 2 - 2.6, HY - 1.5, 0.1), BAHAN.sel,
             'surya', 'sel-badan-' + (s > 0 ? 'atas' : 'bawah'),
             [0, s * (HY / 2 - 0.35), HZ + 0.02]);
    });
    return papan;
  })();

  /* =========================================================
     4. Sayap surya: rantai tiga panel berengsel di tiap sisi
     =========================================================
     Panel pertama adalah dinding badan yang membuka. Engselnya berdiri
     pada rusuk belakang (z = -HZ), jadi saat terbentang seluruh sayap
     jatuh pada satu bidang yang sama - persis seperti pada foto, dan
     itu pula sebabnya bagian dalam wahana terlihat begitu terbuka. */
  function buatPanel(induk, nama, pakaiSel) {
    var g = new THREE.Group();
    g.name = nama;
    induk.add(g);

    // papan panel: pangkalnya di x=0, memanjang ke +x
    tambah(g, new THREE.BoxGeometry(PANEL_W, PANEL_H, PANEL_T), BAHAN.papan,
           'surya', nama + '-papan', [PANEL_W / 2, 0, 0]);

    /* Sel dipasang pada KEDUA muka papan. Sisi kiri berputar setengah
       lingkaran saat membentang, jadi kalau selnya hanya sebelah, satu
       sayap akan memperlihatkan punggung papan yang polos — dan pada
       semua foto EXA kedua sayap jelas memperlihatkan sel. */
    if (pakaiSel) {
      [1, -1].forEach(function (muka) {
        [1, -1].forEach(function (s) {
          /* Sel hampir memenuhi papan: pada foto, bingkai putih yang
             tersisa hanya sekitar sepersepuluh lebar panel. */
          tambah(g, new THREE.BoxGeometry(PANEL_W - 0.9, PANEL_H / 2 - 0.55, 0.08), BAHAN.sel,
                 'surya', nama + '-sel-' + (muka > 0 ? 'depan' : 'belakang') + '-' + (s > 0 ? 'atas' : 'bawah'),
                 [PANEL_W / 2, s * (PANEL_H / 4 + 0.16), muka * (PANEL_T / 2 + 0.04)]);
        });
      });
    }
    return g;
  }

  /* Engsel kuningan: dua blok bertumpuk pada tiap sambungan, seperti
     pada foto. Bentuk kecil ini yang membuat lipatannya terbaca sebagai
     mekanisme, bukan sekadar panel yang patah. */
  function buatEngsel(induk, x, nama) {
    [1, -1].forEach(function (s) {
      tambah(induk, new THREE.BoxGeometry(1.5, 1.2, 0.85), BAHAN.kuningan,
             'engsel', nama + '-' + (s > 0 ? 'atas' : 'bawah'),
             [x, s * 3.1, 0.15]);
    });
  }

  var sayapSisi = [];
  [1, -1].forEach(function (sisi) {
    var tanda = sisi > 0 ? 'kanan' : 'kiri';

    /* Simpul engsel pangkal berdiri di rusuk belakang badan. Seluruh
       rantai digantung padanya, jadi satu putaran menggerakkan semuanya. */
    /* Sisi kiri TIDAK diskalakan negatif. Skala negatif membalik urutan
       simpul segitiga, sehingga panel kiri tampak tersinari dari belakang.
       Cerminannya diurus oleh sudut engsel: keduanya terlipat ke arah
       putaran yang sama, lalu membuka ke arah yang berlawanan. */
    var pangkal = new THREE.Group();
    pangkal.name = 'engsel-pangkal-' + tanda;
    pangkal.position.set(sisi * HX, 0, -HZ);
    root.add(pangkal);

    var p0 = buatPanel(pangkal, 'panel-' + tanda + '-0', true);
    buatEngsel(pangkal, 0.6, 'engsel-' + tanda + '-0');

    var s1 = new THREE.Group();
    s1.name = 'engsel-1-' + tanda;
    s1.position.set(PANEL_W + 0.35, 0, 0);
    p0.add(s1);
    var p1 = buatPanel(s1, 'panel-' + tanda + '-1', true);
    buatEngsel(s1, 0.3, 'engsel-' + tanda + '-1');

    var s2 = new THREE.Group();
    s2.name = 'engsel-2-' + tanda;
    s2.position.set(PANEL_W + 0.35, 0, 0);
    p1.add(s2);
    buatPanel(s2, 'panel-' + tanda + '-2', true);
    buatEngsel(s2, 0.3, 'engsel-' + tanda + '-2');

    sayapSisi.push({ pangkal: pangkal, s1: s1, s2: s2, sisi: sisi });
  });

  /* =========================================================
     5. Bagian dalam: ICEPS, baterai, kabel
     =========================================================
     Hanya terlihat ketika sayap terbentang, karena panel pertama tiap
     sisi memang dinding badannya. */
  tambah(root, new THREE.BoxGeometry(0.25, HY * 2 - 1.6, HZ * 2 - 1.8), BAHAN.pcbMerah,
         'dalam', 'iceps-papan', [-1.4, 0.2, 0]);
  tambah(root, new THREE.BoxGeometry(1.5, 1.5, 1.5), BAHAN.gelap,
         'dalam', 'iceps-prosesor', [-1.1, 2.1, -0.6]);
  tambah(root, new THREE.BoxGeometry(0.9, 1.1, 2.2), BAHAN.pcbHijau,
         'dalam', 'iceps-sdr', [-1.0, -0.4, 0.9]);
  tambah(root, new THREE.BoxGeometry(2.6, 3.4, 0.9), BAHAN.baterai,
         'dalam', 'baterai-bao3', [0.9, -0.6, -1.2]);
  tambah(root, new THREE.BoxGeometry(2.0, 0.28, 2.6), BAHAN.pcbHijau,
         'dalam', 'papan-muatan', [1.2, 2.6, 0.4]);
  // berkas kabel
  [[-0.2, 1.5, 2.0, BAHAN.kabelO], [-0.2, 1.0, 2.2, BAHAN.kabelB],
   [0.4, -2.2, 1.9, BAHAN.kabelO]].forEach(function (k, i) {
    var kbl = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.4, 8), k[3]);
    kbl.name = 'kabel-' + i;
    kbl.userData.group = 'dalam';
    kbl.rotation.z = Math.PI / 2;
    kbl.rotation.y = i * 0.4 - 0.3;
    kbl.position.set(k[0], k[1], k[2] - 1.2);
    root.add(kbl);
  });

  /* =========================================================
     6. Antena dan sensor
     ========================================================= */
  tambah(root, new THREE.CylinderGeometry(0.42, 0.52, 0.8, 14), BAHAN.kuningan,
         'antena', 'konektor-sma', [1.5, HY + 0.3, -1.2]);
  tambah(root, new THREE.CylinderGeometry(0.11, 0.11, 2.6, 10), BAHAN.rangka2,
         'antena', 'batang-antena', [1.5, HY + 1.9, -1.2]);
  tambah(root, new THREE.BoxGeometry(1.2, 0.5, 0.9), BAHAN.rangka2,
         'antena', 'dudukan-antena', [-1.4, HY + 0.2, -1.0]);

  /* Sensor suhu dan matahari pada keenam sisi - kecil, tetapi disebut
     dokumentasi sebagai ciri yang ada di SEMUA sisi, jadi dibangun di
     semua sisi juga. */
  [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]].forEach(function (n, i) {
    tambah(root, new THREE.BoxGeometry(0.5, 0.5, 0.18), BAHAN.gelap, 'sensor', 'sensor-' + i,
           [n[0] * (HX - 1.1) + (n[0] ? 0 : 2.6), n[1] * (HY - 1.0) + (n[1] ? 0 : -3.6), n[2] * (HZ + 0.12) + (n[2] ? 0 : 2.2)],
           [n[1] ? Math.PI / 2 : 0, n[0] ? Math.PI / 2 : 0, 0]);
  });

  /* =========================================================
     7. Tali REMOVE BEFORE LAUNCH
     ========================================================= */
  (function () {
    var tali = new THREE.Group();
    tali.name = 'rbf';
    root.add(tali);
    var pita = tambah(tali, new THREE.PlaneGeometry(6.2, 1.05), BAHAN.rbf, 'rbf', 'rbf-pita',
                      [2.6, -1.4, HZ + 0.5], [0, 0, -0.42]);
    pita.renderOrder = 2;
    tambah(tali, new THREE.TorusGeometry(0.45, 0.13, 8, 18), BAHAN.kuningan, 'rbf', 'rbf-cincin',
           [-0.2, 1.4, HZ + 0.6]);
    tambah(tali, new THREE.BoxGeometry(0.5, 1.6, 0.3), BAHAN.rangka2, 'rbf', 'rbf-pin',
           [-0.2, 2.2, HZ + 0.4]);
  })();

  /* =========================================================
     Kendali pembentangan
     =========================================================
     Satu angka 0..1 menggerakkan seluruh rantai:
       0 = terlipat rapat ke badan, seperti di dalam deployer
       1 = terbentang penuh pada satu bidang

     Sudutnya bukan karangan: saat terbentang seluruh panel harus
     sebidang, jadi kedua engsel sambungan harus mencapai nol, dan
     engsel pangkal harus membuka tepat seperempat lingkaran dari
     posisi terlipat. */
  function setDeploy(t) {
    t = Math.max(0, Math.min(1, t));
    sayapSisi.forEach(function (w) {
      /* Terlipat, kedua sisi sama: panel menempel pada mukanya sendiri,
         memanjang ke arah +Z. Terbentang, keduanya berpisah — yang kanan
         berhenti di 0 derajat, yang kiri terus sampai setengah lingkaran,
         sehingga keduanya sebidang dan saling membelakangi. */
      w.pangkal.rotation.y = w.sisi > 0
        ? -Math.PI / 2 * (1 - t)
        : -Math.PI / 2 * (1 + t);
      /* Sambungannya melipat berselang-seling, seperti lipatan kipas:
         tanpa itu panel kedua dan ketiga akan saling menembus. */
      w.s1.rotation.y = Math.PI * (1 - t);
      w.s2.rotation.y = -Math.PI * (1 - t);
    });
    root.userData.deploy = t;
  }
  setDeploy(1);

  root.userData.setDeploy = setDeploy;
  root.userData.groups = ['rangka', 'surya', 'perisai', 'engsel', 'dalam',
                          'antena', 'sensor', 'rbf'];
  root.userData.sumber = 'tujuh foto resmi EXA, folder ini';
  return root;
};
