/* =====================================================================
   satria-model.js — Satelit SATRIA, dari model 3D Satelit_Satria_1.glb
   =====================================================================

   Membangun THREE.Group dari window.SATRIA_DATA (_satria/satria-data.js).

   Kenapa tidak memakai GLTFLoader: situs ini dibuka dengan klik dua kali
   lewat file://, dan GLTFLoader mengambil berkasnya dengan fetch — yang
   selalu gagal di file://. Jadi GLB-nya dipanggang lebih dulu menjadi
   berkas JS: posisi, normal, dan UV sudah dalam ruang dunia, tekstur
   warnanya diperkecil dan ditanam sebagai data URL.

   Sumbu asli GLB (sesudah transformasi node dipanggang):

       X  -3,07 .. 1,64   sumbu hadap Bumi; antena di +X, pendorong di -X
       Y   0,38 .. 6,59   atas-bawah
       Z  -9,17 .. 9,03   bentang sayap surya, 18,2 satuan

   Sumbu itu kebetulan sama persis dengan model kanvas Satria yang lama:
   +X ke antena, Y ke atas, Z bentang sayap. Jadi tidak ada pemutaran di
   sini — yang perlu hanya menggeser titik asal ke tengah bus dan
   membesarkan modelnya ke skala halaman, supaya tujuh titik komponen di
   satria-1.html tetap menunjuk benda yang sama.

   SKALA dicari dari ujung sayap: titik "Panel surya" lama berada di
   z = 22, ujung sayap GLB di z = 9,1 — jadi 22 / 9,1 = 2,418. Dengan
   angka itu nosel pendorong jatuh di x = -5,31, sementara titik lamanya
   di x = -5,0. Jarak kamera dan langkah tur di halaman ikut tetap sah.
   ===================================================================== */

window.createSatriaModel = function () {
  'use strict';

  var D = window.SATRIA_DATA;
  if (!D) throw new Error('satria-data.js belum termuat');

  /* ---------- nama bagian GLB -> grup lapisan situs ----------
     Nama node di GLB-nya generik (Cube.001, Cylinder.003), jadi pemetaan
     ini dibuat dengan menyorot satu per satu di panggung uji
     (_satria/harness.html), bukan dari namanya. Letak dan ukuran tiap
     bagian dicatat di _satria/pemetaan.md supaya bisa diperiksa ulang. */
  var GRUP = {
    'Cube':           'osr',        // dua pelat lebar di sisi utara-selatan
    'Cube.001':       'bus',        // kotak badan beserta seluruh dindingnya
    'Cube.004':       'bus',        // susunan pelat mendatar di ujung -X
    'Cube.005':       'bus',        // kotak-kotak perangkat di sisi atas
    'Cylinder.001':   'bus',        // siku kecil di dinding bus
    'NurbsPath':      'tank',       // pipa melengkung sistem propelan
    'Cube.003':       'solar',      // dua sayap surya, bentang 44 satuan
    'Cube.002':       'solar',      // dua batang penopang ke sayap
    'Cylinder.002':   'antenna',    // dua reflektor atas
    'Cylinder.003':   'antenna',    // lengan penopang kedua reflektor atas
    'Cylinder.004#1': 'antenna',    // reflektor bawah
    'Cylinder.005':   'antenna',    // menara umpan ke reflektor bawah
    'Cylinder.004#0': 'antenna',    // serpih 4 segitiga, ikut antena
    'Cylinder':       'thruster'    // nosel di ujung -X
  };

  /* Ke skala dan titik asal halaman. Tidak ada pemutaran: sumbu GLB-nya
     sudah sama dengan sumbu model lama. */
  var SKALA = 2.418;
  var PUSAT_BUS = [-0.748, 3.462, -0.072];   // titik tengah node "Cube"
  var SUSUN = new THREE.Matrix4()
    .makeScale(SKALA, SKALA, SKALA)
    .multiply(new THREE.Matrix4().makeTranslation(
      -PUSAT_BUS[0], -PUSAT_BUS[1], -PUSAT_BUS[2]));

  function dekode(b64, Tipe) {
    var biner = window.atob(b64);
    var buf = new ArrayBuffer(biner.length);
    var byte = new Uint8Array(buf);
    for (var i = 0; i < biner.length; i++) byte[i] = biner.charCodeAt(i);
    return new Tipe(buf);
  }

  /* Tekstur dipakai bersama: beberapa material menunjuk gambar yang sama,
     dan memuatnya dua kali berarti dua tekstur GPU untuk piksel yang persis
     sama. */
  var cacheTekstur = {};
  function tekstur(idx) {
    if (idx === null || idx === undefined) return null;
    if (!cacheTekstur[idx]) {
      var t = new THREE.Texture();
      var img = new Image();
      img.onload = function () { t.image = img; t.needsUpdate = true; };
      img.src = D.tekstur[idx];
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.flipY = false;                       // glTF memakai UV asal kiri-atas
      cacheTekstur[idx] = t;
    }
    return cacheTekstur[idx];
  }

  var bahan = D.material.map(function (m) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(m.warna[0], m.warna[1], m.warna[2]),
      map: tekstur(m.peta),
      /* Logam ditahan di bawah 0,45: tanpa peta lingkungan, permukaan
         logam penuh merender nyaris hitam. Pelajaran dari model Kratos. */
      metalness: Math.min(m.metal === undefined ? 0.4 : m.metal, 0.45),
      roughness: m.kasar === undefined ? 0.6 : Math.max(m.kasar, 0.25),
      side: THREE.DoubleSide
    });
  });
  var bahanPolos = new THREE.MeshStandardMaterial({
    color: '#B9BEC4', roughness: 0.55, metalness: 0.3, side: THREE.DoubleSide });

  var root = new THREE.Group();
  root.name = 'satria-glb';

  D.bagian.forEach(function (b) {
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(dekode(b.pos, Float32Array), 3));
    if (b.nor) geo.setAttribute('normal', new THREE.BufferAttribute(dekode(b.nor, Float32Array), 3));
    else geo.computeVertexNormals();
    if (b.uv) geo.setAttribute('uv', new THREE.BufferAttribute(dekode(b.uv, Float32Array), 2));
    geo.setIndex(new THREE.BufferAttribute(
      dekode(b.idx, b.idx32 ? Uint32Array : Uint16Array), 1));
    geo.applyMatrix4(SUSUN);

    var mesh = new THREE.Mesh(geo, b.material === null ? bahanPolos : bahan[b.material]);
    mesh.name = b.nama;
    mesh.userData.group = GRUP[b.nama] || 'bus';
    root.add(mesh);
  });

  /* Tidak ada 'tower': model ini tidak memodelkan tabung struktural di
     dalam bus. Lihat _satria/pemetaan.md. */
  root.userData.groups = ['bus', 'osr', 'tank', 'solar', 'antenna', 'thruster'];
  root.userData.sumber = 'Satelit_Satria_1.glb';
  return root;
};
