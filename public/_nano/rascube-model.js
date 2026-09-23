/* =====================================================================
   rascube-model.js — RASCube V2 (Robinson Aerospace Systems)
   =====================================================================

   Porting ke Three.js dari model kanvas yang dulu tinggal di
   cubesat.html, dan dari render resmi P1 v13 di _nano/foto/.

   Sumbu dan skalanya SAMA PERSIS dengan model kanvas itu, supaya keenam
   titik komponennya dapat dipindahkan apa adanya tanpa diukur ulang:

     R = 5 (setengah rusuk, kubus 10 cm)
     +Y  atas (dek, antena)       -Y  pelat dasar
     +Z  dinding depan (sablon dan konektor)
     +-X dinding samping (panel berlubang)

   Satu perbedaan yang disengaja dari versi kanvas: perender kanvas situs
   menyusun poligon menurut kedalaman titik tengahnya, jadi dulu dinding
   samping terpaksa dibangun sebagai bingkai berlubang dan dinding depan
   dipecah jadi petak supaya detail tidak tertimpa. Three.js memakai
   z-buffer, jadi dinding di sini kembali jadi satu bidang utuh.

   Tidak ada berkas yang dimuat saat berjalan: situs ini dibuka dengan
   klik dua kali lewat file://.
   ===================================================================== */

window.createRasCubeModel = function () {
  'use strict';

  var R = 5;
  var P = 0.62;                       // tebal tiang sudut

  var root = new THREE.Group();
  root.name = 'rascube-v2';

  /* Sablon dinding depan. Hanya nama pembuat yang dibangun: pada render
     sumber, dua baris kecil di bawahnya tidak terbaca, dan menebaknya
     berarti mengarang. */
  function texSablon() {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 192;
    var g = c.getContext('2d');
    g.fillStyle = '#AEB4BA'; g.fillRect(0, 0, 512, 192);
    g.fillStyle = '#2B3036';
    g.textAlign = 'center';
    g.font = 'bold 84px Arial Black, Arial, sans-serif';
    g.fillText('ROBINSON', 256, 96);
    g.font = '600 30px Arial, sans-serif';
    g.fillText('A E R O S P A C E   S Y S T E M S', 256, 146);
    var t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  /* Panel berlubang: kisi titik rapat, digambar ke kanvas. */
  function texJala() {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    var g = c.getContext('2d');
    g.fillStyle = '#121416'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(170,180,190,.20)';
    for (var y = 2; y < 64; y += 5) for (var x = 2; x < 64; x += 5) g.fillRect(x, y, 1.6, 1.6);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 2);
    return t;
  }

  /* Logam ditahan di bawah 0,45 dengan sengaja: tanpa peta lingkungan,
     logam murni merender nyaris hitam. Pelajarannya dari model Kratos. */
  var B = {
    tiang:    new THREE.MeshStandardMaterial({ color: '#6C727A', roughness: 0.5, metalness: 0.35 }),
    dek:      new THREE.MeshStandardMaterial({ color: '#ECEDE9', roughness: 0.8 }),
    dinding:  new THREE.MeshStandardMaterial({ color: '#B9BEC4', roughness: 0.55, metalness: 0.25 }),
    dasar:    new THREE.MeshStandardMaterial({ color: '#8E949B', roughness: 0.6, metalness: 0.25 }),
    jala:     new THREE.MeshStandardMaterial({ map: texJala(), roughness: 0.9 }),
    sablon:   new THREE.MeshStandardMaterial({ map: texSablon(), roughness: 0.7 }),
    konektor: new THREE.MeshStandardMaterial({ color: '#C6CCD3', roughness: 0.4, metalness: 0.4 }),
    lubang:   new THREE.MeshStandardMaterial({ color: '#12181F', roughness: 0.7 }),
    tembaga:  new THREE.MeshStandardMaterial({ color: '#BE6F38', roughness: 0.42, metalness: 0.4 }),
    emas:     new THREE.MeshStandardMaterial({ color: '#C9A24C', roughness: 0.38, metalness: 0.42 }),
    hitam:    new THREE.MeshStandardMaterial({ color: '#20262E', roughness: 0.6 }),
    abu:      new THREE.MeshStandardMaterial({ color: '#9AA3AF', roughness: 0.5, metalness: 0.3 })
  };

  function kotak(w, h, d, bahan, grup, nama, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bahan);
    m.name = nama; m.userData.group = grup;
    m.position.set(x, y, z);
    root.add(m);
    return m;
  }
  function batang(a, b, r, bahan, grup, nama) {
    var A = new THREE.Vector3(a[0], a[1], a[2]), Bv = new THREE.Vector3(b[0], b[1], b[2]);
    var len = A.distanceTo(Bv);
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), bahan);
    m.name = nama; m.userData.group = grup;
    m.position.copy(A).add(Bv).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), Bv.clone().sub(A).normalize());
    root.add(m);
    return m;
  }

  /* ---------- rangka: empat tiang sudut dan pelat dasar ---------- */
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q, i) {
    kotak(P, R * 2, P, B.tiang, 'rangka', 'tiang-sudut-' + i,
          q[0] * (R - P / 2), 0, q[1] * (R - P / 2));
  });
  kotak(R * 2 - 0.4, 0.36, R * 2 - 0.4, B.dasar, 'rangka', 'pelat-dasar', 0, -R + 0.14, 0);

  /* ---------- dek atas: satu-satunya bidang putih ---------- */
  kotak(R * 2 - 0.4, 0.36, R * 2 - 0.4, B.dek, 'dek', 'dek-atas', 0, R - 0.14, 0);

  /* ---------- empat dinding ---------- */
  var W = R * 2 - 1.32;
  kotak(W, W, 0.3, B.dinding, 'dinding', 'dinding-depan', 0, 0, R - 0.21);
  kotak(W, W, 0.3, B.dinding, 'dinding', 'dinding-belakang', 0, 0, -R + 0.21);
  kotak(0.3, W, W, B.dinding, 'dinding', 'dinding-kanan', R - 0.21, 0, 0);
  kotak(0.3, W, W, B.dinding, 'dinding', 'dinding-kiri', -R + 0.21, 0, 0);

  /* ---------- panel berlubang: dua per dinding samping ---------- */
  [1, -1].forEach(function (s) {
    [[-3.9, -1.05], [1.05, 3.9]].forEach(function (yy, j) {
      kotak(0.08, yy[1] - yy[0], 6.8, B.jala, 'jala',
            'panel-berlubang-' + (s > 0 ? 'kanan' : 'kiri') + '-' + j,
            s * (R - 0.02), (yy[0] + yy[1]) / 2, 0);
    });
  });

  /* ---------- bidang sablon pada dinding depan ---------- */
  var plat = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.1, 0.08),
    [B.dinding, B.dinding, B.dinding, B.dinding, B.sablon, B.dinding]);
  plat.name = 'bidang-sablon'; plat.userData.group = 'dinding';
  plat.position.set(0, 2.2, R - 0.02);
  root.add(plat);

  /* ---------- konektor dinding depan ----------
     Satu bundar besar di tengah, dua persegi mengapitnya, satu lonjong
     kecil di bawah — susunan yang terbaca pada render. */
  batang([0, -0.4, R - 0.05], [0, -0.4, R + 0.55], 1.3, B.konektor, 'konektor', 'konektor-bundar');
  batang([0, -0.4, R + 0.3], [0, -0.4, R + 0.6], 0.92, B.lubang, 'konektor', 'konektor-bundar-lubang');
  kotak(2.1, 1.4, 0.5, B.konektor, 'konektor', 'konektor-kiri', -3.05, -1.6, R + 0.2);
  kotak(1.7, 1.1, 0.1, B.lubang, 'konektor', 'konektor-kiri-lubang', -3.05, -1.6, R + 0.47);
  kotak(2.1, 1.4, 0.5, B.konektor, 'konektor', 'konektor-kanan', 3.05, 0.1, R + 0.2);
  kotak(1.7, 1.1, 0.1, B.lubang, 'konektor', 'konektor-kanan-lubang', 3.05, 0.1, R + 0.47);
  var lonjong = batang([0, -3.2, R - 0.05], [0, -3.2, R + 0.35], 0.55, B.konektor, 'konektor', 'konektor-lonjong');
  lonjong.scale.x = 1.35;

  /* ---------- dek: antena patch, pin emas, antena cambuk ---------- */
  var patch = kotak(2.8, 0.3, 2.8, B.tembaga, 'antena', 'antena-patch', -2.2, R + 0.2, -0.3);
  patch.rotation.y = 0.18;
  [0, 0.6, 1.2].forEach(function (dx, i) {
    kotak(0.25, 0.5, 0.8, B.emas, 'konektor', 'pin-emas-' + i, 0.42 + dx, R + 0.26, -2.7);
  });
  batang([1.9, R - 0.1, -0.6], [1.9, R + 0.8, -0.6], 0.6, B.abu, 'antena', 'dudukan-cambuk');
  batang([1.9, R + 0.7, -0.6], [1.9, R + 1.5, -0.6], 0.4, B.emas, 'antena', 'konektor-sma');
  batang([1.9, R + 1.3, -0.6], [2.8, R + 11.5, -0.1], 0.18, B.hitam, 'antena', 'antena-cambuk');

  root.userData.groups = ['rangka', 'dek', 'dinding', 'jala', 'antena', 'konektor'];
  root.userData.sumber = 'render resmi RASCube V2 P1 v13, _nano/foto/';
  return root;
};
