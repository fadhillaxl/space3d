/* =====================================================================
   viewer3d.js — perender 3D mandiri untuk orbiter Space Shuttle
   Tanpa library eksternal. Canvas 2D + painter's algorithm.
   Dipakai oleh discovery.html dan buran.html.
   ===================================================================== */
(function (root, factory) {
  var lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.SpaceViewer = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- palet material ---------- */
  var MAT = {
    hull:     '#E6E9EE',
    hullWarm: '#DCDFE6',
    tps:      '#262B33',
    rcc:      '#14171C',
    bay:      '#151A22',
    bayFloor: '#232A34',
    radiator: '#C4CBD4',
    pod:      '#D8DCE3',
    bell:     '#878E98',
    bellIn:   '#4A5058',
    red:      '#D6453A',
    glass:    '#2E3A48',
    gold:     '#C9A24C',
    goldDark: '#8C6F32',
    solar:    '#1D3557',
    solarLit: '#2E5A86',
    dish:     '#D9DDE3',
    boom:     '#6E7681',
    foam:     '#C4622D',
    foamDark: '#9C4C21',
    srb:      '#DCE2E9',
    srbBand:  '#AEB6C0',
    strut:    '#5A626C',
    osr:      '#DDE4EC',
    osrEdge:  '#A9B4C2',
    tank:     '#B9603E',
    tower:    '#7E8792',
    hall:     '#5C6672',
    hallGlow: '#7C5BD0',
    rail:     '#C9CFD8',
    railDark: '#9AA3AF',
    pcb:      '#1F6B4A',
    pcbEdge:  '#154A34',
    chip:     '#20262E',
    batt:     '#3E4650',
    cell:     '#1E3A63',
    cellLit:  '#2C55A0',
    whip:     '#B9C2CC',
    lens:     '#12181F',
    bench:    '#2A313A',
    kabel:    '#C08A3E'
  };

  /* ---------- util warna ---------- */
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * k)));
    g = Math.max(0, Math.min(255, Math.round(g * k)));
    b = Math.max(0, Math.min(255, Math.round(b * k)));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /* ---------- penampang badan orbiter (z,y ternormalisasi) ---------- */
  var PROFILE = [
    [ 0.00,  1.00], [ 0.42,  0.96], [ 0.72,  0.82], [ 0.91,  0.55],
    [ 1.00,  0.18], [ 0.99, -0.22], [ 0.90, -0.55], [ 0.62, -0.78],
    [ 0.26, -0.87], [ 0.00, -0.89], [-0.26, -0.87], [-0.62, -0.78],
    [-0.90, -0.55], [-0.99, -0.22], [-1.00,  0.18], [-0.91,  0.55],
    [-0.72,  0.82], [-0.42,  0.96]
  ];

  /* ---------- helper mesh ---------- */
  function Mesh() { this.v = []; this.f = []; }
  Mesh.prototype.addV = function (x, y, z) { this.v.push([x, y, z]); return this.v.length - 1; };
  Mesh.prototype.addF = function (idx, color, group) {
    this.f.push({ v: idx, c: color, g: group || 'body' });
  };

  /* Loft: rangkaian cincin penampang menjadi badan tertutup */
  function loftFuselage(mesh, rings, opts) {
    opts = opts || {};
    var bayFrom = opts.bayFrom, bayTo = opts.bayTo;
    var P = PROFILE, n = P.length;
    var ringIdx = [];

    for (var i = 0; i < rings.length; i++) {
      var r = rings[i], row = [];
      for (var j = 0; j < n; j++) {
        row.push(mesh.addV(r.x, r.cy + P[j][1] * r.h, P[j][0] * r.w));
      }
      ringIdx.push(row);
    }

    for (var i2 = 0; i2 < rings.length - 1; i2++) {
      var a = ringIdx[i2], b = ringIdx[i2 + 1];
      var xm = (rings[i2].x + rings[i2 + 1].x) / 2;
      for (var j2 = 0; j2 < n; j2++) {
        var k = (j2 + 1) % n;
        var ynorm = (P[j2][1] + P[k][1]) / 2;
        var col = ynorm < -0.42 ? MAT.tps : MAT.hull;
        var grp = 'body';
        // Bagian atas pada rentang ruang muatan = pintu payload bay
        if (bayFrom !== undefined && xm > bayFrom && xm < bayTo && ynorm > 0.5) {
          grp = 'door';
          col = MAT.hullWarm;
        }
        mesh.addF([a[j2], a[k], b[k], b[j2]], col, grp);
      }
    }

    // Tutup ekor (bulkhead belakang)
    var last = ringIdx[ringIdx.length - 1];
    for (var t = 1; t < n - 1; t++) {
      mesh.addF([last[0], last[t], last[t + 1]], MAT.tps, 'body');
    }
    return ringIdx;
  }

  /* Pelat tipis (sayap / sirip) dari poligon planar + ketebalan */
  function plate(mesh, pts, thickFn, axis, topColor, botColor, edgeColor, group) {
    var top = [], bot = [];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], t = thickFn(p);
      if (axis === 'y') {
        top.push(mesh.addV(p[0], p[1] + t, p[2]));
        bot.push(mesh.addV(p[0], p[1] - t, p[2]));
      } else {
        top.push(mesh.addV(p[0], p[1], p[2] + t));
        bot.push(mesh.addV(p[0], p[1], p[2] - t));
      }
    }
    for (var f = 1; f < pts.length - 1; f++) {
      mesh.addF([top[0], top[f], top[f + 1]], topColor, group);
      mesh.addF([bot[0], bot[f + 1], bot[f]], botColor, group);
    }
    for (var e = 0; e < pts.length; e++) {
      var e2 = (e + 1) % pts.length;
      mesh.addF([top[e], top[e2], bot[e2], bot[e]], edgeColor, group);
    }
  }

  /* Kotak lofted sederhana (OMS pod dsb.) */
  function boxLoft(mesh, sections, color, group) {
    var rows = [];
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      rows.push([
        mesh.addV(s.x, s.y0, s.z0), mesh.addV(s.x, s.y0, s.z1),
        mesh.addV(s.x, s.y1, s.z1), mesh.addV(s.x, s.y1, s.z0)
      ]);
    }
    for (var r = 0; r < rows.length - 1; r++) {
      var a = rows[r], b = rows[r + 1];
      for (var k = 0; k < 4; k++) {
        var k2 = (k + 1) % 4;
        mesh.addF([a[k], a[k2], b[k2], b[k]], color, group);
      }
    }
    var f0 = rows[0], fl = rows[rows.length - 1];
    mesh.addF([f0[0], f0[1], f0[2], f0[3]], color, group);
    mesh.addF([fl[3], fl[2], fl[1], fl[0]], color, group);
  }

  /* Nozel mesin (kerucut terpotong) */
  function nozzle(mesh, cx, cy, cz, r0, r1, len, seg, group) {
    var a = [], b = [];
    for (var i = 0; i < seg; i++) {
      var t = (i / seg) * Math.PI * 2;
      a.push(mesh.addV(cx, cy + Math.sin(t) * r0, cz + Math.cos(t) * r0));
      b.push(mesh.addV(cx - len, cy + Math.sin(t) * r1, cz + Math.cos(t) * r1));
    }
    for (var j = 0; j < seg; j++) {
      var j2 = (j + 1) % seg;
      mesh.addF([a[j], a[j2], b[j2], b[j]], MAT.bell, group);
    }
    for (var k = 1; k < seg - 1; k++) {
      mesh.addF([b[0], b[k], b[k + 1]], MAT.bellIn, group);
    }
  }

  /* Cakram (reflektor antena) */
  function disc(mesh, cx, cy, cz, r, depth, seg, color, group) {
    var rim = [], hub = mesh.addV(cx - depth, cy, cz);
    for (var i = 0; i < seg; i++) {
      var t = (i / seg) * Math.PI * 2;
      rim.push(mesh.addV(cx, cy + Math.sin(t) * r, cz + Math.cos(t) * r));
    }
    for (var j = 0; j < seg; j++) {
      var j2 = (j + 1) % seg;
      mesh.addF([hub, rim[j], rim[j2]], color, group);
      mesh.addF([hub, rim[j2], rim[j]], shadeHex(color, 0.72), group);
    }
  }
  function shadeHex(hex, k) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ---------- konstruksi model satelit GEO ---------- */
  /* Bola beriris, dipakai untuk tangki propelan di dalam bus. */
  function sphere(mesh, cx, cy, cz, r, seg, ring, color, group) {
    var baris = [], i, j;
    for (i = 0; i <= ring; i++) {
      var phi = (i / ring) * Math.PI;
      var rr = Math.sin(phi) * r, yy = Math.cos(phi) * r;
      var row = [];
      for (j = 0; j < seg; j++) {
        var t = (j / seg) * Math.PI * 2;
        row.push(mesh.addV(cx + Math.cos(t) * rr, cy + yy, cz + Math.sin(t) * rr));
      }
      baris.push(row);
    }
    for (i = 0; i < ring; i++) {
      for (j = 0; j < seg; j++) {
        var k = (j + 1) % seg;
        mesh.addF([baris[i][j], baris[i][k], baris[i + 1][k], baris[i + 1][j]],
                  color, group);
      }
    }
  }

  function buildSatellite() {
    var m = new Mesh();

    // Badan satelit (bus)
    boxLoft(m, [
      { x:  4.5, y0: -4.2, y1: 4.2, z0: -4.2, z1: 4.2 },
      { x: -4.5, y0: -4.2, y1: 4.2, z0: -4.2, z1: 4.2 }
    ], MAT.gold, 'bus');
    boxLoft(m, [
      { x:  4.6, y0: -3.0, y1: 3.0, z0: -3.0, z1: 3.0 },
      { x:  5.4, y0: -2.4, y1: 2.4, z0: -2.4, z1: 2.4 }
    ], MAT.goldDark, 'bus');

    // Sayap surya kiri-kanan
    [1, -1].forEach(function (s) {
      var boom = [
        [ 0.35, 0.35, 4.2 * s], [-0.35, 0.35, 4.2 * s],
        [-0.35, 0.35, 7.5 * s], [ 0.35, 0.35, 7.5 * s]
      ];
      plate(m, boom, function () { return 0.35; }, 'y', MAT.boom, MAT.boom, MAT.boom, 'boom');

      for (var p = 0; p < 3; p++) {
        var z0 = 7.5 + p * 7.4, z1 = z0 + 7.0;
        var panel = [
          [ 3.4, 0.0, z0 * s], [-3.4, 0.0, z0 * s],
          [-3.4, 0.0, z1 * s], [ 3.4, 0.0, z1 * s]
        ];
        plate(m, panel, function () { return 0.22; }, 'y',
              MAT.solarLit, MAT.solar, MAT.boom, 'solar');
      }
    });

    /* Optical Solar Reflector: pelat radiator pada sisi utara dan selatan.
       Permukaan inilah yang membuang panas satelit ke ruang angkasa, dan
       sengaja diletakkan pada sisi yang paling jarang disinari Matahari. */
    [1, -1].forEach(function (s2) {
      plate(m, [
        [ 4.0, 4.25 * s2, -3.6], [-4.0, 4.25 * s2, -3.6],
        [-4.0, 4.25 * s2,  3.6], [ 4.0, 4.25 * s2,  3.6]
      ], function () { return 0.12; }, 'y', MAT.osr, MAT.osrEdge, MAT.osrEdge, 'osr');
    });

    /* Tower structure: tabung tengah yang menyalurkan beban peluncuran dari
       adaptor roket ke seluruh rangka. Berada di dalam bus, jadi hanya
       terlihat saat mode potongan dinyalakan atau lapisan bus dimatikan. */
    tubeX(m, -4.4, 4.4, 1.9, 14, MAT.tower, 'tower', true, true);

    /* Tangki propelan mengapit tabung tengah. */
    sphere(m,  1.6, 0,  2.5, 1.5, 12, 8, MAT.tank, 'tank');
    sphere(m,  1.6, 0, -2.5, 1.5, 12, 8, MAT.tank, 'tank');
    sphere(m, -1.8, 0,  2.5, 1.5, 12, 8, MAT.tank, 'tank');
    sphere(m, -1.8, 0, -2.5, 1.5, 12, 8, MAT.tank, 'tank');

    // Reflektor antena menghadap Bumi (+X)
    disc(m, 6.6,  2.6,  3.0, 3.2, 1.1, 18, MAT.dish, 'antenna');
    disc(m, 6.6, -2.6, -3.0, 3.2, 1.1, 18, MAT.dish, 'antenna');

    /* Subreflektor: cermin kecil di depan reflektor utama. Sinyal dari
       umpan dipantulkan ke sini lebih dulu, baru ke reflektor besar —
       susunan yang membuat perangkat umpannya bisa ditaruh dekat badan. */
    disc(m, 8.4,  2.6,  3.0, 1.15, 0.42, 14, MAT.osr, 'subdish');
    disc(m, 8.4, -2.6, -3.0, 1.15, 0.42, 14, MAT.osr, 'subdish');
    disc(m, 5.9,  0.0,  0.0, 1.7, 0.6, 14, MAT.dish, 'antenna');

    // Nosel apogee di sisi membelakangi Bumi
    nozzle(m, -4.6, 0, 0, 0.8, 1.5, 2.2, 14, 'thruster');

    /* Empat pendorong plasma stasioner pada sisi membelakangi Bumi.
       Daya dorongnya kecil tetapi jauh lebih hemat propelan daripada roket
       kimia — dipakai menaikkan orbit dan menjaga posisi bertahun-tahun. */
    [[2.6, 2.6], [2.6, -2.6], [-2.6, 2.6], [-2.6, -2.6]].forEach(function (q) {
      nozzle(m, -4.5, q[0], q[1], 0.34, 0.62, 1.0, 10, 'hall');
    });

    return m;
  }


  /* ---------- konstruksi tumpukan peluncuran ----------
     Sumbu x adalah sumbu memanjang, sama seperti orbiter, sehingga seluruh
     logika kamera dapat dipakai ulang. Satu satuan model kira-kira 0,95 m. */

  /* Silinder sepanjang sumbu x, dengan pilihan tutup di kedua ujung. */
  function tubeX(mesh, x0, x1, r, seg, color, group, capA, capB) {
    var a = [], b = [], i, t;
    for (i = 0; i < seg; i++) {
      t = (i / seg) * Math.PI * 2;
      a.push(mesh.addV(x0, Math.sin(t) * r, Math.cos(t) * r));
      b.push(mesh.addV(x1, Math.sin(t) * r, Math.cos(t) * r));
    }
    for (i = 0; i < seg; i++) {
      var j = (i + 1) % seg;
      mesh.addF([a[i], a[j], b[j], b[i]], color, group);
    }
    if (capA) for (i = 1; i < seg - 1; i++) mesh.addF([a[0], a[i], a[i + 1]], color, group);
    if (capB) for (i = 1; i < seg - 1; i++) mesh.addF([b[0], b[i + 1], b[i]], color, group);
    return { a: a, b: b };
  }

  /* Hidung membulat (ogive) yang menutup ujung sebuah silinder. */
  function ogiveX(mesh, xBase, len, r, seg, rings, color, group) {
    var prev = null, i, k, t;
    for (k = 0; k <= rings; k++) {
      var f = k / rings;
      var rr = r * Math.cos(f * Math.PI / 2);
      var xx = xBase + len * f;
      var ring = [];
      for (i = 0; i < seg; i++) {
        t = (i / seg) * Math.PI * 2;
        ring.push(mesh.addV(xx, Math.sin(t) * rr, Math.cos(t) * rr));
      }
      if (prev) {
        for (i = 0; i < seg; i++) {
          var j = (i + 1) % seg;
          mesh.addF([prev[i], prev[j], ring[j], ring[i]],
                    k === rings ? shadeHex(color, 0.9) : color, group);
        }
      }
      prev = ring;
    }
  }

  /* Batang penghubung antara orbiter, tangki, dan booster. */
  function strut(mesh, p0, p1, r, color, group) {
    var dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
    var len = Math.hypot(dx, dy, dz) || 1;
    var ux = dx / len, uy = dy / len, uz = dz / len;
    // dua vektor tegak lurus terhadap sumbu batang
    var ax = Math.abs(ux) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    var n1 = [uy * ax[2] - uz * ax[1], uz * ax[0] - ux * ax[2], ux * ax[1] - uy * ax[0]];
    var l1 = Math.hypot(n1[0], n1[1], n1[2]) || 1;
    n1 = [n1[0] / l1, n1[1] / l1, n1[2] / l1];
    var n2 = [uy * n1[2] - uz * n1[1], uz * n1[0] - ux * n1[2], ux * n1[1] - uy * n1[0]];
    var A = [], B = [], i;
    for (i = 0; i < 6; i++) {
      var t = (i / 6) * Math.PI * 2, c = Math.cos(t) * r, sn = Math.sin(t) * r;
      A.push(mesh.addV(p0[0] + n1[0] * c + n2[0] * sn,
                       p0[1] + n1[1] * c + n2[1] * sn,
                       p0[2] + n1[2] * c + n2[2] * sn));
      B.push(mesh.addV(p1[0] + n1[0] * c + n2[0] * sn,
                       p1[1] + n1[1] * c + n2[1] * sn,
                       p1[2] + n1[2] * c + n2[2] * sn));
    }
    for (i = 0; i < 6; i++) {
      var j = (i + 1) % 6;
      mesh.addF([A[i], A[j], B[j], B[i]], color, group);
    }
  }

  /* Menyalin sebuah mesh ke mesh tujuan dengan pergeseran dan label grup baru. */
  function mergeMesh(dst, src, dx, dy, dz, groupMap) {
    var base = dst.v.length, i;
    for (i = 0; i < src.v.length; i++) {
      dst.v.push([src.v[i][0] + dx, src.v[i][1] + dy, src.v[i][2] + dz]);
    }
    for (i = 0; i < src.f.length; i++) {
      var f = src.f[i];
      dst.f.push({
        v: f.v.map(function (n) { return n + base; }),
        c: f.c,
        g: groupMap ? (groupMap[f.g] || f.g) : f.g
      });
    }
  }


  /* ---------- CubeSat 1U ----------
     Satu satuan model setara satu sentimeter, jadi kubusnya benar-benar
     10 x 10 x 10. Sumbu x menghadap Bumi, mengikuti kesepakatan model lain
     di berkas ini. */

  /* Balok sederhana sepanjang sumbu x. */
  function balok(mesh, x0, x1, y0, y1, z0, z1, color, group) {
    boxLoft(mesh, [
      { x: x0, y0: y0, y1: y1, z0: z0, z1: z1 },
      { x: x1, y0: y0, y1: y1, z0: z0, z1: z1 }
    ], color, group);
  }

  /* Pelat tipis pada bidang yz, dipakai untuk papan dan panel. */
  function pelatYZ(mesh, x, tebal, y0, y1, z0, z1, color, group) {
    balok(mesh, x, x + tebal, y0, y1, z0, z1, color, group);
  }

  function buildCubeSat() {
    var m = new Mesh();
    var R = 5;            // setengah rusuk, jadi kubus 10 cm
    var t = 0.45;         // tebal rel sudut

    /* Empat rel sudut. Inilah bagian yang bersentuhan dengan dinding
       deployer saat satelit didorong keluar, dan standar CubeSat mengatur
       kehalusan serta kekerasan permukaannya. */
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q) {
      var y = q[0] * (R - t / 2), z = q[1] * (R - t / 2);
      balok(m, -R, R, y - t / 2, y + t / 2, z - t / 2, z + t / 2,
            MAT.rail, 'rangka');
    });

    /* Rusuk melintang di kedua ujung, mengikat keempat rel. */
    [-R + t / 2, R - t / 2].forEach(function (x) {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var y = d[0] * (R - t / 2), z = d[1] * (R - t / 2);
        if (d[0]) balok(m, x - t / 2, x + t / 2, y - t / 2, y + t / 2, -R + t, R - t, MAT.railDark, 'rangka');
        else      balok(m, x - t / 2, x + t / 2, -R + t, R - t, z - t / 2, z + t / 2, MAT.railDark, 'rangka');
      });
    });

    /* Panel surya badan pada empat sisi. Sel dibuat sedikit menonjol agar
       terbaca sebagai lapisan tersendiri, bukan sekadar warna. */
    [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) {
      var y = d[1] * R, z = d[0] * R;
      if (d[1]) balok(m, -R + 0.6, R - 0.6, y - 0.18, y + 0.18, -R + 0.6, R - 0.6, MAT.cellLit, 'panel');
      else      balok(m, -R + 0.6, R - 0.6, -R + 0.6, R - 0.6, z - 0.18, z + 0.18, MAT.cellLit, 'panel');
    });

    /* Sayap surya yang dibentangkan. Pada CubeSat 1U, sayap seperti ini
       yang membedakan daya beberapa watt dengan belasan watt. */
    [1, -1].forEach(function (s2) {
      var y = s2 * (R + 0.4);
      balok(m, -R + 0.6, R - 0.6, y - 0.16, y + 0.16, R, R + 10.5, MAT.cellLit, 'deploy');
      balok(m, -R + 0.6, R - 0.6, y - 0.16, y + 0.16, -R - 10.5, -R, MAT.cell, 'deploy');
      // engsel
      balok(m, -1.0, 1.0, y - 0.5, y + 0.5, R - 0.4, R + 0.5, MAT.railDark, 'deploy');
      balok(m, -1.0, 1.0, y - 0.5, y + 0.5, -R - 0.5, -R + 0.4, MAT.railDark, 'deploy');
    });

    /* Antena pita, digulung saat peluncuran lalu memanjang sendiri. */
    [1, -1].forEach(function (s3) {
      balok(m, -R - 0.3, -R, s3 * 1.2 - 0.14, s3 * 1.2 + 0.14, -0.5, 12.0, MAT.whip, 'antena');
    });

    /* Kamera menghadap Bumi. */
    tubeX(m, R - 0.2, R + 1.6, 0.85, 12, MAT.chip, 'muatan', false, false);
    disc(m, R + 1.62, 0, 0, 0.8, 0.1, 12, MAT.lens, 'muatan');

    /* Tumpukan papan di dalam rangka. Susunan bertingkat seperti ini khas
       CubeSat: setiap papan menangani satu fungsi dan dihubungkan lewat
       satu jajaran pin yang menembus seluruh tumpukan. */
    var papan = [-3.2, -1.4, 0.4, 2.2];
    papan.forEach(function (x, i) {
      pelatYZ(m, x, 0.22, -R + 1.0, R - 1.0, -R + 1.0, R - 1.0,
              i === 0 ? MAT.pcbEdge : MAT.pcb, 'papan');
      // beberapa komponen di atas papan
      balok(m, x + 0.22, x + 0.75, -1.6, 1.6, -1.2, 1.2, MAT.chip, 'papan');
      balok(m, x + 0.22, x + 0.55, 1.9, 3.2, -2.6, -1.0, MAT.chip, 'papan');
    });
    // jajaran pin penghubung antarpapan
    [[3.0, 3.0], [3.0, -3.0]].forEach(function (q) {
      balok(m, -3.4, 2.6, q[0] - 0.22, q[0] + 0.22, q[1] - 0.22, q[1] + 0.22,
            MAT.railDark, 'papan');
    });

    /* Paket baterai. */
    balok(m, -4.4, -3.5, -2.4, 2.4, -2.0, 2.0, MAT.batt, 'baterai');

    m.pivot = centerOf(m);
    return m;
  }

  /* ---------- FlatSat ----------
     FlatSat adalah tahap ketika seluruh subsistem dijajar terbuka di meja
     dan disambungkan persis seperti nanti di dalam satelit. Tujuannya
     menguji semuanya bekerja sama selagi setiap papan masih mudah dijangkau
     tangan dan alat ukur. */
  function buildFlatSat() {
    var m = new Mesh();

    /* Meja kerja dipecah menjadi petak-petak, bukan satu bidang utuh.

       Perender menyusun poligon menurut kedalaman titik tengahnya. Satu
       bidang selebar meja hanya punya satu titik tengah, sehingga papan
       yang berada lebih jauh dari titik itu ikut tertimpa meja dan hilang
       dari pandangan. Dengan dipecah, tiap petak punya kedalamannya
       sendiri dan urutannya kembali benar. */
    var NX = 8, NZ = 6;
    for (var ix = 0; ix < NX; ix++) {
      for (var iz = 0; iz < NZ; iz++) {
        var x0 = -20 + 40 * ix / NX, x1 = -20 + 40 * (ix + 1) / NX;
        var z0 = -14 + 28 * iz / NZ, z1 = -14 + 28 * (iz + 1) / NZ;
        balok(m, x0, x1, -0.8, 0, z0, z1, MAT.bench, 'meja');
        balok(m, x0, x1, -1.4, -0.8, z0, z1, MAT.chip, 'meja');
      }
    }

    /* Enam papan dijajar dua baris. Pada satelit jadi, papan-papan ini
       bertumpuk di dalam kubus 10 cm; di meja, semuanya terbuka. */
    var tata = [
      { x: -15.5, z: -7.0, w: 7.0, d: 5.4, nama: 'obc' },
      { x:  -6.5, z: -7.0, w: 7.0, d: 5.4, nama: 'eps' },
      { x:   2.5, z: -7.0, w: 7.0, d: 5.4, nama: 'radio' },
      { x: -15.5, z:  2.0, w: 7.0, d: 5.4, nama: 'sensor' },
      { x:  -6.5, z:  2.0, w: 7.0, d: 5.4, nama: 'baterai' },
      { x:   2.5, z:  2.0, w: 7.0, d: 5.4, nama: 'muatan' }
    ];
    tata.forEach(function (b) {
      balok(m, b.x, b.x + b.w, 0, 0.24, b.z, b.z + b.d, MAT.pcb, 'papan');
      // komponen menonjol di atas papan
      balok(m, b.x + 1.2, b.x + 3.4, 0.24, 0.9, b.z + 1.2, b.z + 3.2, MAT.chip, 'papan');
      balok(m, b.x + 4.2, b.x + 6.0, 0.24, 0.6, b.z + 0.8, b.z + 2.0, MAT.chip, 'papan');
      // penopang papan agar tidak menyentuh meja langsung
      [[0.7, 0.7], [b.w - 0.7, 0.7], [0.7, b.d - 0.7], [b.w - 0.7, b.d - 0.7]]
        .forEach(function (k) {
          balok(m, b.x + k[0] - 0.2, b.x + k[0] + 0.2, -0.5, 0,
                b.z + k[1] - 0.2, b.z + k[1] + 0.2, MAT.railDark, 'papan');
        });
    });

    /* Kabel penghubung antarpapan — bagian yang justru paling banyak
       memakan waktu saat integrasi sebenarnya. */
    var kabel = [
      [-8.5, -4.3, -6.5, -4.3], [ 0.5, -4.3,  2.5, -4.3],
      [-8.5,  4.7, -6.5,  4.7], [ 0.5,  4.7,  2.5,  4.7],
      [-12.0, -1.6, -12.0,  2.0], [-3.0, -1.6, -3.0,  2.0],
      [ 6.0, -1.6,  6.0,  2.0]
    ];
    kabel.forEach(function (k) {
      var x0 = Math.min(k[0], k[2]), x1 = Math.max(k[0], k[2]);
      var z0 = Math.min(k[1], k[3]), z1 = Math.max(k[1], k[3]);
      balok(m, x0 - 0.14, x1 + 0.14, 0.05, 0.25, z0 - 0.14, z1 + 0.14,
            MAT.kabel, 'kabel');
    });

    /* Catu daya bangku dan komputer penguji di tepi meja. */
    balok(m, 11.5, 18.5, 0, 3.6, -8.0, -2.5, MAT.batt, 'ujistand');
    balok(m, 11.8, 18.2, 3.6, 3.8, -7.7, -2.8, MAT.chip, 'ujistand');
    balok(m, 11.5, 18.5, 0, 0.3, 1.5, 8.0, MAT.railDark, 'ujistand');
    balok(m, 11.5, 12.0, 0.3, 5.4, 1.5, 8.0, MAT.chip, 'ujistand');

    m.pivot = centerOf(m);
    return m;
  }

  function buildStack() {
    var m = new Mesh();

    /* --- External Tank: LH2 di belakang, intertank, LOX di depan ---
       Panjang asli 46,9 m dan diameter 8,4 m; di sini 49,4 x 8,8 satuan. */
    var etR = 4.4;
    tubeX(m, -26.0, -2.0, etR, 22, MAT.foam, 'etLH2', true, false);   // tangki hidrogen
    tubeX(m, -2.0, 3.6, etR, 22, MAT.foamDark, 'etInter', false, false); // intertank
    tubeX(m, 3.6, 15.4, etR, 22, MAT.foam, 'etLOX', false, false);    // tangki oksigen
    ogiveX(m, 15.4, 8.0, etR, 22, 5, MAT.foam, 'etLOX');              // hidung ogive

    /* --- dua Solid Rocket Booster ---
       Panjang asli 45,46 m dan diameter 3,71 m; di sini 47,9 x 3,9 satuan. */
    var srbR = 1.95, srbZ = etR + srbR + 0.5;
    [-1, 1].forEach(function (sgn) {
      var z = sgn * srbZ;
      var save = m.addV;
      // silinder utama digambar di z = 0 lalu digeser lewat pembungkus
      var ring = tubeX(m, -28.5, 12.0, srbR, 16, MAT.srb, 'srb', false, false);
      ring.a.concat(ring.b).forEach(function (idx) { m.v[idx][2] += z; });
      // empat pita sambungan segmen
      [-20.0, -10.5, -1.0, 7.5].forEach(function (bx) {
        var r2 = tubeX(m, bx, bx + 0.7, srbR + 0.09, 16, MAT.srbBand, 'srb', false, false);
        r2.a.concat(r2.b).forEach(function (idx) { m.v[idx][2] += z; });
      });
      // hidung kerucut berisi parasut pemulihan
      var noseBase = m.v.length;
      ogiveX(m, 12.0, 4.2, srbR, 16, 4, MAT.srb, 'srb');
      for (var q = noseBase; q < m.v.length; q++) m.v[q][2] += z;
      // nosel di ujung belakang
      var nz = m.v.length;
      nozzle(m, -28.5, 0, 0, srbR * 0.62, srbR * 0.88, 3.4, 14, 'srbNozzle');
      for (var w = nz; w < m.v.length; w++) m.v[w][2] += z;
      // batang penopang ke tangki
      strut(m, [6.0, 0, sgn * (etR + 0.2)], [6.0, 0, z - sgn * srbR], 0.32, MAT.strut, 'strut');
      strut(m, [-22.0, 0, sgn * (etR + 0.2)], [-22.0, 0, z - sgn * srbR], 0.32, MAT.strut, 'strut');
    });

    /* --- orbiter, dipasang di sisi atas tangki --- */
    var orb = buildModel('discovery');
    mergeMesh(m, orb, -3.0, etR + 2.7, 0, {
      body: 'orb', door: 'orb', doorOpen: 'orb', bayIn: 'orb', wing: 'orb',
      fin: 'orb', flap: 'orb', canopy: 'orb', pod: 'orb', engine: 'orbEngine'
    });

    /* --- batang penghubung orbiter ke tangki --- */
    strut(m, [6.0, etR, 0], [6.0, etR + 1.8, 0], 0.42, MAT.strut, 'strut');
    strut(m, [-19.0, etR, 2.2], [-19.0, etR + 2.2, 1.6], 0.42, MAT.strut, 'strut');
    strut(m, [-19.0, etR, -2.2], [-19.0, etR + 2.2, -1.6], 0.42, MAT.strut, 'strut');

    m.pivot = centerOf(m);
    return m;
  }

  function centerOf(mesh) {
    var lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (var i = 0; i < mesh.v.length; i++) {
      for (var k = 0; k < 3; k++) {
        if (mesh.v[i][k] < lo[k]) lo[k] = mesh.v[i][k];
        if (mesh.v[i][k] > hi[k]) hi[k] = mesh.v[i][k];
      }
    }
    return [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  }

  /* ---------- konstruksi model ---------- */
  function buildModel(variant) {
    if (variant === 'stack') return buildStack();
    if (variant === 'cubesat') return buildCubeSat();
    if (variant === 'flatsat') return buildFlatSat();
    if (variant === 'satria') { var sat = buildSatellite(); sat.pivot = centerOf(sat); return sat; }
    var m = new Mesh();
    var isBuran = variant === 'buran';

    var rings = [
      { x:  18.6, w: 0.25, h: 0.25, cy: 0.15 },
      { x:  17.4, w: 1.05, h: 1.05, cy: 0.20 },
      { x:  15.6, w: 2.10, h: 1.95, cy: 0.25 },
      { x:  13.0, w: 3.05, h: 2.55, cy: 0.20 },
      { x:   9.5, w: 3.60, h: 2.80, cy: 0.10 },
      { x:   4.0, w: 3.80, h: 2.85, cy: 0.00 },
      { x:  -4.0, w: 3.80, h: 2.85, cy: 0.00 },
      { x: -10.0, w: 3.75, h: 2.90, cy: 0.05 },
      { x: -14.0, w: 3.55, h: 3.05, cy: 0.30 },
      { x: -17.0, w: 3.20, h: 3.10, cy: 0.55 },
      { x: -18.8, w: 2.85, h: 2.95, cy: 0.65 }
    ];
    loftFuselage(m, rings, { bayFrom: -11.5, bayTo: 11.0 });

    /* --- ruang muatan (terlihat saat pintu dibuka) --- */
    var bx0 = -11.5, bx1 = 11.0, bz = 3.15, byFloor = -0.4, byTop = 2.55;
    m.addF([m.addV(bx0, byFloor, -bz), m.addV(bx1, byFloor, -bz),
            m.addV(bx1, byFloor, bz), m.addV(bx0, byFloor, bz)], MAT.bayFloor, 'bayIn');
    m.addF([m.addV(bx0, byFloor, -bz), m.addV(bx0, byTop, -bz),
            m.addV(bx1, byTop, -bz), m.addV(bx1, byFloor, -bz)], MAT.bay, 'bayIn');
    m.addF([m.addV(bx0, byFloor, bz), m.addV(bx1, byFloor, bz),
            m.addV(bx1, byTop, bz), m.addV(bx0, byTop, bz)], MAT.bay, 'bayIn');
    m.addF([m.addV(bx0, byFloor, -bz), m.addV(bx0, byFloor, bz),
            m.addV(bx0, byTop, bz), m.addV(bx0, byTop, -bz)], MAT.bay, 'bayIn');
    m.addF([m.addV(bx1, byFloor, -bz), m.addV(bx1, byTop, -bz),
            m.addV(bx1, byTop, bz), m.addV(bx1, byFloor, bz)], MAT.bay, 'bayIn');

    /* --- daun pintu payload bay, terbuka ke samping-atas --- */
    var ang = 1.92; // rad
    [1, -1].forEach(function (s) {
      var hz = 3.45 * s, hy = 2.35, wdt = 3.5;
      var ez = hz + Math.cos(ang) * wdt * s, ey = hy + Math.sin(ang) * wdt;
      var a1 = m.addV(bx0, hy, hz), a2 = m.addV(bx1, hy, hz);
      var b1 = m.addV(bx0, ey, ez), b2 = m.addV(bx1, ey, ez);
      m.addF([a1, a2, b2, b1], MAT.hullWarm, 'doorOpen');
      var c1 = m.addV(bx0, hy - 0.12, hz), c2 = m.addV(bx1, hy - 0.12, hz);
      var d1 = m.addV(bx0, ey - 0.12, ez), d2 = m.addV(bx1, ey - 0.12, ez);
      m.addF([c1, d1, d2, c2], MAT.radiator, 'doorOpen');
    });

    /* --- sayap delta ganda --- */
    [1, -1].forEach(function (s) {
      var pl = [
        [ 8.5, -1.55, 3.55 * s],
        [ 0.5, -1.70, 6.30 * s],
        [-8.5, -1.85, 11.80 * s],
        [-13.6, -1.85, 11.80 * s],
        [-16.6, -1.80, 7.60 * s],
        [-16.6, -1.60, 3.55 * s]
      ];
      plate(m, pl, function (p) {
        var f = 1 - Math.min(1, Math.abs(p[2]) / 12);
        return 0.16 + 0.52 * f;
      }, 'y', MAT.hull, MAT.tps, MAT.tps, 'wing');

      // tepi depan RCC
      var le = [
        [ 8.5, -1.45, 3.55 * s], [ 0.5, -1.62, 6.30 * s],
        [-8.5, -1.80, 11.80 * s], [-8.9, -1.80, 11.40 * s],
        [ 0.2, -1.62, 6.05 * s], [ 8.2, -1.45, 3.45 * s]
      ];
      plate(m, le, function () { return 0.30; }, 'y', MAT.rcc, MAT.rcc, MAT.rcc, 'wing');

      // elevon
      var el = [
        [-14.9, -1.84, 11.75 * s], [-16.6, -1.80, 7.90 * s],
        [-16.6, -1.72, 4.60 * s], [-15.4, -1.76, 4.60 * s],
        [-15.4, -1.82, 7.90 * s], [-13.9, -1.84, 11.75 * s]
      ];
      plate(m, el, function () { return 0.22; }, 'y', MAT.hullWarm, MAT.tps, MAT.tps, 'wing');
    });

    /* --- sirip vertikal --- */
    var fin = [
      [-11.6, 2.60, 0], [-16.2, 10.60, 0],
      [-18.5, 10.60, 0], [-18.9, 2.90, 0]
    ];
    plate(m, fin, function (p) {
      var f = 1 - Math.min(1, (p[1] - 2.6) / 8);
      return 0.14 + 0.30 * f;
    }, 'z', MAT.hull, MAT.hull, MAT.hull, 'fin');
    plate(m, [
      [-11.6, 2.60, 0], [-16.2, 10.60, 0], [-16.7, 10.60, 0], [-12.4, 2.60, 0]
    ], function () { return 0.22; }, 'z', MAT.rcc, MAT.rcc, MAT.rcc, 'fin');

    /* --- body flap --- */
    boxLoft(m, [
      { x: -18.3, y0: -1.95, y1: -1.35, z0: -2.6, z1: 2.6 },
      { x: -20.4, y0: -1.90, y1: -1.40, z0: -2.4, z1: 2.4 }
    ], MAT.tps, 'flap');

    /* --- kanopi --- */
    boxLoft(m, [
      { x: 15.2, y0: 1.55, y1: 1.95, z0: -1.25, z1: 1.25 },
      { x: 13.4, y0: 1.90, y1: 2.55, z0: -1.75, z1: 1.75 },
      { x: 11.6, y0: 2.10, y1: 2.60, z0: -1.85, z1: 1.85 }
    ], MAT.glass, 'canopy');

    if (isBuran) {
      /* Buran: mesin utama ada di roket Energia. Bagian belakang hanya
         membawa dua mesin manuver orbit yang jauh lebih kecil. */
      boxLoft(m, [
        { x: -15.4, y0: 2.35, y1: 5.00, z0: -3.30, z1: -1.15 },
        { x: -19.0, y0: 2.35, y1: 4.60, z0: -3.00, z1: -1.15 }
      ], MAT.pod, 'pod');
      boxLoft(m, [
        { x: -15.4, y0: 2.35, y1: 5.00, z0: 1.15, z1: 3.30 },
        { x: -19.0, y0: 2.35, y1: 4.60, z0: 1.15, z1: 3.00 }
      ], MAT.pod, 'pod');
      nozzle(m, -19.0, 3.30, -2.05, 0.70, 0.92, 1.5, 12, 'engine');
      nozzle(m, -19.0, 3.30,  2.05, 0.70, 0.92, 1.5, 12, 'engine');
      // pita merah pengenal
      [1, -1].forEach(function (s) {
        m.addF([
          m.addV(12.4, -0.30, 3.62 * s), m.addV(9.4, -0.30, 3.82 * s),
          m.addV(9.4,  0.55, 3.82 * s), m.addV(12.4, 0.55, 3.62 * s)
        ], MAT.red, 'mark');
      });
    } else {
      /* Discovery: tiga SSME + dua OMS pod */
      boxLoft(m, [
        { x: -13.8, y0: 2.55, y1: 5.30, z0: -3.35, z1: -1.05 },
        { x: -19.2, y0: 2.45, y1: 4.75, z0: -3.05, z1: -1.05 }
      ], MAT.pod, 'pod');
      boxLoft(m, [
        { x: -13.8, y0: 2.55, y1: 5.30, z0: 1.05, z1: 3.35 },
        { x: -19.2, y0: 2.45, y1: 4.75, z0: 1.05, z1: 3.05 }
      ], MAT.pod, 'pod');
      nozzle(m, -18.6, 3.15, 0.00, 0.95, 1.35, 2.9, 14, 'engine');
      nozzle(m, -18.6, 1.05, -1.85, 0.95, 1.35, 2.9, 14, 'engine');
      nozzle(m, -18.6, 1.05,  1.85, 0.95, 1.35, 2.9, 14, 'engine');
    }

    m.pivot = centerOf(m);
    return m;
  }

  /* ---------- titik penanda (hotspot) ---------- */

  /* ---------- lapisan komponen yang dapat dinyalakan / dimatikan ---------- */
  var SHUTTLE_LAYERS = [
    { id: 'body',   label: 'Badan',            groups: ['body'],
      note: 'Struktur utama orbiter, dari hidung sampai pangkal mesin.' },
    { id: 'bay',    label: 'Ruang muatan',     groups: ['door', 'doorOpen', 'bayIn'],
      note: 'Pintu payload bay beserta ruang di dalamnya.' },
    { id: 'wing',   label: 'Sayap',            groups: ['wing', 'flap'],
      note: 'Sayap delta ganda beserta elevon di tepi belakang.' },
    { id: 'fin',    label: 'Sirip vertikal',   groups: ['fin'],
      note: 'Sirip ekor dengan rudder yang juga berfungsi sebagai rem udara.' },
    { id: 'canopy', label: 'Kanopi',           groups: ['canopy'],
      note: 'Jendela dek penerbangan di bagian atas kabin kru.' },
    { id: 'pod',    label: 'OMS pod',          groups: ['pod'],
      note: 'Dua polong mesin manuver orbit di kiri dan kanan sirip.' },
    { id: 'engine', label: 'Mesin',            groups: ['engine', 'mark'],
      note: 'Kelompok nosel dan struktur pemasangan mesin di buritan.' }
  ];

  var STACK_LAYERS = [
    { id: 'orbiter', label: 'Orbiter', groups: ['orb', 'orbEngine'],
      note: 'Discovery sendiri — satu-satunya bagian berawak dalam tumpukan.' },
    { id: 'et', label: 'External Tank', groups: ['etLH2', 'etInter', 'etLOX'],
      note: 'Tangki hidrogen dan oksigen cair, satu-satunya komponen yang tidak dipakai ulang.' },
    { id: 'srb', label: 'Solid Rocket Booster', groups: ['srb', 'srbNozzle'],
      note: 'Dua roket padat yang memberi sebagian besar daya dorong saat lepas landas.' },
    { id: 'strut', label: 'Penopang', groups: ['strut'],
      note: 'Batang struktural yang mengikat orbiter dan booster ke tangki.' }
  ];

  var LAYERS = {
    cubesat: [
      { id: 'rangka',  label: 'Rangka dan rel', groups: ['rangka'],
        note: 'Rangka aluminium dan empat rel sudut yang bersentuhan dengan dinding deployer.' },
      { id: 'panel',   label: 'Panel badan',    groups: ['panel'],
        note: 'Sel surya yang menempel langsung pada keempat sisi kubus.' },
      { id: 'deploy',  label: 'Sayap surya',    groups: ['deploy'],
        note: 'Sayap tambahan yang dibentangkan setelah keluar dari deployer.' },
      { id: 'antena',  label: 'Antena',         groups: ['antena'],
        note: 'Antena pita yang digulung saat peluncuran lalu memanjang sendiri.' },
      { id: 'papan',   label: 'Tumpukan papan', groups: ['papan'],
        note: 'Papan elektronik bertingkat di dalam rangka. Matikan lapisan lain untuk melihatnya.' },
      { id: 'baterai', label: 'Baterai',        groups: ['baterai'],
        note: 'Paket baterai, penopang daya saat satelit berada di sisi malam Bumi.' },
      { id: 'muatan',  label: 'Muatan',         groups: ['muatan'],
        note: 'Kamera menghadap Bumi — alasan satelit ini diterbangkan.' }
    ],
    flatsat: [
      { id: 'meja',     label: 'Meja kerja',   groups: ['meja'],
        note: 'Bangku tempat seluruh subsistem dijajar terbuka.' },
      { id: 'papan',    label: 'Papan subsistem', groups: ['papan'],
        note: 'Enam papan yang nanti bertumpuk di dalam kubus 10 sentimeter.' },
      { id: 'kabel',    label: 'Kabel penghubung', groups: ['kabel'],
        note: 'Sambungan antarpapan — bagian yang paling banyak memakan waktu saat integrasi.' },
      { id: 'ujistand', label: 'Perangkat uji', groups: ['ujistand'],
        note: 'Catu daya bangku dan komputer pemantau.' }
    ],
    stack: STACK_LAYERS,
    discovery: SHUTTLE_LAYERS,
    buran: SHUTTLE_LAYERS,
    satria: [
      { id: 'bus',      label: 'Bus',          groups: ['bus'],
        note: 'Dinding luar rangka utama, tempat sebagian besar perangkat dipasang.' },
      { id: 'osr',      label: 'Radiator OSR', groups: ['osr'],
        note: 'Pelat pemantul surya optis pada sisi utara dan selatan, jalan keluar panas satelit.' },
      { id: 'tank',     label: 'Pipa propelan', groups: ['tank'],
        note: 'Pipa sistem propelan di dalam bus. Tangkinya sendiri tidak terekam pindaian.' },
      { id: 'solar',    label: 'Panel surya',  groups: ['solar', 'boom'],
        note: 'Sayap surya beserta batang penopangnya.' },
      { id: 'antenna',  label: 'Antena',       groups: ['antenna', 'subdish'],
        note: 'Reflektor utama, subreflektor, dan perangkat umpannya.' },
      { id: 'thruster', label: 'Pendorong',    groups: ['thruster', 'hall'],
        note: 'Nosel apogee dan empat pendorong plasma stasioner.' }
    ]
  };

  function layerIndex(variant) {
    var out = {}, defs = LAYERS[variant] || [];
    for (var i = 0; i < defs.length; i++) {
      for (var j = 0; j < defs[i].groups.length; j++) out[defs[i].groups[j]] = defs[i].id;
    }
    return out;
  }


  /* ---------- tur berpandu: setiap langkah menyetel kamera dan sorotan ---------- */
  var TOURS = {
    cubesat: [
      { title: 'Sebuah kubus sepuluh sentimeter',
        text: 'CubeSat bukan jenis satelit, melainkan sebuah standar ukuran. Satu unit — 1U — adalah kubus bersisi sepuluh sentimeter dengan massa paling banyak sekitar 1,33 kilogram. Standar itu membuat satelit kecil bisa memakai wadah peluncur yang sama, dan justru keseragaman itulah yang menurunkan biayanya sampai terjangkau sekolah.',
        yaw: -0.75, pitch: 0.30, dist: 36 },
      { title: 'Rangka dan rel',
        text: 'Empat rel di sudut kubus bersentuhan dengan dinding deployer. Standar mengatur kehalusan dan kekerasan permukaannya, karena rel yang tergores dapat membuat satelit tersangkut dan gagal keluar — kegagalan yang tidak bisa diperbaiki dari darat.',
        yaw: -0.45, pitch: 0.20, dist: 26, layer: 'rangka' },
      { title: 'Masalah daya',
        text: 'Seluruh permukaan 1U hanya sekitar enam ratus sentimeter persegi, dan tidak semuanya menghadap Matahari sekaligus. Karena itu sayap surya yang dibentangkan menjadi penentu: perbedaannya bukan sedikit, melainkan antara beberapa watt dan belasan watt.',
        yaw: 0.0001, pitch: 1.10, dist: 40, layer: 'deploy' },
      { title: 'Antena yang memanjang sendiri',
        text: 'Antena berupa pita logam yang digulung rapat saat peluncuran. Begitu penahannya dilepas, pita itu memanjang sendiri seperti meteran gulung. Tidak ada motor, tidak ada engsel — dan justru kesederhanaan itu yang membuatnya jarang gagal.',
        yaw: -2.30, pitch: 0.24, dist: 32, layer: 'antena' },
      { title: 'Melihat ke dalam',
        text: 'Rangka dan panel dibuka. Di dalamnya papan-papan bertumpuk, dihubungkan satu jajaran pin yang menembus seluruh tumpukan. Tiap papan menangani satu fungsi, dan susunan ini memungkinkan papan diganti tanpa merombak yang lain.',
        yaw: -0.85, pitch: 0.35, dist: 28, section: true, layer: 'papan' },
      { title: 'Muatan',
        text: 'Semua yang lain ada untuk melayani bagian ini. Pada IRVINE01, muatannya kamera beresolusi rendah untuk memotret Venus dan bintang terang — sederhana, tetapi cukup untuk menghitung jarak sekaligus mengukur ketepatan arah hadap satelit.',
        yaw: 1.25, pitch: 0.10, dist: 24, layer: 'muatan' }
    ],
    flatsat: [
      { title: 'Apa itu FlatSat',
        text: 'Sebelum satelit dirakit ke dalam rangkanya, seluruh subsistem dijajar terbuka di meja dan disambungkan persis seperti nanti di dalam satelit. Tahap ini disebut FlatSat. Perangkatnya bukan maket — sama dengan yang akan diterbangkan, hanya belum dikemas.',
        yaw: -0.60, pitch: 0.55, dist: 58 },
      { title: 'Mengapa dibuka',
        text: 'Di dalam kubus sepuluh sentimeter, mengukur tegangan pada satu papan berarti membongkar seluruh tumpukan. Di meja, setiap titik dapat dijangkau alat ukur tanpa membongkar apa pun. Kesalahan ditemukan selagi memperbaikinya masih semudah mencabut satu kabel.',
        yaw: -0.35, pitch: 0.70, dist: 46, layer: 'papan' },
      { title: 'Kabel penghubung',
        text: 'Sambungan antarpapan justru bagian yang paling banyak memakan waktu saat integrasi sebenarnya. Menemukan satu kabel yang tertukar di meja jauh lebih murah daripada menemukannya setelah satelit tersegel.',
        yaw: -0.10, pitch: 0.80, dist: 44, layer: 'kabel' },
      { title: 'Perangkat uji',
        text: 'Catu daya bangku menggantikan baterai dan panel surya, sehingga tegangan dapat diatur dan arus tiap subsistem dapat diukur. Komputer di sampingnya menerima telemetri dan menampilkannya sebagai grafik langsung.',
        yaw: 0.55, pitch: 0.50, dist: 42, layer: 'ujistand' },
      { title: 'Dari meja ke rangka',
        text: 'Setelah setiap subsistem terbukti bekerja bersama, papan-papan itu dilepas dari meja dan ditumpuk ke dalam rangka. Tidak ada yang berubah selain susunannya — dan itulah sebabnya tahap FlatSat dianggap sudah membuktikan sebagian besar risikonya.',
        yaw: -0.75, pitch: 0.45, dist: 62 }
    ],
    stack: [
      { title: 'Tumpukan peluncuran',
        text: 'Yang lepas landas bukan hanya orbiter. Discovery adalah satu dari empat bagian: orbiter itu sendiri, External Tank berwarna oranye, dan dua Solid Rocket Booster di kiri dan kanan. Tinggi seluruhnya sekitar 56 meter.',
        yaw: -0.75, pitch: 0.30, dist: 92 },
      { title: 'External Tank',
        text: 'Tangki sepanjang 46,9 meter ini adalah tulang punggung struktural yang mengikat orbiter dan kedua booster. Warna oranyenya berasal dari busa isolasi setebal sekitar 2,5 cm, yang menjaga suhu propelan dan mencegah pembentukan es.',
        yaw: -0.45, pitch: 0.16, dist: 78, layer: 'et' },
      { title: 'Dua tangki dalam satu',
        text: 'Bagian depan berisi oksigen cair pada -182 derajat, bagian belakang hidrogen cair pada -253 derajat. Di antara keduanya terdapat intertank, tempat beban dari booster diteruskan ke struktur.',
        yaw: 0.0001, pitch: 0.06, dist: 74, layer: 'et' },
      { title: 'Solid Rocket Booster',
        text: 'Setiap booster panjangnya 45,46 meter dan menghasilkan daya dorong sekitar 14.679 kN. Propelannya padat, campuran amonium perklorat dan aluminium — sekali menyala, tidak bisa dimatikan.',
        yaw: -1.20, pitch: 0.22, dist: 76, layer: 'srb' },
      { title: 'Booster dipulihkan',
        text: 'Setelah membakar propelan selama sekitar 123 detik, booster dilepas pada ketinggian 45,7 km, jatuh ke Samudra Atlantik dengan parasut, lalu ditarik kembali ke darat untuk dipakai lagi.',
        yaw: -2.40, pitch: 0.18, dist: 66, layer: 'srb' },
      { title: 'Orbiter di sisi tangki',
        text: 'Berbeda dari roket Apollo yang menempatkan kapsul di puncak, orbiter dipasang menyamping. Posisi ini memungkinkan ruang muatan yang besar, tetapi juga membuat serpihan busa dari tangki dapat mengenai pelindung panas — penyebab hilangnya Columbia pada 2003.',
        yaw: -0.90, pitch: 0.45, dist: 70, layer: 'orbiter' },
      { title: 'Yang kembali dan yang tidak',
        text: 'Booster dipungut dari laut dan dipakai ulang. Orbiter mendarat sebagai pesawat layang. Hanya External Tank yang tidak pernah kembali — dilepas menjelang orbit lalu hancur di atmosfer.',
        yaw: -1.80, pitch: 0.30, dist: 92 }
    ],
    discovery: [
      { title: 'Bentuk keseluruhan',
        text: 'Discovery memiliki panjang sekitar 37 meter dengan bentang sayap sekitar 24 meter. Bentuknya adalah kompromi: harus bertahan sebagai kapsul saat reentry, lalu berubah peran menjadi pesawat layang saat mendarat.',
        yaw: -0.75, pitch: 0.30, dist: 64 },
      { title: 'Hidung dan kabin kru',
        text: 'Di bagian depan terdapat kabin bertekanan tiga dek. Kerucut hidungnya berlapis karbon, bagian yang menerima panas tertinggi bersama tepi depan sayap.',
        yaw: -0.45, pitch: 0.22, dist: 40, layer: 'body' },
      { title: 'Ruang muatan',
        text: 'Pintu payload bay dibuka. Ruang sepanjang sekitar 18 meter inilah alasan orbiter dibuat sebesar ini — cukup untuk satelit besar, laboratorium Spacelab, dan modul Stasiun Luar Angkasa Internasional.',
        yaw: -0.85, pitch: 0.62, dist: 52, doors: true, layer: 'bay' },
      { title: 'Melihat ke dalam',
        text: 'Badan dibelah membujur. Dari sini terlihat bahwa sebagian besar volume orbiter memang ruang muatan, bukan mesin atau bahan bakar.',
        yaw: -0.95, pitch: 0.34, dist: 50, doors: true, section: true, layer: 'bay' },
      { title: 'Sayap delta ganda',
        text: 'Sudut sapuan sayap berubah di tengah: bagian dalam curam agar stabil pada kecepatan hipersonik, bagian luar lebih landai agar tetap terkendali saat mendarat pada kecepatan rendah.',
        yaw: 0.0001, pitch: 1.20, dist: 58, layer: 'wing' },
      { title: 'Perlindungan panas',
        text: 'Permukaan bawah gelap oleh ubin silika. Bagian inilah yang menghadap ke depan saat kembali ke atmosfer, menahan suhu yang dapat melampaui 1.500 derajat Celsius.',
        yaw: -2.30, pitch: -0.55, dist: 60, layer: 'wing' },
      { title: 'Buritan',
        text: 'Tiga Space Shuttle Main Engine, dua polong OMS di kiri dan kanan sirip, serta body flap di bawah nosel. Mesin utama menyala hanya saat menuju orbit, mengambil bahan bakar dari External Tank.',
        yaw: -2.60, pitch: 0.25, dist: 44, layer: 'engine' },
      { title: 'Sirip vertikal',
        text: 'Rudder di tepi belakang sirip terbelah menjadi dua bilah yang dapat membuka seperti gunting — berfungsi sebagai speed brake untuk mengatur laju turun saat pendekatan.',
        yaw: -1.60, pitch: 0.10, dist: 42, layer: 'fin' },

      /* Bab pendaratan: menelusuri bagian-bagian yang membuat orbiter
         sanggup mendarat sebagai pesawat layang, satu per satu. */
      { title: 'Pendaratan: dari wahana antariksa ke pesawat',
        text: 'Kapsul Apollo pulang dengan cara jatuh — turun di bawah parasut lalu tercebur ke laut, dan kapal harus menjemputnya. Orbiter pulang dengan cara terbang. Ia harus mendarat di landasan seperti pesawat, tetapi tanpa mesin sama sekali: hanya satu kesempatan, tanpa kemungkinan berputar dan mencoba lagi. Bagian-bagian berikut yang memungkinkannya.',
        yaw: -0.75, pitch: 0.30, dist: 66 },
      { title: 'Pendaratan: sayap delta',
        text: 'NASA memilih sayap delta, bukan sayap lurus. Sayap lurus lebih kuat secara struktur dan lebih efisien pada kecepatan rendah, tetapi sayap delta jauh lebih lincah. Karena orbiter harus turun tajam tanpa tenaga mesin dan tetap dapat dikendalikan, kelincahan itulah yang diutamakan — meski permukaannya yang lebih luas berarti lebih banyak bidang yang harus dilindungi dari panas reentry.',
        yaw: 0.0001, pitch: 1.15, dist: 58, layer: 'wing' },
      { title: 'Pendaratan: elevon',
        text: 'Di tepi belakang kedua sayap terdapat elevon. Pada pesawat biasa, tugas mengatur guling dipegang aileron dan tugas mengatur angguk dipegang elevator. Orbiter tidak punya elevator, jadi elevon mengerjakan keduanya: bergerak berlawanan untuk memiringkan, bergerak bersamaan untuk menaikkan atau menurunkan hidung.',
        yaw: -1.05, pitch: 0.45, dist: 46, layer: 'wing' },
      { title: 'Pendaratan: body flap',
        text: 'Panel besar di bawah nosel mesin ini juga bertugas ganda. Ia bekerja seperti penstabil mendatar pada pesawat, menjaga sikap wahana tetap datar. Ukurannya yang besar sekaligus menaungi ketiga mesin utama dari panas saat orbiter menembus atmosfer.',
        yaw: -2.35, pitch: -0.10, dist: 44, layer: 'body' },
      { title: 'Pendaratan: pintu parasut',
        text: 'Begitu roda menyentuh landasan, pintu di pangkal sirip vertikal terbuka dan melepaskan parasut. Parasut itu menahan laju wahana selama meluncur, memperpendek jarak yang dibutuhkan sampai berhenti. Fitur ini baru ditambahkan pada masa pertengahan program.',
        yaw: -2.05, pitch: 0.28, dist: 40, layer: 'fin' },
      { title: 'Pendaratan: sirip vertikal',
        text: 'Sirip ekor menjaga orbiter tetap searah dengan arah geraknya. Rudder di tepi belakangnya terbelah menjadi dua bilah yang dapat dibuka seperti gunting menjadi rem udara — dipakai untuk mengatur laju turun saat pendekatan dan memperlambat wahana setelah menyentuh landasan.',
        yaw: -1.55, pitch: 0.12, dist: 44, layer: 'fin' },
      { title: 'Pendaratan: roda pendarat',
        text: 'Seperti pesawat, orbiter membawa roda yang dapat dilipat masuk. Roda disimpan di dalam badan selama peluncuran dan reentry, agar permukaan luarnya tetap rata — lebih baik secara aerodinamika dan lebih aman terhadap panas. Roda baru diturunkan beberapa saat sebelum menyentuh landasan.',
        yaw: 0.85, pitch: -0.18, dist: 34, layer: 'body' }
    ],
    buran: [
      { title: 'Bentuk keseluruhan',
        text: 'Siluet Buran sangat mirip Space Shuttle. Kemiripan ini bukan kebetulan: keduanya menghadapi persoalan aerodinamika dan reentry yang sama, dan Soviet mempelajari data Amerika yang terbuka untuk umum.',
        yaw: -0.75, pitch: 0.30, dist: 64 },
      { title: 'Perbedaan yang menentukan',
        text: 'Buritan Buran tidak membawa tiga mesin utama. Seluruh tenaga peluncuran berasal dari roket Energia, sehingga orbiter murni menjadi muatan.',
        yaw: -2.60, pitch: 0.25, dist: 44, layer: 'engine' },
      { title: 'Ruang muatan',
        text: 'Payload bay dirancang untuk kargo dan satelit, dengan konfigurasi yang sebanding dengan Space Shuttle.',
        yaw: -0.85, pitch: 0.62, dist: 52, doors: true, layer: 'bay' },
      { title: 'Melihat ke dalam',
        text: 'Karena tidak membawa mesin utama, ruang di buritan Buran dipakai untuk keperluan lain — salah satu perbedaan struktural yang paling nyata dari kembarannya.',
        yaw: -0.95, pitch: 0.34, dist: 50, doors: true, section: true },
      { title: 'Sayap dan kendali',
        text: 'Sayap delta ganda dengan elevon di tepi belakang, mengikuti prinsip yang sama: stabil saat hipersonik, terkendali saat mendarat.',
        yaw: 0.0001, pitch: 1.20, dist: 58, layer: 'wing' },
      { title: 'Satu penerbangan',
        text: 'Pada 15 November 1988 Buran terbang tanpa awak, mengelilingi Bumi dua kali, lalu mendarat otomatis. Itu satu-satunya penerbangannya.',
        yaw: -1.60, pitch: 0.10, dist: 46, layer: 'fin' }
    ],
    satria: [
      { title: 'Bentuk keseluruhan',
        text: 'Satelit geostasioner berbentuk bus kotak dengan dua sayap surya. Bentuk ini khas untuk satelit yang harus menjaga satu sisi selalu menghadap Bumi.',
        yaw: -0.75, pitch: 0.30, dist: 92 },
      { title: 'Bus satelit',
        text: 'Rangka utama berisi avionik, sistem kendali sikap, baterai, dan tangki propelan.',
        yaw: -0.45, pitch: 0.20, dist: 58, layer: 'bus', titik: 4 },
      { title: 'Panel surya',
        text: 'Sayap surya dibentangkan setelah satelit mencapai orbit, dan berputar mengikuti Matahari untuk memasok daya.',
        /* Dilihat dari sisi hadap Bumi, bukan dari atas. Bidang sayapnya tegak
           lurus sumbu itu, jadi dari atas yang terlihat cuma dua garis tipis —
           tepi panelnya. */
        yaw: 1.5, pitch: 0.18, dist: 86, layer: 'solar', titik: 1 },
      { title: 'Antena',
        text: 'Reflektor diarahkan ke Bumi. Pada satelit komunikasi, bagian inilah yang menentukan wilayah mana yang terlayani. Di depannya terdapat subreflektor kecil: sinyal dari perangkat umpan dipantulkan ke sana lebih dulu, baru ke reflektor besar, sehingga umpannya bisa diletakkan dekat badan satelit.',
        yaw: 1.45, pitch: 0.10, dist: 62, layer: 'antenna', titik: 6 },
      { title: 'Di dalam bus',
        text: 'Model ini hasil pindaian bagian luar satelit, jadi isi bus tidak ikut terekam. Di dalamnya berdiri tabung struktural yang memikul beban peluncuran dari adaptor roket ke seluruh rangka, diapit tangki propelan — yang ikut tergambar hanya pipanya. Isi tangki itulah yang menentukan umur satelit: begitu propelan untuk menjaga posisi habis, masa operasi berakhir meski elektroniknya masih sehat.',
        /* Dua lapisan sekaligus, dan ini satu-satunya langkah yang begitu.
           Menyendirikan lapisan pipa saja membuat panggungnya tampak kosong:
           pipanya memang terender, tetapi 1,8 satuan di model selebar 44,
           gelap, dan tanpa apa pun di sekitarnya sebagai pembanding. Dengan
           bus ikut tampil, pipanya terbaca sebagai benda di punggung badan —
           yang justru maksud langkah ini. */
        yaw: -0.85, pitch: 0.32, dist: 26, layer: 'bus', lapisanLain: ['tank'], titik: 2 },
      { title: 'Membuang panas',
        text: 'Pelat terang di sisi utara dan selatan adalah radiator OSR — Optical Solar Reflector. Permukaannya memantulkan cahaya Matahari tetapi meloloskan panas dari dalam satelit ke ruang angkasa. Letaknya bukan kebetulan: kedua sisi itu yang paling jarang tersinari sepanjang tahun.',
        yaw: 0.0001, pitch: 0.12, dist: 42, layer: 'osr', titik: 3 },
      { title: 'Pendorong plasma',
        text: 'Empat pendorong plasma stasioner berada di sisi yang membelakangi Bumi. Dorongannya sangat kecil — setara dorongan selembar kertas di telapak tangan — tetapi jauh lebih hemat propelan daripada roket kimia. Karena itu kenaikan orbitnya memakan waktu berbulan-bulan, dan bobot yang dihemat ditukar menjadi muatan atau umur yang lebih panjang.',
        /* Bus ikut ditampilkan, alasannya sama seperti langkah pipa propelan:
           nosel pendorongnya hanya 0,8 satuan, dan sendirian di panggung ia
           tidak terbaca sebagai apa pun. */
        yaw: -1.75, pitch: 0.10, dist: 30, layer: 'bus', lapisanLain: ['thruster'], titik: 5 }
    ]
  };

  /* warna untuk mode tampilan "warna komponen" */
  var LAYER_COLORS = {
    body: '#5B9BD5', bay: '#E8B44A', wing: '#5FBF8E', fin: '#D96C6C',
    canopy: '#8E7BD8', pod: '#4FB0C6', engine: '#C77BB5',
    bus: '#5B9BD5', solar: '#E8B44A', antenna: '#5FBF8E', thruster: '#D96C6C',
    orbiter: '#5B9BD5', et: '#E8934A', srb: '#8FA6BF', strut: '#D96C6C',
    osr: '#8FD8C4', tower: '#7FA8D9', tank: '#E0705A'
  };


  /* ---------- kategori anotasi ----------
     Warna dipakai untuk mengelompokkan titik menurut sistemnya, bukan
     sekadar hiasan: pengunjung bisa melihat sekilas mana yang termasuk
     pelindung panas, mana yang termasuk penggerak, dan seterusnya. */
  var KATEGORI = {
    awak:     { label: 'Awak dan kabin',     warna: '#E0A458' },
    navigasi: { label: 'Navigasi dan sikap', warna: '#5FBF8E' },
    struktur: { label: 'Struktur dan kendali', warna: '#7FA8D9' },
    tps:      { label: 'Pelindung panas',    warna: '#C77BB5' },
    mesin:    { label: 'Penggerak',          warna: '#E0705A' },
    muatan:   { label: 'Ruang muatan',       warna: '#59B8C4' },
    daya:     { label: 'Sistem daya',        warna: '#E8C34A' },
    termal:   { label: 'Kendali termal',     warna: '#8FD8C4' },
    antena:   { label: 'Antena',             warna: '#59B8C4' },
    komputer: { label: 'Elektronik',         warna: '#8FB4E8' },
    uji:      { label: 'Perangkat uji',      warna: '#C9A0DC' }
  };

  var HOTSPOTS = {
    cubesat: [
      { n: 1, pos: [0, 5.2, 5.2], kat: 'struktur', layer: 'rangka', off: [-112, -40],
        label: 'Rel sudut',
        note: 'Empat rel inilah yang bersentuhan dengan dinding deployer saat satelit didorong keluar. Standar CubeSat mengatur kehalusan dan kekerasan permukaannya, karena rel yang tergores bisa membuat satelit tersangkut dan gagal keluar.',
        link: '#standar' },
      { n: 2, pos: [0, 5.2, 0], kat: 'daya', layer: 'panel', off: [-96, -14],
        label: 'Panel surya badan',
        note: 'Sel surya menempel langsung pada sisi kubus. Pada 1U, seluruh permukaan yang tersedia hanya sekitar 600 sentimeter persegi, dan tidak semuanya menghadap Matahari sekaligus.',
        link: '#daya' },
      { n: 3, pos: [0, 5.4, 12.0], kat: 'daya', layer: 'deploy', off: [56, -52],
        label: 'Sayap surya',
        note: 'Sayap tambahan yang dilipat rapat di dalam deployer lalu dibentangkan setelah keluar. Inilah yang membedakan daya beberapa watt dengan belasan watt — dan pada IRVINE01, sayap ini dipasok oleh EXA.',
        link: '#daya' },
      { n: 4, pos: [-5.2, 1.2, 6.0], kat: 'antena', layer: 'antena', off: [-104, 30],
        label: 'Antena pita',
        note: 'Pita logam yang digulung saat peluncuran, lalu memanjang sendiri seperti meteran gulung ketika penahannya dilepas. Sederhana, ringan, dan tidak memerlukan motor.',
        link: '#komunikasi' },
      { n: 5, pos: [6.4, 0, 0], kat: 'muatan', layer: 'muatan', off: [64, 8],
        label: 'Kamera muatan',
        note: 'Muatan IRVINE01: kamera beresolusi rendah untuk memotret Venus, bintang terang, dan benda langit lain. Datanya dipakai menghitung jarak sekaligus mengukur ketepatan arah hadap satelit.',
        link: '#irvine' },
      { n: 6, pos: [0.4, 0, 0], kat: 'komputer', layer: 'papan', off: [-88, 58],
        label: 'Tumpukan papan',
        note: 'Papan bertingkat yang dihubungkan satu jajaran pin menembus seluruh tumpukan. Tiap papan menangani satu fungsi: komputer, daya, radio, kendali sikap. Matikan lapisan lain untuk melihatnya.',
        link: '#subsistem' },
      { n: 7, pos: [-4.0, 0, 2.4], kat: 'daya', layer: 'baterai', off: [-72, 76],
        label: 'Paket baterai',
        note: 'Menyimpan daya untuk dipakai saat satelit berada di sisi malam Bumi. Pada orbit rendah, gelapnya berlangsung sekitar sepertiga dari tiap putaran — dan tiap putaran hanya sekitar sembilan puluh menit.',
        link: '#daya' }
    ],
    flatsat: [
      { n: 1, pos: [-12.0, 0.9, -4.3], kat: 'komputer', layer: 'papan', off: [-96, -46],
        label: 'Papan subsistem',
        note: 'Enam papan yang nanti bertumpuk rapat di dalam kubus 10 sentimeter, di sini dijajar terbuka. Setiap sambungan, tegangan, dan sinyal dapat dijangkau tangan dan alat ukur.',
        link: '#flatsat' },
      { n: 2, pos: [-3.0, 0.3, 0.2], kat: 'struktur', layer: 'kabel', off: [-56, 34],
        label: 'Kabel penghubung',
        note: 'Bagian yang paling banyak memakan waktu saat integrasi sebenarnya. Salah satu tujuan tahap FlatSat adalah menemukan kesalahan sambungan selagi memperbaikinya masih semudah mencabut satu kabel.',
        link: '#flatsat' },
      { n: 3, pos: [15.0, 3.9, -5.2], kat: 'uji', layer: 'ujistand', off: [70, -30],
        label: 'Catu daya bangku',
        note: 'Menggantikan baterai dan panel surya selama pengujian, sehingga tegangan dapat diatur dan arus yang ditarik tiap subsistem dapat diukur.',
        link: '#flatsat' },
      { n: 4, pos: [12.0, 5.6, 4.8], kat: 'uji', layer: 'ujistand', off: [64, 24],
        label: 'Komputer pemantau',
        note: 'Menerima telemetri dari papan dan menampilkannya sebagai grafik langsung. Pada RASCube V2, perangkat lunak Mission Control menampilkan lebih dari lima puluh jenis data dari sensor di dalam kit.',
        link: '#rascube' },
      { n: 5, pos: [-16.0, 0.4, -6.0], kat: 'daya', layer: 'meja', off: [-88, 62],
        label: 'Meja kerja',
        note: 'FlatSat bukan model atau maket. Perangkatnya sama dengan yang akan diterbangkan, hanya belum dirakit ke dalam rangka — supaya kesalahan ditemukan selagi masih mudah diperbaiki.',
        link: '#flatsat' }
    ],
    stack: [
      { n: 1, pos: [19.0, 0, 0],     layer: 'et',      label: 'Tangki oksigen cair',
        note: 'Bagian depan External Tank menampung sekitar 616.500 kg oksigen cair pada suhu -182 derajat Celsius. Panjangnya sekitar 16,6 meter.' },
      { n: 2, pos: [0.8, 4.6, 0],    layer: 'et',      label: 'Intertank',
        note: 'Penghubung antara kedua tangki. Di sinilah beban dari dua booster diteruskan ke struktur tangki, dan di sini pula sebagian besar instrumen dipasang.' },
      { n: 3, pos: [-14.0, -4.6, 0], layer: 'et',      label: 'Tangki hidrogen cair',
        note: 'Bagian belakang tangki, panjang sekitar 29,5 meter. Volumenya 2,5 kali tangki oksigen, tetapi bobot isinya hanya sepertiga karena hidrogen cair jauh lebih ringan.' },
      { n: 4, pos: [2.0, 0, 7.0],    layer: 'srb',     label: 'Solid Rocket Booster',
        note: 'Dua booster ini menyumbang sekitar 71 sampai 83 persen daya dorong saat lepas landas. Keduanya adalah motor roket padat terbesar yang pernah diterbangkan.' },
      { n: 5, pos: [-29.5, 0, 7.0],  layer: 'srb',     label: 'Nosel booster',
        note: 'Setelah membakar propelan selama sekitar 123 detik, booster dilepas pada ketinggian sekitar 45,7 km, turun dengan parasut, dan dipungut dari laut untuk dipakai lagi.' },
      { n: 6, pos: [14.0, 0, 7.0],   layer: 'srb',     label: 'Hidung booster',
        note: 'Berisi sistem parasut pemulihan. Dari 270 booster yang pernah diluncurkan, hanya empat yang gagal dipulihkan.' },
      { n: 7, pos: [-2.0, 9.4, 0],   layer: 'orbiter', label: 'Orbiter Discovery',
        note: 'Dipasang di sisi tangki, bukan di puncaknya. Posisi menyamping inilah yang membuat serpihan dari tangki bisa mengenai pelindung panas orbiter.' },
      { n: 8, pos: [-22.5, 6.9, 0],  layer: 'orbiter', label: 'Tiga mesin utama',
        note: 'Space Shuttle Main Engine mengambil bahan bakar dari External Tank melalui saluran besar, dan menyala sekitar 480 detik hingga tangki dilepas.' },
      { n: 9, pos: [6.0, 6.2, 0],    layer: 'strut',   label: 'Penopang depan',
        note: 'Batang penghubung yang menahan hidung orbiter pada tangki. Dilepas bersamaan saat pemisahan tangki.' }
    ],
    discovery: [
      { n: 1, pos: [17.6, 0.4, 0], kat: 'tps', layer: 'wing', off: [-118, -6],
        label: 'Kerucut hidung',
        note: 'Berlapis reinforced carbon-carbon, bukan ubin. Bersama tepi depan sayap, bagian inilah yang menghadapi suhu tertinggi saat kembali ke atmosfer — melampaui 1.600 derajat Celsius.',
        link: '#teknologi' },
      { n: 2, pos: [13.2, 4.4, 0], kat: 'awak', layer: 'canopy', off: [-40, -62],
        label: 'Dek penerbangan',
        note: 'Enam jendela depan dan dua jendela di atap. Komandan dan pilot duduk di sini saat peluncuran dan pendaratan, menghadap ke atas selama menaiki orbit.',
        link: '#teknologi' },
      { n: 3, pos: [14.0, 2.9, 0], kat: 'awak', layer: 'body', off: [-104, -34],
        label: 'Kabin kru',
        note: 'Ruang bertekanan tiga dek: dek penerbangan di atas, dek tengah untuk tinggal dan tidur, dan ruang peralatan di bawahnya. Awak biasanya lima sampai tujuh orang.',
        link: '#teknologi' },
      { n: 4, pos: [13.0, 1.5, 2.0], kat: 'awak', layer: 'body', off: [-96, 22],
        label: 'Palka kru',
        note: 'Pintu masuk utama di sisi kiri kabin. Dipakai astronaut untuk naik sebelum peluncuran dan turun setelah pendaratan.',
        link: '#teknologi' },
      { n: 5, pos: [16.5, 2.0, 1.2], kat: 'navigasi', layer: 'body', off: [-118, -22],
        label: 'Pendorong RCS hidung',
        note: 'Bagian dari Reaction Control System — total 44 pendorong pada orbiter, 38 primer dan 6 vernier. Kelompok di hidung mengatur sikap dan gerakan halus saat mendekat ke stasiun.',
        link: '#teknologi' },
      { n: 6, pos: [15.0, 3.4, 0.9], kat: 'navigasi', layer: 'body', off: [-70, -48],
        label: 'Pelacak bintang',
        note: 'Mengunci bintang yang sudah dikenal lewat optiknya, lalu meneruskan data itu ke unit pengukur inersia untuk menetapkan orientasi orbiter di ruang tanpa acuan.',
        link: '#teknologi' },
      { n: 7, pos: [14.5, -2.6, 0], kat: 'struktur', layer: 'body', off: [-92, 56],
        label: 'Roda pendarat depan',
        note: 'Terlipat di dalam badan selama penerbangan dan baru dibuka menjelang pendaratan. Discovery mendarat sebagai pesawat layang, tanpa tenaga mesin.',
        link: '#teknologi' },
      { n: 8, pos: [0, 2.9, 0], kat: 'muatan', layer: 'bay', off: [34, -66],
        label: 'Ruang muatan',
        note: 'Panjang sekitar 18 meter dengan diameter 4,6 meter. Inilah alasan orbiter dibuat sebesar ini — cukup untuk satelit besar, laboratorium Spacelab, dan modul Stasiun Luar Angkasa Internasional.',
        link: '#teknologi' },
      { n: 9, pos: [0, 5.6, 2.6], kat: 'muatan', layer: 'bay', off: [58, -40],
        label: 'Pintu ruang muatan',
        note: 'Selalu dibuka begitu mencapai orbit, karena sisi dalamnya membawa radiator yang membuang panas dari seluruh orbiter. Menutupnya terlalu lama membuat wahana kepanasan.',
        link: '#teknologi' },
      { n: 10, pos: [2.0, 3.2, 1.2], kat: 'muatan', layer: 'bay', off: [44, -18],
        label: 'Lengan robot',
        note: 'Remote Manipulator System sepanjang sekitar 15 meter, dipakai untuk melepas dan menangkap muatan. Discovery memakainya antara lain saat melepaskan Teleskop Hubble pada 1990.',
        link: '#misi' },
      { n: 11, pos: [5.0, 1.6, 2.6], kat: 'tps', layer: 'body', off: [24, 42],
        label: 'Selimut AFRSI',
        note: 'Advanced Flexible Reusable Surface Insulation — selimut kain serat silika berjahit pada permukaan yang panasnya sedang, seperti sisi atas badan. Lebih ringan dan lebih murah daripada ubin.',
        link: '#teknologi' },
      { n: 12, pos: [8.0, -1.2, 3.2], kat: 'tps', layer: 'wing', off: [-56, 62],
        label: 'Ubin hitam HRSI',
        note: 'High-Temperature Reusable Surface Insulation, terbuat dari serat silika kemurnian tinggi. Menutupi permukaan bawah dan sayap. Bahannya begitu buruk menghantar panas sehingga sisi satunya tetap dingin saat sisi lain membara.',
        link: '#teknologi' },
      { n: 13, pos: [9.0, 3.6, 1.6], kat: 'tps', layer: 'body', off: [16, -46],
        label: 'Ubin putih LRSI',
        note: 'Low-Temperature Reusable Surface Insulation untuk permukaan atas yang panasnya lebih rendah. Warnanya putih agar memantulkan panas Matahari selama di orbit.',
        link: '#teknologi' },
      { n: 14, pos: [-9.5, -0.8, 12.0], kat: 'struktur', layer: 'wing', off: [66, 34],
        label: 'Sayap delta ganda',
        note: 'Sudut sapuannya berubah di tengah: bagian dalam curam agar stabil pada kecepatan hipersonik, bagian luar lebih landai agar tetap terkendali pada kecepatan pendaratan.',
        link: '#teknologi' },
      { n: 15, pos: [-14.5, -1.2, 9.0], kat: 'struktur', layer: 'wing', off: [78, 12],
        label: 'Elevon',
        note: 'Permukaan kendali di tepi belakang sayap. Bergerak bersamaan sebagai elevator untuk mengatur naik-turun, berlawanan sebagai aileron untuk memiringkan pesawat.',
        link: '#teknologi' },
      { n: 16, pos: [-17.5, 10.9, 0], kat: 'struktur', layer: 'fin', off: [96, -44],
        label: 'Sirip vertikal',
        note: 'Rudder di tepi belakangnya terbelah menjadi dua bilah yang dapat membuka seperti gunting, berfungsi sebagai rem udara untuk mengatur laju turun saat pendekatan.',
        link: '#teknologi' },
      { n: 17, pos: [-17.5, 5.4, 2.4], kat: 'mesin', layer: 'pod', off: [72, -18],
        label: 'Polong OMS',
        note: 'Orbital Maneuvering System, satu di kiri dan satu di kanan. Dipakai untuk menyisipkan diri ke orbit, berpindah ketinggian, dan melakukan pembakaran deorbit sebelum pulang.',
        link: '#teknologi' },
      { n: 18, pos: [-19.5, 2.2, 0], kat: 'mesin', layer: 'engine', off: [86, 30],
        label: 'Tiga mesin utama',
        note: 'Space Shuttle Main Engine menyala dari sebelum lepas landas sampai sekitar delapan setengah menit, mengambil bahan bakar dari External Tank. Ketiganya dapat digerakkan pada dudukannya untuk mengarahkan wahana.',
        link: '#peluncuran' },
      { n: 19, pos: [-19.0, -1.7, 0], kat: 'struktur', layer: 'body', off: [92, 58],
        label: 'Body flap',
        note: 'Panel besar di bawah nosel mesin. Fungsinya ganda: menjaga sikap wahana tetap datar seperti penstabil mendatar pada pesawat, sekaligus melindungi mesin utama dari panas saat kembali ke atmosfer.',
        link: '#pendaratan' },
      { n: 20, pos: [-18.4, 4.6, 0], kat: 'struktur', layer: 'fin', off: [104, -60],
        label: 'Pintu parasut',
        note: 'Terletak di pangkal sirip vertikal. Terbuka begitu roda menyentuh landasan, melepaskan parasut yang membantu memperlambat wahana selama meluncur di landasan.',
        link: '#pendaratan' }
    ],
    buran: [
      { n: 1, pos: [17.6, 0.4, 0], kat: 'tps', layer: 'wing', off: [-118, -6],
        label: 'Kerucut hidung',
        note: 'Sama seperti pada Space Shuttle, bagian ini menghadapi suhu tertinggi saat kembali ke atmosfer dan memakai bahan tahan panas khusus, bukan ubin biasa.',
        link: '#teknologi' },
      { n: 2, pos: [13.2, 4.4, 0], kat: 'awak', layer: 'canopy', off: [-40, -62],
        label: 'Dek penerbangan',
        note: 'Dirancang untuk awak hingga sepuluh orang. Pada satu-satunya penerbangannya, kursi-kursi ini kosong — seluruh misi dijalankan otomatis.',
        link: '#misi' },
      { n: 3, pos: [14.0, 2.9, 0], kat: 'awak', layer: 'body', off: [-104, -34],
        label: 'Kabin kru',
        note: 'Kabin bertekanan di bagian depan badan. Buran memang dirancang berawak, tetapi keputusan menerbangkannya tanpa awak diambil justru karena sistem otomatisnya dianggap sudah cukup matang.',
        link: '#misi' },
      { n: 4, pos: [13.0, 1.5, 2.0], kat: 'awak', layer: 'body', off: [-96, 22],
        label: 'Palka kru',
        note: 'Pintu masuk utama ke kabin. Tidak pernah dipakai untuk memasukkan awak ke penerbangan orbit.',
        link: '#misi' },
      { n: 5, pos: [16.5, 2.0, 1.2], kat: 'navigasi', layer: 'body', off: [-118, -22],
        label: 'Pendorong kendali hidung',
        note: 'Kelompok pendorong kecil untuk mengatur sikap wahana di orbit, tempat permukaan kendali aerodinamis tidak berguna karena tidak ada udara.',
        link: '#teknologi' },
      { n: 6, pos: [15.0, 3.4, 0.9], kat: 'navigasi', layer: 'body', off: [-70, -48],
        label: 'Sistem pemandu otomatis',
        note: 'Inilah pembeda paling penting dari Space Shuttle. Sistem ini menerbangkan Buran dari peluncuran sampai menyentuh landasan tanpa satu pun perintah manusia di dalam wahana.',
        link: '#misi' },
      { n: 7, pos: [14.5, -2.6, 0], kat: 'struktur', layer: 'body', off: [-92, 56],
        label: 'Roda pendarat depan',
        note: 'Pada 15 November 1988, roda ini menyentuh landasan Baikonur dengan simpangan hanya beberapa meter dari garis tengah, dalam kondisi angin samping yang kencang.',
        link: '#misi' },
      { n: 8, pos: [0, 2.9, 0], kat: 'muatan', layer: 'bay', off: [34, -66],
        label: 'Ruang muatan',
        note: 'Berukuran sebanding dengan milik Space Shuttle, dirancang untuk membawa kargo dan satelit ke orbit. Pada penerbangan 1988, ruang ini hanya berisi peralatan ukur.',
        link: '#misi' },
      { n: 9, pos: [0, 5.6, 2.6], kat: 'muatan', layer: 'bay', off: [58, -40],
        label: 'Pintu ruang muatan',
        note: 'Dibuka selama di orbit dengan alasan yang sama seperti pada Space Shuttle: sisi dalamnya membuang panas wahana ke ruang angkasa.',
        link: '#teknologi' },
      { n: 10, pos: [2.0, 3.2, 1.2], kat: 'muatan', layer: 'bay', off: [44, -18],
        label: 'Rencana lengan robot',
        note: 'Buran dirancang dapat membawa lengan manipulator untuk menangani muatan, tetapi perangkat itu tidak pernah diterbangkan.',
        link: '#teknologi' },
      { n: 11, pos: [5.0, 1.6, 2.6], kat: 'tps', layer: 'body', off: [24, 42],
        label: 'Selimut tahan panas',
        note: 'Permukaan yang panasnya sedang dilindungi selimut lentur, bukan ubin kaku — pendekatan yang sama dengan Space Shuttle.',
        link: '#teknologi' },
      { n: 12, pos: [8.0, -1.2, 3.2], kat: 'tps', layer: 'wing', off: [-56, 62],
        label: 'Ubin permukaan bawah',
        note: 'Sekitar 38.000 ubin menutupi permukaan bawah. Setelah penerbangan 1988, hanya beberapa ubin yang dilaporkan hilang — hasil yang dianggap sangat baik untuk penerbangan perdana.',
        link: '#misi' },
      { n: 13, pos: [9.0, 3.6, 1.6], kat: 'tps', layer: 'body', off: [16, -46],
        label: 'Ubin permukaan atas',
        note: 'Berwarna terang karena panas yang diterimanya jauh lebih rendah daripada permukaan bawah yang menghadap arah datang saat reentry.',
        link: '#teknologi' },
      { n: 14, pos: [-9.5, -0.8, 12.0], kat: 'struktur', layer: 'wing', off: [66, 34],
        label: 'Sayap delta ganda',
        note: 'Bentuknya hampir sama dengan Space Shuttle. Kemiripan ini bukan peniruan buta: keduanya menghadapi persoalan aerodinamika dan reentry yang sama, dan solusinya memang mengerucut ke bentuk serupa.',
        link: '#banding' },
      { n: 15, pos: [-14.5, -1.2, 9.0], kat: 'struktur', layer: 'wing', off: [78, 12],
        label: 'Elevon',
        note: 'Permukaan kendali di tepi belakang sayap, dipakai saat wahana sudah kembali ke lapisan udara yang cukup padat.',
        link: '#teknologi' },
      { n: 16, pos: [-17.5, 10.9, 0], kat: 'struktur', layer: 'fin', off: [96, -44],
        label: 'Sirip vertikal',
        note: 'Membawa rudder yang juga berfungsi sebagai rem udara, seperti pada Space Shuttle.',
        link: '#teknologi' },
      { n: 17, pos: [-17.5, 5.2, 2.4], kat: 'mesin', layer: 'pod', off: [72, -18],
        label: 'Mesin manuver orbit',
        note: 'Dua mesin di belakang sayap untuk menyisipkan diri ke orbit dan melakukan pembakaran deorbit. Inilah satu-satunya penggerak besar yang dibawa Buran sendiri.',
        link: '#teknologi' },
      { n: 18, pos: [-20.5, 3.4, 0], kat: 'mesin', layer: 'engine', off: [86, 30],
        label: 'Buritan tanpa mesin utama',
        note: 'Perbedaan paling menentukan dari Space Shuttle. Buran tidak membawa mesin utama; seluruh tenaga peluncuran berasal dari roket Energia, sehingga orbiter murni menjadi muatan. Energia karena itu dapat dipakai membawa benda lain tanpa orbiter sama sekali.',
        link: '#banding' }
    ],
    satria: [
      /* Ketujuh titik ini tetap sama seperti sebelumnya; yang berubah hanya
         koordinatnya, diarahkan ulang ke bagian mesh pindaian yang benar.
         Angkanya dibaca dari kotak batas tiap bagian di _satria/pemetaan.md,
         bukan dikira-kira. Dua titik di dalam bus — tangki dan tabung tengah —
         tidak punya geometri sendiri pada mesh ini, jadi keduanya diarahkan ke
         dalam badan bus dan keterangannya ditulis ulang. */
      /* z 14, bukan di ujung sayap (±22): di ujung, label namanya jatuh di tepi
         panggung dan ikut terpotong. */
      { n: 1, pos: [2.6, 0.9, 14.0], kat: 'daya', layer: 'solar', off: [46, -58],
        label: 'Panel surya',
        note: 'Lima panel per sayap, dilipat rapat selama peluncuran lalu dibentangkan di orbit. Sayapnya berputar pelan mengikuti Matahari sepanjang hari sementara badan satelit tetap menghadap Bumi.',
        link: '#teknologi' },
      { n: 2, pos: [-1.8, 2.35, 0],  kat: 'mesin', layer: 'tank', off: [-96, 34],
        label: 'Tangki propelan',
        note: 'Tangki propelan berada di dalam badan, di bawah titik ini, mengapit tabung tengah — pindaian 3D ini hanya merekam bagian luar satelit, jadi tangkinya sendiri tidak tergambar; yang ikut terekam hanya pipanya. Isi tangki menentukan umur satelit: begitu propelan untuk menjaga posisi habis, masa operasi berakhir meski seluruh elektroniknya masih sehat.',
        link: '#operasi' },
      { n: 3, pos: [0, 0, 2.9],    kat: 'termal', layer: 'osr', off: [34, -34],
        label: 'Radiator OSR',
        note: 'Optical Solar Reflector — pelat yang memantulkan cahaya Matahari tetapi meloloskan panas dari dalam satelit ke ruang angkasa. Dipasang di sisi utara dan selatan, yang paling jarang tersinari. Matikan lapisan Radiator OSR untuk melepas kedua pelat itu dari badan.',
        link: '#teknologi' },
      { n: 4, pos: [1.4, 2.35, 0],    kat: 'struktur', layer: 'bus', off: [-104, -16],
        label: 'Tabung tengah',
        note: 'Menara struktural yang menyalurkan beban peluncuran dari adaptor roket ke seluruh rangka. Tabungnya berdiri di sumbu badan, tepat di bawah titik ini. Sama seperti tangki propelan, bagian dalam bus tidak ikut terekam pindaian, jadi yang terlihat di sini dinding luarnya.',
        link: '#teknologi' },
      { n: 5, pos: [-5.3, -1.4, 0], kat: 'mesin', layer: 'thruster', off: [-88, 60],
        label: 'Pendorong plasma',
        note: 'Stationary Plasma Thruster: mendorong dengan mempercepat gas terionisasi. Daya dorongnya sangat kecil, tetapi jauh lebih hemat propelan daripada roket kimia, sehingga bobot yang dihemat bisa ditukar menjadi muatan atau umur yang lebih panjang.',
        link: '#teknologi' },
      { n: 6, pos: [4.0, 5.7, 4.6], kat: 'antena', layer: 'antenna', off: [56, 18],
        label: 'Reflektor antena',
        note: 'Memusatkan gelombang radio seperti cermin cekung memusatkan cahaya. Makin besar reflektornya, makin sempit berkas yang dihasilkan — dan makin banyak kapasitas yang bisa dipakai ulang di wilayah berbeda. Satria membawa tiga reflektor: dua di sisi atas badan, satu menggantung di bawah.',
        link: '#teknologi' },
      { n: 7, pos: [5.0, -5.5, 0.3], kat: 'antena', layer: 'antenna', off: [76, -20],
        label: 'Reflektor bawah',
        note: 'Reflektor ketiga, digantung pada menara umpan di bawah badan. Perangkat umpannya duduk di pangkal menara, dekat badan satelit, bukan menggantung jauh di depan reflektor — susunan yang memperpendek jalur gelombang dan menghemat ruang saat satelit masih terlipat di dalam roket.',
        link: '#teknologi' }
    ]
  };

  /* ---------- viewer ---------- */
  function mount(canvas, opts) {
    opts = opts || {};
    var variant = opts.variant || 'discovery';
    var mesh = buildModel(variant);
    var spots = HOTSPOTS[variant] || [];
    var ctx = canvas.getContext('2d');

    var baseDist = opts.dist || 64;
    var baseYaw = (opts.yaw !== undefined) ? opts.yaw : -0.75;
    var basePitch = (opts.pitch !== undefined) ? opts.pitch : 0.32;
    var layerDefs = LAYERS[variant] || [];
    var groupLayer = layerIndex(variant);
    var state = {
      yaw: baseYaw, pitch: basePitch, dist: baseDist, doorsOpen: false,
      spin: !matchMedia('(prefers-reduced-motion: reduce)').matches,
      hover: -1, active: -1,
      panX: 0, panY: 0,
      hidden: {},          // id lapisan yang disembunyikan
      section: false,      // mode potongan memanjang
      mode: 'solid',       // solid | wire | layer
      tgt: null,           // sasaran gerak kamera halus
      labelSemua: false,   // tampilkan seluruh label sekaligus
      hoverLayer: null,    // lapisan di bawah kursor
      lockLayer: null,     // lapisan yang disorot karena pin diklik
      cursor: null
    };

    // titik tengah tiap sisi dihitung sekali, dipakai untuk mode potongan
    for (var fi = 0; fi < mesh.f.length; fi++) {
      var ff = mesh.f[fi], ax = 0, az = 0;
      for (var fv = 0; fv < ff.v.length; fv++) {
        ax += mesh.v[ff.v[fv]][0];
        az += mesh.v[ff.v[fv]][2];
      }
      ff._cx = ax / ff.v.length - (mesh.pivot ? mesh.pivot[0] : 0);
      ff._cz = az / ff.v.length - (mesh.pivot ? mesh.pivot[2] : 0);
      ff._layer = groupLayer[ff.g] || null;
    }

    /* Potongan selalu membujur pada bidang lateral, karena memotong
       melintang hanya akan memenggal buritan dan tidak memperlihatkan apa
       pun. Yang mengikuti kamera hanyalah sisi mana yang dibuang: separuh
       yang menghadap penonton, supaya bagian dalam selalu terlihat. */
    function cutAway(face) {
      var sgn = Math.cos(state.yaw) >= 0 ? 1 : -1;
      return sgn * face._cz < -0.35;
    }
    var W = 0, H = 0, dpr = 1, stars = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      var count = Math.round((W * H) / 5200);
      for (var i = 0; i < count; i++) {
        stars.push([Math.random() * W, Math.random() * H,
                    Math.random() * 1.25 + 0.25, Math.random() * 0.55 + 0.12]);
      }
    }

    var pivot = mesh.pivot || [0, 0, 0];

    function rotatePoint(p, skipPivot) {
      var px = p[0], py = p[1], pz = p[2];
      if (!skipPivot) { px -= pivot[0]; py -= pivot[1]; pz -= pivot[2]; }
      var cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
      var cp = Math.cos(state.pitch), sp = Math.sin(state.pitch);
      var x = px * cy + pz * sy;
      var z = -px * sy + pz * cy;
      var y = py * cp + z * sp;
      z = -py * sp + z * cp;
      return [x, y, z];
    }

    function project(p) {
      var v = rotatePoint(p);
      var zc = v[2] + state.dist;
      if (zc < 1) zc = 1;
      var f = Math.min(W, H) * 1.55;
      return [W / 2 + state.panX + (f * v[0]) / zc,
              H / 2 + state.panY - (f * v[1]) / zc, zc];
    }

    var LIGHT = (function () {
      var l = [-0.42, 0.72, -0.55];
      var n = Math.hypot(l[0], l[1], l[2]);
      return [l[0] / n, l[1] / n, l[2] / n];
    })();

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // latar: langit + bintang
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#080C13');
      g.addColorStop(1, '#0D1520');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (var s = 0; s < stars.length; s++) {
        ctx.globalAlpha = stars[s][3];
        ctx.fillStyle = '#CBD7E6';
        ctx.fillRect(stars[s][0], stars[s][1], stars[s][2], stars[s][2]);
      }
      ctx.globalAlpha = 1;

      // kumpulkan poligon
      var lit = state.lockLayer || state.hoverLayer;
      var list = [];
      for (var i = 0; i < mesh.f.length; i++) {
        var face = mesh.f[i];
        if (face.g === 'door' && state.doorsOpen) continue;
        if ((face.g === 'doorOpen' || face.g === 'bayIn') && !state.doorsOpen) continue;
        if (face._layer && state.hidden[face._layer]) continue;
        // mode potongan: separuh model dibuang agar bagian dalam terlihat
        if (state.section && face.g !== 'bayIn' && cutAway(face)) continue;

        var pts = [], sum = 0, ok = true;
        for (var k = 0; k < face.v.length; k++) {
          var pr = project(mesh.v[face.v[k]]);
          if (!isFinite(pr[0]) || !isFinite(pr[1])) { ok = false; break; }
          pts.push(pr); sum += pr[2];
        }
        if (!ok) continue;

        var a = rotatePoint(mesh.v[face.v[0]], true),
            b = rotatePoint(mesh.v[face.v[1]], true),
            c = rotatePoint(mesh.v[face.v[2]], true);
        var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        var nl = Math.hypot(nx, ny, nz) || 1;
        var dot = Math.abs((nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nl);
        list.push({ p: pts, z: sum / face.v.length, c: face.c,
                    k: 0.38 + 0.72 * dot, L: face._layer });
      }

      list.sort(function (p, q) { return q.z - p.z; });

      lastList = list;
      var accent = opts.accent || '#4FA8E0';
      for (var j = 0; j < list.length; j++) {
        var it = list[j];
        ctx.beginPath();
        ctx.moveTo(it.p[0][0], it.p[0][1]);
        for (var q2 = 1; q2 < it.p.length; q2++) ctx.lineTo(it.p[q2][0], it.p[q2][1]);
        ctx.closePath();
        var on = lit && it.L === lit;
        var base = (state.mode === 'layer' && LAYER_COLORS[it.L])
                   ? LAYER_COLORS[it.L] : it.c;
        var col = shade(base, on ? it.k * 1.28 : it.k);

        if (state.mode === 'wire') {
          // rangka: hanya garis tepi, tanpa isian
          ctx.globalAlpha = on ? 0.95 : (lit ? 0.18 : 0.5);
          ctx.strokeStyle = on ? accent : '#8FA6BF';
          ctx.lineWidth = on ? 1 : 0.55;
          ctx.stroke();
        } else {
          ctx.globalAlpha = (lit && !on) ? 0.34 : 1;
          ctx.fillStyle = col;
          ctx.fill();
          ctx.strokeStyle = on ? accent : col;
          ctx.lineWidth = on ? 0.9 : 0.6;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      if (state.section) {
        ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = accent;
        ctx.fillText('POTONGAN MEMANJANG', 12, H - 22);
      }

      drawHotspots();
      drawHoverLabel(lit);
    }

    var lastList = [];

    function layerLabel(id) {
      for (var i = 0; i < layerDefs.length; i++) {
        if (layerDefs[i].id === id) return layerDefs[i].label;
      }
      return null;
    }

    function drawHoverLabel(lit) {
      if (!lit || !state.cursor) return;
      var text = layerLabel(lit);
      if (!text) return;
      ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      var w = ctx.measureText(text).width + 16;
      var x = Math.min(state.cursor[0] + 14, W - w - 6);
      var y = Math.max(14, state.cursor[1] - 16);
      ctx.fillStyle = 'rgba(9,13,20,.92)';
      ctx.fillRect(x, y - 10, w, 20);
      ctx.strokeStyle = opts.accent || '#4FA8E0';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y - 9.5, w - 1, 19);
      ctx.fillStyle = '#E6EDF5';
      ctx.fillText(text, x + 8, y + 0.5);
    }

    // titik di dalam poligon, metode ray casting
    function inside(pt, poly) {
      var x = pt[0], y = pt[1], hit = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi)) hit = !hit;
      }
      return hit;
    }

    // sisi terdepan diuji lebih dulu: daftar digambar dari belakang ke depan
    function layerAt(pt) {
      for (var i = lastList.length - 1; i >= 0; i--) {
        if (lastList[i].L && inside(pt, lastList[i].p)) return lastList[i].L;
      }
      return null;
    }

    var spotScreen = [];
    /* Titik anotasi bergaya penampil museum: cincin tipis, garis penunjuk
       menyerong, dan label bergaris bawah. Label hanya muncul saat titiknya
       disorot atau dipilih, supaya kanvas tidak penuh teks. */
    function drawHotspots() {
      spotScreen = [];
      var accent = opts.accent || '#4FA8E0';
      var i, p;

      // lewati satu putaran: kumpulkan posisi dulu, gambar label belakangan
      var pts = [];
      for (i = 0; i < spots.length; i++) {
        p = project(spots[i].pos);
        spotScreen.push({ x: p[0], y: p[1], i: i });
        pts.push(p);
      }

      // warna titik mengikuti kategorinya, sehingga sistem yang sejenis
      // langsung terbaca sewarna
      function warnaSpot(sp) {
        var k = sp.kat && KATEGORI[sp.kat];
        return k ? k.warna : accent;
      }

      for (i = 0; i < spots.length; i++) {
        p = pts[i];
        var col = warnaSpot(spots[i]);
        var on = (state.hover === i || state.active === i);
        var r = on ? 9 : 6.5;

        ctx.beginPath();
        ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
        ctx.fillStyle = on ? hexA(col, 0.5) : 'rgba(9,13,20,.5)';
        ctx.fill();
        ctx.lineWidth = on ? 2.2 : 1.6;
        ctx.strokeStyle = col;
        ctx.stroke();
      }

      /* Label.

         Pergeseran bawaan tiap titik hanya pas pada satu sudut pandang,
         padahal model bisa diputar bebas. Karena itu posisi label dihitung
         ulang setiap bingkai: pergeseran dipakai sebagai usulan awal, lalu
         label yang bertumpuk digeser turun sampai tidak lagi bersinggungan.
         Yang digeser hanya labelnya; titiknya tetap di tempat, dan garis
         penunjuk menjaga keduanya tetap terhubung. */
      ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textBaseline = 'alphabetic';

      var TINGGI = 15;   // tinggi satu label termasuk jarak aman
      var label = [];
      for (i = 0; i < spots.length; i++) {
        var sp = spots[i];
        var tampil = (state.hover === i || state.active === i) || state.labelSemua;
        if (!tampil) continue;
        p = pts[i];
        // Titik yang jatuh di luar kanvas — misalnya saat kamera didekatkan —
        // tidak diberi label, karena komponennya memang tidak terlihat dan
        // labelnya hanya akan menggantung di tepi tanpa penunjuk yang jelas.
        if (p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) continue;
        var teks = sp.n + ' · ' + sp.label;
        var lebar = ctx.measureText(teks).width;
        var dx = sp.off ? sp.off[0] : -60;
        var dy = sp.off ? sp.off[1] : -30;
        var kanan = dx >= 0;

        // bila sisi yang diminta tidak muat, pindahkan ke sisi seberangnya
        if (!kanan && p[0] + dx - lebar < 6) { kanan = true; dx = 26; }
        if (kanan && p[0] + dx + lebar > W - 6) { kanan = false; dx = -26; }

        label.push({
          i: i, spot: sp, titik: p, teks: teks, lebar: lebar, kanan: kanan,
          x: p[0] + dx,
          y: Math.max(TINGGI, Math.min(H - 12, p[1] + dy)),
          z: p[2],
          warna: warnaSpot(sp),
          aktif: (state.hover === i || state.active === i)
        });
      }

      /* Penjepitan tepi kiri dan kanan dilakukan di sini, sebelum tabrakan
         diselesaikan. Bila dikerjakan belakangan, label yang bergeser masuk
         justru bisa menabrak label lain yang tadinya sudah aman. */
      for (i = 0; i < label.length; i++) {
        var Lc = label[i];
        var kiriC = Lc.kanan ? Lc.x : Lc.x - Lc.lebar;
        if (kiriC < 4) Lc.x += (4 - kiriC);
        else if (kiriC + Lc.lebar > W - 4) Lc.x -= (kiriC + Lc.lebar - (W - 4));
      }

      /* Batas kapasitas.

         Pada kanvas pendek — layar ponsel misalnya — dua puluh label
         bertumpuk setinggi kanvasnya sendiri, sehingga tidak ada penataan
         yang bisa membuat semuanya muat. Yang ditampilkan karena itu
         dibatasi sebanyak yang benar-benar cukup ruang, dan yang dipilih
         adalah titik yang paling dekat ke penonton: komponen di sisi
         terdepan model, yang memang paling jelas terlihat. Titik yang
         sedang disorot atau dipilih selalu ikut. */
      var kapasitas = Math.max(3, Math.floor((H - TINGGI * 2) / TINGGI));
      if (label.length > kapasitas) {
        label.sort(function (a, b) {
          if (a.aktif !== b.aktif) return a.aktif ? -1 : 1;
          return a.z - b.z;                    // z kecil = lebih dekat
        });
        label = label.slice(0, kapasitas);
      }

      /* Penyelesaian tumpang tindih.

         Label diurutkan menurut tinggi, lalu yang bersinggungan pada kolom
         yang sama didorong ke bawah. Sekali lintasan tidak cukup: label yang
         baru saja didorong bisa menabrak label lain yang tadinya aman, jadi
         lintasan diulang sampai tidak ada lagi yang bergerak. Batas lintasan
         dipasang agar tidak pernah berputar tanpa henti pada kasus rapat —
         nyata pada layar ponsel, tempat ruangnya paling sempit. */
      label.sort(function (a, b) { return a.y - b.y; });
      var tumpangX = function (A, B) {
        var kiriA = A.kanan ? A.x : A.x - A.lebar;
        var kiriB = B.kanan ? B.x : B.x - B.lebar;
        return (kiriA < kiriB + B.lebar) && (kiriB < kiriA + A.lebar);
      };

      for (var lintas = 0; lintas < 8; lintas++) {
        var bergerak = false;
        for (i = 0; i < label.length; i++) {
          for (var j = 0; j < label.length; j++) {
            if (i === j) continue;
            var A = label[i], B = label[j];
            // Hanya yang berada di bawah yang mengalah. Saat tingginya persis
            // sama, urutan larik yang memutuskan — tanpa aturan pemecah ini
            // keduanya saling mendorong dan tidak ada yang benar-benar pindah.
            if (A.y < B.y || (A.y === B.y && i < j)) continue;
            if (tumpangX(A, B) && Math.abs(A.y - B.y) < TINGGI) {
              A.y = B.y + TINGGI;
              bergerak = true;
            }
          }
        }
        if (!bergerak) break;
      }

      /* Label yang terdorong melewati tepi bawah dibuang, bukan dijepit ke
         tepi. Menjepitnya hanya akan menumpuk beberapa label pada baris yang
         sama — persis masalah yang baru saja diselesaikan. Yang dibuang
         adalah yang terdorong paling jauh, yaitu yang paling banyak
         mengalah, dan titiknya tetap tergambar di model. */
      var muat = [];
      for (i = 0; i < label.length; i++) {
        if (label[i].y > H - 12 && !label[i].aktif) continue;
        if (label[i].y > H - 12) label[i].y = H - 12;   // yang aktif tetap tampil
        muat.push(label[i]);
      }
      label = muat;

      for (i = 0; i < label.length; i++) {
        var L2 = label[i];
        ctx.textAlign = L2.kanan ? 'left' : 'right';
        var ux = L2.kanan ? L2.x : L2.x - L2.lebar;
        var pangkal = L2.kanan ? L2.x - 4 : L2.x + 4;

        ctx.beginPath();
        ctx.moveTo(L2.titik[0], L2.titik[1]);
        ctx.lineTo(pangkal, L2.y + 4);
        ctx.strokeStyle = hexA(L2.warna, L2.aktif ? 0.95 : 0.5);
        ctx.lineWidth = L2.aktif ? 1.5 : 1;
        ctx.stroke();

        ctx.fillStyle = '#F2F6FA';
        ctx.shadowColor = 'rgba(0,0,0,.9)';
        ctx.shadowBlur = 5;
        ctx.fillText(L2.teks, L2.x, L2.y);
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.moveTo(ux, L2.y + 4);
        ctx.lineTo(ux + L2.lebar, L2.y + 4);
        ctx.strokeStyle = L2.warna;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }

    /* warna heks menjadi rgba dengan alfa tertentu */
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }

    /* --- interaksi --- */
    var drag = false, lx = 0, ly = 0, moved = 0;

    function pointerPos(e) {
      var r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }

    var panning = false;

    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    canvas.addEventListener('pointerdown', function (e) {
      drag = true; moved = 0;
      state.tgt = null;   // sentuhan pengguna membatalkan gerak tur
      // klik kanan, tombol tengah, atau tahan Shift untuk menggeser
      panning = (e.button === 2 || e.button === 1 || e.shiftKey);
      var p = pointerPos(e); lx = p[0]; ly = p[1];
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = panning ? 'move' : 'grabbing';
      state.spin = false;
      if (opts.onSpinChange) opts.onSpinChange(false);
    });

    canvas.addEventListener('pointermove', function (e) {
      var p = pointerPos(e);
      state.cursor = p;
      if (drag) {
        var dx = p[0] - lx, dy = p[1] - ly;
        moved += Math.abs(dx) + Math.abs(dy);
        if (panning) {
          var lim = Math.min(W, H) * 0.6;
          state.panX = Math.max(-lim, Math.min(lim, state.panX + dx));
          state.panY = Math.max(-lim, Math.min(lim, state.panY + dy));
        } else {
          state.yaw -= dx * 0.008;
          state.pitch = Math.max(-1.35, Math.min(1.35, state.pitch + dy * 0.006));
        }
        lx = p[0]; ly = p[1];
      } else {
        var found = -1;
        for (var i = 0; i < spotScreen.length; i++) {
          if (Math.hypot(spotScreen[i].x - p[0], spotScreen[i].y - p[1]) < 16) { found = i; break; }
        }
        if (found !== state.hover) state.hover = found;

        var lay = (found >= 0 && spots[found].layer) ? spots[found].layer : layerAt(p);
        if (lay !== state.hoverLayer) {
          state.hoverLayer = lay;
          if (opts.onLayerHover) opts.onLayerHover(lay);
        }
        canvas.style.cursor = found >= 0 ? 'pointer' : (lay ? 'grab' : 'default');
      }
    });

    canvas.addEventListener('pointerleave', function () {
      state.cursor = null;
      if (state.hoverLayer !== null) {
        state.hoverLayer = null;
        if (opts.onLayerHover) opts.onLayerHover(null);
      }
    });

    canvas.addEventListener('pointerup', function (e) {
      drag = false; panning = false;
      canvas.style.cursor = 'grab';
      if (moved < 6) {
        var p = pointerPos(e);
        for (var i = 0; i < spotScreen.length; i++) {
          if (Math.hypot(spotScreen[i].x - p[0], spotScreen[i].y - p[1]) < 16) {
            state.active = i;
            state.lockLayer = spots[i].layer || null;
            if (opts.onSelect) opts.onSelect(spots[i], i);
            if (opts.onLayerHover) opts.onLayerHover(state.lockLayer);
            break;
          }
        }
      }
    });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      state.dist = Math.max(baseDist * 0.4, Math.min(baseDist * 2.4, state.dist + e.deltaY * 0.06));
    }, { passive: false });

    canvas.addEventListener('keydown', function (e) {
      var k = e.key;
      var step = 18;
      if (e.shiftKey) {   // Shift + panah menggeser model
        if (k === 'ArrowLeft') { state.panX -= step; e.preventDefault(); }
        if (k === 'ArrowRight') { state.panX += step; e.preventDefault(); }
        if (k === 'ArrowUp') { state.panY -= step; e.preventDefault(); }
        if (k === 'ArrowDown') { state.panY += step; e.preventDefault(); }
        return;
      }
      if (k === 'ArrowLeft') { state.yaw -= 0.12; e.preventDefault(); }
      if (k === 'ArrowRight') { state.yaw += 0.12; e.preventDefault(); }
      if (k === 'ArrowUp') { state.pitch = Math.min(1.35, state.pitch + 0.08); e.preventDefault(); }
      if (k === 'ArrowDown') { state.pitch = Math.max(-1.35, state.pitch - 0.08); e.preventDefault(); }
      if (k === '+' || k === '=') { state.dist = Math.max(baseDist * 0.4, state.dist - 4); e.preventDefault(); }
      if (k === '-' || k === '_') { state.dist = Math.min(baseDist * 2.4, state.dist + 4); e.preventDefault(); }
    });

    /* --- loop --- */
    var last = 0, stopped = false;
    function frame(t) {
      if (stopped) return;
      if (state.tgt) {
        // gerak halus menuju sasaran; berhenti saat selisihnya kecil
        var g = state.tgt, e = 0.14, done = true;
        ['yaw', 'pitch', 'dist'].forEach(function (key) {
          var d = g[key] - state[key];
          if (Math.abs(d) > (key === 'dist' ? 0.35 : 0.004)) {
            state[key] += d * e; done = false;
          } else state[key] = g[key];
        });
        state.panX += (0 - state.panX) * e;
        state.panY += (0 - state.panY) * e;
        if (done) { state.tgt = null; state.panX = 0; state.panY = 0; }
      } else if (state.spin) {
        state.yaw += (t - last) * 0.00013;
      }
      last = t;
      draw();
      requestAnimationFrame(frame);
    }

    var ro = (typeof ResizeObserver !== 'undefined') ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(function (t) { last = t; frame(t); });

    return {
      spots: spots,
      setView: function (name) {
        var views = {
          samping: [0.0001, 0.02], atas: [0.0001, 1.30],
          depan: [Math.PI / 2, 0.06], tigaperempat: [baseYaw, basePitch]
        };
        var v = views[name] || views.tigaperempat;
        state.yaw = v[0]; state.pitch = v[1];
      },
      layers: layerDefs,
      toggleDoors: function () { state.doorsOpen = !state.doorsOpen; return state.doorsOpen; },
      toggleSpin: function () { state.spin = !state.spin; return state.spin; },
      select: function (i) {
        state.active = i;
        state.lockLayer = (spots[i] && spots[i].layer) || null;
      },
      setLayer: function (id, on) {
        if (on) delete state.hidden[id]; else state.hidden[id] = true;
        return !state.hidden[id];
      },
      isLayerOn: function (id) { return !state.hidden[id]; },
      highlight: function (id) { state.lockLayer = id || null; },
      toggleSection: function () {
        state.section = !state.section;
        return state.section;
      },
      setMode: function (m) { state.mode = m; return state.mode; },
      toggleLabel: function () {
        state.labelSemua = !state.labelSemua;
        return state.labelSemua;
      },
      kategori: KATEGORI,
      getMode: function () { return state.mode; },
      /* Menerapkan satu langkah tur: kamera bergerak halus, sedangkan
         pintu, potongan, dan sorotan disetel langsung. */
      applyStep: function (step) {
        if (!step) return;
        state.spin = false;
        if (opts.onSpinChange) opts.onSpinChange(false);
        state.doorsOpen = !!step.doors;
        state.section = !!step.section;
        state.lockLayer = step.layer || null;
        state.hidden = {};
        state.tgt = {
          yaw: (step.yaw !== undefined) ? step.yaw : state.yaw,
          pitch: (step.pitch !== undefined) ? step.pitch : state.pitch,
          dist: (step.dist !== undefined) ? step.dist : state.dist
        };
      },
      zoom: function (dir) {
        state.dist = Math.max(baseDist * 0.4,
                     Math.min(baseDist * 2.4, state.dist + dir * 6));
      },
      reset: function () {
        state.yaw = baseYaw; state.pitch = basePitch; state.dist = baseDist;
        state.panX = 0; state.panY = 0; state.hidden = {};
        state.section = false; state.lockLayer = null; state.active = -1;
        state.mode = 'solid'; state.tgt = null; state.labelSemua = false;
      },
      destroy: function () { stopped = true; if (ro) ro.disconnect(); }
    };
  }

  return { buildModel: buildModel, mount: mount, HOTSPOTS: HOTSPOTS,
           LAYERS: LAYERS, TOURS: TOURS, KATEGORI: KATEGORI };
});
