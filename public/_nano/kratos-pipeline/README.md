# Kratos Spacecraft Bus 1B — situs 3D

Halaman dokumentasi interaktif untuk bus wahana antariksa EXA Kratos 1B, kelas
CubeSat 1U. Model 3D-nya dibangun ulang sebagai kode dari tujuh foto resmi EXA
yang ada di folder ini.

## Cara membuka

**Klik dua kali `index.html`.** Selesai — tidak perlu server, tidak perlu
jaringan.

Halaman ini sengaja dibuat supaya berjalan penuh dari `file://`:

- tidak ada `fetch`, `XMLHttpRequest`, atau ES module
- tidak ada CDN, tidak ada font web
- tidak ada berkas tekstur — semua permukaan digambar ke kanvas saat halaman dibuka
- satu-satunya pustaka luar, Three.js, ikut disalin ke `vendor/`

Syaratnya cuma satu: **folder ini harus tetap utuh.** Kalau `index.html`
dikirim sendirian tanpa foldernya, modelnya tidak akan tampil. Untuk dikirim ke
orang lain, zip seluruh folder.

## Isi halaman

| Bagian | Isi |
| --- | --- |
| Model | Panggung 3D: seret memutar, gulir memperbesar, penggeser melipat dan membentangkan sayap surya |
| Poin | Dua belas titik komponen — klik nomornya pada model atau poinnya di daftar |
| Subsistem | ICEPS, perisai, struktur, daya dan muatan |
| Spesifikasi | Tabel angka yang tercetak pada lembar EXA |
| Sumber | Ketujuh foto rujukan beserta batas ketelitiannya |

Penggeser **Terlipat ↔ Terbentang** adalah bagian yang paling menjelaskan
wahana ini: panel pertama tiap sisi bukan sayap tempelan, melainkan **dinding
badannya sendiri** yang berayun keluar. Itulah sebabnya semua foto EXA
memperlihatkan bagian dalam wahana tanpa ada panel yang dilepas.

## Berkas

| Berkas | Isi |
| --- | --- |
| `index.html` | Halaman: tata letak, gaya, dan seluruh teks dokumentasi |
| `kratos-model.js` | `window.createKratosModel()` → model Three.js, termasuk rantai engsel |
| `kratos-poin.js` | Dua belas titik komponen — satu-satunya salinan daftar itu |
| `kratos-viewer.js` | Panggung, orbit, titik bernomor, lapisan, dan kendali |
| `vendor/three.min.js` | Three.js r128 UMD, MIT, dari cdnjs |
| `capture.html` | Panggung pengambil gambar untuk tahap tinjauan. **Bukan bagian situs** |
| `pipeline-notes.md` | Catatan jujur pembangunan: yang diukur, yang ditebak, gerbang yang dilewati |
| `renders/` | Render tinjauan dan lembar pembanding lawan foto |
| `assessment.json`, `detail-inventory.json`, `detail-crops/` | Artefak pipeline img2threejs |
| `.img2threejs/state.json` | Checklist pipeline |

## Titik komponen menempel pada mesh, bukan pada koordinat

Sayapnya bergerak. Kalau titik komponen ditulis sebagai koordinat tetap, titik
"susunan surya" akan tertinggal di udara begitu sayapnya dilipat.

Karena itu tiap poin di `kratos-poin.js` boleh memakai `ikut: '<nama mesh>'`
sebagai ganti `pos`. Letaknya lalu dihitung dari matriks dunia mesh itu setiap
bingkai. Poin yang menyebut mesh yang tidak ada akan mengeluarkan peringatan di
konsol — bukan diam-diam menempel di titik nol.

## Mutu dan batasnya

Model ini **rekonstruksi, bukan gambar teknik.** Ringkasnya:

- Ketujuh foto 750 × 500 px, dinilai `conditional` oleh alat pemeriksa.
- Nisbah siluet meleset **0,5 persen** dan skalanya **3,5 persen** terhadap foto
  rujukan — keduanya lulus ambang.
- Tumpang tindih siluet **0,674** lawan ambang 0,85 — **belum lulus**.
- Bagian dalam badan, sisi bawah, dan seluruh tulisan label bukan hasil
  pengukuran.

Rinciannya, termasuk dua belas putaran perbaikan dan apa yang ditemukan di tiap
putaran, ada di `pipeline-notes.md`.

Satu catatan untuk siapa pun yang melanjutkan model ini: **jangan naikkan
`metalness` tanpa memasang peta lingkungan.** Pada percobaan pertama, engsel
kuningan tergambar hitam dan perisai emas jadi cokelat lumpur, karena permukaan
logam tanpa lingkungan tidak punya apa pun untuk dipantulkan. Sudah ditulis
sebagai komentar di `kratos-model.js`, tepat di atas daftar bahannya.

## Checklist pipeline

`.img2threejs/state.json` berhenti di `await-pass-transition`. Itu disengaja:
langkah tersebut menunggu transisi antar-pass dari generator, sementara model
ini ditulis langsung sebagai JavaScript dalam satu tahap — karena generator
skill menghasilkan TypeScript, dan halaman ini wajib berjalan tanpa build.
