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

    /* Matriks dunia harus disegarkan dulu: tanpa ini kotak batasnya dihitung
       pada ruang model yang belum diputar, dan kamera membidik titik yang
       salah sehingga tumpukan terpotong di bawah. */
    pivot.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(pivot);
    var target = box.getCenter(new THREE.Vector3());

    /* ---------- indeks grup dan bahan ---------- */
    var byGroup = {};
    var allMats = [];
    model.traverse(function (o) {
      if (!o.isMesh) return;
      var g = o.userData.group || 'lain';
      (byGroup[g] = byGroup[g] || []).push(o);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
        if (m && allMats.indexOf(m) < 0) allMats.push(m);
      });
    });

    var sumberLapisan = def.layers || (SV.LAYERS || {})[opts.variant] || [];
    var layers = sumberLapisan.filter(function (L) {
      return L.groups.some(function (g) { return byGroup[g]; });
    });
    var layerOn = {};
    layers.forEach(function (L) { layerOn[L.id] = true; });

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
    var yaw = DEF.yaw, pitch = DEF.pitch, dist = DEF.dist;
    var tYaw = yaw, tPitch = pitch, tDist = dist;
    var spin = true, labelsOn = false, section = false, mode = 'padat';
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
      return { el: b, tag: tag, spot: s, world: new THREE.Vector3() };
    });

    var ray = new THREE.Raycaster();
    var tick = 0;

    function updateDots() {
      var w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
      tick++;
      dots.forEach(function (d) {
        d.world.set(d.spot.pos[0], d.spot.pos[1], d.spot.pos[2]);
        model.localToWorld(d.world);
        var p = d.world.clone().project(camera);
        var visible = p.z < 1;
        var x = (p.x * 0.5 + 0.5) * w, y = (-p.y * 0.5 + 0.5) * h;
        d.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        d.el.style.display = visible ? 'flex' : 'none';
        d.tag.style.display = labelsOn ? 'block' : 'none';

        /* Uji tertutup benda lain hanya sesekali: sembilan sinar tiap
           bingkai tidak sepadan untuk sesuatu yang hanya mengatur pudar. */
        if (visible && tick % 6 === 0) {
          var dir = d.world.clone().sub(camera.position);
          var len = dir.length();
          ray.set(camera.position, dir.normalize());
          var hit = ray.intersectObject(model, true)[0];
          d.el.style.opacity = (hit && hit.distance < len - 1.2) ? '0.35' : '1';
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
    function onUp() { dragging = false; }
    function onWheel(e) {
      e.preventDefault();
      tDist = dist = Math.max(45, Math.min(320, dist * (1 + Math.sign(e.deltaY) * 0.11)));
      place();
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    function select(i) {
      var s = spots[i];
      if (!s) return;
      dots.forEach(function (d, j) {
        d.el.style.background = j === i ? accent : 'rgba(10,16,24,.82)';
        d.el.style.transform += '';
        d.tag.style.display = (labelsOn || j === i) ? 'block' : 'none';
      });
      spin = false; if (opts.onSpinChange) opts.onSpinChange(false);
      if (opts.onSelect) opts.onSelect(s);
    }

    /* ---------- gelung gambar ---------- */
    var raf = 0, dead = false;
    function frame() {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (spin && !dragging) { tYaw += 0.0022; }

      /* Pintu dibuka bertahap, bukan seketika: gerakannya sendiri yang
         menjelaskan bahwa daun itu berputar pada engsel di tepi badan. */
      var targetAngle = doorsOpen ? 1.95 : 0;
      if (Math.abs(targetAngle - doorAngle) > 0.001) {
        doorAngle += (targetAngle - doorAngle) * 0.09;
        (model.userData.doors || []).forEach(function (h) {
          h.rotation.x = h.userData.doorSide * doorAngle;
        });
      }
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

      setLayer: function (id, on) {
        layerOn[id] = !!on;
        eachLayerMesh(id, function (m) { m.visible = !!on; });
        return !!on;
      },
      isLayerOn: function (id) { return !!layerOn[id]; },

      highlight: function (id) {
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
        section = !section;
        allMats.forEach(function (m) {
          m.clippingPlanes = section ? [clipPlane] : null;
          m.needsUpdate = true;
        });
        return section;
      },

      toggleLabel: function () { labelsOn = !labelsOn; return labelsOn; },

      setMode: function (m) {
        mode = m;
        var wire = (m === 'rangka' || m === 'garis');
        allMats.forEach(function (mat) { mat.wireframe = wire; });
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
        tDist = Math.max(45, Math.min(320, tDist * (1 + dir * 0.14)));
      },

      reset: function () {
        tYaw = DEF.yaw; tPitch = DEF.pitch; tDist = DEF.dist;
        labelsOn = false;
        doorsOpen = false;
        if (section) { section = false; allMats.forEach(function (m) { m.clippingPlanes = null; m.needsUpdate = true; }); }
        allMats.forEach(function (m) { m.wireframe = false; });
        mode = 'padat';
        layers.forEach(function (L) {
          layerOn[L.id] = true;
          eachLayerMesh(L.id, function (m) { m.visible = true; });
        });
        dots.forEach(function (d) { d.el.style.background = 'rgba(10,16,24,.82)'; });
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
