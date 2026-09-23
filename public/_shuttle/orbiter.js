/* =====================================================================
   orbiter.js — Space Shuttle orbiter (Discovery, OV-103)
   =====================================================================

   Dibangun dari foto Discovery di landasan 39B
   (_shuttle/reference/shuttle-pad-sts41d.jpg): badan putih dengan perut
   hitam, kerucut hidung gelap, tepi depan sayap hitam, kanopi gelap,
   dua polong OMS mengapit sirip, dan tiga nosel mesin di buritan.

   Kerangkanya sengaja sama dengan model orbiter lama pada situs supaya
   kedua puluh titik komponen yang sudah ada tetap jatuh di tempatnya:

     +X  hidung          -X  buritan
     +Y  punggung        -Y  perut
     +-Z sayap kiri dan kanan

   Beberapa koordinat titik itu sekaligus mengunci ukurannya: hidung di
   x 17.6, tepi pintu ruang muatan di y 5.6 z 2.6, ujung sayap di z 12,
   puncak sirip di y 10.9, dan nosel mesin di x -19.5.

   Nama grup mengikuti nama yang dipakai situs ('body', 'door', 'bayIn',
   'wing', 'flap', 'fin', 'canopy', 'pod', 'engine', 'mark') supaya
   tombol lapisan komponen bekerja tanpa diubah.
   ===================================================================== */

window.createOrbiterModel = function (options) {
  'use strict';
  options = options || {};

  var root = new THREE.Group();
  root.name = 'orbiter-discovery';

  /* ---------- bahan ----------
     Pelindung panas orbiter terbagi tegas: putih di punggung, hitam di
     perut. Dibuat sebagai satu tekstur kanvas yang dipetakan mengelilingi
     penampang badan, bukan dua mesh terpisah, supaya batas hitam-putihnya
     melengkung mengikuti badan seperti pada foto. */
  function tpsTexture() {
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var g = c.getContext('2d');

    // v = 0 di punggung, v = 0.5 di perut
    g.fillStyle = '#EDEFF2';
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#191C20';
    g.fillRect(0, 74, 256, 108);          // pita hitam melingkari perut
    // batas atas dibuat sedikit kabur, seperti peralihan ubin ke selimut
    var grad = g.createLinearGradient(0, 62, 0, 78);
    grad.addColorStop(0, 'rgba(237,239,242,1)');
    grad.addColorStop(1, 'rgba(25,28,32,1)');
    g.fillStyle = grad; g.fillRect(0, 62, 256, 16);
    var grad2 = g.createLinearGradient(0, 178, 0, 194);
    grad2.addColorStop(0, 'rgba(25,28,32,1)');
    grad2.addColorStop(1, 'rgba(237,239,242,1)');
    g.fillStyle = grad2; g.fillRect(0, 178, 256, 16);

    // garis ubin halus
    g.strokeStyle = 'rgba(120,130,145,.20)';
    g.lineWidth = 1;
    for (var i = 0; i < 256; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function markTexture(kind) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 512, 256);
    if (kind === 'usa') {
      // bendera lalu tulisan USA, seperti pada sayap kiri di foto
      g.fillStyle = '#C8102E';
      for (var s = 0; s < 7; s++) g.fillRect(20, 40 + s * 16, 150, 8);
      g.fillStyle = '#F4F5F7'; g.fillRect(20, 40, 150, 112);
      g.fillStyle = '#C8102E';
      for (var s2 = 0; s2 < 6; s2++) g.fillRect(20, 40 + s2 * 20, 150, 10);
      g.fillStyle = '#0A3161'; g.fillRect(20, 40, 62, 54);
      g.fillStyle = '#16233A';
      g.font = 'bold 96px Arial Black, Arial, sans-serif';
      g.textBaseline = 'middle';
      g.fillText('USA', 200, 96);
    } else {
      g.fillStyle = '#1A2333';
      g.font = 'italic bold 74px Georgia, serif';
      g.textBaseline = 'middle';
      g.fillText('Discovery', 12, 128);
    }
    var t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  var MAT = {
    tps: new THREE.MeshStandardMaterial({
      map: tpsTexture(), roughness: 0.92, metalness: 0.0 }),
    putih: new THREE.MeshStandardMaterial({ color: '#EDEFF2', roughness: 0.9 }),
    hitam: new THREE.MeshStandardMaterial({ color: '#191C20', roughness: 0.82 }),
    rcc:   new THREE.MeshStandardMaterial({ color: '#0E1013', roughness: 0.7 }),
    kaca:  new THREE.MeshStandardMaterial({ color: '#243447', roughness: 0.25, metalness: 0.35 }),
    bay:   new THREE.MeshStandardMaterial({ color: '#1C2229', roughness: 0.95, side: THREE.DoubleSide }),
    radiator: new THREE.MeshStandardMaterial({ color: '#C8CDD4', roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide }),
    logam: new THREE.MeshStandardMaterial({ color: '#8A9099', roughness: 0.6, metalness: 0.35 }),
    nosel: new THREE.MeshStandardMaterial({ color: '#3A4048', roughness: 0.55, metalness: 0.5 })
  };

  function add(parent, geo, mat, group, name) {
    var m = new THREE.Mesh(geo, mat);
    m.name = name || group;
    m.userData.group = group;
    parent.add(m);
    return m;
  }

  /* =========================================================
     1. Badan — loft dari rangkaian cincin penampang
     =========================================================
     Penampang orbiter bukan lingkaran: punggungnya membulat,
     perutnya nyaris rata. Profil di bawah adalah setengah lebar
     dan setengah tinggi ternormalisasi, ditelusuri dari punggung
     searah jarum jam. */
  var PROFIL = [
    [ 0.00,  1.00], [ 0.42,  0.96], [ 0.72,  0.82], [ 0.91,  0.55],
    [ 1.00,  0.18], [ 0.99, -0.22], [ 0.90, -0.55], [ 0.62, -0.78],
    [ 0.26, -0.87], [ 0.00, -0.89], [-0.26, -0.87], [-0.62, -0.78],
    [-0.90, -0.55], [-0.99, -0.22], [-1.00,  0.18], [-0.91,  0.55],
    [-0.72,  0.82], [-0.42,  0.96]
  ];

  /* Cincin: x, setengah lebar, setengah tinggi, pergeseran pusat.
     Angkanya diikat oleh titik komponen: hidung 17.6, sisi badan
     z 2.6 pada x 5, dan buritan -19.5. */
  var CINCIN = [
    { x:  18.7, w: 0.30, h: 0.30, cy:  0.20 },
    { x:  17.4, w: 1.10, h: 1.05, cy:  0.25 },
    { x:  15.6, w: 2.10, h: 1.95, cy:  0.30 },
    { x:  13.0, w: 3.05, h: 2.60, cy:  0.25 },
    { x:   9.5, w: 3.60, h: 2.85, cy:  0.10 },
    { x:   4.0, w: 3.80, h: 2.90, cy:  0.00 },
    { x:  -4.0, w: 3.80, h: 2.90, cy:  0.00 },
    { x: -10.0, w: 3.75, h: 2.95, cy:  0.05 },
    { x: -14.0, w: 3.55, h: 3.10, cy:  0.30 },
    { x: -17.0, w: 3.20, h: 3.15, cy:  0.55 },
    { x: -19.2, w: 2.85, h: 3.00, cy:  0.65 }
  ];

  /* Ruang muatan adalah lubang pada punggung badan, bukan kotak yang
     ditempel di atasnya. Karena itu bidang punggung di sepanjang ruang
     muatan tidak ikut dibuat saat badan di-loft — kalau dibuat, pintu
     yang terbuka hanya akan memperlihatkan punggung badan yang utuh. */
  var BAY_X0 = -11.5, BAY_X1 = 11.0;
  var BUKAAN = [0, 1, 2, 16, 17];        // indeks profil yang jadi bibir lubang

  function loftBadan() {
    var n = PROFIL.length, m = CINCIN.length;
    var pos = [], uv = [], idx = [];
    var x0 = CINCIN[m - 1].x, x1 = CINCIN[0].x;

    for (var i = 0; i < m; i++) {
      var r = CINCIN[i];
      for (var j = 0; j <= n; j++) {          // n+1: jahitan UV ditutup
        var p = PROFIL[j % n];
        pos.push(r.x, r.cy + p[1] * r.h, p[0] * r.w);
        uv.push((r.x - x0) / (x1 - x0) * 3.2, j / n);
      }
    }
    for (var i2 = 0; i2 < m - 1; i2++) {
      var xm = (CINCIN[i2].x + CINCIN[i2 + 1].x) / 2;
      var diBay = xm > BAY_X0 && xm < BAY_X1;
      for (var j2 = 0; j2 < n; j2++) {
        if (diBay && BUKAAN.indexOf(j2) >= 0) continue;   // bibir lubang
        var a = i2 * (n + 1) + j2, b = a + 1;
        var c = a + (n + 1), d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  add(root, loftBadan(), MAT.tps, 'body', 'badan');

  /* Kerucut hidung berlapis karbon — bagian tergelap di depan. */
  var hidung = new THREE.SphereGeometry(1.5, 20, 14);
  hidung.scale(1.5, 1.0, 1.0);
  var mh = add(root, hidung, MAT.rcc, 'body', 'kerucut-hidung');
  mh.position.set(17.9, 0.25, 0);

  /* =========================================================
     2. Kanopi dan jendela
     ========================================================= */
  var kanopiGeo = new THREE.SphereGeometry(1.62, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  var kanopi = add(root, kanopiGeo, MAT.kaca, 'canopy', 'kanopi');
  kanopi.scale.set(1.85, 0.72, 1.0);
  kanopi.position.set(13.9, 3.35, 0);
  kanopi.rotation.z = -0.16;

  // dua jendela atap
  [1, -1].forEach(function (s) {
    var w = add(root, new THREE.BoxGeometry(1.5, 0.16, 0.8), MAT.kaca, 'canopy', 'jendela-atap');
    w.position.set(12.6, 4.28, s * 0.7);
  });

  /* Palka kru di sisi kiri badan — titik 4 menunjuk ke sini. */
  var palka = add(root, new THREE.CircleGeometry(1.0, 20), MAT.hitam, 'body', 'palka-kru');
  palka.position.set(13.0, 1.5, 2.62);
  palka.rotation.y = Math.PI / 2;

  /* =========================================================
     3. Ruang muatan: dinding dalam, radiator, dan dua daun pintu
     =========================================================
     Pintunya diberi simpul engsel tersendiri di tepi atas badan,
     jadi membukanya cukup memutar simpul itu — bukan memindahkan
     geometri. Adapter viewer yang menggerakkannya. */
  /* Bibir lubang jatuh di sekitar z +-2.74 dan y 2.45 — itulah garis
     engsel kedua daun pintu. */
  var BAY_Z = 2.74, BAY_Y = 2.45, BAY_LANTAI = 0.55;

  var bay = new THREE.Group();
  bay.name = 'ruang-muatan';
  root.add(bay);

  // lantai dan dinding ruang muatan
  var lantai = add(bay, new THREE.BoxGeometry(BAY_X1 - BAY_X0, 0.22, BAY_Z * 2), MAT.bay, 'bayIn', 'bay-lantai');
  lantai.position.set((BAY_X0 + BAY_X1) / 2, BAY_LANTAI, 0);
  [1, -1].forEach(function (s) {
    var d = add(bay, new THREE.BoxGeometry(BAY_X1 - BAY_X0, BAY_Y - BAY_LANTAI, 0.2), MAT.bay, 'bayIn', 'bay-dinding');
    d.position.set((BAY_X0 + BAY_X1) / 2, (BAY_Y + BAY_LANTAI) / 2, s * BAY_Z);
  });
  [BAY_X0, BAY_X1].forEach(function (x, i) {
    var w = add(bay, new THREE.BoxGeometry(0.22, BAY_Y - BAY_LANTAI, BAY_Z * 2), MAT.bay, 'bayIn', 'bay-sekat-' + i);
    w.position.set(x, (BAY_Y + BAY_LANTAI) / 2, 0);
  });

  /* Dua daun pintu, masing-masing seperempat silinder di sekitar
     sumbu membujur badan. Engselnya di tepi atas badan. */
  [1, -1].forEach(function (s) {
    var hinge = new THREE.Group();
    hinge.name = 'engsel-pintu-' + (s > 0 ? 'kanan' : 'kiri');
    hinge.position.set(0, BAY_Y, s * BAY_Z);
    hinge.userData.doorSide = s;
    bay.add(hinge);

    /* Daun pintu dibuat datar, sama seperti idiom model lain di situs ini:
       pada ukuran tampil, lengkung aslinya tidak terbaca, sementara daun
       datar membuat arah putaran engselnya langsung jelas. Sisi dalamnya
       memakai bahan dua-muka supaya tetap terlihat saat pintu terbuka. */
    var daunMat = new THREE.MeshStandardMaterial({
      color: '#EDEFF2', roughness: 0.9, side: THREE.DoubleSide });
    var d = new THREE.Mesh(
      new THREE.BoxGeometry(BAY_X1 - BAY_X0, 0.2, BAY_Z), daunMat);
    d.name = 'pintu-' + (s > 0 ? 'kanan' : 'kiri');
    d.userData.group = 'door';
    d.position.set((BAY_X0 + BAY_X1) / 2, 0, -s * BAY_Z / 2);
    hinge.add(d);

    // radiator menghadap ke dalam ruang muatan, menempel di sisi bawah daun
    var rad = new THREE.Mesh(
      new THREE.PlaneGeometry(BAY_X1 - BAY_X0 - 1.4, BAY_Z - 0.7), MAT.radiator);
    rad.name = 'radiator-' + (s > 0 ? 'kanan' : 'kiri');
    rad.userData.group = 'door';
    rad.position.set((BAY_X0 + BAY_X1) / 2, -0.12, -s * BAY_Z / 2);
    rad.rotation.x = Math.PI / 2;
    hinge.add(rad);

    root.userData.doors = root.userData.doors || [];
    root.userData.doors.push(hinge);
  });

  /* Lengan robot Canadarm, tersimpan di tepi kiri ruang muatan. */
  var lengan = add(bay, new THREE.CylinderGeometry(0.22, 0.22, 15.5, 10), MAT.putih, 'bayIn', 'lengan-robot');
  lengan.rotation.z = Math.PI / 2;
  lengan.position.set(2.0, 2.15, 2.45);

  /* =========================================================
     4. Sayap delta ganda
     ========================================================= */
  function sayapShape(tumbuh) {
    var g = tumbuh || 0;
    var s = new THREE.Shape();
    s.moveTo(11.5 + g * 0.4, 1.9);          // pangkal glove, dekat kabin
    s.lineTo(2.0, 6.0 + g);                 // patahan sapuan
    s.lineTo(-9.5 - g * 0.3, 12.0 + g);     // ujung tepi depan
    s.lineTo(-15.2 - g, 12.0 + g);          // ujung tepi belakang
    s.lineTo(-16.0 - g, 2.6);
    s.closePath();
    return s;
  }
  [1, -1].forEach(function (side) {
    /* Sayap memakai bahan polos: tekstur badan dipetakan mengelilingi
       penampang, dan pada bidang ekstrusi UV-nya jatuh sebagai pita
       melintang yang tidak ada di aslinya. Tepi hitamnya justru datang
       dari pelat karbon di bawahnya, seperti tepi depan sayap sungguhan. */
    [{ t: 0.55, m: MAT.rcc,   h: 0.60, drop: 0.34, g: 'wing', n: 'sayap-tepi' },
     { t: 0,    m: MAT.putih, h: 0.62, drop: 0,    g: 'wing', n: 'sayap' }].forEach(function (cfg) {
      var geo = new THREE.ExtrudeGeometry(sayapShape(cfg.t),
        { depth: cfg.h, bevelEnabled: false, curveSegments: 1 });
      geo.rotateX(-Math.PI / 2);
      var mesh = new THREE.Mesh(geo, cfg.m);
      mesh.name = cfg.n + (side > 0 ? '-kanan' : '-kiri');
      mesh.userData.group = cfg.g;
      mesh.scale.z = side;
      mesh.position.set(0, -1.15 - cfg.drop, 0);
      root.add(mesh);
    });

    /* Elevon di tepi belakang sayap — titik 15 menunjuk ke sini. */
    var elevon = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.34, 8.4), MAT.putih);
    elevon.name = 'elevon-' + (side > 0 ? 'kanan' : 'kiri');
    elevon.userData.group = 'flap';
    elevon.position.set(-15.0, -1.15, side * 7.6);
    root.add(elevon);
  });

  /* =========================================================
     5. Sirip vertikal
     ========================================================= */
  var siripShape = new THREE.Shape();
  siripShape.moveTo(0, 0);
  siripShape.lineTo(-2.6, 8.0);
  siripShape.lineTo(-6.2, 8.0);
  siripShape.lineTo(-7.4, 0);
  siripShape.closePath();
  var siripGeo = new THREE.ExtrudeGeometry(siripShape, { depth: 0.62, bevelEnabled: false, curveSegments: 1 });
  siripGeo.translate(0, 0, -0.31);
  var sirip = add(root, siripGeo, MAT.putih, 'fin', 'sirip-vertikal');
  sirip.position.set(-13.4, 3.0, 0);

  // pintu parasut di puncak pangkal sirip — titik 20
  var chute = add(root, new THREE.BoxGeometry(1.5, 0.9, 0.7), MAT.hitam, 'fin', 'pintu-parasut');
  chute.position.set(-18.4, 4.6, 0);

  /* =========================================================
     6. Polong OMS dan mesin
     ========================================================= */
  [1, -1].forEach(function (side) {
    var pod = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 12), MAT.putih);
    pod.name = 'oms-' + (side > 0 ? 'kanan' : 'kiri');
    pod.userData.group = 'pod';
    pod.scale.set(2.6, 1.05, 1.0);
    pod.position.set(-16.6, 4.9, side * 2.4);
    root.add(pod);

    var nos = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.5, 14), MAT.nosel);
    nos.name = 'oms-nosel-' + (side > 0 ? 'kanan' : 'kiri');
    nos.userData.group = 'pod';
    nos.rotation.z = Math.PI / 2;
    nos.position.set(-19.4, 4.6, side * 2.2);
    root.add(nos);
  });

  /* Tiga nosel mesin utama: satu di atas, dua di bawah. */
  [[2.9, 0], [1.0, 1.55], [1.0, -1.55]].forEach(function (p, i) {
    var bell = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 1.35, 3.0, 20, 1, true), MAT.nosel);
    bell.name = 'mesin-' + i;
    bell.userData.group = 'engine';
    bell.rotation.z = Math.PI / 2;
    bell.position.set(-20.2, p[0], p[1]);
    bell.material.side = THREE.DoubleSide;
    root.add(bell);
  });

  /* Body flap di bawah nosel — titik 19. */
  var flap = add(root, new THREE.BoxGeometry(2.4, 0.42, 5.6), MAT.hitam, 'flap', 'body-flap');
  flap.position.set(-19.0, -1.75, 0);

  /* =========================================================
     7. Penanda: bendera dan tulisan, seperti terbaca pada foto
     ========================================================= */
  function tempel(tex, w, h, pos, rot, nama) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9 }));
    m.name = nama;
    m.userData.group = 'mark';
    m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    root.add(m);
    return m;
  }
  // USA + bendera di punggung sayap kiri
  tempel(markTexture('usa'), 6.4, 3.2, [-4.0, -0.50, 7.6], [Math.PI / 2, 0, Math.PI / 2], 'tanda-usa');
  // nama wahana di sisi badan depan
  tempel(markTexture('nama'), 5.2, 1.5, [8.6, 1.9, 3.16], [0, Math.PI / 2, 0], 'tanda-nama');

  /* Pintu roda pendarat depan — titik 7 menunjuk ke sini. */
  var gear = add(root, new THREE.BoxGeometry(3.2, 0.2, 1.9), MAT.hitam, 'body', 'pintu-roda-depan');
  gear.position.set(14.5, -2.35, 0);

  root.userData.groups = ['body', 'canopy', 'door', 'bayIn', 'wing', 'flap',
                          'fin', 'pod', 'engine', 'mark'];
  root.userData.axis = { nose: '+X', up: '+Y', wings: '+-Z' };
  root.userData.source = 'STS-41D di landasan 39B (_shuttle/reference/shuttle-pad-sts41d.jpg)';
  /* Orbiter pindaian, kalau asetnya tersedia.

     Sama pola dengan model.js: yang prosedural tetap dibangun dan tampil
     lebih dulu, lalu diganti mesh pindaian Smithsonian yang sudah dipecah
     tujuh wilayah begitu datanya sampai. Kalau gagal dimuat, yang
     prosedural tetap di tempatnya.

     Lewati dengan createOrbiterModel({ scanOrbiter: false }). */
  if (window.ScanOrbiter && window.ScanOrbiter.replaceOrbiterIn && options.scanOrbiter !== false) {
    window.ScanOrbiter.replaceOrbiterIn(root, { base: options.scanBase, livery: options.livery });
  }

  return root;
};
