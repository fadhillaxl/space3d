/* =====================================================================
   buran-model.js — orbiter Buran untuk halaman Rusia
   =====================================================================

   Buran dan Space Shuttle punya siluet yang nyaris sama, dan pindaian
   Smithsonian atas Discovery OV-103 dipakai di sini sebagai geometrinya
   dengan peta warna livery Buran/СССР menggantikan finis NASA. Yang
   diganti hanya peta warnanya: posisi, normal, UV dan indeksnya identik
   byte per byte dengan pindaian aslinya, jadi peta normal dan peta
   oklusi pindaian itu tetap sahih dan tetap dipakai.

   Perlu disebut apa adanya: ini BUKAN pindaian Buran. Ini airframe
   Discovery yang dicat ulang. Bentuk umumnya benar — keduanya memang
   memecahkan persoalan aerodinamika yang sama — tetapi perbedaan nyata
   antara kedua wahana, terutama buritan Buran yang tidak membawa tiga
   mesin utama, tidak terwakili oleh geometri ini. Titik komponen nomor
   dua pada halaman ini justru menerangkan perbedaan tersebut, jadi
   keterangannya tetap benar meski modelnya tidak menunjukkannya.

   Semua kerja beratnya sudah ada di orbiter.js dan scan-orbiter.js.
   Berkas ini hanya memilih livery-nya.
   ===================================================================== */
(function (root, factory) {
  var lib = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = lib;
  else root.createBuranModel = lib;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return function createBuranModel(options) {
    options = options || {};
    if (typeof window.createOrbiterModel !== 'function') {
      throw new Error('orbiter.js belum termuat');
    }
    /* Orbiter prosedural dibangun lebih dulu sebagai jalur mundur, lalu
       scan-orbiter.js menggantinya dengan pindaian berlivery Buran. Kalau
       pindaiannya gagal dimuat, yang prosedural tetap di tempatnya dan
       halaman tidak pernah kosong. */
    var o = {};
    for (var k in options) if (Object.prototype.hasOwnProperty.call(options, k)) o[k] = options[k];
    o.livery = 'buran';
    return window.createOrbiterModel(o);
  };
});
