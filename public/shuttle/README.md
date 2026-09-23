# Model 3D halaman USA — Three.js

Dua model pada **discovery.html**, keduanya digambar Three.js, bukan perender kanvas situs.

| Varian | Model | Sumber | Status |
| --- | --- | --- | --- |
| `stack` | tumpukan peluncuran | orbiter: pindaian Smithsonian; tangki, booster, penopang: foto siang `../_orbiter/reference/discovery-ov103.png` | dibangun ulang penuh, lalu orbiternya diganti mesh pindaian |
| `discovery` | orbiter sendiri | pindaian Smithsonian yang sama | memakai pindaian juga, dipecah tujuh wilayah supaya ketujuh tombol lapisan tetap hidup |

## Orbiter pindaian pada varian `stack`

`scan-orbiter.js` memuat mesh fotogrametri Discovery OV-103 milik Smithsonian dari
`scan/` dan menggantikan orbiter prosedural di dalam tumpukan. Domain publik; lisensinya
di `scan/SMITHSONIAN-LICENSE.txt`.

Penggantian dilakukan SESUDAH model jadi, bukan sebagai cabang di dalam `model.js`, dengan
tiga alasan: orbiter prosedural langsung tampil lalu ditingkatkan begitu pindaian sampai;
kalau asetnya gagal dimuat yang prosedural tetap di tempatnya sehingga halaman tidak pernah
kosong; dan kotak batas untuk membingkai kamera sudah benar sejak awal.

Angka penempatan diukur dari mesh setelah diputar ke sumbu situs, bukan dikira-kira:
hidung di x +20,587, perut badan tengah di y -6,171, bentang z +-13,039. Hidungnya ditaruh
di x = 12,38 (sama dengan `ORB_NOSE` prosedural) dan perutnya 0,70 satuan di atas permukaan
tangki.

Dua hal yang perlu diketahui: **roda pendaratnya terjulur** pada pindaian aslinya, jadi
pemuatnya memotong 16.140 segitiga yang seluruh simpulnya di bawah garis perut; dan
pindaian ini **satu mesh utuh**, jadi grup `orbEngine` tidak ada lagi pada varian `stack` —
seluruh orbiter masuk grup `orb`, dan tombol lapisan tetap bekerja.

## Orbiter pindaian pada varian `discovery`

Varian ini memakai mesh pindaian yang sama, tetapi dengan tiga perbedaan.

**Skala lain.** Kedua puluh titik komponennya ditulis untuk orbiter prosedural yang memakai
sekitar 1,0 satuan per meter, bukan 1,0952 seperti tumpukan. Pindaiannya dipasang pada skala
1,0 dengan pergeseran y = 3,0. Angka itu bukan tebakan: orbiter prosedural menaruh pusat
hidung di y = 0,4 dan puncak sirip di y = 10,9, selisih 10,5; pindaian menaruh keduanya di
-2,6 dan +7,913, selisihnya juga 10,5. Proporsinya sudah cocok pada skala 1, jadi tinggal
digeser 0,4 - (-2,6) = 3,0.

**Roda pendarat DIPERTAHANKAN.** Kebalikan dari tumpukan. Titik komponen nomor 7 memang
menunjuk "Roda pendarat depan", jadi memotong rodanya akan membuat label itu menunjuk ruang
kosong.

**Dipecah tujuh.** Pindaian ini satu mesh utuh, sedangkan halaman punya tujuh tombol lapisan.
Tanpa dipecah, enam tombol tidak mengendalikan apa pun. Tiap segitiga dimasukkan ke satu
wilayah menurut letak titik beratnya, dan ketujuh geometrinya BERBAGI atribut posisi, normal,
dan UV — yang berbeda hanya indeksnya, jadi tidak ada salinan tambahan di memori. Hasil
pembagiannya: body 84.006, wing 51.047, engine 5.537, fin 3.662, door 3.054, canopy 1.574,
pod 1.120. Tidak ada wilayah yang kosong.

### Enam anchor dipindah, dua tidak cocok

Enam dari dua puluh titik meleset dari pindaian, semuanya di buritan, karena orbiter
prosedural yang mereka acu lebih panjang di sana dan menaruh polong serta flap sedikit
berbeda. Posisi barunya bukan karangan: tiap satu adalah titik berat simpul mesh yang memang
milik bagian itu.

| # | Label | Posisi lama | Posisi baru |
| --- | --- | --- | --- |
| 9 | Pintu ruang muatan | [0, 5.6, 2.6] | [-6.0, 4.2, 1.6] |
| 15 | Elevon | [-14.5, -1.2, 9.0] | [-10.8, -1.8, 8.1] |
| 17 | Polong OMS | [-17.5, 5.4, 2.4] | [-14.2, 3.6, 2.3] |
| 18 | Tiga mesin utama | [-19.5, 2.2, 0] | [-15.5, 1.9, 0] |
| 19 | Body flap | [-19.0, -1.7, 0] | [-15.7, -0.7, 0] |
| 20 | Pintu parasut | [-18.4, 4.6, 0] | [-16.0, 7.2, 0] |

Setelah itu **18 dari 20** mendarat di wilayah yang cocok dengan lapisannya. Dua yang tersisa
dicatat apa adanya, bukan dipaksakan:

- **#1 Kerucut hidung** memakai lapisan `wing` pada data aslinya, dan mendarat di wilayah
  `body`. Itu bawaan data lama, bukan akibat penggantian ini: hidung dan tepi depan sayap
  memang sama-sama pelindung panas RCC, jadi penulis aslinya mengelompokkannya begitu. Tidak
  saya ubah, karena itu keputusan penyajian, bukan kesalahan.
- **#9 Pintu ruang muatan** mendarat di wilayah `body`, berjarak 1,0 satuan. Pada pindaian
  pintunya tertutup dan menyatu dengan punggung badan, jadi wilayah `door` di situ tipis.

## Yang berubah pada pembangunan ulang terakhir

Model `stack` sebelumnya dibangun dari foto malam. Foto siang menggantikannya karena
`probe_image.py` menilainya `pass` tanpa peringatan sedangkan foto malam hanya
`conditional`, dan karena tujuh ciri di bawah ini memang tidak terbaca dalam gelap.

| Ciri | Dari foto malam | Dari foto siang |
| --- | --- | --- |
| Ujung booster di bawah ujung tangki | 5,94 m | **10,45 m**, terukur, kedua ujungnya dalam satu bidang |
| Hidung booster | dua sudut kerucut dengan undakan | kerucut membulat menerus |
| Pita hitam melingkar booster | tidak terlihat | **dua** per booster |
| Tempelan jingga di frustum | tidak terlihat | ada, satu per booster |
| Bagian dalam nosel booster | ditebak logam abu | **merah bata**, terukur (112, 41, 48) |
| Penanda sayap | huruf tak terbaca | NASA di sayap -Z; bendera dan `Discovery` di sayap +Z |
| Puncak tangki | polos | tudung kerucut gelap, plus stiker putih di ogive |

## Berkas

| Berkas | Isi |
| --- | --- |
| `../vendor/three.min.js` | Three.js r128 UMD, MIT, dari cdnjs. Versi UMD terakhir yang bisa dipanggil `<script>` biasa. |
| `model.js` | `window.createSpaceShuttleModel()` → tumpukan peluncuran. |
| `scan-orbiter.js` | Pemuat mesh orbiter pindaian, plus penempatannya pada tumpukan. |
| `scan/` | Mesh dan tekstur pindaian Smithsonian, 7,5 MB, plus lisensinya. |
| `orbiter.js` | `window.createOrbiterModel()` → orbiter sendiri. Kini juga diganti pindaian; yang prosedural jadi jalur mundur. |
| `three-stack-viewer.js` | Adapter `window.ThreeModelViewer` (`ThreeStackViewer` tetap jadi alias). |
| `harness.html` | Panggung uji sederhana. |
| `review-harness.html` | Panggung tinjauan: tumpukan didirikan seperti di situs, kamera bisa diatur dari luar. |
| `capture.html` | Pengambil gambar untuk tahap tinjauan. Mode `?alpha=1` dan `?strip=1` untuk gerbang. |
| `hotspot-check.html` | Bukti kesembilan titik komponen jatuh di dalam komponen yang benar. |
| `renders/` | Hasil render tiap sudut, lembar perbandingan, `parts.json`. |
| `../_orbiter/` | Seluruh artefak pipeline untuk rujukan siang: analisis, spec, bukti bahan, inventaris detail. |

## Skala dan sumbu

```
+X  ke hidung      -X  ke buritan      +Y  sisi orbiter      +-Z  booster
```

Skala **1,0952 satuan per meter**, dikunci kontrak situs: jari-jari tangki 4,6 satuan
sedangkan aslinya 4,2 m. Foto membenarkan skala itu secara mandiri — bentang sayap
terukur 24,0 m melawan 23,79 m pada dimensi terbitan, meleset 0,9 persen.

## Titik komponen DIPINDAH

Ini perubahan yang perlu diketahui sebelum menyentuh `discovery.html`.

Kesembilan koordinat `HOTSPOTS.stack` ditulis untuk model lama. Karena jarak ujung
tangki ke ujung booster berubah dari 5,94 m menjadi 10,45 m, tidak semua koordinat lama
bisa tetap sahih — titik "tiga mesin utama" misalnya akan jatuh di tengah sayap. Jadi
kesembilannya dipindah, dan tiap letak barunya dibuktikan oleh `hotspot-check.html`
lewat uji keberadaan di dalam volume, bukan sekadar diproyeksikan ke layar.

Lapisan `alas` juga dihapus dari `SpaceViewer.LAYERS.stack`: alas dan plakat itu bagian
dari gaya miniatur cetak yang sudah ditinggalkan, dan wahana di landasan tidak berdiri
di atas alas.

## Empat jebakan yang sudah diperbaiki

1. **Satu `<canvas>` hanya boleh punya satu jenis konteks seumur hidupnya.** Begitu
   perender kanvas situs mengambil `'2d'`, WebGL tidak akan pernah bisa dipasang di
   elemen yang sama. `switchModel()` mengganti simpul kanvasnya dengan salinan kosong
   tiap kali perendernya berganti (`freshCanvas()` di discovery.html).
2. **`renderer.dispose()` tidak melepas konteks WebGL.** Peramban hanya mengizinkan
   belasan konteks hidup, jadi `destroy()` memanggil `forceContextLoss()` lebih dulu.
3. **Urutan simpul yang terbalik tidak terlihat selama badan masih satu warna.** Loft
   badan orbiter sempat menghadap ke dalam; mukanya terbuang backface culling dan yang
   tampak justru sisi dalamnya, yang warnanya sama persis. Kesalahannya baru muncul
   ketika punggung dan perut dibedakan warnanya — dan langsung tampak sebagai badan
   yang gelap seluruhnya.
4. **`ExtrudeGeometry` menambah `bevelThickness` di kedua ujung.** Setengah tebal panel
   bukan `thickness / 2`. Penanda sayap, elevon, dan pita tepi depan sempat tertanam di
   dalam sayap karena memakai angka yang salah. Lihat `panelHalf()`.

## Bukti dan gerbang

| Gerbang | Hasil |
| --- | --- |
| `validate_sculpt_spec.py --strict-quality` | PASS |
| `turntable_gate.py` (4 azimut) | PASS, `segmentationReliable: true` |
| `diagnose_render_multi_angle.py` | PASS, tak ada sudut yang runtuh |
| `check_part_coverage.py` | 49 dispesifikasikan, 180 dibangun, 0 galat, 0 peringatan |
| Uji titik komponen (prosedural) | 9 dari 9 di dalam komponen yang benar |
| Uji titik komponen tumpukan (pindaian) | 9 dari 9; nomor 7 dan 8 mendarat di `orb-scan` |
| Uji titik komponen orbiter (pindaian) | 18 dari 20 di wilayah yang cocok; dua sisanya dicatat di atas |
| `diagnose_render.py` (Tier 1) | **tidak terpakai** — lihat di bawah |

### Kenapa gerbang siluet Tier 1 tidak terpakai

Gerbang itu membandingkan siluet render dengan siluet rujukan. Foto rujukan adalah foto
**pemandangan**, bukan foto objek: `build_foreground_mask` menyimpan 58 persen bingkai —
termasuk menara layanan, dek peluncur, dan lanskap — sehingga yang diukur komposisi
fotonya, bukan wahananya. Tiga cara memisahkan wahananya sudah dicoba dan dicatat di
`.img2threejs/orbiter.json`. Ketiganya gagal karena satu sebab geometris: **ujung sayap
kiri melintas persis di depan menara layanan**, jadi keduanya tidak terpisahkan oleh
aturan otomatis mana pun.

Angka mentahnya tetap dicatat apa adanya: IoU 0,176, selisih rasio 0,399, selisih skala
3,600.

Sebagai gantinya, yang dipakai sebagai bukti adalah gerbang yang memang bekerja
(turntable, multi-angle, part coverage) ditambah pengukuran langsung: puncak booster
meleset 0,08 satuan, stasiun sayap meleset 0,31 satuan, dan tiga warna bahan meleset di
bawah 4 persen setelah dua putaran koreksi terukur.

## Yang masih belum cocok

Dicatat, bukan diklaim beres:

- Garis gelap yang menyusur sisi badan orbiter tidak terbaca pada skala tinjauan,
  padahal jelas ada di foto.
- Rusuk intertank terbaca lebih kasar daripada foto, walau jumlahnya sudah dinaikkan
  dari 32 ke 72.
- Stiker di ogive tangki ada, tetapi ukurannya di ambang batas keterlihatan.

## Yang bukan hasil pembacaan gambar

Satu sudut pandang tidak bisa memperlihatkan semuanya. Berikut ini **dugaan**, dan
semuanya ditandai di `root.userData.inferred`:

- sisi jauh tumpukan (dari kesetangkupan)
- perut orbiter dan isi ruang muatan
- dasar booster dan nosel di balik dek peluncur
- penopang belakang orbiter ke tangki
- pangkal glove sayap — tertutup booster di sepanjang rentangnya, ditempatkan dari
  panjang tali busur pangkal sayap terbitan
- identitas gugus penanda gelap di punggung badan depan: jelas ada dan setangkup, tetapi
  sudut ini tidak bisa memastikan itu apa

## Tahap pipeline

Tahap `blockout` selesai dan ditinjau (`action: continue`, fidelity 0,78). Tahap
lanjutan (`structural-pass` dan seterusnya) **belum dijalankan** secara formal, walau
isi modelnya sudah melewati tingkat blockout — bahan, pencahayaan, dan penanda semuanya
sudah ada. Status resminya ada di `.img2threejs/orbiter.json`.

## Mode luring

`sw.js` tidak ada di folder ini, jadi mode luring situs sudah tidak aktif sejak sebelum
pekerjaan ini. Kalau `sw.js` dipulihkan dari zip, daftar precache-nya harus memuat
`vendor/three.min.js`, `_shuttle/model.js`, `_shuttle/orbiter.js`, dan
`_shuttle/three-stack-viewer.js`.
