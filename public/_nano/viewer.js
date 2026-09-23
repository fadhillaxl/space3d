/* =====================================================================
   viewer.js — panggung 3D, titik komponen, dan kendali halaman
   =====================================================================

   Dipakai bersama oleh rascube.html dan kratos.html. Setiap halaman
   mengisi window.WAHANA sebelum memuat berkas ini:

     buat      fungsi pembuat model (mis. window.createKratosModel)
     poin      daftar titik komponen
     lapisan   { idGrup: 'Label tombol' } — urutannya urutan tombol
     pandang   { nama: { yaw, pitch } } untuk tombol data-aksi="pandang:nama"
     awal      { yaw, pitch } sudut pembuka
     tur       [{ n?, judul?, teks, pandang?, deploy? }] — tur berpandu.
               Langkah dengan n menunjuk poin bernomor itu; tanpa n,
               judul dan pandang-nya dipakai apa adanya.
     galeri    [{ judul, yaw, pitch, deploy?, dekat? }] — gambar yang
               dirender dari model ini ke #galeri-model saat halaman dibuka.

   Model yang punya userData.setDeploy (Kratos) mendapat penggeser
   lipat-bentang; yang tidak punya (RASCube) penggesernya disembunyikan.

   Tidak ada pustaka kendali orbit yang dimuat: orbitnya ditulis di sini,
   tiga puluh baris, karena satu berkas tambahan berarti satu berkas lagi
   yang bisa hilang saat folder ini dipindahkan atau di-zip.

   Titik komponen dibaca dari KRATOS_POIN. Sebagian menempel pada mesh
   yang ikut bergerak saat sayap melipat, jadi letaknya dihitung dari
   matriks dunia mesh itu tiap bingkai — bukan dari koordinat tetap.
   ===================================================================== */

(function () {
  'use strict';

  var W = window.WAHANA || {};
  var LABEL_LAPISAN = W.lapisan || {};
  var PANDANG = W.pandang || {
    depan:   { yaw: 0.0001,        pitch: 0.12 },
    samping: { yaw: -Math.PI / 2,  pitch: 0.10 },
    atas:    { yaw: 0.0001,        pitch: 1.25 }
  };

  var stage = document.getElementById('stage');
  var canvas = document.getElementById('kanvas');
  var lapisBox = document.getElementById('lapisan');
  var daftar = document.getElementById('daftar-poin');
  var kartu = document.getElementById('kartu');
  var poin = W.poin || [];

  /* Daftar poin di bawah panggung selalu dibangun, apa pun nasib WebGL —
     dokumentasinya harus tetap terbaca kalau modelnya gagal tampil. */
  var tombolPoin = poin.map(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<span class="n"></span><span><span class="t"></span><span class="d"></span></span>';
    b.querySelector('.n').textContent = p.n < 10 ? '0' + p.n : String(p.n);
    b.querySelector('.t').textContent = p.label;
    b.querySelector('.d').textContent = p.teks;
    daftar.appendChild(b);
    return b;
  });

  if (typeof THREE === 'undefined' || typeof W.buat !== 'function') {
    stage.classList.add('is-failed');
    return;
  }

  /* ---------- panggung ---------- */
  var scene, camera, renderer, model;
  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 16 / 10, 0.1, 2000);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    model = W.buat();
    scene.add(model);
  } catch (e) {
    stage.classList.add('is-failed');
    return;
  }

  /* Cahaya: satu kunci dari kiri-atas-depan seperti pada foto studio EXA,
     satu pengisi dingin dari kanan-belakang supaya sisi bayangan tidak
     jatuh menjadi hitam di atas panggung segelap ini, dan satu lampu
     langit-tanah untuk mengangkat seluruhnya. Emasnya perlu ketiganya:
     logam tanpa lingkungan akan tampak cokelat mati. */
  scene.add(new THREE.HemisphereLight('#e8f0fa', '#1b2430', 0.95));
  var kunci = new THREE.DirectionalLight('#fff6e6', 1.15);
  kunci.position.set(-9, 12, 14);
  scene.add(kunci);
  var isi = new THREE.DirectionalLight('#bcd4ec', 0.55);
  isi.position.set(11, 2, -9);
  scene.add(isi);
  var belakang = new THREE.DirectionalLight('#ffffff', 0.35);
  belakang.position.set(2, -6, -12);
  scene.add(belakang);

  /* ---------- pembingkaian kamera ----------
     Kotak batas wahana berubah drastis antara terlipat dan terbentang,
     jadi jaraknya diukur pada KEDUA keadaan lalu ditakar menurut posisi
     penggeser. Tanpa itu, wahana yang terlipat tampak sebesar semut, dan
     yang terbentang terpotong di kiri-kanan. */
  /* Bentang mendatar harus diukur dengan bidang pandang MENDATAR, bukan
     yang tegak. Panggung ini lebar (16:10), jadi memakai sudut tegak untuk
     lebar 75 satuan membuat kamera mundur hampir dua kali lipat dari yang
     diperlukan, dan wahana tampil sebesar semut. */
  /* Tidak semua wahana bisa dilipat. Yang tidak bisa diperlakukan seolah
     selalu terbentang penuh, dan penggesernya disembunyikan di bawah. */
  var bisaLipat = typeof model.userData.setDeploy === 'function';
  function modelDeploy(t) { if (bisaLipat) model.userData.setDeploy(t); }

  var FOV = 32;
  function ukurMuat() {
    model.updateMatrixWorld(true);
    var b = new THREE.Box3().setFromObject(model);
    var s = b.getSize(new THREE.Vector3());
    var aspek = (stage.clientWidth || 16) / (stage.clientHeight || 10);
    var tegak = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    var perluTegak = (s.y / 2) / tegak;
    var perluDatar = (Math.max(s.x, s.z) / 2) / (tegak * aspek);
    return { jarak: Math.max(perluTegak, perluDatar) * 1.06,
             pusat: b.getCenter(new THREE.Vector3()) };
  }
  modelDeploy(0);
  var JARAK_LIPAT = ukurMuat().jarak;
  modelDeploy(1);
  var muatBentang = ukurMuat();
  var JARAK_BENTANG = muatBentang.jarak;

  /* Kamera membidik pusat kotak batas saat terbentang, bukan titik nol:
     dek antena dan tali RBF menggeser pusatnya sedikit ke atas. */
  var target = muatBentang.pusat.clone();
  var AWAL = W.awal || { yaw: -0.72, pitch: 0.28 };
  var yaw = AWAL.yaw, pitch = AWAL.pitch, jarak = JARAK_BENTANG;
  var tYaw = yaw, tPitch = pitch, tJarak = jarak, zoom = 1;
  var putar = true, nomorOn = true, aktif = -1, deploy = 1, tDeploy = 1;

  function tempatkan() {
    camera.position.set(
      target.x + jarak * Math.cos(pitch) * Math.sin(yaw),
      target.y + jarak * Math.sin(pitch),
      target.z + jarak * Math.cos(pitch) * Math.cos(yaw));
    camera.lookAt(target);
  }

  function ukurUlang() {
    var w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', function () {
    ukurUlang();
    /* Jarak dasar bergantung pada nisbah panggung, jadi ikut dihitung
       ulang saat jendelanya berubah lebar. */
    var d0 = deploy;
    modelDeploy(0); JARAK_LIPAT = ukurMuat().jarak;
    modelDeploy(1); JARAK_BENTANG = ukurMuat().jarak;
    modelDeploy(d0);
    setDeploy(d0);
  });
  ukurUlang();
  tempatkan();

  /* ---------- titik bernomor ---------- */
  var spotsBox = document.getElementById('spots');
  var sinar = new THREE.Raycaster();
  var titik = poin.map(function (p, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'spot';
    b.textContent = String(p.n);
    b.setAttribute('aria-label', p.n + ' — ' + p.label);
    b.addEventListener('click', function () { hentikanTur(); pilih(i, true); });
    spotsBox.appendChild(b);
    return { el: b, poin: p, obj: p.ikut ? model.getObjectByName(p.ikut) : null,
             dunia: new THREE.Vector3() };
  });

  /* Poin yang menyebut mesh tetapi mesh-nya tidak ada adalah salah ketik,
     dan diam-diam titik itu akan menempel di titik nol. Lebih baik
     berisik sekarang daripada salah tunjuk di depan orang. */
  titik.forEach(function (t) {
    if (t.poin.ikut && !t.obj) {
      console.warn('[wahana] poin ' + t.poin.n + ' menyebut mesh "' + t.poin.ikut + '" yang tidak ada pada model');
    }
  });

  var detak = 0;
  function perbaruiTitik() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    detak++;
    titik.forEach(function (t, i) {
      if (t.obj) t.obj.getWorldPosition(t.dunia);
      else t.dunia.set(t.poin.pos[0], t.poin.pos[1], t.poin.pos[2]).applyMatrix4(model.matrixWorld);

      var p = t.dunia.clone().project(camera);
      /* Nomor mati berarti semua titik hilang; hanya tur yang boleh
         menampilkan titik yang sedang dibahas. */
      var tampil = nomorOn || (turDi >= 0 && i === aktif);
      var didepan = p.z < 1;
      t.el.classList.toggle('is-hidden', !(tampil && didepan));
      if (!(tampil && didepan)) return;
      t.el.style.transform = 'translate(' +
        ((p.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' +
        ((-p.y * 0.5 + 0.5) * h).toFixed(1) + 'px)';

      /* Uji tertutup benda lain dijalankan berselang, bukan tiap bingkai:
         dua belas sinar per bingkai tidak sepadan untuk sesuatu yang
         hanya mengatur pudar. */
      if (detak % 8 === 0) {
        var arah = t.dunia.clone().sub(camera.position);
        var jauh = arah.length();
        sinar.set(camera.position, arah.normalize());
        var kena = sinar.intersectObject(model, true)[0];
        t.el.classList.toggle('is-behind', !!(kena && kena.distance < jauh - 0.45));
      }
    });
  }

  /* ---------- kartu keterangan ---------- */
  var kartuN = document.getElementById('kartu-n');
  var kartuJudul = document.getElementById('kartu-judul');
  var kartuTeks = document.getElementById('kartu-teks');
  var kartuRinci = document.getElementById('kartu-rinci');

  function pilih(i, geser) {
    var p = poin[i];
    if (!p) return;
    aktif = i;
    titik.forEach(function (t, j) { t.el.classList.toggle('is-on', i === j); });
    tombolPoin.forEach(function (b, j) { b.style.background = i === j ? 'var(--panel2)' : ''; });

    kartuN.textContent = 'Poin ' + (p.n < 10 ? '0' + p.n : p.n);
    kartuJudul.textContent = p.label;
    kartuTeks.textContent = p.teks;
    kartuRinci.innerHTML = '';
    (p.rinci || []).forEach(function (r) {
      var li = document.createElement('li');
      li.textContent = r;
      kartuRinci.appendChild(li);
    });
    kartu.hidden = false;

    if (geser && p.pandang) {
      tYaw = p.pandang.yaw;
      tPitch = p.pandang.pitch;
      putar = false;
      tekan('putar', false);
    }
  }
  function tutupKartu() {
    kartu.hidden = true;
    aktif = -1;
    titik.forEach(function (t) { t.el.classList.remove('is-on'); });
    tombolPoin.forEach(function (b) { b.style.background = ''; });
  }
  document.getElementById('kartu-tutup').addEventListener('click', function () {
    hentikanTur(); tutupKartu();
  });
  tombolPoin.forEach(function (b, i) {
    b.addEventListener('click', function () {
      hentikanTur();
      pilih(i, true);
      stage.scrollIntoView({ block: 'center' });
    });
  });

  /* ---------- lapisan komponen ---------- */
  var perGrup = {};
  model.traverse(function (o) {
    if (!o.isMesh) return;
    var g = o.userData.group || 'lain';
    (perGrup[g] = perGrup[g] || []).push(o);
  });
  Object.keys(LABEL_LAPISAN).forEach(function (id) {
    if (!perGrup[id]) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'layer';
    b.setAttribute('aria-pressed', 'true');
    b.innerHTML = '<span class="layer__dot"></span>';
    b.appendChild(document.createTextNode(LABEL_LAPISAN[id]));
    b.addEventListener('click', function () {
      var nyala = b.getAttribute('aria-pressed') === 'false';
      b.setAttribute('aria-pressed', String(nyala));
      b.classList.toggle('is-off', !nyala);
      perGrup[id].forEach(function (m) { m.visible = nyala; });
    });
    lapisBox.appendChild(b);
  });

  /* ---------- kendali ---------- */
  function tekan(aksi, nyala) {
    var b = document.querySelector('[data-aksi="' + aksi + '"]');
    if (b) b.setAttribute('aria-pressed', String(nyala));
  }

  document.querySelectorAll('[data-aksi]').forEach(function (b) {
    b.addEventListener('click', function () {
      var a = b.getAttribute('data-aksi');
      if (a === 'putar') { putar = !putar; tekan('putar', putar); }
      else if (a === 'nomor') {
        nomorOn = !nomorOn;
        tekan('nomor', nomorOn);
      }
      else if (a === 'ulang') {
        tYaw = AWAL.yaw; tPitch = AWAL.pitch; zoom = 1;
        putar = true; tekan('putar', true);
        nomorOn = true; tekan('nomor', true);
        tutupKartu();
        document.querySelectorAll('.layer').forEach(function (l) {
          l.setAttribute('aria-pressed', 'true');
          l.classList.remove('is-off');
        });
        Object.keys(perGrup).forEach(function (g) {
          perGrup[g].forEach(function (m) { m.visible = true; });
        });
        hentikanTur();
        geser.value = 100;
        tDeploy = 1; setDeploy(1);
      }
      else if (a.indexOf('pandang:') === 0) {
        var v = PANDANG[a.slice(8)];
        if (v) { tYaw = v.yaw; tPitch = v.pitch; putar = false; tekan('putar', false); }
      }
    });
  });

  var geser = document.getElementById('deploy');
  if (!bisaLipat && geser) {
    var wadah = geser.closest('.slider');
    if (wadah) wadah.hidden = true;
  }
  function setDeploy(t) {
    deploy = t;
    modelDeploy(t);
    tJarak = (JARAK_LIPAT + (JARAK_BENTANG - JARAK_LIPAT) * t) * zoom;
  }
  geser.addEventListener('input', function () { tDeploy = geser.value / 100; setDeploy(tDeploy); });
  setDeploy(1);
  jarak = tJarak;

  /* orbit: seret memutar, gulir memperbesar */
  var seret = false, px = 0, py = 0;
  canvas.addEventListener('pointerdown', function (e) {
    seret = true; px = e.clientX; py = e.clientY;
    putar = false; tekan('putar', false);
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!seret) return;
    tYaw = yaw = yaw - (e.clientX - px) * 0.008;
    tPitch = pitch = Math.max(-1.35, Math.min(1.35, pitch + (e.clientY - py) * 0.006));
    px = e.clientX; py = e.clientY;
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    canvas.addEventListener(ev, function () { seret = false; });
  });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoom = Math.max(0.42, Math.min(2.6, zoom * (1 + Math.sign(e.deltaY) * 0.12)));
    tJarak = (JARAK_LIPAT + (JARAK_BENTANG - JARAK_LIPAT) * deploy) * zoom;
  }, { passive: false });

  /* ---------- gelung gambar ---------- */
  var pelan = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (pelan) { putar = false; tekan('putar', false); }

  (function gambar() {
    requestAnimationFrame(gambar);
    if (putar && !seret) tYaw += 0.0026;
    /* Lipat-bentang dari tur berjalan pelan, supaya gerakannya terbaca. */
    if (bisaLipat && Math.abs(tDeploy - deploy) > 0.002) {
      setDeploy(deploy + (tDeploy - deploy) * 0.06);
      geser.value = Math.round(deploy * 100);
    }
    yaw += (tYaw - yaw) * 0.12;
    pitch += (tPitch - pitch) * 0.12;
    jarak += (tJarak - jarak) * 0.10;
    tempatkan();
    perbaruiTitik();
    renderer.render(scene, camera);
  })();

  /* ---------- tur berpandu ----------
     Memakai kartu keterangan yang sama: judul dan teksnya diganti teks tur,
     dan dua tombol maju-mundur muncul di bawahnya. Selama tur hanya titik
     yang sedang dibahas yang tampil. */
  var tur = W.tur || [];
  var turDi = -1, nomorSebelumTur = true;
  var turNav = null;

  function hentikanTur() {
    if (!(turDi >= 0)) return;
    turDi = -1;
    nomorOn = nomorSebelumTur;
    tekan('nomor', nomorOn);
    tekan('tur', false);
    if (turNav) turNav.hidden = true;
  }

  function tampilLangkah(k) {
    var st = tur[k];
    if (!st) return;
    turDi = k;
    var idx = -1;
    if (st.n) poin.forEach(function (p, j) { if (p.n === st.n) idx = j; });
    if (idx >= 0) {
      pilih(idx, true);
      if (st.judul) kartuJudul.textContent = st.judul;
    } else {
      aktif = -1;
      titik.forEach(function (t) { t.el.classList.remove('is-on'); });
      tombolPoin.forEach(function (b) { b.style.background = ''; });
      kartuJudul.textContent = st.judul || '';
      kartuRinci.innerHTML = '';
      kartu.hidden = false;
      var v = st.pandang || AWAL;
      tYaw = v.yaw; tPitch = v.pitch;
    }
    kartuN.textContent = 'Tur · langkah ' + (k + 1) + ' dari ' + tur.length;
    kartuTeks.textContent = st.teks;
    if (typeof st.deploy === 'number' && bisaLipat) tDeploy = st.deploy;
    putar = false; tekan('putar', false);
    turNav.querySelector('[data-tur="mundur"]').disabled = k === 0;
    turNav.querySelector('[data-tur="maju"]').textContent =
      k === tur.length - 1 ? 'Selesai' : 'Berikutnya →';
  }

  function mulaiTur() {
    nomorSebelumTur = nomorOn;
    nomorOn = false;
    tekan('nomor', false);
    tekan('tur', true);
    turNav.hidden = false;
    tampilLangkah(0);
  }

  if (tur.length) {
    turNav = document.createElement('div');
    turNav.className = 'tur-nav';
    turNav.hidden = true;
    turNav.innerHTML =
      '<button type="button" class="btn" data-tur="mundur">← Sebelumnya</button>' +
      '<button type="button" class="btn" data-tur="maju">Berikutnya →</button>';
    kartu.querySelector('.card3d__isi').appendChild(turNav);
    turNav.querySelector('[data-tur="mundur"]').addEventListener('click', function () {
      if (turDi > 0) tampilLangkah(turDi - 1);
    });
    turNav.querySelector('[data-tur="maju"]').addEventListener('click', function () {
      if (turDi < tur.length - 1) tampilLangkah(turDi + 1);
      else { hentikanTur(); tutupKartu(); }
    });

    var bar = document.querySelector('.bar');
    var tombolTur = document.createElement('button');
    tombolTur.type = 'button';
    tombolTur.className = 'btn';
    tombolTur.setAttribute('data-aksi', 'tur');
    tombolTur.setAttribute('aria-pressed', 'false');
    tombolTur.textContent = 'Tur';
    tombolTur.title = 'Tur berpandu, ' + tur.length + ' langkah';
    tombolTur.addEventListener('click', function () {
      if (turDi >= 0) { hentikanTur(); tutupKartu(); } else mulaiTur();
    });
    if (bar) bar.insertBefore(tombolTur, bar.firstChild);
  }

  /* ---------- galeri model ----------
     Gambar galeri dirender dari model yang sama, pada penggambar kedua yang
     dibuang lagi sesudahnya: tidak ada berkas gambar yang perlu ikut di-zip,
     dan galeri tidak pernah basi terhadap modelnya. */
  function buatGaleri() {
    var wadah = document.getElementById('galeri-model');
    var daftarG = W.galeri || [];
    if (!wadah || !daftarG.length) return;
    var LEBAR = 800, TINGGI = 500, FOVG = 30;
    var kanvasG = document.createElement('canvas');
    kanvasG.width = LEBAR; kanvasG.height = TINGGI;
    var rg, sceneG, camG, modelG;
    try {
      rg = new THREE.WebGLRenderer({ canvas: kanvasG, antialias: true, preserveDrawingBuffer: true });
      rg.setPixelRatio(1);
      rg.setSize(LEBAR, TINGGI, false);
      rg.setClearColor('#0B1017', 1);
      sceneG = new THREE.Scene();
      scene.children.forEach(function (o) { if (o.isLight) sceneG.add(o.clone()); });
      modelG = W.buat();
      sceneG.add(modelG);
      camG = new THREE.PerspectiveCamera(FOVG, LEBAR / TINGGI, 0.1, 4000);
    } catch (e) { return; }

    var tanV = Math.tan(THREE.MathUtils.degToRad(FOVG) / 2), tanH = tanV * LEBAR / TINGGI;
    daftarG.forEach(function (g) {
      if (typeof modelG.userData.setDeploy === 'function') {
        modelG.userData.setDeploy(typeof g.deploy === 'number' ? g.deploy : 1);
      }
      modelG.updateMatrixWorld(true);
      var kotak = new THREE.Box3().setFromObject(modelG);
      var pusat = kotak.getCenter(new THREE.Vector3());
      var arah = new THREE.Vector3(Math.cos(g.pitch) * Math.sin(g.yaw), Math.sin(g.pitch),
                                   Math.cos(g.pitch) * Math.cos(g.yaw));
      /* Jarak dipilih supaya kedelapan sudut kotak batas masuk bingkai dari
         arah pandang ini, bukan satu jarak yang sama untuk semua sudut. */
      camG.position.copy(pusat).addScaledVector(arah, 10);
      camG.lookAt(pusat);
      camG.updateMatrixWorld(true);
      var kanan = new THREE.Vector3().setFromMatrixColumn(camG.matrixWorld, 0);
      var atas = new THREE.Vector3().setFromMatrixColumn(camG.matrixWorld, 1);
      var perlu = 0;
      [kotak.min.x, kotak.max.x].forEach(function (x) {
        [kotak.min.y, kotak.max.y].forEach(function (y) {
          [kotak.min.z, kotak.max.z].forEach(function (z) {
            var q = new THREE.Vector3(x, y, z).sub(pusat);
            var zq = q.dot(arah);
            perlu = Math.max(perlu, zq + Math.abs(q.dot(kanan)) / tanH,
                                    zq + Math.abs(q.dot(atas)) / tanV);
          });
        });
      });
      camG.position.copy(pusat).addScaledVector(arah, perlu * 1.08 * (g.dekat || 1));
      camG.lookAt(pusat);
      rg.render(sceneG, camG);

      var fig = document.createElement('figure');
      var img = document.createElement('img');
      img.src = kanvasG.toDataURL('image/jpeg', 0.9);
      img.alt = g.judul;
      img.width = LEBAR; img.height = TINGGI;
      var cap = document.createElement('figcaption');
      cap.textContent = g.judul;
      fig.appendChild(img); fig.appendChild(cap);
      wadah.appendChild(fig);
    });
    if (rg.forceContextLoss) rg.forceContextLoss();
    rg.dispose();
  }
  setTimeout(buatGaleri, 60);

  /* Satu titik dipilih sejak awal supaya jelas bahwa nomornya bisa diklik. */
  pilih(0, false);
})();
