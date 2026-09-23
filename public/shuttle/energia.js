/* =====================================================================
   energia.js — tumpukan peluncuran Energia–Buran
   =====================================================================

   Bentuknya mirip Space Shuttle dari jauh, tetapi arsitekturnya justru
   kebalikannya, dan itu bagian yang paling layak dilihat dari model ini:

     Space Shuttle   orbiter membawa tiga mesin utama; tangki hanya
                     memasok propelan dan tidak punya mesin sama sekali.
     Energia         seluruh mesin ada di roketnya. Blok Ts membawa empat
                     RD-0120 di buritannya sendiri, dan Buran naik sebagai
                     muatan tanpa mesin utama.

   Akibatnya Energia adalah roket yang berdiri sendiri: pernah terbang
   sekali lagi tanpa Buran, mengangkut Polyus. Space Shuttle tidak pernah
   bisa begitu — tanpa orbiter, tumpukannya tidak punya mesin.

   Pembedanya yang kedua: boosternya cair, bukan padat. Empat Blok A,
   masing-masing satu RD-170 berkepala empat nosel, dan tiap blok pada
   dasarnya tingkat pertama roket Zenit.

   ---------------------------------------------------------------------
   Ukuran

   Skalanya sama dengan tumpukan Amerika, 1,0952 satuan situs per meter,
   supaya pemuat pindaian bisa dipakai ulang apa adanya.

       Blok Ts      diameter 7,75 m   panjang 58,765 m
       Blok A       diameter 3,90 m   panjang 39,46 m, empat buah
       Buran        panjang 36,37 m   rentang sayap 23,92 m

   ---------------------------------------------------------------------
   Yang terukur dan yang dugaan

   Diameter, panjang, dan jumlah mesin di atas berasal dari angka resmi
   kendaraannya. Yang DIDUGA: sudut pemasangan keempat booster, bentuk
   persis penopang antara inti dan orbiter, serta rincian buritan di
   balik dek peluncuran. Semua itu disusun agar terbaca benar pada
   ukuran tampil, bukan hasil pengukuran.

   Orbiternya sendiri diganti pindaian Smithsonian berlivery Buran oleh
   scan-orbiter.js. Perlu diulang di sini: itu airframe Discovery yang
   dicat ulang, bukan pindaian Buran — lihat buran-model.js.
   ===================================================================== */

window.createEnergiaModel = function (options) {
  'use strict';
  options = options || {};

  var METRE = 1.0952;
  function m(x) { return x * METRE; }

  /* =========================================================
     1. Ukuran
     ========================================================= */
  var CORE_R        = m(3.875);          // 7,75 m diameter
  var CORE_TIP      = 40.0;              // datum memanjang
  var CORE_OGIVE    = CORE_TIP - m(9.0);
  var CORE_AFT      = CORE_TIP - m(58.765);
  var CORE_SKIRT    = CORE_AFT + m(4.2);
  var CORE_NOZ_END  = CORE_AFT - m(3.4);

  var BOOST_R       = m(1.95);           // 3,90 m diameter
  var BOOST_TIP     = 22.2;
  var BOOST_NOSE    = BOOST_TIP - m(5.6);
  var BOOST_AFT     = BOOST_TIP - m(39.46);
  var BOOST_NOZ_END = BOOST_AFT - m(2.6);
  var BOOST_D       = CORE_R + BOOST_R + 0.30;   // jarak sumbu ke sumbu

  /* Keempat Blok A mengelilingi inti, orbiter di antara sepasang di
     antaranya. Sudutnya DUGAAN: dipilih 45 derajat supaya dua booster
     mengapit orbiter dan dua lagi terlihat di belakang inti, seperti
     yang terbaca pada foto di landasan. */
  var BOOST_ANGLE = [45, 135, 225, 315];

  var ORB_NOSE = 23.8;                   // hidung Buran, dari foto di landasan

  var root = new THREE.Group();
  root.name = 'root';

  /* =========================================================
     2. Tekstur — digambar saat berjalan, tanpa berkas gambar
     ---------------------------------------------------------
     Halaman harus tetap hidup dari dobel-klik, jadi tidak ada satu pun
     gambar yang dimuat dari luar.
     ========================================================= */
  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function finish(c, repX, repY) {
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repX || 1, repY || 1);
    t.anisotropy = 8;
    return t;
  }

  /* PRNG bersemai: bercaknya harus sama tiap kali halaman dibuka,
     kalau tidak modelnya berubah sendiri antar-muat. */
  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* Busa isolasi Blok Ts. Warnanya lebih cokelat dan lebih kusam
     daripada External Tank Amerika. */
  function foamTexture() {
    var c = makeCanvas(256, 256), g = c.getContext('2d'), r = seeded(20481115), i;
    g.fillStyle = '#B4682E';
    g.fillRect(0, 0, 256, 256);
    for (i = 0; i < 2600; i++) {
      var x = r() * 256, y = r() * 256, rad = 1 + r() * 5;
      g.fillStyle = 'rgba(' + (140 + r() * 60 | 0) + ',' + (78 + r() * 40 | 0) +
                    ',' + (36 + r() * 30 | 0) + ',' + (0.10 + r() * 0.30).toFixed(2) + ')';
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    return c;
  }

  /* Cat putih Blok A, dengan sedikit kotor supaya tidak terbaca plastik. */
  function paintTexture() {
    var c = makeCanvas(128, 128), g = c.getContext('2d'), r = seeded(390411), i;
    g.fillStyle = '#DCDDD8';
    g.fillRect(0, 0, 128, 128);
    for (i = 0; i < 900; i++) {
      g.fillStyle = 'rgba(150,152,148,' + (0.04 + r() * 0.12).toFixed(2) + ')';
      g.beginPath(); g.arc(r() * 128, r() * 128, 0.6 + r() * 2.2, 0, Math.PI * 2); g.fill();
    }
    return c;
  }

  function std(hex, rough, metal, canvas, repX, repY) {
    var mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex), roughness: rough, metalness: metal
    });
    if (canvas) mat.map = finish(canvas, repX, repY);
    return mat;
  }

  var M = {
    foam:      std('#FFFFFF', 0.94, 0.0, foamTexture(), 3, 9),
    paint:     std('#FFFFFF', 0.66, 0.0, paintTexture(), 2, 8),
    grey:      std('#9BA0A6', 0.60, 0.15, null),
    dark:      std('#2A2D33', 0.62, 0.10, null),
    engine:    std('#7C7F86', 0.42, 0.85, null),
    engineIn:  std('#33353B', 0.70, 0.55, null),
    nozzle:    std('#8A6152', 0.66, 0.20, null),
    nozzleIn:  std('#4A2C24', 0.80, 0.10, null),
    strut:     std('#B9BDC2', 0.55, 0.35, null),
    orbBlank:  std('#E8EAEE', 0.80, 0.0, null)
  };

  /* =========================================================
     3. Alat bantu bentuk
     ========================================================= */
  function add(parent, mesh, group, name) {
    mesh.userData.group = group;
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  }

  /* Benda putar sepanjang sumbu X; profil sebagai pasangan [x, jari-jari]. */
  function lathe(profile, segments, material) {
    var pts = [], i;
    for (i = 0; i < profile.length; i++) {
      pts.push(new THREE.Vector2(Math.max(profile[i][1], 0.0001), profile[i][0]));
    }
    var geo = new THREE.LatheGeometry(pts, segments || 44);
    geo.rotateZ(-Math.PI / 2);
    return new THREE.Mesh(geo, material);
  }

  function tube(x0, x1, r0, r1, segments, material, open) {
    var geo = new THREE.CylinderGeometry(r1, r0, Math.abs(x1 - x0), segments || 44, 1, !!open);
    geo.rotateZ(Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, 0);
    return new THREE.Mesh(geo, material);
  }

  /* Ogive: kemiringannya berubah terus, bukan kerucut lurus. */
  function ogiveProfile(xTip, xBase, r, steps) {
    var p = [], i, t;
    for (i = 0; i <= steps; i++) {
      t = i / steps;
      p.push([xTip + (xBase - xTip) * t, r * Math.sqrt(Math.max(t, 0)) ]);
    }
    return p;
  }

  /* Nosel lonceng: dinding luar dan dalam, supaya tetap terbaca sebagai
     rongga saat dilihat dari bawah. */
  function bell(parent, x, rThroat, rExit, len, group, name) {
    var prof = [], i, t;
    for (i = 0; i <= 10; i++) {
      t = i / 10;
      prof.push([x - len * t, rThroat + (rExit - rThroat) * Math.pow(t, 0.72)]);
    }
    var out = add(parent, lathe(prof, 26, M.engine), group, name);
    var inn = lathe(prof, 26, M.engineIn);
    inn.scale.set(1, 0.96, 0.96);
    add(parent, inn, group, name + '-dalam');
    return out;
  }

  /* =========================================================
     4. Blok Ts — inti, dengan mesinnya sendiri
     ========================================================= */
  var core = new THREE.Group();
  core.name = 'blok-ts';
  root.add(core);

  add(core, lathe(ogiveProfile(CORE_TIP, CORE_OGIVE, CORE_R, 18), 44, M.foam),
      'core', 'core-ogive');
  add(core, tube(CORE_OGIVE, CORE_SKIRT, CORE_R, CORE_R, 44, M.foam),
      'core', 'core-silinder');
  add(core, tube(CORE_SKIRT, CORE_AFT, CORE_R, CORE_R * 0.96, 44, M.grey),
      'core', 'core-rok-buritan');

  /* Empat RD-0120. Inilah pembeda pokoknya dari Space Shuttle: mesin
     utamanya ada di roket, bukan di orbiter. */
  (function () {
    var ring = CORE_R * 0.46, i, a;
    for (i = 0; i < 4; i++) {
      a = (i * 90 + 45) * Math.PI / 180;
      var g = new THREE.Group();
      g.position.set(0, Math.cos(a) * ring, Math.sin(a) * ring);
      core.add(g);
      bell(g, CORE_AFT + m(0.4), m(0.55), m(1.15), m(3.8), 'coreEngine', 'rd0120-' + (i + 1));
    }
  })();

  /* =========================================================
     5. Blok A — empat booster cair
     ========================================================= */
  BOOST_ANGLE.forEach(function (deg, n) {
    var a = deg * Math.PI / 180;
    var g = new THREE.Group();
    g.name = 'blok-a-' + (n + 1);
    g.position.set(0, Math.cos(a) * BOOST_D, Math.sin(a) * BOOST_D);
    root.add(g);

    add(g, lathe(ogiveProfile(BOOST_TIP, BOOST_NOSE, BOOST_R, 14), 32, M.paint),
        'boost', 'blok-a-' + (n + 1) + '-hidung');
    add(g, tube(BOOST_NOSE, BOOST_AFT + m(3.0), BOOST_R, BOOST_R, 32, M.paint),
        'boost', 'blok-a-' + (n + 1) + '-badan');
    add(g, tube(BOOST_AFT + m(3.0), BOOST_AFT, BOOST_R, BOOST_R * 0.98, 32, M.dark),
        'boost', 'blok-a-' + (n + 1) + '-rok');

    /* Satu RD-170 berkepala empat nosel — bukan satu nosel besar. */
    var ring = BOOST_R * 0.44, i, b;
    for (i = 0; i < 4; i++) {
      b = (i * 90 + 45) * Math.PI / 180;
      var e = new THREE.Group();
      e.position.set(0, Math.cos(b) * ring, Math.sin(b) * ring);
      g.add(e);
      var prof = [], k, t;
      for (k = 0; k <= 8; k++) {
        t = k / 8;
        prof.push([BOOST_AFT - m(2.6) * t, m(0.26) + (m(0.62) - m(0.26)) * Math.pow(t, 0.7)]);
      }
      add(e, lathe(prof, 20, M.nozzle), 'boostNozzle',
          'rd170-' + (n + 1) + '-' + (i + 1));
      var inn = lathe(prof, 20, M.nozzleIn);
      inn.scale.set(1, 0.94, 0.94);
      add(e, inn, 'boostNozzle', 'rd170-' + (n + 1) + '-' + (i + 1) + '-dalam');
    }

    /* Penopang ke inti: satu di hidung, satu di buritan. */
    var dir = new THREE.Vector3(0, -Math.cos(a), -Math.sin(a));
    [[BOOST_NOSE + m(1.0), 'depan'], [BOOST_AFT + m(4.0), 'belakang']].forEach(function (s) {
      var len = BOOST_D - CORE_R - BOOST_R + 0.5;
      var bar = new THREE.Mesh(
        new THREE.CylinderGeometry(m(0.22), m(0.22), len, 10), M.strut);
      bar.position.set(s[0], dir.y * (len / 2 + BOOST_R * 0.6), dir.z * (len / 2 + BOOST_R * 0.6));
      bar.lookAt(new THREE.Vector3(s[0], 0, 0));
      bar.rotateX(Math.PI / 2);
      add(g, bar, 'strut', 'penopang-blok-a-' + (n + 1) + '-' + s[1]);
    });
  });

  /* =========================================================
     6. Penopang orbiter
     ---------------------------------------------------------
     Bentuk persisnya DUGAAN. Yang pasti: Buran bergantung pada inti
     lewat titik-titik ini dan tidak membawa mesin utama sendiri.
     ========================================================= */
  (function () {
    var yInner = CORE_R, yOuter = CORE_R + m(1.9);
    [[ORB_NOSE - m(9.0), m(0.30), 'depan'],
     [ORB_NOSE - m(26.0), m(0.38), 'belakang-atas'],
     [ORB_NOSE - m(30.5), m(0.38), 'belakang-bawah']].forEach(function (s) {
      var len = yOuter - yInner;
      var bar = new THREE.Mesh(new THREE.CylinderGeometry(s[1], s[1], len, 10), M.strut);
      bar.position.set(s[0], yInner + len / 2, 0);
      add(root, bar, 'strut', 'penopang-orbiter-' + s[2]);
    });
  })();

  /* =========================================================
     7. Orbiter — hanya kerangka kasar
     ---------------------------------------------------------
     scan-orbiter.js menggantinya dengan pindaian berlivery Buran. Yang
     di bawah ini cuma jalur mundur supaya tumpukannya tidak berlubang
     kalau data pindaian gagal dimuat; bentuknya sengaja kasar dan tidak
     dimaksudkan untuk dilihat.
     ========================================================= */
  (function () {
    var y = CORE_R + m(0.70) + m(5.6);
    var g = new THREE.Group();
    g.name = 'orbiter-kasar';
    g.position.set(0, y, 0);
    root.add(g);

    var L = m(36.37), nose = ORB_NOSE, aft = ORB_NOSE - L;
    var prof = [], i, t;
    for (i = 0; i <= 16; i++) {
      t = i / 16;
      prof.push([nose - L * t, m(2.6) * Math.sin(Math.PI * Math.min(t * 1.25, 0.95)) + m(0.5)]);
    }
    add(g, lathe(prof, 24, M.orbBlank), 'orb', 'orb-kasar-badan');

    [1, -1].forEach(function (s) {
      var sh = new THREE.Shape();
      sh.moveTo(nose - L * 0.30, 0);
      sh.lineTo(aft + m(2.0), m(11.96));
      sh.lineTo(aft, m(11.96));
      sh.lineTo(aft, 0);
      sh.closePath();
      var geo = new THREE.ExtrudeGeometry(sh, { depth: m(0.5), bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, -m(0.25), 0);
      var w = new THREE.Mesh(geo, M.orbBlank);
      w.scale.z = s;
      add(g, w, 'orb', 'orb-kasar-sayap-' + (s > 0 ? 'kanan' : 'kiri'));
    });

    var fin = new THREE.Shape();
    fin.moveTo(aft + m(9.0), 0);
    fin.lineTo(aft + m(6.5), m(8.0));
    fin.lineTo(aft + m(1.5), m(8.0));
    fin.lineTo(aft + m(0.5), 0);
    fin.closePath();
    var fgeo = new THREE.ExtrudeGeometry(fin, { depth: m(0.5), bevelEnabled: false });
    fgeo.translate(0, 0, -m(0.25));
    add(g, new THREE.Mesh(fgeo, M.orbBlank), 'orb', 'orb-kasar-sirip');
  })();

  /* =========================================================
     8. Penutup
     ========================================================= */
  root.traverse(function (o) {
    if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; }
  });

  root.userData.groups = ['orb', 'core', 'coreEngine', 'boost', 'boostNozzle', 'strut'];
  root.userData.scale = METRE;
  root.userData.sumber = 'Energia 11K25 — ukuran resmi; sudut booster dan penopang dugaan';

  /* Pindaian berlivery Buran menggantikan kerangka kasar di atas.
     Penempatannya dihitung dari jari-jari Blok Ts, bukan dari tangki
     Amerika, jadi dikirim sebagai penimpaan. */
  if (window.ScanOrbiter && options.scanOrbiter !== false) {
    window.ScanOrbiter.replaceIn(root, {
      base: options.scanBase,
      livery: 'buran',
      place: window.ScanOrbiter.placement({
        orbNose: ORB_NOSE, tankRadius: CORE_R, bellyGap: m(0.64)
      })
    });
  }

  return root;
};
