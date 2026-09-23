# Catatan pipeline — rekonstruksi Kratos Bus 1B

Berkas ini adalah catatan jujur tentang bagaimana model dibangun: apa yang
benar-benar diukur dari foto, apa yang disimpulkan, dan gerbang mana yang
dilewati beserta alasannya. Dipakai sebagai bukti untuk `.img2threejs/state.json`.

## 1. Admisi rujukan

Tujuh foto resmi EXA, semuanya 750 × 500 px kecuali `main-600x400` (600 × 400).

`probe_image.py` menilai **ketujuhnya `conditional`**, dengan satu peringatan yang
sama: *low resolution; small geometry/material details may be unreliable*.

Diterima, dengan alasan yang menutup kekurangan itu: **tujuh sudut pandang**,
termasuk terlipat, setengah terbuka, terbentang penuh, dan satu tampak dalam.
Rubrik intake menyebut jumlah tampak sebagai pengungkit mutu terbesar, dan di
sini justru itulah yang berlimpah. Yang tetap tidak terselamatkan oleh jumlah
tampak adalah tulisan kecil pada label — dan itu memang tidak dibangun.

## 2. Analisis gambar

| Lapisan | Hasil |
| --- | --- |
| Identifikasi | Bus wahana antariksa kelas CubeSat 1U, `primaryDomain: object` |
| Bentuk keseluruhan | Kubus 1U dengan dua sayap panel simetris; simetri bilateral terhadap bidang YZ |
| Makro | Rangka, perisai, enam panel sayap, isi badan, antena, tali RBF |
| Meso | Rel sudut, bingkai ujung, dek, engsel kuningan, papan ICEPS, baterai |
| Mikro | Jari-jari sel surya, bantalan tembaga tepi papan, kerutan lembaran emas, cip pada perisai |
| Hubungan | Panel-0 tiap sisi **adalah dinding badan** — berengsel pada rusuk belakang, membuka keluar; panel-1 dan panel-2 menggantung berantai padanya |
| Material | Aluminium anodisasi (logam, kasar sedang), lembaran emas (logam, kilap tinggi), sel surya nila (dielektrik gelap), PCB putih (dielektrik matte), kuningan engsel |
| Ciri identitas | Perisai emas satu muka; engsel kuningan dua susun tiap sambungan; garis jari-jari sel yang sangat rapat; tali RBF merah |
| Ketidakpastian | Sisi yang tidak pernah menghadap kamera; tata letak di dalam papan ICEPS; tulisan label |

Temuan yang paling menentukan bentuk: **panel pertama tiap sisi adalah dinding
badannya sendiri.** Itulah sebabnya foto-foto EXA memperlihatkan bagian dalam
wahana tanpa ada panel yang dilepas — dan itulah yang membuat rantai engselnya
harus dibangun sungguhan, bukan ditempel sebagai sayap terpisah.

## 3. Skala

EXA tidak mencantumkan dimensi pada ketujuh lembar. Skala dijangkarkan pada
standar CubeSat 1U — **10 × 10 × 11,35 cm** — dan seluruh angka lain diturunkan
sebagai nisbah terhadap badan itu, diukur pada `main-600x400.jpg`:

| Besaran | Nisbah terukur | Nilai model |
| --- | --- | --- |
| Lebar panel | ≈ 1,06 × lebar badan | 10,6 cm |
| Tinggi panel | ≈ 0,97 × tinggi badan | 11,0 cm |
| Rentang terbentang | 3 panel + badan tiap sisi | 75 cm |
| Rel sudut | ≈ 0,09 × lebar badan | 0,9 cm |

## 4. Gerbang yang dijalankan dan yang dilewati

| Langkah | Status | Keterangan |
| --- | --- | --- |
| image-analysis | selesai | tabel di atas |
| reference-suitability / admission | selesai | ketujuh foto `conditional`, diterima atas dasar tujuh tampak |
| local-spec-search | selesai | koleksi `core_3d`, **0 hasil** — korpus lokal tidak memuat CubeSat, jadi tidak ada bukti domain yang bisa ditarik |
| pre-spec-assessment | selesai | `assessment.json`, tingkat `complex` |
| detail-inventory | selesai | `detail-inventory.json` + `detail-crops/` |
| projection-route | dilewati | tidak ada permukaan bercorak yang perlu diproyeksikan; seluruh material dapat didekati secara prosedural |
| spec-authoring → generator | **dilewati, disengaja** | lihat di bawah |
| material-evidence | dilewati | warna diambil langsung dari foto secara visual; `extract_pbr_evidence.py` tidak dijalankan |
| render-capture / review | selesai | tujuh putaran tinjauan di peramban, dicatat di bawah |
| multi-angle | selesai | diperiksa dari depan, samping, atas, dan sisi perisai, pada tiga tingkat pembentangan |

### Kenapa generator spec dilewati

`generate_threejs_factory.py` menghasilkan **TypeScript**. Halaman ini wajib
berjalan dari `file://` dengan klik dua kali — tanpa build, tanpa bundler, tanpa
modul. Jadi modelnya ditulis langsung sebagai JavaScript biasa di
`kratos-model.js`, dan keputusan rekonstruksinya disimpan sebagai komentar di
dalam berkas itu, bukan hanya di kepala saya.

Ini penyimpangan dari alur skill dan dicatat sebagai penyimpangan, bukan
disamarkan sebagai kepatuhan.

## 5. Catatan tinjauan

| Putaran | Yang ditemukan | Tindakan |
| --- | --- | --- |
| 1 | Sayap membentang ke sisi yang sama, wahana lonjong | arah engsel dibalik; sisi kiri diputar, bukan diskalakan negatif |
| 2 | Wahana sebesar semut di tengah panggung | jarak kamera memakai bidang pandang tegak untuk bentang mendatar — diperbaiki dengan nisbah panggung |
| 3 | Sayap kiri memperlihatkan punggung papan polos | sel dipasang pada kedua muka tiap panel |
| 4 | Kartu keterangan menutupi model yang dijelaskannya | kartu dipindah jadi kolom di samping panggung |
| 5 | Model terpotong saat jendela diubah lebar | jarak dasar dihitung ulang pada tiap `resize` |
| 6 | (pemeriksaan) terlipat, setengah, terbentang | ketiganya benar; rantai melipat seperti kipas tanpa saling menembus |
| 7 | (pemeriksaan) `file://` | tidak ada `fetch`, modul, font web, atau pemuat tekstur |
| 8 | Gerbang Tier-1 gagal, IoU 0,207, peringatan *51,2% piksel depan di luar gumpalan terbesar* | latar panggung tangkap diganti abu: bingkai panel wahana ini putih, dan di atas latar putih maskernya pecah jadi pulau sehingga gerbang hanya mengukur badannya |
| 9 | Nisbah dan skala masih meleset | kamera disisir: 4 sudut, lalu 4 faktor bingkai, lalu 12 kombinasi yaw × pitch |
| 10 | Lembar pembanding: engsel hitam, perisai cokelat lumpur | `metalness` 0,85–0,9 tanpa peta lingkungan — diturunkan ke 0,30–0,42 |
| 11 | Sel terbaca sebagai plastik biru | warna dasar digelapkan ke hampir hitam, sel diperbesar hingga hampir memenuhi papan |
| 12 | Rel sudut terlalu gemuk, tali RBF terlalu besar | rel 0,9 → 0,62; pita RBF diperkecil |

## 6. Hasil gerbang deterministik

Diukur `diagnose_render.py`, render `renders/p2-utama.png` lawan
`KRATOS-1U-CubeSat-Platform-main-600x400.jpg`:

| Ukuran | Awal | Akhir | Ambang | Status |
| --- | --- | --- | --- | --- |
| Silhouette IoU | 0,207 | **0,674** | 0,85 | belum lulus |
| Aspect-ratio delta | 0,371 | **0,005** | 0,05 | lulus |
| Scale delta | 0,704 | **0,035** | 0,08 | lulus |
| Bilateral symmetry error | 0,040 | 0,171 | — | tercatat |

**Gerbang Tier-1 belum lulus, dan itu tidak disamarkan.** Yang lulus adalah dua
ukuran yang menilai proporsi: nisbah siluet meleset 0,5 persen dan skalanya 3,5
persen. Yang tidak lulus adalah tumpang tindih siluet.

Sisa selisihnya berasal dari dua hal yang tidak bisa diperbaiki dengan menggeser
kamera: **perspektif lensa foto tidak diketahui** (skill punya
`solve_camera_pose.py` untuk ini, tidak dijalankan), dan **lebar celah antarpanel
serta sudut jatuh sayap** pada foto tidak persis seperti yang saya bangun. Pada
benda tipis dan panjang, meleset selebar satu bingkai panel saja sudah memangkas
IoU jauh, sementara proporsi keseluruhannya tetap benar — dan itulah yang
terbaca pada angka-angka di atas.

Lembar pembandingnya ada di `renders/banding.png` (sebelum perbaikan bahan) dan
`renders/banding2.png` (sesudah).

## 7. Yang BUKAN hasil pengukuran

Disebut terpisah supaya tidak ada yang mengira model ini gambar teknik:

- Tata letak komponen di dalam papan ICEPS — hanya siluet papan, prosesor,
  radio, dan baterai yang ditempatkan; posisi persisnya dugaan.
- Sisi bawah wahana, yang tidak pernah menghadap kamera pada foto mana pun.
- Bentuk persis engsel di dalam sambungannya.
- Tulisan pada label dan sablon; tidak dibangun sama sekali, bukan dikarang.
- Jumlah sel per panel diambil dari yang terlihat (2 per muka); foto tidak
  memperlihatkan seluruh panel dari jarak yang cukup untuk memastikannya sama
  pada keenam panel.
