/* =====================================================================
   three-stack-viewer.js — adapter Three.js untuk model tumpukan peluncuran
   =====================================================================

   Situs ini menggambar semua modelnya dengan perender kanvas buatan
   sendiri. Model tumpukan yang baru dibangun dengan Three.js, jadi
   berkas ini menyediakan objek dengan bentuk API yang persis sama
   seperti SpaceViewer.mount(), supaya seluruh kendali halaman —
   lapisan komponen, titik bernomor, tur berpandu, potongan, label,
   zoom, atur ulang — bekerja tanpa satu pun diubah.

   Titik komponen tidak disalin ulang di sini: dibaca langsung dari
   SpaceViewer.HOTSPOTS.stack. Sumbu dan skalanya sama seperti dulu,
   tetapi proporsi memanjang model tumpukan berubah setelah dibangun
   ulang dari foto siang, jadi kesembilan koordinat titik itu ikut
   dipindah di discovery.html dan dibuktikan ulang oleh
   _shuttle/hotspot-check.html.
   ===================================================================== */

window.ThreeModelViewer = (function () {
  'use strict';

  /* Lapisan tumpukan.

     Dulu daftar ini disalin di sini karena model lama bergaya miniatur
     cetak dan punya satu lapisan tambahan, 'alas', yang tidak ada pada
     wahana sungguhan. Model sekarang dibangun dari foto wahana di
     landasan dan tidak lagi berdiri di atas alas, jadi salinan kedua itu
     dibuang: keduanya sekarang membaca SpaceViewer apa adanya, dan tidak
     ada lagi daftar yang bisa ikut basi. */
  function stackLayers() {
    var SV = window.SpaceViewer;
    return (SV && SV.LAYERS && SV.LAYERS.stack) || [];
  }

  /* Dua model, dua kerangka pandang.

     Tumpukan didirikan (model +X jadi tegak), dan sisi orbiternya
     menghadap -X dunia, jadi tampak depannya ada di yaw -pi/2.
     Orbiter dibiarkan mendatar seperti pesawat: hidungnya tetap di +X,
     jadi tampak depan justru di yaw +pi/2 dan tampak samping di nol. */
  var MODELS = {
    stack: {
      factory: 'createSpaceShuttleModel',
      tegak: true,
      layers: null,                      // pakai SpaceViewer.LAYERS.stack
      jarak: 1.30,
      awal: { yaw: -1.12, pitch: 0.16 },
      views: { depan:   { yaw: -Math.PI / 2, pitch: 0.05 },
               samping: { yaw: 0.0001,       pitch: 0.08 },
               atas:    { yaw: -Math.PI / 2, pitch: 1.15 } }
    },
    discovery: {
      factory: 'createOrbiterModel',
      tegak: false,
      layers: null,                      // pakai SpaceViewer.LAYERS.discovery
      jarak: 1.15,
      awal: { yaw: -0.75, pitch: 0.30 },
      views: { depan:   { yaw: Math.PI / 2, pitch: 0.06 },
               samping: { yaw: 0.0001,      pitch: 0.05 },
               atas:    { yaw: 0.0001,      pitch: 1.25 } }
    },
    /* Buran memakai airframe yang sama dengan livery berbeda, jadi
       kerangka pandangnya juga sama persis. Lapisannya dibiarkan null
       supaya terbaca dari SpaceViewer.LAYERS.buran, yang isinya memang
       daftar lapisan orbiter yang sama. */
    /* Tumpukan Energia berdiri sama seperti tumpukan Amerika, dan sisi
       orbiternya juga menghadap -X dunia, jadi kerangka pandangnya sama.
       Hanya lebih tinggi, sehingga kameranya perlu mundur sedikit. */
    buranStack: {
      factory: 'createEnergiaModel',
      tegak: true,
      layers: null,                      // pakai SpaceViewer.LAYERS.buranStack
      jarak: 1.34,
      awal: { yaw: -1.12, pitch: 0.16 },
      views: { depan:   { yaw: -Math.PI / 2, pitch: 0.05 },
               samping: { yaw: 0.0001,       pitch: 0.08 },
               atas:    { yaw: -Math.PI / 2, pitch: 1.15 } }
    },
    buran: {
      factory: 'createBuranModel',
      tegak: false,
      layers: null,                      // pakai SpaceViewer.LAYERS.buran
      jarak: 1.15,
      awal: { yaw: -0.75, pitch: 0.30 },
      views: { depan:   { yaw: Math.PI / 2, pitch: 0.06 },
               samping: { yaw: 0.0001,      pitch: 0.05 },
               atas:    { yaw: 0.0001,      pitch: 1.25 } }
    }
  };

  function mount(canvas, opts) {
    opts = opts || {};
    var def = MODELS[opts.variant];
    if (typeof THREE === 'undefined' || !def || typeof window[def.factory] !== 'function') {
      throw new Error('Three.js atau model untuk varian ini belum termuat');
    }

    var SV = window.SpaceViewer || {};
    var spots = ((SV.HOTSPOTS || {})[opts.variant] || []).slice();
    var stage = canvas.parentNode;
    var accent = opts.accent || '#4FA8E0';

    /* ---------- scene ---------- */
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, 16 / 10, 0.5, 4000);
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.localClippingEnabled = true;

    /* Cahaya di sini sengaja TIDAK meniru foto rujukan mana pun.

       Dua model dilayani berkas ini dan rujukannya berbeda: tumpukan
       peluncuran dibangun dari foto siang (_orbiter/reference/), orbiter
       tunggal masih dari foto malam (_shuttle/reference/). Panggung situs
       sendiri gelap. Jadi arah kunci diambil dari rujukan, tetapi
       pengisinya dinaikkan supaya sisi bayangan tidak jatuh jadi hitam di
       atas latar segelap ini. Penyimpangan yang disengaja, dicatat pada
       lightingFromPhoto di kedua spec. */
    scene.add(new THREE.HemisphereLight('#eef4fb', '#243040', 1.00));
    var key = new THREE.DirectionalLight('#ffffff', 1.05);
    key.position.set(-5, 8, 10);
    scene.add(key);
    var fill = new THREE.DirectionalLight('#cfe0f2', 0.45);
    fill.position.set(8, 1, -6);
    scene.add(fill);

    /* Model dibangun memanjang pada +X. Dimiringkan seperempat lingkaran
       supaya miniaturnya berdiri tegak di layar, seperti benda aslinya di
       atas meja. Titik komponen tetap dibaca pada ruang model, lalu
       dipetakan ke ruang dunia lewat localToWorld. */
    var pivot = new THREE.Group();
    if (def.tegak) pivot.rotation.z = Math.PI / 2;
    scene.add(pivot);

    var model = window[def.factory]();
    pivot.add(model);

    /* Titik yang menyebut 'ikut' menempel pada mesh bernama itu dan ikut
       bergerak bersamanya (sayap Kratos melipat dan membentang). Yang lain
       memakai koordinat tetap 'pos' di ruang model, seperti biasa. */
    function letakTitik(s, out) {
      if (s.ikut) {
        if (s._obj === undefined) s._obj = model.getObjectByName(s.ikut) || null;
        if (s._obj) return s._obj.getWorldPosition(out);
      }
      out.set(s.pos[0], s.pos[1], s.pos[2]);
      return model.localToWorld(out);
    }

    /* Matriks dunia harus disegarkan dulu: tanpa ini kotak batasnya dihitung
       pada ruang model yang belum diputar, dan kamera membidik titik yang
       salah sehingga tumpukan terpotong di bawah. */
    pivot.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(pivot);
    var target = box.getCenter(new THREE.Vector3());
    /* Pusat orbit bisa bergeser ke arah titik yang sedang ditunjuk tur, lalu
       kembali ke tengah. baseTarget menyimpan tengah aslinya. */
    var baseTarget = target.clone();
    var tTarget = target.clone();
    var active = -1;                     // titik bernomor yang sedang ditunjuk
    /* nomorOn: semua titik bernomor ditampilkan. hanyaAktif: mode tur, hanya
       titik yang sedang dibahas yang digambar. Titik terpilih selalu tampil. */
    var nomorOn = opts.nomor !== false, hanyaAktif = false;

    /* ---------- indeks grup dan bahan ---------- */
    var byGroup = {};
    var allMats = [];
    function susunIndeks() {
      byGroup = {};
      allMats = [];
      model.traverse(function (o) {
        if (!o.isMesh) return;
        var g = o.userData.group || 'lain';
        (byGroup[g] = byGroup[g] || []).push(o);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
          if (m && allMats.indexOf(m) < 0) allMats.push(m);
        });
      });
    }
    susunIndeks();

    var sumberLapisan = def.layers || (SV.LAYERS || {})[opts.variant] || [];
    var layers = sumberLapisan.filter(function (L) {
      return L.groups.some(function (g) { return byGroup[g]; });
    });
    var layerOn = {};
    layers.forEach(function (L) { layerOn[L.id] = true; });

    /* Tanda tangan himpunan mesh. Pindaian menggantikan model prosedural
       beberapa saat SETELAH penampil terpasang; begitu himpunan mesh berubah,
       indeks disusun ulang, kalau tidak tombol lapisan, potongan, dan mode
       tampilan terus bekerja pada mesh yang sudah dibuang. */
    function tandaMesh() {
      var t = 0, n = 0;
      model.traverse(function (o) { if (o.isMesh) { t += o.id; n++; } });
      return n + ':' + t;
    }
    var tandaLalu = tandaMesh();

    /* Mode "Warna komponen": tiap lapisan satu warna rata. Bahan asli ditukar,
       bukan diwarnai ulang, karena model prosedural memakai satu bahan untuk
       bagian dari lapisan yang berbeda. */
    var PALET = ['#4FA8E0', '#E0A458', '#5FBF8E', '#C77DDB', '#E06C75', '#D8C35A', '#7FC8C0', '#9C8CF0'];
    var bahanLapisan = {};

    function kembalikanBahan() {
      model.traverse(function (o) {
        if (o.isMesh && o.userData.bahanAsli) {
          o.material = o.userData.bahanAsli;
          o.userData.bahanAsli = null;
        }
      });
    }

    function terapkanMode() {
      var rangka = (mode === 'wire' || mode === 'rangka' || mode === 'garis');
      var warna = (mode === 'layer' || mode === 'warna');
      kembalikanBahan();
      allMats.forEach(function (m) { m.wireframe = rangka; });
      if (!warna) return;
      layers.forEach(function (L, i) {
        var bm = bahanLapisan[L.id];
        if (!bm) {
          bm = bahanLapisan[L.id] = new THREE.MeshStandardMaterial({
            color: new THREE.Color(PALET[i % PALET.length]).convertSRGBToLinear(),
            roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide });
        }
        bm.clippingPlanes = section ? [clipPlane] : null;
        bm.needsUpdate = true;
        eachLayerMesh(L.id, function (o) {
          if (!o.userData.bahanAsli) o.userData.bahanAsli = o.material;
          o.material = bm;
        });
      });
    }

    /* Diperiksa langsung setiap kali lapisan, mode, atau potongan disentuh,
       tidak hanya dari gelung gambar: gelung itu berhenti di tab yang tidak
       terlihat, sedangkan tombol tetap bisa ditekan. */
    function pastikanIndeks() {
      if (tandaMesh() !== tandaLalu) indeksUlang();
    }

    function indeksUlang() {
      kembalikanBahan();
      susunIndeks();
      var baru = sumberLapisan.filter(function (L) {
        return L.groups.some(function (g) { return byGroup[g]; });
      });
      layers.length = 0;                   // array yang sama dipegang halaman lewat api.layers
      baru.forEach(function (L) {
        layers.push(L);
        if (layerOn[L.id] === undefined) layerOn[L.id] = true;
      });
      layers.forEach(function (L) {
        eachLayerMesh(L.id, function (m) { m.visible = layerOn[L.id]; });
      });
      allMats.forEach(function (m) {
        m.clippingPlanes = section ? [clipPlane] : null;
        m.needsUpdate = true;
      });
      terapkanMode();
      tandaLalu = tandaMesh();
    }

    function eachLayerMesh(id, fn) {
      var L = layers.filter(function (x) { return x.id === id; })[0];
      if (!L) return;
      L.groups.forEach(function (g) { (byGroup[g] || []).forEach(fn); });
    }

    /* ---------- kamera orbit ---------- */
    /* Jarak kamera: model membentang 66 satuan pada sumbu panjangnya, jadi
       dengan bidang pandang 34 derajat dibutuhkan sekitar 1,3 kali angka
       jarak yang dipakai perender kanvas untuk memuat seluruh tumpukan. */
    var DIST_K = def.jarak;
    var DEF = { yaw: def.awal.yaw, pitch: def.awal.pitch,
                dist: (opts.dist || 96) * DIST_K };
    /* Model 'fit' (nanosat) jauh lebih kecil dari orbiter, jadi jaraknya
       diukur dari bola batasnya sendiri, dan batas zoom ikut menyesuaikan. */
    if (def.fit) {
      var bola = box.getBoundingSphere(new THREE.Sphere());
      DEF.dist = bola.radius / Math.sin(THREE.MathUtils.degToRad(34) / 2) * def.fit;
    }
    var D_MIN = def.fit ? DEF.dist * 0.35 : 45;
    var D_MAX = def.fit ? DEF.dist * 3 : 320;
    var yaw = DEF.yaw, pitch = DEF.pitch, dist = DEF.dist;
    var tYaw = yaw, tPitch = pitch, tDist = dist;
    var spin = true, labelsOn = false, section = false, mode = 'solid';
    var doorsOpen = false, doorAngle = 0;

    function place() {
      camera.position.set(
        target.x + dist * Math.cos(pitch) * Math.sin(yaw),
        target.y + dist * Math.sin(pitch),
        target.z + dist * Math.cos(pitch) * Math.cos(yaw));
      camera.lookAt(target);
    }

    function resize() {
      var w = stage.clientWidth || canvas.clientWidth || 800;
      var h = stage.clientHeight || canvas.clientHeight || 500;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize);
    resize();
    place();

    /* ---------- lapisan titik bernomor ----------
       Digambar sebagai elemen HTML di atas kanvas, bukan ke dalam kanvas,
       supaya tetap tajam dan bisa diklik seperti versi kanvas situs. */
    var overlay = document.createElement('div');
    overlay.className = 'three-spots';
    overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2';
    stage.appendChild(overlay);

    /* Garis penunjuk: dari titik yang digeser kembali ke letak aslinya. */
    var SVGNS = 'http://www.w3.org/2000/svg';
    var garis = document.createElementNS(SVGNS, 'svg');
    garis.setAttribute('width', '100%');
    garis.setAttribute('height', '100%');
    garis.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none';
    overlay.appendChild(garis);

    var dots = spots.map(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', s.n + ' — ' + s.label);
      b.style.cssText =
        'position:absolute;left:0;top:0;width:26px;height:26px;margin:-13px 0 0 -13px;' +
        'border-radius:50%;border:1.5px solid ' + accent + ';background:rgba(10,16,24,.82);' +
        'color:#EDF2F7;font:11px ui-monospace,Consolas,monospace;cursor:pointer;' +
        'pointer-events:auto;display:flex;align-items:center;justify-content:center;' +
        'transition:transform .15s,background .15s;padding:0';
      b.textContent = s.n;
      var tag = document.createElement('span');
      tag.textContent = s.label;
      tag.style.cssText =
        'position:absolute;left:32px;top:50%;transform:translateY(-50%);white-space:nowrap;' +
        'font:11px ui-monospace,Consolas,monospace;color:#EDF2F7;background:rgba(10,16,24,.85);' +
        'border:1px solid rgba(120,150,180,.35);padding:2px 7px;display:none';
      b.appendChild(tag);
      b.addEventListener('click', function () { select(i); });
      overlay.appendChild(b);

      var ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('stroke', accent);
      ln.setAttribute('stroke-width', '1');
      ln.setAttribute('stroke-opacity', '0.7');
      var jangkar = document.createElementNS(SVGNS, 'circle');
      jangkar.setAttribute('r', '2.5');
      jangkar.setAttribute('fill', accent);
      garis.appendChild(ln);
      garis.appendChild(jangkar);

      return { el: b, tag: tag, spot: s, world: new THREE.Vector3(), idx: i,
               ln: ln, jangkar: jangkar, tertutup: false,
               ax: 0, ay: 0, sx: 0, sy: 0, qx: null, qy: null, tampak: false };
    });
    var ukuranTitik = 26;

    var tick = 0;

    /* ---------- uji tertutup lewat kedalaman GPU ----------
       Satu sinar ke pindaian 150 ribu segitiga makan 17,5 ms. Sebagai gantinya
       scene digambar sekali lagi sebagai kedalaman ke target kecil, dibaca
       balik sekali, lalu kedalaman tiap titik dibandingkan dengan kedalaman
       permukaan di pikselnya. Biayanya sama berapa pun jumlah titiknya. */
    var depthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    var depthRT = new THREE.WebGLRenderTarget(2, 2, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType });
    var depthBuf = new Uint8Array(16);
    var depthCam = new THREE.PerspectiveCamera();
    var warnaLama = new THREE.Color();
    var TOLERANSI = def.toleransi || 1.2;   // satuan situs, sama dengan uji sinar dulu

    function renderKedalaman(cam, lebar, tinggi) {
      if (depthRT.width !== lebar || depthRT.height !== tinggi) depthRT.setSize(lebar, tinggi);
      if (depthBuf.length !== lebar * tinggi * 4) depthBuf = new Uint8Array(lebar * tinggi * 4);
      depthMat.clippingPlanes = section ? [clipPlane] : null;
      renderer.getClearColor(warnaLama);
      var alphaLama = renderer.getClearAlpha();
      renderer.setRenderTarget(depthRT);
      renderer.setClearColor(0xffffff, 1);   // putih = kedalaman terjauh
      renderer.clear();
      scene.overrideMaterial = depthMat;
      renderer.render(scene, cam);
      scene.overrideMaterial = null;
      renderer.readRenderTargetPixels(depthRT, 0, 0, lebar, tinggi, depthBuf);
      renderer.setRenderTarget(null);
      renderer.setClearColor(warnaLama, alphaLama);
    }

    // kebalikan packDepthToRGBA milik Three.js
    function kedalamanDi(tx, ty, lebar) {
      var o = (ty * lebar + tx) * 4;
      return (depthBuf[o] / 16777216 + depthBuf[o + 1] / 65536 +
              depthBuf[o + 2] / 256 + depthBuf[o + 3]) / 256;
    }

    function jarakPandang(ndcZ, cam) {
      return 2 * cam.near * cam.far / (cam.far + cam.near - ndcZ * (cam.far - cam.near));
    }

    /* Seberapa jauh titik (ndc x,y,z) tertutup permukaan lain, dalam satuan
       situs, setelah toleransi. Nol berarti terlihat. Sembilan piksel di
       sekitarnya harus sepakat, supaya titik di tepi siluet tidak hilang. */
    function dalamTertutup(nx, ny, nz, cam, lebar, tinggi) {
      if (nz >= 1 || nx < -1 || nx > 1 || ny < -1 || ny > 1) return 0;
      var cx = Math.floor((nx * 0.5 + 0.5) * lebar);
      var cy = Math.floor((ny * 0.5 + 0.5) * tinggi);
      var terjauh = 0, ox, oy;
      for (ox = -1; ox <= 1; ox++) {
        for (oy = -1; oy <= 1; oy++) {
          var x = Math.max(0, Math.min(lebar - 1, cx + ox));
          var y = Math.max(0, Math.min(tinggi - 1, cy + oy));
          terjauh = Math.max(terjauh, kedalamanDi(x, y, lebar));
        }
      }
      if (terjauh >= 0.99999) return 0;      // tidak ada permukaan di situ
      var jarakTitik = jarakPandang(nz, cam);
      var jarakPermukaan = jarakPandang(terjauh * 2 - 1, cam);
      return Math.max(0, jarakTitik - jarakPermukaan - TOLERANSI);
    }

    function updateDots() {
      var w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
      tick++;

      /* Panggung sempit (ponsel): titik lebih kecil, supaya dua puluh tombol
         tidak menutupi seluruh orbiter. */
      var ukuran = (w < 520 || h < 300) ? 20 : 26;
      if (ukuran !== ukuranTitik) {
        ukuranTitik = ukuran;
        dots.forEach(function (d) {
          d.el.style.width = d.el.style.height = ukuran + 'px';
          d.el.style.margin = (-ukuran / 2) + 'px 0 0 ' + (-ukuran / 2) + 'px';
          d.el.style.fontSize = (ukuran < 26 ? 10 : 11) + 'px';
          d.sisi = null;                  // sisi label dipasang ulang di bawah
          d.lebarTerukur = false;
        });
      }

      // 1. letak asli tiap titik di layar, dan titik mana yang boleh digambar
      var tampak = [];
      var perluUji = tick % 4 === 0, adaLayak = false;
      dots.forEach(function (d) {
        var boleh = hanyaAktif ? d.idx === active
                               : (nomorOn || labelsOn || d.idx === active);
        letakTitik(d.spot, d.world);
        var p = d.world.clone().project(camera);
        d.nx = p.x; d.ny = p.y; d.nz = p.z;
        d.ax = (p.x * 0.5 + 0.5) * w;
        d.ay = (-p.y * 0.5 + 0.5) * h;
        /* Titik yang letak aslinya di luar panggung disembunyikan, bukan
           dijepit ke tepi: menjepit beberapa titik ke tepi yang sama justru
           membuatnya berimpit lagi, dan garis penunjuknya menunjuk ke luar. */
        d.layak = boleh && p.z < 1 && d.ax >= 0 && d.ax <= w && d.ay >= 0 && d.ay <= h;
        if (d.layak) adaLayak = true;
        if (d.layak && !d.layakLalu) perluUji = true;   // baru muncul: uji sekarang
      });

      /* Titik di balik badan model tidak digambar, begitu pula labelnya.
         Perubahan baru berlaku setelah dua uji berturut-turut sepakat, supaya
         titik di tepi tidak berkedip saat model berputar; titik yang baru
         saja layak langsung memakai hasil pertamanya. */
      if (perluUji && adaLayak) {
        var lebar = Math.max(64, Math.round(w / 3)), tinggi = Math.max(40, Math.round(h / 3));
        renderKedalaman(camera, lebar, tinggi);
        dots.forEach(function (d) {
          if (!d.layak) return;
          var hasil = dalamTertutup(d.nx, d.ny, d.nz, camera, lebar, tinggi) > 0;
          if (!d.layakLalu) d.tertutup = hasil;
          else if (hasil === d.ujiLalu) d.tertutup = hasil;
          d.ujiLalu = hasil;
        });
      }

      /* Hanya sebagian yang ditampilkan: yang paling dekat ke kamera lebih
         dulu, dan hanya bila label (atau nomornya, kalau label mati) tidak
         menumpuk dengan yang sudah terpilih. Saat model diputar, bagian lain
         mendekat dan menggantikannya. Titik yang sedang dibahas selalu dulu. */
      var pusat = target.clone().project(camera);
      var pusatX = (pusat.x * 0.5 + 0.5) * w;
      var calonTampil = [];
      dots.forEach(function (d) {
        d.layakLalu = d.layak;
        d.sx = d.ax; d.sy = d.ay;
        // titik yang sedang dibahas tidak pernah hilang; ia memudar saja
        if (!(d.layak && (!d.tertutup || d.idx === active))) { d.tampak = false; return; }
        var jarakKamera = camera.position.distanceTo(d.world);
        /* Yang sudah tampil sedikit diunggulkan supaya tidak berkedip saat dua
           titik hampir sama jauhnya. Hanya 3%: 10% membuat susunannya nyaris
           tidak pernah berganti walau model sudah berputar jauh. */
        if (d.tampak) jarakKamera *= 0.97;
        d.skor = d.idx === active ? -1 : jarakKamera;
        calonTampil.push(d);
      });
      calonTampil.sort(function (a, b) { return a.skor - b.skor || a.idx - b.idx; });

      var pakaiLabel = labelsOn;
      var jatah = pakaiLabel ? Math.max(2, Math.min(5, Math.floor(w / 170)))
                             : Math.max(4, Math.min(10, Math.floor(w / 80)));
      var kotak = [];
      calonTampil.forEach(function (d) {
        var sisi = d.ax < pusatX ? 'kiri' : 'kanan';
        if (d.sisi !== sisi) {
          d.sisi = sisi;
          d.tag.style.left = sisi === 'kanan' ? (ukuran + 6) + 'px' : 'auto';
          d.tag.style.right = sisi === 'kiri' ? (ukuran + 6) + 'px' : 'auto';
        }
        var r = ukuran / 2 + 3, lebarLabel = 0;
        if (pakaiLabel || d.idx === active) {
          if (!d.lebarLabel) d.lebarLabel = Math.max(40, d.spot.label.length * 7 + 18);
          lebarLabel = d.lebarLabel + 6;
        }
        var k = {
          l: d.ax - r - (sisi === 'kiri' ? lebarLabel : 0),
          r: d.ax + r + (sisi === 'kanan' ? lebarLabel : 0),
          t: d.ay - r, b: d.ay + r
        };
        var wajib = d.idx === active;
        var muat = wajib || (kotak.length < jatah && !kotak.some(function (o) {
          return k.l < o.r && k.r > o.l && k.t < o.b && k.b > o.t;
        }));
        d.tampak = muat;
        if (muat) { kotak.push(k); tampak.push(d); }
      });

      /* 2. saling menyingkir. Mulai dari letak asli setiap bingkai dan
         dikerjakan dalam urutan tetap, jadi pandangan yang sama selalu
         menghasilkan susunan yang sama. Titik terpilih tidak ikut bergeser. */
      var jarakMin = ukuran + 4, a, b, it;
      var tepi = ukuran / 2 + 2;
      for (it = 0; it < 24; it++) {
        var geser = false;
        for (a = 0; a < tampak.length; a++) {
          for (b = a + 1; b < tampak.length; b++) {
            var A = tampak[a], B = tampak[b];
            var dx = B.sx - A.sx, dy = B.sy - A.sy;
            var d2 = dx * dx + dy * dy;
            if (d2 >= jarakMin * jarakMin) continue;
            var dd = Math.sqrt(d2);
            if (dd < 0.01) {
              // tepat berimpit: arah dorong ditentukan nomornya, bukan acak
              var sudut = A.idx * 2.399 + B.idx * 1.113;
              dx = Math.cos(sudut); dy = Math.sin(sudut); dd = 1;
            }
            var ux = dx / dd, uy = dy / dd, dorong = jarakMin - (d2 < 0.0001 ? 0 : dd);
            var wA = A.idx === active ? 0 : 1, wB = B.idx === active ? 0 : 1;
            var jumlah = (wA + wB) || 1;
            A.sx -= ux * dorong * wA / jumlah; A.sy -= uy * dorong * wA / jumlah;
            B.sx += ux * dorong * wB / jumlah; B.sy += uy * dorong * wB / jumlah;
            geser = true;
          }
        }
        /* Tepi panggung ikut diperhitungkan di dalam putaran, bukan sesudahnya,
           supaya titik yang terdorong ke tepi tetap saling menjauh. */
        tampak.forEach(function (d) {
          d.sx = Math.max(tepi, Math.min(w - tepi, d.sx));
          d.sy = Math.max(tepi, Math.min(h - tepi, d.sy));
        });
        if (!geser) break;
      }

      // 3. gambar: bergerak halus ke letak hasil
      dots.forEach(function (d, j) {
        if (!d.tampak) {
          d.el.style.display = 'none';
          d.ln.style.display = d.jangkar.style.display = 'none';
          d.qx = null;
          return;
        }
        var sx = Math.max(tepi, Math.min(w - tepi, d.sx));
        var sy = Math.max(tepi, Math.min(h - tepi, d.sy));
        if (d.qx === null) { d.qx = sx; d.qy = sy; }
        d.qx += (sx - d.qx) * 0.35;
        d.qy += (sy - d.qy) * 0.35;

        d.el.style.transform = 'translate(' + d.qx.toFixed(1) + 'px,' + d.qy.toFixed(1) + 'px)' +
                               (j === active ? ' scale(1.22)' : '');
        d.el.style.zIndex = j === active ? '3' : '';
        d.el.style.display = 'flex';
        d.tag.style.display = (labelsOn || j === active) ? 'block' : 'none';
        /* lebar label diukur sekali saja setelah benar-benar tergambar; membaca
           offsetWidth tiap bingkai memaksa tata letak dihitung ulang */
        if (!d.lebarTerukur && d.tag.style.display === 'block' && d.tag.offsetWidth) {
          d.lebarLabel = d.tag.offsetWidth; d.lebarTerukur = true;
        }

        /* Selagi satu titik dipilih, yang lain memudar, supaya yang terlihat
           adalah modelnya dan titik yang sedang dibahas. */
        var opas = d.tertutup ? 0.35 : 1;
        if (active >= 0 && j !== active && !labelsOn) opas *= 0.45;
        d.el.style.opacity = String(opas);

        var jauh = Math.abs(d.qx - d.ax) + Math.abs(d.qy - d.ay);
        var perluGaris = jauh > ukuran * 0.35;
        d.ln.style.display = d.jangkar.style.display = perluGaris ? '' : 'none';
        if (perluGaris) {
          d.ln.setAttribute('x1', d.ax.toFixed(1)); d.ln.setAttribute('y1', d.ay.toFixed(1));
          d.ln.setAttribute('x2', d.qx.toFixed(1)); d.ln.setAttribute('y2', d.qy.toFixed(1));
          d.jangkar.setAttribute('cx', d.ax.toFixed(1)); d.jangkar.setAttribute('cy', d.ay.toFixed(1));
          d.ln.setAttribute('stroke-opacity', String(0.7 * opas));
          d.jangkar.setAttribute('fill-opacity', String(opas));
        }
      });
    }

    /* ---------- interaksi ---------- */
    var dragging = false, px = 0, py = 0, moved = 0;
    function onDown(e) {
      dragging = true; moved = 0; px = e.clientX; py = e.clientY;
      spin = false; if (opts.onSpinChange) opts.onSpinChange(false);
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - px, dy = e.clientY - py;
      moved += Math.abs(dx) + Math.abs(dy);
      tYaw = yaw = yaw - dx * 0.007;
      tPitch = pitch = Math.max(-1.35, Math.min(1.35, pitch + dy * 0.005));
      px = e.clientX; py = e.clientY;
      place();
    }
    function lepasPilihan() {
      if (active < 0 || hanyaAktif) return;
      markActive(-1);
      if (opts.onDeselect) opts.onDeselect();
    }

    /* Tekan tanpa seret di bidang kosong model melepas titik terpilih. Titik
       bernomor adalah tombol di atas kanvas, jadi menyentuh titik tidak
       sampai ke sini. pointercancel bukan sentuhan, jadi tidak dihitung. */
    function onUp(e) {
      var ketuk = dragging && moved < 6 && !(e && e.type === 'pointercancel');
      dragging = false;
      if (ketuk) lepasPilihan();
    }
    function onWheel(e) {
      e.preventDefault();
      tDist = dist = Math.max(D_MIN, Math.min(D_MAX, dist * (1 + Math.sign(e.deltaY) * 0.11)));
      place();
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    function markActive(i) {
      active = spots[i] ? i : -1;
      dots.forEach(function (d, j) {
        d.el.style.background = j === active ? accent : 'rgba(10,16,24,.82)';
      });
    }

    function select(i) {
      var s = spots[i];
      if (!s) return;
      markActive(i);
      spin = false; if (opts.onSpinChange) opts.onSpinChange(false);
      if (opts.onSelect) opts.onSelect(s);
    }

    /* Arahkan kamera ke satu titik bernomor dan tandai titiknya, tanpa
       membuka kartu keterangan. Dipakai tur berpandu. i < 0 melepas.

       letak (opsional) = { nx, ny }: di mana titik itu harus jatuh di layar,
       dalam koordinat -1..1 dari tengah panggung. Halaman yang tahu panel
       turnya menutupi pojok kanan atas bisa meminta titiknya ditaruh di kiri
       bawah; penampil sendiri tidak perlu tahu soal panel itu. */
    function focusSpot(i, letak, cara) {
      var ringan = !!(cara && cara.ringan);
      var s = spots[i];
      if (!s) {
        markActive(-1);
        tTarget.copy(baseTarget);
        return;
      }
      // komponen yang ditunjuk harus benar-benar tergambar
      if (s.layer && layerOn[s.layer] === false) {
        layerOn[s.layer] = true;
        eachLayerMesh(s.layer, function (m) { m.visible = true; });
      }
      var w = letakTitik(s, new THREE.Vector3());

      var dDef = new THREE.Vector3(Math.cos(DEF.pitch) * Math.sin(DEF.yaw), Math.sin(DEF.pitch),
                                   Math.cos(DEF.pitch) * Math.cos(DEF.yaw));
      var radial = w.clone().sub(baseTarget);
      if (radial.lengthSq() < 1e-6) radial.copy(dDef);
      radial.normalize();
      var atas = new THREE.Vector3(0, 1, 0);
      /* Mode ringan (titik disentuh biasa, bukan tur): zoom dibiarkan, dan
         sudut yang sekarang dicoba lebih dulu. Kamera hanya menoleh kalau
         dari sudut sekarang titiknya tertutup badan. */
      var jarak = ringan ? tDist : Math.max(D_MIN, DEF.dist * 0.85);
      var sekarang = new THREE.Vector3(Math.cos(tPitch) * Math.sin(tYaw), Math.sin(tPitch),
                                       Math.cos(tPitch) * Math.cos(tYaw));

      /* Hitung pose kamera akhir untuk satu arah pandang: sudut, pusat orbit,
         dan letak kameranya. Pusat orbit digeser sejauh setengah-lebar
         pandang dikali letak.nx ke kanan-atas kamera, supaya titiknya
         mendarat di letak layar yang diminta. */
      function pose(dir) {
        dir = dir.clone().normalize();
        var yw = Math.atan2(dir.x, dir.z);
        var pt = Math.max(-0.75, Math.min(1.05, Math.asin(Math.max(-1, Math.min(1, dir.y)))));
        var cp = Math.cos(pt);
        var fwd = new THREE.Vector3(-cp * Math.sin(yw), -Math.sin(pt), -cp * Math.cos(yw));
        var tg;
        if (letak && typeof letak.nx === 'number') {
          var right = new THREE.Vector3().crossVectors(fwd, atas).normalize();
          var up = new THREE.Vector3().crossVectors(right, fwd).normalize();
          var halfH = jarak * Math.tan(camera.fov * Math.PI / 360);
          var halfW = halfH * camera.aspect;
          tg = w.clone().addScaledVector(right, -letak.nx * halfW)
                        .addScaledVector(up, -(letak.ny || 0) * halfH);
        } else if (ringan) {
          tg = tTarget.clone();          // sentuhan biasa: pembingkaian dibiarkan
        } else {
          tg = baseTarget.clone().lerp(w, 0.45);
        }
        var cam = tg.clone().addScaledVector(fwd, -jarak);
        return { yaw: yw, pitch: pt, target: tg, cam: cam };
      }

      /* Seberapa dalam titik itu tertutup benda lain dari pose ini. Aturannya
         sama dengan pemudar titik di updateDots: tertutup bila ada bidang
         lebih dari 1,2 satuan di depannya. Nol berarti terlihat. */
      function tertutup(ps) {
        depthCam.fov = camera.fov; depthCam.aspect = camera.aspect;
        depthCam.near = camera.near; depthCam.far = camera.far;
        depthCam.updateProjectionMatrix();
        depthCam.position.copy(ps.cam);
        depthCam.lookAt(ps.target);
        depthCam.updateMatrixWorld(true);
        var lebar = 192, tinggi = Math.max(48, Math.round(192 / camera.aspect));
        renderKedalaman(depthCam, lebar, tinggi);
        var q = w.clone().project(depthCam);
        return dalamTertutup(q.x, q.y, q.z, depthCam, lebar, tinggi);
      }

      /* Beberapa arah dicoba berurutan, yang paling enak dilihat dulu:
         condong ke pandangan tiga-perempat bawaan, lalu lurus dari sisi
         titiknya, lalu dari atas. Yang pertama tidak tertutup dipakai.
         Titik-titiknya sendiri tidak dipindah; kameralah yang mencari celah. */
      var calon = [
        ringan ? sekarang.clone() : radial.clone().add(dDef.clone().multiplyScalar(0.55)),
        radial.clone().add(dDef.clone().multiplyScalar(0.55)),
        radial.clone(),
        radial.clone().add(atas.clone().multiplyScalar(0.9)),
        radial.clone().add(dDef.clone().multiplyScalar(-0.55)).add(atas.clone().multiplyScalar(0.5)),
        new THREE.Vector3(radial.x, 0, radial.z).add(atas.clone().multiplyScalar(0.35)),
        radial.clone().add(atas.clone().multiplyScalar(-0.6)),
        dDef.clone()
      ];
      var terbaik = null, dalamTerbaik = Infinity;
      for (var c = 0; c < calon.length; c++) {
        if (calon[c].lengthSq() < 1e-6) continue;
        var ps = pose(calon[c]);
        var dalam = tertutup(ps);
        if (dalam < dalamTerbaik) { terbaik = ps; dalamTerbaik = dalam; }
        if (dalam === 0) break;
      }

      var d = terbaik.yaw - tYaw;
      tYaw += Math.atan2(Math.sin(d), Math.cos(d));      // jalan terpendek
      tPitch = terbaik.pitch;
      tDist = jarak;
      tTarget.copy(terbaik.target);

      spin = false; if (opts.onSpinChange) opts.onSpinChange(false);
      markActive(i);
    }

    /* ---------- gelung gambar ---------- */
    var raf = 0, dead = false;
    var cekMesh = 0;
    function frame() {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (spin && !dragging) { tYaw += 0.0022; }
      if (++cekMesh % 30 === 0) pastikanIndeks();

      /* Pintu dibuka bertahap, bukan seketika: gerakannya sendiri yang
         menjelaskan bahwa daun itu berputar pada engsel di tepi badan. */
      var targetAngle = doorsOpen ? 1.95 : 0;
      if (Math.abs(targetAngle - doorAngle) > 0.001) {
        doorAngle += (targetAngle - doorAngle) * 0.09;
        (model.userData.doors || []).forEach(function (h) {
          h.rotation.x = h.userData.doorSide * doorAngle;
        });
      }
      target.lerp(tTarget, 0.12);
      yaw += (tYaw - yaw) * 0.12;
      pitch += (tPitch - pitch) * 0.12;
      dist += (tDist - dist) * 0.12;
      place();
      updateDots();
      renderer.render(scene, camera);
    }
    frame();

    /* ---------- API, bentuknya sama dengan SpaceViewer.mount() ---------- */
    var clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

    return {
      spots: spots,
      layers: layers,
      kategori: SV.KATEGORI || {},

      select: select,
      focusSpot: focusSpot,
      deselect: lepasPilihan,

      setLayer: function (id, on) {
        pastikanIndeks();
        layerOn[id] = !!on;
        eachLayerMesh(id, function (m) { m.visible = !!on; });
        return !!on;
      },
      isLayerOn: function (id) { return !!layerOn[id]; },

      highlight: function (id) {
        pastikanIndeks();
        model.traverse(function (o) {
          if (!o.isMesh) return;
          var mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(function (m) { if (m && m.emissive) m.emissive.setHex(0x000000); });
        });
        if (!id) return;
        eachLayerMesh(id, function (o) {
          var mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(function (m) { if (m && m.emissive) m.emissive.setHex(0x1d3450); });
        });
        if (opts.onLayerHover) opts.onLayerHover(id);
      },

      toggleSpin: function () {
        spin = !spin;
        if (opts.onSpinChange) opts.onSpinChange(spin);
        return spin;
      },
      /* Pintu ruang muatan: hanya orbiter yang punya. Engselnya sudah
         disiapkan model sebagai simpul tersendiri di tepi atas badan,
         jadi membukanya cukup memutar simpul itu. */
      toggleDoors: function () {
        var hinges = model.userData.doors;
        if (!hinges || !hinges.length) return false;
        doorsOpen = !doorsOpen;
        return doorsOpen;
      },

      toggleSection: function () {
        pastikanIndeks();
        section = !section;
        allMats.forEach(function (m) {
          m.clippingPlanes = section ? [clipPlane] : null;
          m.needsUpdate = true;
        });
        Object.keys(bahanLapisan).forEach(function (k) {
          bahanLapisan[k].clippingPlanes = section ? [clipPlane] : null;
          bahanLapisan[k].needsUpdate = true;
        });
        return section;
      },

      toggleLabel: function () { labelsOn = !labelsOn; return labelsOn; },

      /* Tampilkan atau sembunyikan semua titik bernomor. */
      setNumbers: function (on) {
        nomorOn = !!on;
        if (!nomorOn) lepasPilihan();   // nomor dimatikan: tidak ada yang tertinggal menyala
        return nomorOn;
      },
      isNumbersOn: function () { return nomorOn; },

      /* Mode tur: hanya titik yang sedang ditunjuk yang digambar. */
      setTourOnly: function (on) { hanyaAktif = !!on; return hanyaAktif; },

      /* Menerima nama halaman ('solid', 'wire', 'layer') maupun nama lama
         ('padat', 'rangka', 'warna'). */
      setMode: function (m) {
        pastikanIndeks();
        mode = m;
        terapkanMode();
        return mode;
      },
      getMode: function () { return mode; },

      setView: function (name) {
        var v = def.views[name];
        if (!v) return;
        tYaw = v.yaw; tPitch = v.pitch;
        spin = false; if (opts.onSpinChange) opts.onSpinChange(false);
      },

      applyStep: function (step) {
        if (!step) return;
        if (typeof step.yaw === 'number') tYaw = step.yaw;
        if (typeof step.pitch === 'number') tPitch = step.pitch;
        if (typeof step.dist === 'number') tDist = step.dist * DIST_K;
        spin = false; if (opts.onSpinChange) opts.onSpinChange(false);
        if (typeof step.doors === 'boolean') doorsOpen = step.doors;
        if (step.layer) {
          layers.forEach(function (L) {
            /* Dulu lapisan 'alas' selalu dibiarkan menyala di sini, karena
               alas miniaturnya memang bukan bagian wahana dan tidak masuk
               akal disembunyikan saat tur menyorot satu komponen. Model
               sekarang tidak punya alas, jadi pengecualian itu dihapus. */
            var on = (L.id === step.layer);
            layerOn[L.id] = on;
            eachLayerMesh(L.id, function (m) { m.visible = layerOn[L.id]; });
          });
        }
      },

      zoom: function (dir) {
        tDist = Math.max(D_MIN, Math.min(D_MAX, tDist * (1 + dir * 0.14)));
      },

      reset: function () {
        pastikanIndeks();
        tYaw = DEF.yaw; tPitch = DEF.pitch; tDist = DEF.dist;
        labelsOn = false;
        doorsOpen = false;
        if (section) { section = false; allMats.forEach(function (m) { m.clippingPlanes = null; m.needsUpdate = true; }); }
        mode = 'solid';
        terapkanMode();
        layers.forEach(function (L) {
          layerOn[L.id] = true;
          eachLayerMesh(L.id, function (m) { m.visible = true; });
        });
        markActive(-1);
        tTarget.copy(baseTarget);
        spin = true;
        if (opts.onSpinChange) opts.onSpinChange(true);
      },

      destroy: function () {
        dead = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onUp);
        canvas.removeEventListener('wheel', onWheel);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        depthRT.dispose();
        depthMat.dispose();
        model.traverse(function (o) {
          if (o.isMesh) {
            o.geometry.dispose();
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
              if (m) { if (m.map) m.map.dispose(); m.dispose(); }
            });
          }
        });
        /* dispose() saja tidak melepas konteks WebGL-nya. Peramban hanya
           mengizinkan belasan konteks hidup sekaligus, jadi tanpa ini
           berganti model berkali-kali akhirnya menolak membuat yang baru. */
        if (renderer.forceContextLoss) renderer.forceContextLoss();
        renderer.dispose();
      }
    };
  }

  return { mount: mount, MODELS: MODELS, LAYERS: stackLayers() };
})();

/* Nama lama dipertahankan supaya pemanggil yang sudah ada tidak putus. */
window.ThreeStackViewer = window.ThreeModelViewer;
