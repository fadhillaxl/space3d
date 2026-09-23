/* =====================================================================
   model.js — Space Shuttle launch stack (Discovery di landasan)
   =====================================================================

   Dibangun lewat pipeline img2threejs dari satu foto rujukan siang hari:

       _orbiter/reference/discovery-ov103.png   (605 x 896 px)

   Spesifikasi: _orbiter/object-sculpt-spec.json — 50 komponen, 9 bahan,
   4 sistem pengulangan; lolos validate_sculpt_spec.py --strict-quality.
   Berkas ini adalah wujud spesifikasi itu dalam bentuk yang bisa dipakai
   situs: UMD biasa, THREE global, tanpa tahap build, tanpa unduhan.

   ---------------------------------------------------------------------
   Foto rujukan ini MENGGANTIKAN foto malam yang dipakai sebelumnya
   (_shuttle/reference/shuttle-pad-sts41d.jpg). Yang berubah karena itu:

     * Jarak ujung tangki ke ujung booster terukur 10,45 m, bukan 5,94 m.
       Ini selisih terbesar, dan foto siang memperlihatkan kedua ujungnya
       dalam satu bidang sehingga tidak bisa salah baca.
     * Hidung booster ternyata kerucut membulat menerus, bukan dua sudut
       kerucut dengan undakan.
     * Ada DUA pita hitam melingkar pada tiap booster, plus satu tempelan
       jingga di frustum. Sama sekali tak terbaca pada foto malam.
     * Bagian dalam nosel booster berwarna merah bata, bukan logam abu.
     * Penanda sayap: lambang NASA di sayap -Z, bendera dan tulisan
       Discovery di sayap +Z. Pada foto malam bentuk hurufnya tidak
       terbaca sama sekali.
     * Tangki punya tudung kerucut gelap di puncaknya dan satu stiker
       putih di ogive.
     * Warna tangki lebih muda: cahaya sorot malam sempat membuatnya
       terbaca jauh lebih pekat daripada aslinya.

   ---------------------------------------------------------------------
   Albedo ubin orbiter DIPERBARUI dari sumber ketiga: atlas tekstur
   pindaian Discovery milik Smithsonian (peta diffuse 4096 px). Atlas itu
   TIDAK bisa dipakai untuk bentuk — isinya ribuan pulau UV, bukan
   pemandangan wahana, dan hanya memuat orbiter tanpa tangki maupun
   booster. Tetapi untuk warna ia sumber terbaik yang ada, karena diukur
   langsung dari benda aslinya dan sudah bebas dari cahaya pemotretan.
   Jadi ubin orbiter memakai albedo pindaian; tangki, booster, dan seluruh
   bentuk tetap dari foto siang.

   ---------------------------------------------------------------------
   Sumbu (tetap sama seperti model lama):

     +X   ke arah hidung (atas tumpukan saat berdiri)
     -X   ke arah buritan / nosel
     +Y   sisi tempat orbiter menempel
     +-Z  sisi kiri dan kanan booster

   Skala: 1,0952 satuan per meter, dikunci oleh kontrak situs yang
   menetapkan jari-jari tangki = 4,6 satuan sedangkan aslinya 4,2 m.
   Foto membenarkan skala itu secara mandiri: bentang sayap terukur
   24,0 m melawan 23,79 m pada dimensi terbitan, meleset 0,9 persen.

   PERHATIAN: karena proporsi memanjangnya berubah, sembilan titik
   komponen pada discovery.html IKUT DIPINDAH. Koordinat lamanya ditulis
   untuk model dengan proporsi yang berbeda dan tidak semuanya bisa tetap
   sahih. Letak barunya dibuktikan satu per satu oleh
   _shuttle/hotspot-check.html.

   Yang TIDAK terukur dan memang dugaan: sisi jauh tumpukan, perut
   orbiter, isi ruang muatan, dasar booster di balik dek, penopang
   belakang, dan identitas gugus penanda gelap di punggung badan depan.
   ===================================================================== */

window.createSpaceShuttleModel = function (options) {
  'use strict';
  options = options || {};

  /* =========================================================
     1. Ukuran — semua dari object-sculpt-spec.json
     ========================================================= */
  var ET_R         = 4.6;      // jari-jari tangki (jangkar skala)
  var ET_TIP       = 30.5;     // puncak tudung gelap; datum semua ukuran memanjang
  var ET_ORANGE    = 29.09;    // 1,29 m tudung gelap sebelum ogive jingga
  var ET_OGIVE_END = 20.0;
  var ET_LOX_END   = 12.32;
  var ET_INT_END   = 4.76;
  var ET_DOME      = -17.65;
  var ET_AFT       = -20.85;

  var SRB_R         = 2.032;
  var SRB_Z         = 7.0;
  var SRB_TIP       = 19.05;   // terukur 10,45 m di bawah puncak tangki
  var SRB_NOSE_END  = 13.10;
  var SRB_SKIRT_TOP = 9.50;
  var SRB_CASE_END  = -22.50;
  var SRB_SKIRT_END = -27.00;
  var SRB_NOZ_END   = -30.74;
  var SRB_BANDS     = [12.6, 10.2];   // dua pita hitam, terbaca jelas di foto

  var ORB_Y      = 7.6;        // sumbu badan orbiter di atas sumbu tangki
  var ORB_NOSE   = 12.38;
  var ORB_AFT    = -28.41;
  var ORB_TIP_Z  = 13.02;      // ujung sayap

  var root = new THREE.Group();
  root.name = 'root';

  /* =========================================================
     2. Tekstur — digambar ke kanvas saat berjalan
     ---------------------------------------------------------
     Situs harus tetap hidup tanpa jaringan, jadi tidak ada satu pun
     berkas gambar yang dimuat.
     ========================================================= */

  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  function finish(c, repX, repY, clamp) {
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    if (!clamp) t.repeat.set(repX || 1, repY || 1);
    t.anisotropy = 4;
    return t;
  }

  /* Deret acak berbenih tetap: bentuknya harus sama tiap kali halaman
     dibuka, jadi Math.random() tidak dipakai sama sekali. */
  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* Busa semprot tangki. Warna dasar dari cuplikan siang (212,157,93),
     diturunkan sedikit karena halaman menyinari lagi modelnya. */
  function foamTexture() {
    var c = makeCanvas(256, 256), g = c.getContext('2d');
    var rnd = seeded(20410903);
    /* Diukur, bukan dikira: render pertama memberi (200,170,130) sedangkan
       foto memberi (212,157,93) — hijau dan birunya terlalu tinggi. Warna
       dasar dikoreksi dengan nisbah target/hasil per saluran. */
    g.fillStyle = '#D3742B';
    g.fillRect(0, 0, 256, 256);
    var i, x, y, r;
    for (i = 0; i < 2600; i++) {
      x = rnd() * 256; y = rnd() * 256; r = 0.6 + rnd() * 2.2;
      g.fillStyle = rnd() < 0.5 ? 'rgba(150,82,32,.26)' : 'rgba(220,150,86,.24)';
      g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
    }
    for (i = 0; i < 26; i++) {
      x = rnd() * 256;
      g.strokeStyle = 'rgba(140,86,40,.16)';
      g.lineWidth = 2 + rnd() * 5;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (rnd() - 0.5) * 10, 256); g.stroke();
    }
    return c;
  }

  /* Cat putih booster: nyaris polos, hanya butiran halus. */
  function paintTexture(hex, grain) {
    var c = makeCanvas(128, 128), g = c.getContext('2d');
    var rnd = seeded(88117);
    g.fillStyle = hex;
    g.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 1400; i++) {
      g.fillStyle = rnd() < 0.5
        ? 'rgba(0,0,0,' + (grain * 0.5) + ')'
        : 'rgba(255,255,255,' + (grain * 0.5) + ')';
      g.fillRect(rnd() * 128, rnd() * 128, 1, 1);
    }
    return c;
  }

  /* Ubin orbiter: kisi halus DITAMBAH belang kotor.

     Pada foto siang, putih orbiter jelas tidak bersih — ada guratan
     kelabu memanjang di sepanjang badan dan sayap. Itu salah satu ciri
     yang membedakan wahana terbang dari maket, jadi ikut digambar.

     WARNA DASARNYA kini datang dari sumber lain dan lebih kuat: atlas
     tekstur pindaian fotogrametri Discovery milik Smithsonian
     (4096 px, peta diffuse). Diukur dari 113 petak 64x64 yang benar-benar
     seragam, mediannya (199,200,198) untuk ubin terang dan (43,41,43)
     untuk ubin gelap. Itu ALBEDO sebenarnya wahana aslinya, bukan warna
     di bawah cahaya langit seperti pada cuplikan foto. Nilai foto yang
     lama, (207,209,203), sedikit lebih hangat — arah hangat itu memang
     datang dari cahaya siang, bukan dari catnya. */
  function tileTexture(hex, line) {
    var c = makeCanvas(256, 256), g = c.getContext('2d');
    var rnd = seeded(5150);
    g.fillStyle = hex;
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = line;
    g.lineWidth = 1;
    for (var i = 0; i <= 256; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    for (var s = 0; s < 34; s++) {                 // belang kotor
      var x = rnd() * 256, w = 3 + rnd() * 14, a = 0.05 + rnd() * 0.09;
      g.fillStyle = 'rgba(122,124,122,' + a.toFixed(3) + ')';
      g.fillRect(x, rnd() * 90, w, 60 + rnd() * 150);
    }
    return c;
  }

  /* Lambang NASA di sayap -Z. Cakram biru, tulisan NASA, sabit merah,
     dan elips orbit — disederhanakan tetapi susunannya sesuai foto. */
  function nasaTexture() {
    var c = makeCanvas(512, 512), g = c.getContext('2d');
    /* Latarnya dibiarkan TEMBUS. Sempat diisi warna ubin, dan hasilnya tiap
       penanda tampak sebagai kotak putih yang menempel di sayap. */
    g.clearRect(0, 0, 512, 512);
    var cx = 256, cy = 256, R = 168;
    g.fillStyle = '#123C8C';
    g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.fill();
    var rnd = seeded(1958);
    g.fillStyle = '#FFFFFF';
    for (var i = 0; i < 26; i++) {                 // bintang
      var a = rnd() * 6.2832, rr = rnd() * (R - 22);
      g.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.5, 2.5);
    }
    g.save();                                       // elips orbit
    g.translate(cx, cy); g.rotate(-0.42);
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 7;
    g.beginPath(); g.ellipse(0, 0, R - 16, 52, 0, 0, 6.2832); g.stroke();
    g.restore();
    g.strokeStyle = '#D8442C'; g.lineWidth = 26;    // sabit merah
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - R + 26, cy + 42);
    g.quadraticCurveTo(cx + 20, cy - 26, cx + R - 14, cy - 96);
    g.stroke();
    g.fillStyle = '#FFFFFF';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 108px Arial Black, Arial, sans-serif';
    g.fillText('NASA', cx, cy + 16);
    return c;
  }

  /* Bendera dan nama di sayap +Z, susunan persis seperti foto:
     bendera di atas, nama di bawahnya. */
  function flagTexture() {
    var c = makeCanvas(512, 256), g = c.getContext('2d');
    g.clearRect(0, 0, 512, 256);            // latar tembus, sama alasannya
    var fx = 150, fy = 26, fw = 148, fh = 84, band = fh / 13;
    for (var b = 0; b < 13; b++) {
      g.fillStyle = (b % 2 === 0) ? '#C8202C' : '#F4F4F1';
      g.fillRect(fx, fy + b * band, fw, band);
    }
    g.fillStyle = '#26386F';
    g.fillRect(fx, fy, fw * 0.42, band * 7);
    g.fillStyle = '#F4F4F1';
    for (var sy = 0; sy < 4; sy++) {
      for (var sx = 0; sx < 5; sx++) g.fillRect(fx + 7 + sx * 11, fy + 6 + sy * 12, 3, 3);
    }
    g.strokeStyle = 'rgba(0,0,0,.30)'; g.lineWidth = 1.5;
    g.strokeRect(fx, fy, fw, fh);
    g.fillStyle = '#141418';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 62px Georgia, "Times New Roman", serif';
    g.fillText('Discovery', 256, 180);
    return c;
  }

  /* Gugus penanda gelap di punggung badan depan. Bentuknya jelas dan
     setangkup pada foto, tetapi dari satu sudut ini tidak bisa
     dipastikan itu apa — jadi digambar sebagai gugus penanda yang
     teramati, bukan diberi nama yang belum tentu benar. */
  function fwdMarkTexture() {
    var c = makeCanvas(256, 192), g = c.getContext('2d');
    g.clearRect(0, 0, 256, 192);
    g.fillStyle = '#26262A';
    g.beginPath();                                  // bentuk jangkar di tengah
    g.moveTo(112, 24); g.lineTo(144, 24); g.lineTo(150, 76);
    g.lineTo(170, 86); g.lineTo(170, 110); g.lineTo(86, 110);
    g.lineTo(86, 86); g.lineTo(106, 76); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(52, 96, 26, 17, -0.3, 0, 6.2832); g.fill();
    g.beginPath(); g.ellipse(204, 96, 26, 17, 0.3, 0, 6.2832); g.fill();
    return c;
  }

  /* =========================================================
     3. Bahan
     ========================================================= */
  function std(hex, rough, metal, canvas, repX, repY, clamp, transparent) {
    var m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hex), roughness: rough, metalness: metal
    });
    if (canvas) m.map = finish(canvas, repX, repY, clamp);
    if (transparent) { m.transparent = true; m.alphaTest = 0.35; }
    return m;
  }

  var M = {
    foam:      std('#FFFFFF', 0.92, 0.0, foamTexture(), 3, 8),
    paint:     std('#FFFFFF', 0.62, 0.0, paintTexture('#D8D8D3', 0.10), 2, 8),
    tileLight: std('#FFFFFF', 0.78, 0.0, tileTexture('#C7C8C6', 'rgba(136,138,136,.30)'), 4, 4),
    tileDark:  std('#2B292B', 0.55, 0.0, null),
    leadEdge:  std('#232123', 0.30, 0.0, null),   // satu-satunya bidang tidak matte
    band:      std('#1C1C1E', 0.60, 0.0, null),   // pita hitam booster
    patch:     std('#CE842C', 0.70, 0.0, null),   // tempelan jingga frustum
    nozzleRed: std('#964A34', 0.72, 0.0, null),   // liner nosel booster — TERAMATI
    nozzleIn:  std('#5A2A20', 0.80, 0.0, null),
    engine:    std('#78787E', 0.42, 0.90, null),
    engineIn:  std('#34343A', 0.70, 0.60, null),
    glass:     std('#1E242E', 0.18, 0.0, null),
    markNASA:  std('#FFFFFF', 0.70, 0.0, nasaTexture(), 1, 1, true, true),
    markFlag:  std('#FFFFFF', 0.70, 0.0, flagTexture(), 1, 1, true, true),
    markFwd:   std('#FFFFFF', 0.70, 0.0, fwdMarkTexture(), 1, 1, true, true),
    decal:     std('#EFEDE6', 0.75, 0.0, null)
  };

  /* =========================================================
     4. Alat bantu bentuk
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
    var geo = new THREE.LatheGeometry(pts, segments || 40);
    geo.rotateZ(-Math.PI / 2);
    return new THREE.Mesh(geo, material);
  }

  function tube(x0, x1, r, segments, material, open) {
    var geo = new THREE.CylinderGeometry(r, r, Math.abs(x1 - x0), segments || 40, 1, !!open);
    geo.rotateZ(Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, 0);
    return new THREE.Mesh(geo, material);
  }

  /* Ogive: lengkung yang kemiringannya berubah terus, bukan kerucut. */
  function ogiveProfile(xTip, xBase, r, steps) {
    var p = [], i, t;
    for (i = 0; i <= steps; i++) {
      t = i / steps;
      p.push([xTip + (xBase - xTip) * t, r * Math.sin(t * Math.PI / 2)]);
    }
    return p;
  }

  /* Kerucut membulat — profil hidung booster pada foto siang. Ujungnya
     melengkung masuk, bukan bertemu di satu titik tajam. */
  function roundedConeProfile(xTip, xBase, r, steps) {
    var p = [], i, t;
    for (i = 0; i <= steps; i++) {
      t = i / steps;
      p.push([xTip + (xBase - xTip) * t, r * Math.pow(t, 0.72)]);
    }
    return p;
  }

  /* Loft badan orbiter, dua bahan: punggung terang, perut gelap, dengan
     batas yang naik ke arah hidung. Batas itulah yang pada foto terbaca
     sebagai garis gelap menyusur sisi badan sampai ke hidung. */
  function loft(stations, ring, matLight, matDark, boundary) {
    var rows = stations.length, i, j, k;
    var pos = [], uv = [], light = [], dark = [];
    var section = [];
    for (j = 0; j < ring; j++) {
      var a = (j / ring) * Math.PI * 2;
      var ca = Math.cos(a), sa = Math.sin(a), n = 4;
      var d = Math.pow(Math.pow(Math.abs(ca), n) + Math.pow(Math.abs(sa), n), -1 / n);
      section.push([ca * d, sa * d]);
    }
    for (i = 0; i < rows; i++) {
      var st = stations[i];
      for (j = 0; j < ring; j++) {
        var sy = section[j][1];
        var flat = sy < 0 ? 0.86 : 1.0;
        pos.push(st.x, st.cy + sy * st.h * flat, section[j][0] * st.w);
        uv.push(j / ring, i / (rows - 1));
      }
    }
    for (i = 0; i < rows - 1; i++) {
      var lim = boundary((stations[i].x + stations[i + 1].x) / 2);
      for (j = 0; j < ring; j++) {
        k = (j + 1) % ring;
        var a0 = i * ring + j, b0 = i * ring + k;
        var a1 = (i + 1) * ring + j, b1 = (i + 1) * ring + k;
        var syMid = (section[j][1] + section[k][1]) / 2;
        /* Urutan simpul menghadap KELUAR. Arah yang salah sempat lolos
           tanpa terlihat selama badan masih satu warna: mukanya terbuang
           backface culling dan yang tampak justru sisi dalamnya. */
        (syMid < lim ? dark : light).push(a0, b1, a1, a0, b0, b1);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(light.concat(dark));
    geo.addGroup(0, light.length, 0);
    geo.addGroup(light.length, dark.length, 1);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, [matLight, matDark]);
  }

  /* Pita melengkung sepanjang sumbu X dengan penampang elips — pintu
     ruang muatan harus mengikuti lengkung badan, bukan menempel di atasnya. */
  function arcShell(x0, x1, halfW, halfH, cy, a0, a1, seg, material) {
    var pos = [], uv = [], idx = [], i, j;
    for (i = 0; i < 2; i++) {
      var x = i === 0 ? x0 : x1;
      for (j = 0; j <= seg; j++) {
        var a = a0 + (a1 - a0) * (j / seg);
        pos.push(x, cy + Math.sin(a) * halfH, Math.cos(a) * halfW);
        uv.push(j / seg, i);
      }
    }
    for (j = 0; j < seg; j++) {
      var p0 = j, p1 = j + 1, q0 = seg + 1 + j, q1 = seg + 2 + j;
      idx.push(p0, q1, q0, p0, p1, q1);          // menghadap keluar
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
  }

  /* Tebal SEBENARNYA sebuah panel: ExtrudeGeometry menambah
     bevelThickness di kedua ujung, jadi setengah tebalnya bukan
     thickness/2. Penanda dan elevon sempat tertanam di dalam sayap
     karena memakai angka yang salah. */
  var BEVEL = 0.28;
  function panelHalf(t) { return t / 2 + t * BEVEL; }

  function panel(points, thickness, material) {
    var shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness, bevelEnabled: true,
      bevelThickness: thickness * BEVEL, bevelSize: thickness * 0.30, bevelSegments: 2
    });
    geo.translate(0, 0, -thickness / 2);
    return new THREE.Mesh(geo, material);
  }

  /* =========================================================
     5. External Tank — grup situs: etLOX, etInter, etLH2
     ========================================================= */
  var et = new THREE.Group();
  et.name = 'et';
  root.add(et);

  /* Tudung kerucut gelap di puncak. Kecil, tetapi salah satu ciri yang
     paling jelas terbaca di foto siang dan tidak ada sama sekali pada
     model sebelumnya. */
  add(et, lathe([
    [ET_TIP, 0.05], [ET_TIP - 0.5, 0.42], [ET_ORANGE, 0.88]
  ], 28, M.tileDark), 'etLOX', 'et-tip-cap');

  add(et, lathe(ogiveProfile(ET_ORANGE, ET_OGIVE_END, ET_R, 16), 48, M.foam),
      'etLOX', 'et-lox-ogive');

  add(et, tube(ET_OGIVE_END, ET_LOX_END, ET_R, 48, M.foam), 'etLOX', 'et-lox-barrel');

  /* Stiker putih persegi panjang di ogive. */
  var decalGeo = new THREE.PlaneGeometry(2.4, 0.62);
  decalGeo.rotateY(Math.PI / 2);
  decalGeo.translate(0, 0, 0);
  var decal = new THREE.Mesh(decalGeo, M.decal);
  decal.position.set(25.4, 2.55, -2.15);
  decal.lookAt(new THREE.Vector3(25.4, 5.1, -4.3));
  add(et, decal, 'etLOX', 'micro-et-decal');

  /* Intertank: jari-jarinya sama dengan badan tangki, pinggangnya
     dinyatakan lewat rusuk menonjol — dan rusuk itu memang terbaca
     jelas sebagai garis-garis tegak halus pada foto siang. */
  add(et, tube(ET_LOX_END, ET_INT_END, ET_R, 48, M.foam), 'etInter', 'et-intertank');
  for (var si = 0; si < 72; si++) {
    var sa = (si / 72) * Math.PI * 2;
    var sg = new THREE.BoxGeometry(ET_LOX_END - ET_INT_END - 0.4, 0.045, 0.11);
    sg.translate((ET_LOX_END + ET_INT_END) / 2,
                 Math.sin(sa) * (ET_R + 0.03), Math.cos(sa) * (ET_R + 0.03));
    var sm = new THREE.Mesh(sg, M.foam);
    sm.rotation.x = -sa;
    add(et, sm, 'etInter', 'et-stringer-' + si);
  }

  add(et, tube(ET_INT_END, ET_DOME, ET_R, 48, M.foam), 'etLH2', 'et-lh2-barrel');

  var domeProf = [];
  for (var di = 0; di <= 10; di++) {
    var dt = di / 10;
    domeProf.push([ET_DOME + (ET_AFT - ET_DOME) * dt, ET_R * Math.cos(dt * Math.PI / 2)]);
  }
  add(et, lathe(domeProf, 48, M.foam), 'etLH2', 'et-aft-dome');

  /* Saluran kabel: rusuk memanjang dengan deretan pengencang. */
  var trayAngle = -0.62;
  var trayGeo = new THREE.CylinderGeometry(0.18, 0.18, ET_ORANGE - ET_AFT - 3.0, 10);
  trayGeo.rotateZ(Math.PI / 2);
  trayGeo.translate((ET_OGIVE_END + ET_AFT) / 2 + 2.0,
                    Math.sin(trayAngle) * (ET_R + 0.13),
                    Math.cos(trayAngle) * (ET_R + 0.13));
  add(et, new THREE.Mesh(trayGeo, M.foam), 'etLH2', 'micro-et-tray');

  /* =========================================================
     6. Solid Rocket Booster — grup situs: srb, srbNozzle
     ========================================================= */
  function buildBooster(z, tag) {
    var b = new THREE.Group();
    b.name = 'srb-' + tag;   // srb-port / srb-stbd, matching the spec ids
    b.position.z = z;
    root.add(b);

    /* Kerucut membulat menerus. Foto malam sempat terbaca sebagai dua
       sudut kerucut dengan undakan; foto siang menunjukkan satu profil
       melengkung, jadi bacaan lama itu ditarik. */
    add(b, lathe(roundedConeProfile(SRB_TIP, SRB_NOSE_END, SRB_R, 14), 32, M.paint),
        'srb', 'srb-' + tag + '-nose');

    /* Gugus lubang pendorong pada kerucut hidung. */
    var rnd = seeded(770 + (z > 0 ? 1 : 2));
    for (var pi = 0; pi < 12; pi++) {
      var px = SRB_TIP - 1.6 - (pi % 6) * 0.42;
      var pa = (pi < 6 ? -0.5 : 0.5) + (rnd() - 0.5) * 0.5;
      var pr = SRB_R * Math.pow((SRB_TIP - px) / (SRB_TIP - SRB_NOSE_END), 0.72);
      var pg = new THREE.CylinderGeometry(0.085, 0.085, 0.16, 8);
      pg.rotateZ(Math.PI / 2);
      pg.translate(px, Math.sin(pa) * pr, Math.cos(pa) * pr);
      add(b, new THREE.Mesh(pg, M.tileDark), 'srb', 'micro-srb-ports-' + tag + '-' + pi);
    }

    add(b, tube(SRB_NOSE_END, SRB_SKIRT_TOP, SRB_R, 32, M.paint), 'srb', 'srb-' + tag + '-frustum');

    /* DUA pita hitam melingkar. Tak terbaca sama sekali pada foto malam;
       pada foto siang keduanya jelas dan jadi ciri booster yang paling
       cepat dikenali. */
    for (var bi = 0; bi < SRB_BANDS.length; bi++) {
      var bg = new THREE.CylinderGeometry(SRB_R * 1.005, SRB_R * 1.005, 0.62, 32, 1, true);
      bg.rotateZ(Math.PI / 2);
      bg.translate(SRB_BANDS[bi], 0, 0);
      add(b, new THREE.Mesh(bg, M.band), 'srb', 'micro-srb-bands-' + tag + '-' + bi);
    }

    /* Tempelan jingga di frustum, di bawah pita atas. */
    var pat = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05), M.patch);
    pat.position.set(11.45, 0, SRB_R + 0.02);
    add(b, pat, 'srb', 'micro-srb-patch-' + tag);

    add(b, tube(SRB_SKIRT_TOP, SRB_CASE_END, SRB_R, 32, M.paint), 'srb', 'srb-' + tag + '-case');

    /* Rok buritan melebar kuat — jauh lebih melebar daripada dugaan
       sebelumnya, dan pada foto siang pelebarannya tidak bisa keliru. */
    add(b, lathe([
      [SRB_CASE_END,        SRB_R],
      [SRB_CASE_END - 1.6,  SRB_R * 1.10],
      [SRB_SKIRT_END + 1.6, SRB_R * 1.30],
      [SRB_SKIRT_END,       SRB_R * 1.42]
    ], 32, M.paint), 'srb', 'srb-' + tag + '-skirt');

    /* Nosel: lonceng dengan bagian dalam merah bata. Warna itu TERAMATI
       langsung (rerata cuplikan 112,41,48), bukan dugaan; model
       sebelumnya menebak logam abu karena foto malam hanya memberi
       bayangan gelap di sini. */
    add(b, lathe([
      [SRB_SKIRT_END,        SRB_R * 0.44],
      [SRB_SKIRT_END - 1.5,  SRB_R * 0.52],
      [SRB_NOZ_END + 1.3,    SRB_R * 0.64],
      [SRB_NOZ_END,          SRB_R * 0.78]
    ], 32, M.nozzleRed), 'srbNozzle', 'srb-' + tag + '-nozzle');

    add(b, lathe([
      [SRB_SKIRT_END - 0.2, SRB_R * 0.38],
      [SRB_NOZ_END + 0.15,  SRB_R * 0.70]
    ], 28, M.nozzleIn), 'srbNozzle', 'srb-' + tag + '-nozzle-inner');

    return b;
  }
  buildBooster(SRB_Z, 'stbd');
  buildBooster(-SRB_Z, 'port');

  /* =========================================================
     7. Orbiter — grup situs: orb, orbEngine
     ========================================================= */
  var orb = new THREE.Group();
  orb.name = 'orb';
  orb.position.y = ORB_Y;
  root.add(orb);

  var stations = [
    { x: ORB_NOSE, w: 0.16, h: 0.16, cy: -0.55 },
    { x: 11.1,     w: 0.95, h: 0.85, cy: -0.40 },
    { x: 8.9,      w: 1.65, h: 1.45, cy: -0.22 },
    { x: 5.9,      w: 2.30, h: 1.95, cy: -0.06 },
    { x: 2.9,      w: 2.62, h: 2.22, cy: 0.00 },
    { x: -2.1,     w: 2.75, h: 2.32, cy: 0.00 },
    { x: -10.1,    w: 2.75, h: 2.32, cy: 0.00 },
    { x: -16.1,    w: 2.72, h: 2.32, cy: 0.02 },
    { x: -20.1,    w: 2.62, h: 2.36, cy: 0.06 },
    { x: -24.1,    w: 2.42, h: 2.30, cy: 0.10 },
    { x: -27.1,    w: 2.05, h: 2.02, cy: 0.10 },
    { x: ORB_AFT,  w: 1.72, h: 1.72, cy: 0.10 }
  ];

  var TILE_EDGE = [[ORB_NOSE, 0.92], [8.9, 0.44], [2.9, -0.14], [-2.1, -0.34]];
  function tileBoundary(x) {
    if (x >= TILE_EDGE[0][0]) return TILE_EDGE[0][1];
    for (var i = 0; i < TILE_EDGE.length - 1; i++) {
      var a = TILE_EDGE[i], b = TILE_EDGE[i + 1];
      if (x <= a[0] && x >= b[0]) {
        return a[1] + (b[1] - a[1]) * ((a[0] - x) / (a[0] - b[0]));
      }
    }
    return TILE_EDGE[TILE_EDGE.length - 1][1];
  }
  /* Badan orbiter dibangun sebagai TIGA mesh, bukan satu.

     Gerbang perakitan (check_part_coverage) menangkap ini: spec
     menyebut badan depan, badan tengah, dan badan belakang sebagai tiga
     komponen, sedangkan model sempat melebur ketiganya jadi satu loft.
     Satu mesh tidak bisa diledakkan atau diklik per bagian, jadi janji
     spec-nya tidak terpenuhi walau rendernya terlihat benar. Ketiganya
     berbagi stasiun batas supaya tidak ada celah di sambungannya. */
  var SPLIT = [[0, 4, 'orb-fwd-fuselage'], [4, 7, 'orb-mid-fuselage'], [7, 11, 'orb-aft-fuselage']];
  for (var fs = 0; fs < SPLIT.length; fs++) {
    add(orb, loft(stations.slice(SPLIT[fs][0], SPLIT[fs][1] + 1), 28,
                  M.tileLight, M.tileDark, tileBoundary), 'orb', SPLIT[fs][2]);
  }

  /* Loft itu tabung terbuka; buritannya ditutup satu cakram. */
  var tailCap = new THREE.CircleGeometry(1.72, 28);
  tailCap.rotateY(-Math.PI / 2);
  tailCap.translate(ORB_AFT, 0.10, 0);
  add(orb, new THREE.Mesh(tailCap, M.tileDark), 'orb', 'orb-tail-cap');

  /* Tudung hidung dibesarkan: pada render pertama ia hanya bercak kecil,
     sedangkan di foto tudung hitam ini salah satu penanda orbiter yang
     paling cepat dikenali dan menutupi seluruh ujung depan. */
  var noseCap = lathe([
    [ORB_NOSE + 0.04, 0.12],
    [ORB_NOSE - 0.45, 0.82],
    [ORB_NOSE - 1.30, 1.34],
    [ORB_NOSE - 2.90, 1.76]
  ], 28, M.tileDark);
  noseCap.position.y = -0.50;
  add(orb, noseCap, 'orb', 'orb-nose-cap');

  /* Pintu ruang muatan, tertutup — pada foto memang tertutup. */
  var doorPairs = [[0.10, 1.44], [1.70, 3.04]];
  for (var dpi = 0; dpi < 2; dpi++) {
    add(orb, arcShell(2.5, -15.7, 2.79, 2.36, 0.0,
                      doorPairs[dpi][0], doorPairs[dpi][1], 14, M.tileLight),
        'orb', 'orb-bay-door-' + (dpi === 0 ? 'stbd' : 'port'));
  }

  /* Jendela dek penerbangan. */
  var winFwd = [-1.35, -0.81, -0.27, 0.27, 0.81, 1.35];
  for (var wi = 0; wi < winFwd.length; wi++) {
    var wg = new THREE.BoxGeometry(0.62, 0.10, 0.44);
    wg.translate(9.63, 1.16, winFwd[wi]);
    var wm = new THREE.Mesh(wg, M.glass);
    wm.rotation.z = -0.38;
    add(orb, wm, 'orb', 'micro-orb-windows-fwd-' + wi);
  }
  for (var oi = 0; oi < 2; oi++) {
    var og = new THREE.BoxGeometry(0.72, 0.10, 0.50);
    og.translate(7.93, 1.52, oi === 0 ? -0.55 : 0.55);
    add(orb, new THREE.Mesh(og, M.glass), 'orb', 'micro-orb-windows-top-' + oi);
  }

  /* Gugus penanda gelap di punggung badan depan. */
  var fwdMark = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.4), M.markFwd);
  fwdMark.geometry.rotateX(-Math.PI / 2);
  fwdMark.geometry.rotateY(-Math.PI / 2);
  fwdMark.position.set(6.5, 1.72, 0);
  add(orb, fwdMark, 'orb', 'micro-orb-fwd-marks');

  /* Sayap delta ganda.

     Stasiun tempat tepi depan melewati selubung booster DIUKUR dari
     foto: 41,23 m di bawah puncak tangki, yaitu x = -14,65. Dari situ
     sudut sapuan luar 45 derajat memberi ujung tepi depan di x = -18,64.
     Pangkal glove-nya tidak terlihat sama sekali — tertutup booster di
     sepanjang rentangnya — jadi ditempatkan dari panjang tali busur
     pangkal sayap terbitan. Itu dugaan yang ditandai, bukan ukuran. */
  var WING = [
    [-3.40,  2.50],    // pangkal tepi depan (glove) — dugaan
    [-13.02, 7.40],    // patahan sapuan
    [-18.64, ORB_TIP_Z],
    [-22.44, ORB_TIP_Z],
    [-23.10, 2.50]
  ];
  var WING_T = 0.95;

  function buildWing(sign, tag) {
    var pts = [], i;
    for (i = 0; i < WING.length; i++) pts.push([WING[i][0], WING[i][1] * sign]);
    if (sign < 0) pts.reverse();
    var w = panel(pts, WING_T, M.tileLight);
    w.rotation.x = -Math.PI / 2;
    w.position.y = -0.70;
    add(orb, w, 'orb', 'orb-wing-' + tag);

    /* Tepi depan gelap: pada foto siang ini garis hitam TIPIS, bukan
       pita tebal. Tingginya cukup untuk memeluk tepi sayap; panjangnya
       tidak dilebihkan supaya tidak menambah bentang. */
    var edges = [[WING[0], WING[1]], [WING[1], WING[2]]];
    var DEPTH = 0.30, OUT = 0.08, WH = panelHalf(WING_T) * 2 + 0.06;
    for (i = 0; i < edges.length; i++) {
      var a = edges[i][0], b = edges[i][1];
      var dx = b[0] - a[0], dzu = b[1] - a[1];
      var len = Math.sqrt(dx * dx + dzu * dzu);
      var nx = dzu / len, nz = -dx / len;
      var em = new THREE.Mesh(new THREE.BoxGeometry(len, WH, DEPTH), M.leadEdge);
      em.position.set((a[0] + b[0]) / 2 + nx * OUT, -0.70,
                      ((a[1] + b[1]) / 2 + nz * OUT) * sign);
      em.rotation.y = -Math.atan2(dzu * sign, dx);
      add(orb, em, 'orb', 'micro-orb-le-band-' + tag + '-' + i);
    }

    /* Elevon di tepi belakang. */
    var elev = [[4.6, 9.6], [4.9, 4.8]];
    for (i = 0; i < elev.length; i++) {
      var gg = new THREE.BoxGeometry(0.16, panelHalf(WING_T) * 2 + 0.04, elev[i][0]);
      gg.translate(-22.4, -0.70, elev[i][1] * sign);
      add(orb, new THREE.Mesh(gg, M.tileDark), 'orb', 'micro-orb-elevons-' + tag + '-' + i);
    }

    /* Penanda sayap.

       Sisi dan letaknya dibaca langsung dari foto: lambang NASA di
       sayap -Z, bendera dengan tulisan Discovery di sayap +Z. Dua
       putaran geometri membuat sumbu U tekstur jatuh pada +Z dan sumbu
       V pada +X, sehingga tulisannya terbaca melintang dan tegak
       persis seperti di foto. */
    var pg = new THREE.PlaneGeometry(sign > 0 ? 6.4 : 3.4, sign > 0 ? 3.2 : 3.4);
    pg.rotateX(-Math.PI / 2);
    pg.rotateY(-Math.PI / 2);
    var pm = new THREE.Mesh(pg, sign > 0 ? M.markFlag : M.markNASA);
    pm.position.set(sign > 0 ? -16.9 : -17.1,
                    -0.70 + panelHalf(WING_T) + 0.03,
                    sign * (sign > 0 ? 7.0 : 6.6));
    add(orb, pm, 'orb', 'micro-orb-insignia-' + tag);
  }
  buildWing(1, 'stbd');
  buildWing(-1, 'port');

  /* Sirip vertikal. */
  var fin = panel([[-14.7, 0], [-17.5, 8.80], [-20.5, 8.80], [-22.0, 0]], 0.80, M.tileLight);
  fin.position.y = 1.90;
  add(orb, fin, 'orb', 'orb-fin');

  var rudGeo = new THREE.BoxGeometry(0.34, 6.6, 0.84);
  rudGeo.translate(-21.0, 5.0, 0);
  add(orb, new THREE.Mesh(rudGeo, M.tileLight), 'orb', 'orb-rudder');

  /* Dua polong mesin manuver. */
  for (var pi2 = 0; pi2 < 2; pi2++) {
    var pod = lathe([
      [-16.7, 0.10], [-18.1, 0.82], [-21.1, 1.20], [-24.5, 1.10], [-25.7, 0.55]
    ], 22, M.tileLight);
    pod.position.set(0, 2.05, pi2 === 0 ? -2.15 : 2.15);
    add(orb, pod, 'orb', 'orb-pod-' + (pi2 === 0 ? 'port' : 'stbd'));
  }

  var bfGeo = new THREE.BoxGeometry(3.40, 0.60, 4.60);
  bfGeo.translate(-26.7, -2.40, 0);
  add(orb, new THREE.Mesh(bfGeo, M.tileDark), 'orb', 'orb-bodyflap');

  /* Struktur dudukan mesin. Titik komponen "tiga mesin utama" berada di
     [-26.5, 6.9, 0] dunia, yaitu y = -0.7 di ruang orbiter — di dalam
     kotak ini. */
  var mountGeo = new THREE.BoxGeometry(4.00, 3.40, 5.20);
  mountGeo.translate(-26.5, -0.40, 0);
  add(orb, new THREE.Mesh(mountGeo, M.tileDark), 'orbEngine', 'orb-engine-mount');

  var bells = [[2.00, 0.00], [-0.90, -1.70], [-0.90, 1.70]];
  var ENGINE_ID = ['upper', 'lower-port', 'lower-stbd'];
  for (var bi2 = 0; bi2 < bells.length; bi2++) {
    var bell = lathe([
      [-24.6, 0.42], [-25.6, 0.60], [-27.2, 1.02], [-28.3, 1.35]
    ], 24, M.engine);
    bell.position.set(0, bells[bi2][0], bells[bi2][1]);
    add(orb, bell, 'orbEngine', 'orb-engine-' + ENGINE_ID[bi2]);

    var inner = lathe([[-24.7, 0.34], [-28.2, 1.22]], 20, M.engineIn);
    inner.position.set(0, bells[bi2][0], bells[bi2][1]);
    add(orb, inner, 'orbEngine', 'orb-engine-' + ENGINE_ID[bi2] + '-inner');
  }

  /* =========================================================
     8. Penopang antarbadan — grup situs: strut
     ========================================================= */
  var strut = new THREE.Group();
  strut.name = 'strut';
  root.add(strut);

  for (var fi = 0; fi < 2; fi++) {
    var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.9, 12), M.paint);
    leg.position.set(6.5, ET_R + 0.62, (fi === 0 ? -1 : 1) * 0.58);
    leg.rotation.x = fi === 0 ? 0.34 : -0.34;
    add(strut, leg, 'strut', fi === 0 ? 'strut-fwd' : 'strut-fwd-leg-1');
  }
  /* Fitting tempat bipod bertemu orbiter; titik komponen "penopang
     depan" ada di [6.5, 6.2, 0], di dalam kotak ini. */
  var fitGeo = new THREE.BoxGeometry(1.30, 1.05, 1.70);
  fitGeo.translate(6.5, 6.05, 0);
  add(strut, new THREE.Mesh(fitGeo, M.paint), 'strut', 'strut-fwd-fitting');

  for (var ai = 0; ai < 2; ai++) {
    var agm = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.4, 12), M.paint);
    agm.position.set(-14.0, ET_R + 0.85, (ai === 0 ? -1 : 1) * 0.95);
    agm.rotation.x = ai === 0 ? 0.42 : -0.42;
    add(strut, agm, 'strut', ai === 0 ? 'strut-aft' : 'strut-aft-leg-1');
  }
  var beamGeo = new THREE.BoxGeometry(1.6, 0.55, 3.6);
  beamGeo.translate(-14.0, ET_R + 0.35, 0);
  add(strut, new THREE.Mesh(beamGeo, M.paint), 'strut', 'strut-aft-beam');

  for (var ri = 0; ri < 2; ri++) {
    var rz = ri === 0 ? -SRB_Z : SRB_Z;
    var rgGeo = new THREE.TorusGeometry(SRB_R * 1.05, 0.17, 8, 28);
    rgGeo.rotateY(Math.PI / 2);
    rgGeo.translate(9.5, 0, rz);
    add(strut, new THREE.Mesh(rgGeo, M.paint), 'strut', 'strut-srb-' + (ri === 0 ? 'port' : 'stbd'));

    var linkGeo = new THREE.BoxGeometry(1.1, 0.42, SRB_Z - ET_R - SRB_R + 0.4);
    linkGeo.translate(9.5, 0, rz * 0.72);
    add(strut, new THREE.Mesh(linkGeo, M.paint), 'strut', 'strut-srb-link-' + ri);

    var aftRing = new THREE.TorusGeometry(SRB_R * 1.05, 0.17, 8, 28);
    aftRing.rotateY(Math.PI / 2);
    aftRing.translate(-18.0, 0, rz);
    add(strut, new THREE.Mesh(aftRing, M.paint), 'strut', 'strut-srb-aft-ring-' + ri);
  }

  /* =========================================================
     9. Data untuk pemanggil
     ========================================================= */
  /* Muatan runtime untuk kesiapan aksi: tiap bagian bernama bisa dicari,
     tiap rakitan makro punya pivot sendiri, dan soket sambungan antarbadan
     dicatat supaya ledakan komponen maupun animasi pemisahan tahap bisa
     dibangun tanpa menebak-nebak nama. */
  var runtime = { nodes: {}, meshes: {}, sockets: {}, assemblies: [] };
  root.traverse(function (o) {
    if (!o.name) return;
    runtime.nodes[o.name] = o;
    if (o.isMesh) runtime.meshes[o.name] = o;
    else if (o.isGroup && o !== root) runtime.assemblies.push(o.name);
  });
  runtime.sockets = {
    'et-fwd-attach':   [6.5, ET_R, 0],
    'et-aft-attach':   [-14.0, ET_R, 0],
    'srb-port-attach': [9.5, 0, -ET_R],
    'srb-stbd-attach': [9.5, 0, ET_R],
    'orb-fwd-attach':  [6.5, ORB_Y - 2.0, 0],
    'orb-aft-attach':  [-14.0, ORB_Y - 2.2, 0]
  };
  runtime.separationOrder = ['srb-port', 'srb-stbd', 'et'];
  root.userData.sculptRuntime = runtime;

  root.userData.groups = ['orb', 'orbEngine', 'etLOX', 'etInter', 'etLH2',
                          'srb', 'srbNozzle', 'strut'];
  root.userData.axis = { nose: '+X', orbiter: '+Y', boosters: '+-Z' };
  root.userData.scale = { unitsPerMetre: 1.0952, anchor: 'jari-jari tangki 4.6 satuan = 4.2 m' };
  root.userData.source = 'img2threejs dari _orbiter/reference/discovery-ov103.png';
  root.userData.spec = '_orbiter/object-sculpt-spec.json';
  root.userData.measured = {
    tankApexToBoosterApex_m: 10.45,
    tankApexToOrbiterNose_m: 16.54,
    wingSpan_m: 24.0,
    scale_pxPerMetre: 11.667
  };
  root.userData.inferred = [
    'sisi jauh tumpukan (dari kesetangkupan)',
    'perut orbiter dan isi ruang muatan',
    'dasar booster dan nosel di balik dek peluncur',
    'penopang belakang orbiter ke tangki',
    'pangkal glove sayap (tertutup booster; dari tali busur terbitan)',
    'identitas gugus penanda gelap di punggung badan depan'
  ];

  /* =========================================================
     10. Orbiter pindaian (kalau asetnya tersedia)
     ---------------------------------------------------------
     Orbiter prosedural di atas tetap dibangun dan tetap tampil lebih
     dulu. Kalau _shuttle/scan-orbiter.js ikut dimuat DAN berkas
     asetnya terjangkau, orbiter itu diganti mesh pindaian Smithsonian
     begitu datanya sampai. Kalau tidak — luring, berkas hilang, atau
     halaman dibuka lewat file:// yang tidak mengizinkan XHR — yang
     prosedural tetap di tempatnya dan halaman tidak pernah kosong.

     Lewati dengan createSpaceShuttleModel({ scanOrbiter: false }). */
  if (window.ScanOrbiter && options.scanOrbiter !== false) {
    window.ScanOrbiter.replaceIn(root, { base: options.scanBase });
  }

  return root;
};
