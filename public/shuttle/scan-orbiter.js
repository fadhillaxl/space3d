/* =====================================================================
   scan-orbiter.js — orbiter Discovery dari pindaian Smithsonian
   =====================================================================

   Memuat mesh pindaian fotogrametri Discovery OV-103 milik Smithsonian
   dan menyerahkannya sudah dalam sumbu dan skala yang dipakai situs.

   Berkas asetnya ada di _shuttle/scan/:

       discovery.bin              5,9 MB  posisi, normal, UV, indeks
       discovery-diffuse.jpg      1,3 MB  peta warna, diperkecil ke 2048
       discovery-occlusion.jpg    0,3 MB  peta bayangan celah, 1024
       SMITHSONIAN-LICENSE.txt            domain publik, lihat di dalamnya

   Aslinya glTF 2.0 dengan .bin terpisah. Berkas .gltf-nya TIDAK dipakai:
   isinya cuma satu mesh, satu primitive, tiga atribut float32 dan indeks
   uint32 dalam satu penyangga tanpa Draco maupun sparse. Jadi tata
   letaknya ditulis tetap di sini dan datanya dibaca langsung. Itu
   menghindari GLTFLoader — sekitar 200 KB pustaka tambahan — untuk
   sesuatu yang muat dalam beberapa baris.

   ---------------------------------------------------------------------
   Sumbu aset lain dari sumbu situs, jadi diputar dan diskala di sini:

       aset  +Z hidung, +Y atas, +-X sayap, satuan METER
       situs +X hidung, +Y atas, +-Z sayap, 1,0952 satuan per meter

   Arah hidung tidak ditebak: dipastikan dari sebaran titiknya. Pada
   z = +17 lebarnya cuma 2,68 m, sedangkan pada z = -13 lebarnya 23,81 m
   (itu sayap) dan pada z = -19 tingginya 13,55 m (itu sirip). Jadi +Z
   hidung, -Z buritan.

   Ukuran terbaca: bentang 23,81 m, panjang 37,59 m. Dimensi terbitan
   23,79 m dan 37,24 m. Cocok.

   ---------------------------------------------------------------------
   PERHATIAN — roda pendaratnya TERJULUR.

   Pindaian ini diambil dari wahana yang dipajang di museum, jadi ketiga
   roda pendaratnya keluar. Pada tumpukan peluncuran, roda itu semestinya
   tersimpan di dalam badan. Ada 10.516 simpul yang menggantung di bawah
   perut badan tengah. Opsi `hideGear` memotong segitiga yang seluruh
   simpulnya berada di bawah garis perut, sehingga rodanya hilang; ruang
   rodanya jadi menganga, tetapi dari jarak tampil di halaman itu jauh
   lebih tidak mengganggu daripada tiga roda yang keluar saat wahananya
   sedang berdiri di landasan.
   ===================================================================== */

window.ScanOrbiter = (function () {
  'use strict';

  /* Tata letak penyangga, disalin dari berkas .gltf aslinya. */
  var LAYOUT = {
    vertexCount: 129029,
    indexCount: 450000,
    position: { offset: 0,       length: 1548348 },
    normal:   { offset: 1548348, length: 1548348 },
    uv:       { offset: 3096696, length: 1032232 },
    index:    { offset: 4128928, length: 1800000 }
  };

  var METRE = 1.0952;          // satuan situs per meter
  var BELLY_Y = -5.45;         // perut badan tengah, dalam meter, ruang aset

  var cache = null;

  /* Jalur aset dicari dari letak berkas skrip ini sendiri, bukan
     ditetapkan mati. Berkas yang sama dipakai di dua tata letak —
     _shuttle/ pada situs dan akar paket kiriman — dan tanpa ini salah
     satunya pasti menunjuk ke tempat yang keliru. */
  function defaultBase() {
    var els = document.getElementsByTagName('script');
    for (var i = els.length - 1; i >= 0; i--) {
      var src = els[i].src || '';
      var k = src.indexOf('scan-orbiter.js');
      if (k >= 0) return src.slice(0, k) + 'scan/';
    }
    return './scan/';
  }

  function loadBuffer(url) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
        else reject(new Error('gagal memuat ' + url + ' (HTTP ' + xhr.status + ')'));
      };
      xhr.onerror = function () { reject(new Error('gagal memuat ' + url)); };
      xhr.send();
    });
  }

  /* Buang segitiga yang SELURUH simpulnya di bawah garis perut. Yang
     dipakai "seluruh", bukan "salah satu", supaya segitiga yang menjembatani
     perut dan ruang roda tidak ikut hilang dan lubangnya tidak melebar. */
  function stripGear(pos, index, bellyY) {
    var keep = new Uint32Array(index.length);
    var n = 0, removed = 0;
    for (var i = 0; i < index.length; i += 3) {
      var a = index[i], b = index[i + 1], c = index[i + 2];
      if (pos[a * 3 + 1] < bellyY && pos[b * 3 + 1] < bellyY && pos[c * 3 + 1] < bellyY) {
        removed++;
        continue;
      }
      keep[n++] = a; keep[n++] = b; keep[n++] = c;
    }
    return { index: keep.subarray(0, n), removedTriangles: removed };
  }


  /* ---------------------------------------------------------------
     Dua sumber data, satu jalur pakai.

     Kalau scan-data.js ikut dimuat, mesh dan teksturnya sudah ada di
     memori sebagai base64 dan tidak ada yang perlu dijemput — itu yang
     membuat halaman jalan dari dobel-klik, karena file:// memblokir XHR.
     Kalau tidak ada, jatuh ke berkas terpisah seperti semula.
     --------------------------------------------------------------- */
  function b64Bytes(b64) {
    var bin = atob(b64), n = bin.length, out = new Uint8Array(n);
    for (var i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* Balikkan kuantisasi scan-data.js ke float, bentuknya sama persis
     dengan yang diberikan discovery.bin, jadi pemakainya tidak perlu tahu
     dari mana datanya datang. */
  function decodeInline(d) {
    var m = d.meta, n = m.vertexCount, i, k;
    var qp = new Int16Array(b64Bytes(d.pos).buffer);
    var qn = new Int8Array(b64Bytes(d.nor).buffer);
    var qu = new Uint16Array(b64Bytes(d.uv).buffer);
    var idx = new Uint32Array(b64Bytes(d.idx).buffer);
    var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    for (i = 0; i < n * 3; i++) {
      k = i % 3;
      pos[i] = (qp[i] + 32767) / 65534 * m.posRange[k] + m.posMin[k];
      nor[i] = qn[i] / 127;
    }
    for (i = 0; i < n * 2; i++) {
      k = i % 2;
      uv[i] = qu[i] / 65535 * m.uvRange[k] + m.uvMin[k];
    }
    return { pos: pos, nor: nor, uv: uv, idx: idx };
  }

  function getArrays(base) {
    if (window.SCAN_DATA) return Promise.resolve(decodeInline(window.SCAN_DATA));
    return loadBuffer(base + 'discovery.bin').then(function (buf) {
      var L = LAYOUT;
      return {
        pos: new Float32Array(buf, L.position.offset, L.vertexCount * 3),
        nor: new Float32Array(buf, L.normal.offset,   L.vertexCount * 3),
        uv:  new Float32Array(buf, L.uv.offset,       L.vertexCount * 2),
        idx: new Uint32Array(buf, L.index.offset,     L.indexCount)
      };
    });
  }

  /* Satu mesh, beberapa livery.

     Orbiter Buran pada halaman Rusia memakai geometri yang sama persis
     dengan pindaian Discovery — posisi, normal, UV dan indeksnya identik
     byte per byte — hanya peta warnanya yang lain. Karena UV-nya sama,
     peta normal dan oklusi pindaian tetap sahih dan tidak ikut diganti.

     Tanpa argumen livery, hasilnya sama persis seperti sebelumnya. */
  var LIVERY = { buran: { data: 'BURAN_DATA', prefix: 'buran-' } };

  function texUrl(base, which, livery) {
    var L = livery && LIVERY[livery];
    if (L && which === 'diffuse') {
      var d = window[L.data];
      if (d && d.diffuse) return d.diffuse;
      return base + L.prefix + which + '.jpg';
    }
    if (window.SCAN_DATA && window.SCAN_DATA[which]) return window.SCAN_DATA[which];
    return base + 'discovery-' + which + '.jpg';
  }

  function liveryName(livery) {
    return livery === 'buran' ? 'pindaian Smithsonian, livery Buran' : 'mesh pindaian Smithsonian';
  }

  function dataSource() { return window.SCAN_DATA ? 'tertanam' : 'berkas terpisah'; }

  /* Status yang bisa dibaca halaman. Tanpa ini penggantian berlangsung
     diam-diam, dan kalau gagal tidak ada cara tahu bedanya dari luar. */
  var STATUS = { source: 'prosedural', detail: 'pindaian belum dimuat', ok: false };

  function setStatus(source, detail, ok) {
    STATUS = { source: source, detail: detail, ok: !!ok };
    try {
      window.dispatchEvent(new CustomEvent('scan-orbiter-status', { detail: STATUS }));
    } catch (e) { /* peramban lama: pemanggil masih bisa membaca getStatus() */ }
    var els = document.querySelectorAll('[data-scan-status]');
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = ok ? 'pindaian Smithsonian' : 'model prosedural';
      els[i].title = detail;
      els[i].style.color = ok ? '' : '#E0A458';
    }
  }

  function getStatus() { return STATUS; }

  /* opts: { base, hideGear, onProgress } */
  function load(opts) {
    opts = opts || {};
    var base = opts.base || defaultBase();
    var hideGear = opts.hideGear !== false;      // baku: sembunyikan roda
    var livery = opts.livery || null;

    /* Livery ikut jadi kunci singgahan. Tanpa itu, model pertama yang
       digambar akan mengunci teksturnya untuk semua yang menyusul. */
    if (cache && cache.hideGear === hideGear && cache.livery === livery) {
      return Promise.resolve(cache.build());
    }

    return getArrays(base).then(function (A) {
      var pos = A.pos, nor = A.nor, uv = A.uv, idx = A.idx;

      var removed = 0;
      if (hideGear) {
        var r = stripGear(pos, idx, BELLY_Y);
        idx = r.index;
        removed = r.removedTriangles;
      }

      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal',   new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv',       new THREE.BufferAttribute(uv, 2));
      /* aoMap Three.js membaca set UV kedua, dan pindaian ini cuma punya
         satu. Set yang sama didaftarkan lagi sebagai uv2. */
      geo.setAttribute('uv2',      new THREE.BufferAttribute(uv, 2));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));

      /* aset -> situs: putar +Z menjadi +X, lalu skalakan ke satuan situs */
      geo.rotateY(Math.PI / 2);
      geo.scale(METRE, METRE, METRE);
      geo.computeBoundingBox();
      geo.computeBoundingSphere();

      cache = {
        hideGear: hideGear,
        livery: livery,
        removedTriangles: removed,
        build: function () { return make(geo, base, removed, livery); }
      };
      return cache.build();
    });
  }

  /* Tekstur dimuat sebagai janji, dan mesh baru diserahkan setelah
     keduanya benar-benar sampai.

     Tanpa ini pemanggil menerima mesh yang petanya masih kosong, dan
     kalau ia langsung merender — misalnya panggung pengambil gambar —
     yang terekam orbiter putih polos tanpa tekstur sama sekali. Persis
     itu yang terjadi pada percobaan pertama. */
  function loadTexture(url, srgb) {
    return new Promise(function (resolve, reject) {
      new THREE.TextureLoader().load(url, function (t) {
        t.flipY = false;                   // glTF memakai UV asal kiri-atas
        /* Hanya peta warna yang sRGB. Peta normal isinya vektor, bukan
           warna: memberinya kurva sRGB akan membengkokkan arah normalnya
           dan bayangan permukaannya jadi salah. Peta oklusi juga linear. */
        if (srgb) { t.encoding = THREE.sRGBEncoding; }
        t.anisotropy = 8;
        t.needsUpdate = true;
        resolve(t);
      }, undefined, function () { reject(new Error('gagal memuat tekstur ' + url)); });
    });
  }

  function make(geo, base, removed, livery) {
    return Promise.all([
      loadTexture(texUrl(base, 'diffuse', livery), true),
      loadTexture(texUrl(base, 'occlusion'), false),
      loadTexture(texUrl(base, 'normals'), false)
    ]).then(function (tex) {
      return build(geo, tex[0], tex[1], tex[2], removed);
    });
  }

  function build(geo, diffuse, ao, normals, removed) {
    var mat = new THREE.MeshStandardMaterial({
      map: diffuse, aoMap: ao, aoMapIntensity: 0.85,
      /* Peta normal inilah yang membuat kisi ubin, sambungan panel, dan
         bekas panas di perut terbaca sebagai permukaan, bukan sekadar
         warna di atas segitiga datar. Ia ada di material glTF aslinya
         sejak awal; sebelumnya tidak terpasang. */
      normalMap: normals,
      normalScale: new THREE.Vector2(1, 1),
      roughness: 0.80, metalness: 0.10     // nilai dari material glTF aslinya
    });

    var mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'orb-scan';
    mesh.userData.group = 'orb';

    var group = new THREE.Group();
    group.name = 'orb';
    group.add(mesh);
    group.userData.source = 'Pindaian Smithsonian Discovery OV-103, domain publik';
    group.userData.removedTriangles = removed;
    return group;
  }

  /* Kotak batas dalam ruang situs, dipakai pemanggil untuk menempatkan
     orbiter pada tumpukan tanpa menebak. */
  function bounds(group) {
    var box = new THREE.Box3().setFromObject(group);
    return {
      min: box.min.toArray().map(function (n) { return +n.toFixed(3); }),
      max: box.max.toArray().map(function (n) { return +n.toFixed(3); }),
      size: box.getSize(new THREE.Vector3()).toArray().map(function (n) { return +n.toFixed(3); })
    };
  }

  /* ---------------------------------------------------------------
     Penempatan pada tumpukan peluncuran.

     Angkanya diukur dari mesh setelah diputar dan diskala ke ruang
     situs, bukan dikira-kira:

         hidung  site x = +20.587
         buritan site x = -20.586
         perut badan tengah site y = -6.171   (|z| < 3, x -12..+8)
         bentang site z = +-13.039

     Hidung ditaruh di x = 12.38, sama dengan ORB_NOSE model prosedural,
     supaya seluruh tata letak tumpukan tidak bergeser. Perutnya ditaruh
     0,70 satuan di atas permukaan tangki (jari-jari 4,6), yaitu celah
     yang ditahan penopang dan memang terlihat di foto landasan.
     --------------------------------------------------------------- */
  var PLACE = {
    localNose: 20.587,
    localBelly: -6.171,
    orbNose: 12.38,          // ORB_NOSE pada model.js
    tankRadius: 4.6,
    bellyGap: 0.70
  };
  PLACE.x = PLACE.orbNose - PLACE.localNose;                       // -8.207
  PLACE.y = PLACE.tankRadius + PLACE.bellyGap - PLACE.localBelly;  // +11.471

  /* Tumpukan lain, jari-jari lain.

     Energia memakai orbiter yang sama pada inti yang lebih ramping dan
     pada ketinggian berbeda, jadi angkanya tidak bisa dipatok. Rumusnya
     yang sama dipakai ulang: hidung didudukkan pada stasiun yang diminta,
     dan perutnya diberi jarak bebas dari kulit tangki. */
  function placement(o) {
    var p = {
      localNose: PLACE.localNose,
      localBelly: PLACE.localBelly,
      orbNose: o.orbNose,
      tankRadius: o.tankRadius,
      bellyGap: o.bellyGap === undefined ? 0.70 : o.bellyGap
    };
    p.x = p.orbNose - p.localNose;
    p.y = p.tankRadius + p.bellyGap - p.localBelly;
    return p;
  }

  /* Ganti orbiter prosedural di dalam sebuah tumpukan dengan pindaian.

     Sengaja dibuat sebagai penggantian SESUDAH model jadi, bukan cabang
     di dalam model.js. Tiga alasannya:

       1. Orbiter prosedural langsung tampil, lalu ditingkatkan begitu
          pindaiannya sampai. Tidak ada lubang menganga selama menunggu.
       2. Kalau asetnya gagal dimuat — luring, berkas hilang, salah
          jalur — yang prosedural tetap di tempatnya. Halaman tidak
          pernah kosong.
       3. Kotak batas untuk membingkai kamera sudah benar sejak awal,
          karena orbiter prosedural punya rentang yang mirip.

     Pindaian ini SATU mesh, jadi ia tidak bisa dipecah menjadi grup
     'orb' dan 'orbEngine' seperti model prosedural. Seluruhnya masuk
     'orb'. Tombol lapisan "Orbiter" tetap bekerja karena situs memang
     memeriksa grup mana yang ada, bukan menuntut keduanya. */
  function replaceIn(root, opts) {
    opts = opts || {};
    if (typeof THREE === 'undefined' || !root) return Promise.resolve(null);
    return load(opts).then(function (scan) {
      var mesh = scan.children[0];
      var P = opts.place || PLACE;
      mesh.position.set(P.x, P.y, 0);

      var doomed = [];
      root.traverse(function (o) {
        if (o.isMesh && (o.userData.group === 'orb' || o.userData.group === 'orbEngine')) doomed.push(o);
      });
      doomed.forEach(function (m) {
        if (m.parent) m.parent.remove(m);
        if (m.geometry) m.geometry.dispose();
      });

      root.add(mesh);
      root.userData.orbiterSource = 'pindaian Smithsonian (domain publik), data ' + dataSource();
      root.userData.proceduralOrbiterRemoved = doomed.length;
      setStatus('pindaian', liveryName(opts.livery) + ', data ' + dataSource(), true);
      if (root.userData.groups) {
        root.userData.groups = root.userData.groups.filter(function (g) { return g !== 'orbEngine'; });
      }
      return mesh;
    }).catch(function (e) {
      /* Diam-diam tetap memakai orbiter prosedural. Ini jalur mundur yang
         disengaja, bukan kegagalan yang perlu menghentikan halaman. */
      if (window.console) console.warn('[ScanOrbiter] memakai orbiter prosedural: ' + e.message);
      setStatus('prosedural', 'pindaian gagal dimuat: ' + e.message, false);
      if (root) root.userData.orbiterSource = 'prosedural (pindaian gagal dimuat: ' + e.message + ')';
      return null;
    });
  }

  /* ===================================================================
     Varian `discovery` — orbiter sendiri
     ===================================================================

     Bedanya dengan pemakaian di tumpukan ada tiga, dan ketiganya penting.

     1. SKALA LAIN. Kedua puluh titik komponen varian ini ditulis untuk
        orbiter prosedural yang memakai sekitar 1,0 satuan per meter,
        bukan 1,0952 seperti tumpukan. Jadi pindaiannya dipasang pada
        skala 1,0 dengan pergeseran y = 3,0.

        Angka y itu bukan tebakan: orbiter prosedural menaruh pusat
        hidungnya di y = 0,4 dan puncak siripnya di y = 10,9, selisih
        10,5. Pindaian menaruh pusat hidungnya di y = -2,6 dan puncak
        siripnya di +7,913 — selisihnya juga 10,5. Proporsinya sudah
        cocok pada skala 1, jadi tinggal digeser 0,4 - (-2,6) = 3,0.

     2. RODA PENDARAT DIPERTAHANKAN. Pada tumpukan roda itu dipotong
        karena wahana yang mau lepas landas tidak menjulurkan roda. Di
        sini justru sebaliknya: titik komponen nomor 7 memang menunjuk
        "Roda pendarat depan". Memotongnya akan membuat label itu
        menunjuk ruang kosong.

     3. DIPECAH TUJUH. Halaman punya tujuh tombol lapisan, sedangkan
        pindaian ini satu mesh utuh. Tanpa dipecah, enam tombol tidak
        mengendalikan apa pun. Tiap segitiga dimasukkan ke satu wilayah
        menurut letak titik beratnya. Atribut posisi, normal, dan UV
        DIPAKAI BERSAMA oleh ketujuh geometri — yang berbeda hanya
        indeksnya — jadi tidak ada salinan tambahan di memori.

     Jumlah segitiga tiap wilayah sudah diperiksa dan tidak ada yang
     kosong: body 79.180, wing 50.844, engine 10.668, fin 3.830,
     door 2.679, canopy 1.574, pod 1.225.
     =================================================================== */
  var DISCOVERY = { scale: 1.0, dx: 0.0, dy: 3.0 };

  /* Aturan wilayah, dalam ruang situs SETELAH penempatan di atas.
     Urutannya berarti: yang pertama cocok yang dipakai. */
  function regionOf(x, y, z) {
    var az = Math.abs(z);
    if (az > 2.9 && y < 3.2) return 'wing';
    if (x > 11.4 && y > 3.5) return 'canopy';
    if (x > -13.0 && x < 4.5 && y > 3.5 && az < 2.9) return 'door';
    if (x < -12.0 && y > 3.2 && y < 6.4 && az > 1.1 && az < 4.0) return 'pod';
    if (x < -11.0 && y > 6.4 && az < 1.6) return 'fin';
    if (x < -15.0 && y < 3.4 && y > -0.2 && az < 3.2) return 'engine';
    return 'body';
  }

  var REGIONS = ['body', 'door', 'wing', 'fin', 'canopy', 'pod', 'engine'];

  /* Pintu ruang muatan, diukur dari meshnya sendiri dalam ruang situs.

     Discovery dipajang dengan pintu tertutup, jadi pindaiannya memuat
     kedua daun sebagai satu cangkang utuh di punggung badan. BAY di bawah
     ini adalah kotak tempat cangkang itu dipotong dua dan digantung:
     engselnya di longeron, |z| 2.94 pada ketinggian y 3.55.

     yMax memotong di bawah pangkal sirip. Aturan wilayah menyerempet
     sedikit pangkal sirip di antara x -13 dan -11, dan bagian itu jelas
     tidak boleh ikut membuka. */
  var BAY = {
    xMin: -10.2, xMax: 4.70,     // berhenti sebelum pangkal sirip mulai naik
    yMax: 4.60,                  // di atas mahkota (4,08), di bawah sirip
    hingeY: 2.80, hingeZ: 2.62,  // garis engsel, dari penampang badan
    floorY: 0.90, wallZ: 2.40    // lantai dan dinding buatan di dalamnya
  };

  /* Kubah tipis di punggung badan itulah daun pintunya.

     Penampang badan di ruang muatan: sisinya hampir tegak di |z| 2,70
     sampai kira-kira y 2,8, lalu melengkung masuk ke mahkota di y 3,6
     sampai 4,1. Jadi engselnya di kaki lengkungan itu, bukan di mahkota.

     Percobaan pertama menaruh engsel di y 3,55 dan |z| 2,94 — di luar tepi
     daunnya sendiri. Daunnya jadi berayun di ujung lengan dan terlihat
     lepas dari badan. Engsel harus tepat di tepi daun. */
  function inBay(x, y, z) {
    return x > BAY.xMin && x < BAY.xMax &&
           y > BAY.hingeY && y < BAY.yMax && Math.abs(z) < BAY.hingeZ + 0.10;
  }

  /* Bangun geometri ringkas dari sebagian segitiga: simpul yang benar-benar
     dipakai saja, dan posisinya digeser ke pangkal engsel supaya simpul
     induknya cukup diputar. */
  function hingeGeometry(list, sp, sn, uv, hy, hz) {
    var map = {}, keep = [], i, v;
    for (i = 0; i < list.length; i++) {
      v = list[i];
      if (map[v] === undefined) { map[v] = keep.length; keep.push(v); }
    }
    var n = keep.length;
    var P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
    for (i = 0; i < n; i++) {
      v = keep[i];
      P[i * 3]     = sp[v * 3];
      P[i * 3 + 1] = sp[v * 3 + 1] - hy;
      P[i * 3 + 2] = sp[v * 3 + 2] - hz;
      N[i * 3]     = sn[v * 3];
      N[i * 3 + 1] = sn[v * 3 + 1];
      N[i * 3 + 2] = sn[v * 3 + 2];
      U[i * 2]     = uv[v * 2];
      U[i * 2 + 1] = uv[v * 2 + 1];
    }
    var I = new Uint32Array(list.length);
    for (i = 0; i < list.length; i++) I[i] = map[list[i]];

    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal',   new THREE.BufferAttribute(N, 3));
    var uvA = new THREE.BufferAttribute(U, 2);
    g.setAttribute('uv',  uvA);
    g.setAttribute('uv2', uvA);
    g.setIndex(new THREE.BufferAttribute(I, 1));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  }

  /* Ruang muatan yang terlihat begitu pintunya terbuka.

     Ini BUKAN data pindaian. Pindaiannya tidak punya bagian dalam sama
     sekali, karena pintu wahana aslinya tertutup saat dipindai. Tanpa ini,
     membuka pintu berarti menembus badan yang berongga. */
  function buildBay() {
    var g = new THREE.Group();
    g.name = 'ruang-muatan-pindaian';
    /* Warnanya harus dikonversi ke linear dulu. Perendernya menulis keluaran
       ber-sRGB, jadi nilai hex yang dipasang apa adanya akan diterangkan
       sekali lagi saat ditampilkan: #171D26 yang mestinya nyaris hitam
       keluar sebagai abu-abu sedang, dan ruang muatannya terbaca seperti
       lempeng yang ditempel, bukan rongga. */
    var mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x171D26).convertSRGBToLinear(),
      roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide });
    var L = BAY.xMax - BAY.xMin, cx = (BAY.xMin + BAY.xMax) / 2;
    var H = BAY.hingeY - BAY.floorY, cy = (BAY.hingeY + BAY.floorY) / 2;

    function slab(geo, x, y, z, name) {
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.name = name;
      m.userData.group = 'bayIn';
      g.add(m);
      return m;
    }
    slab(new THREE.BoxGeometry(L, 0.12, BAY.wallZ * 2), cx, BAY.floorY, 0, 'bay-lantai');
    [1, -1].forEach(function (k) {
      slab(new THREE.BoxGeometry(L, H, 0.12), cx, cy, k * BAY.wallZ, 'bay-dinding');
    });
    [BAY.xMin, BAY.xMax].forEach(function (x, i) {
      slab(new THREE.BoxGeometry(0.12, H, BAY.wallZ * 2), x, cy, 0, 'bay-sekat-' + i);
    });
    return g;
  }

  function buildDiscovery(opts) {
    opts = opts || {};
    var base = opts.base || defaultBase();
    /* hideGear sengaja TIDAK dipakai di sini: titik komponen nomor 7
       menunjuk roda pendarat depan, jadi rodanya harus tetap ada. */
    return getArrays(base).then(function (A) {
      var pos = A.pos, nor = A.nor, uv = A.uv, idx = A.idx;

      var S = DISCOVERY.scale, ox = DISCOVERY.dx, oy = DISCOVERY.dy;
      var n = LAYOUT.vertexCount, i;
      var sp = new Float32Array(n * 3), sn = new Float32Array(n * 3);
      for (i = 0; i < n; i++) {
        sp[i * 3]     =  pos[i * 3 + 2] * S + ox;
        sp[i * 3 + 1] =  pos[i * 3 + 1] * S + oy;
        sp[i * 3 + 2] = -pos[i * 3]     * S;
        sn[i * 3]     =  nor[i * 3 + 2];
        sn[i * 3 + 1] =  nor[i * 3 + 1];
        sn[i * 3 + 2] = -nor[i * 3];
      }

      var buckets = {};
      for (i = 0; i < REGIONS.length; i++) buckets[REGIONS[i]] = [];
      for (i = 0; i < idx.length; i += 3) {
        var a = idx[i], b = idx[i + 1], c = idx[i + 2];
        var cx = (sp[a * 3]     + sp[b * 3]     + sp[c * 3])     / 3;
        var cy = (sp[a * 3 + 1] + sp[b * 3 + 1] + sp[c * 3 + 1]) / 3;
        var cz = (sp[a * 3 + 2] + sp[b * 3 + 2] + sp[c * 3 + 2]) / 3;
        buckets[regionOf(cx, cy, cz)].push(a, b, c);
      }

      var posAttr = new THREE.BufferAttribute(sp, 3);
      var norAttr = new THREE.BufferAttribute(sn, 3);
      var uvAttr  = new THREE.BufferAttribute(uv, 2);

      return Promise.all([
        loadTexture(texUrl(base, 'diffuse', opts.livery), true),
        loadTexture(texUrl(base, 'occlusion'), false),
        loadTexture(texUrl(base, 'normals'), false)
      ]).then(function (tex) {
        var mat = new THREE.MeshStandardMaterial({
          map: tex[0], aoMap: tex[1], aoMapIntensity: 0.85,
          normalMap: tex[2],
          normalScale: new THREE.Vector2(1, 1),
          roughness: 0.80, metalness: 0.10
        });
        /* Daun pintu perlu bahan dua-muka: dibuka, daun satu-muka hilang
           dari pandangan dan terbaca seperti lenyap, bukan terbuka. */
        var matPintu = mat.clone();
        matPintu.side = THREE.DoubleSide;

        var root = new THREE.Group();
        root.name = 'orbiter-scan';
        var counts = {};

        /* Cangkang pintu dipotong di garis tengah: yang di dalam kotak
           ruang muatan digantung pada engselnya masing-masing, sisanya
           (pangkal sirip yang keserempet aturan wilayah) tetap diam. */
        var pintu = { kanan: [], kiri: [] };
        (function () {
          /* Diayak dari 'door' DAN 'body'. Aturan wilayah memotong pintu di
             y 3,5, padahal daunnya turun sampai engsel di y 2,8 — sisanya
             ada di 'body'. Diambil dari keduanya supaya daunnya utuh
             sampai engsel dan tidak menyisakan pita badan yang menggantung. */
          ['door', 'body'].forEach(function (r) {
            var list = buckets[r], tinggal = [], i, a, b, c, cx, cy, cz;
            for (i = 0; i < list.length; i += 3) {
              a = list[i]; b = list[i + 1]; c = list[i + 2];
              cx = (sp[a * 3]     + sp[b * 3]     + sp[c * 3])     / 3;
              cy = (sp[a * 3 + 1] + sp[b * 3 + 1] + sp[c * 3 + 1]) / 3;
              cz = (sp[a * 3 + 2] + sp[b * 3 + 2] + sp[c * 3 + 2]) / 3;
              if (!inBay(cx, cy, cz)) tinggal.push(a, b, c);
              else if (cz > 0) pintu.kanan.push(a, b, c);
              else pintu.kiri.push(a, b, c);
            }
            buckets[r] = tinggal;
          });
        })();

        var engsel = [];
        [['kanan', 1], ['kiri', -1]].forEach(function (pair) {
          var list = pintu[pair[0]], sisi = pair[1];
          if (!list.length) return;
          var hz = sisi * BAY.hingeZ;
          var h = new THREE.Group();
          h.name = 'engsel-pindaian-' + pair[0];
          h.position.set(0, BAY.hingeY, hz);
          h.userData.doorSide = sisi;
          var m = new THREE.Mesh(hingeGeometry(list, sp, sn, uv, BAY.hingeY, hz), matPintu);
          m.name = 'orb-scan-door-' + pair[0];
          m.userData.group = 'door';
          h.add(m);
          root.add(h);
          engsel.push(h);
          counts['door-' + pair[0]] = list.length / 3;
        });
        root.add(buildBay());
        root.userData.doors = engsel;

        REGIONS.forEach(function (r) {
          var list = buckets[r];
          counts[r] = list.length / 3;
          if (!list.length) return;
          var geo = new THREE.BufferGeometry();
          geo.setAttribute('position', posAttr);   // dipakai bersama tujuh geometri
          geo.setAttribute('normal',   norAttr);
          geo.setAttribute('uv',       uvAttr);
          geo.setAttribute('uv2',      uvAttr);
          geo.setIndex(new THREE.BufferAttribute(new Uint32Array(list), 1));
          geo.computeBoundingBox();
          geo.computeBoundingSphere();
          var mesh = new THREE.Mesh(geo, mat);
          mesh.name = 'orb-scan-' + r;
          mesh.userData.group = r;
          root.add(mesh);
        });
        root.userData.regionCounts = counts;
        root.userData.source = 'Pindaian Smithsonian Discovery OV-103, domain publik';
        return root;
      });
    });
  }

  /* Grup yang dipakai orbiter prosedural, semuanya dibuang saat diganti. */
  var DISCOVERY_GROUPS = ['body', 'door', 'doorOpen', 'bayIn', 'wing', 'flap',
                          'fin', 'canopy', 'pod', 'engine', 'mark'];

  function replaceOrbiterIn(root, opts) {
    opts = opts || {};
    if (typeof THREE === 'undefined' || !root) return Promise.resolve(null);
    return buildDiscovery(opts).then(function (scan) {
      var doomed = [];
      root.traverse(function (o) {
        if (o.isMesh && DISCOVERY_GROUPS.indexOf(o.userData.group) >= 0) doomed.push(o);
      });
      doomed.forEach(function (m) {
        if (m.parent) m.parent.remove(m);
        if (m.geometry) m.geometry.dispose();
      });
      /* Simpul engsel milik orbiter prosedural tinggal kosong: daun
         pintunya ikut terbuang di atas, tetapi simpulnya bukan mesh jadi
         tidak tersapu. Kalau dibiarkan, tombol buka ruang muatan memutar
         simpul kosong dan seolah tidak terjadi apa-apa. Engsel pindaian
         menggantikannya. */
      var bayLama = null;
      root.traverse(function (o) { if (o.name === 'ruang-muatan') bayLama = o; });
      if (bayLama && bayLama.parent) bayLama.parent.remove(bayLama);

      while (scan.children.length) root.add(scan.children[0]);
      root.userData.doors = scan.userData.doors || [];
      root.userData.orbiterSource = 'pindaian Smithsonian (domain publik), data ' + dataSource();
      root.userData.proceduralRemoved = doomed.length;
      setStatus('pindaian', liveryName(opts.livery) + ', data ' + dataSource(), true);
      root.userData.regionCounts = scan.userData.regionCounts;
      return root;
    }).catch(function (e) {
      if (window.console) console.warn('[ScanOrbiter] varian discovery memakai prosedural: ' + e.message);
      setStatus('prosedural', 'pindaian gagal dimuat: ' + e.message, false);
      if (root) root.userData.orbiterSource = 'prosedural (pindaian gagal: ' + e.message + ')';
      return null;
    });
  }

  return { load: load, bounds: bounds, replaceIn: replaceIn, dataSource: dataSource,
           getStatus: getStatus, placement: placement,
           buildDiscovery: buildDiscovery, replaceOrbiterIn: replaceOrbiterIn,
           DISCOVERY: DISCOVERY, REGIONS: REGIONS,

           PLACE: PLACE, METRE: METRE, BELLY_Y: BELLY_Y };
})();
