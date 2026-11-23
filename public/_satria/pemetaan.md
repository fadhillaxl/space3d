# Pemetaan bagian model SATRIA

Berkas `Satelit_Satria_1.glb` memberi nama bagiannya secara generik —
`Cube.001`, `Cylinder.003`, `NurbsPath`. Namanya tidak memberi tahu apa pun,
jadi keempat belas bagiannya disorot satu per satu di `harness.html`
(fungsi `sorot(nama)`: satu bagian merah, sisanya abu pudar) dan dicatat di
sini. Kalau model ini diganti lagi, tabel ini yang dipakai untuk memeriksa
apakah lapisan dan titik komponen masih menunjuk benda yang sama.

## Sumbu dan skala

GLB-nya kebetulan memakai sumbu yang sama dengan model kanvas Satria yang
lama: **+X ke arah antena (sisi hadap Bumi), +Y ke atas, ±Z bentang sayap.**
Karena itu tidak ada pemutaran di `satria-model.js` — yang dilakukan hanya:

1. menggeser titik asal ke tengah node `Cube` (`[-0.748, 3.462, -0.072]`);
2. mengalikan dengan **2,418**, dicari dari ujung sayap: titik "Panel surya"
   lama ada di `z = 22`, ujung sayap GLB di `z ≈ 9,1`.

Hasilnya bentang sayap pas di 44 satuan dan nosel pendorong jatuh di
`x = -5,31` — titik lamanya `x = -5,0`. Jarak kamera dan langkah tur di
`satria-1.html` tetap sah tanpa diubah.

## Keempat belas bagian

Pusat dan ukuran di bawah ini sudah dalam koordinat halaman (sesudah geser
dan skala), dibaca dari `daftar()` di panggung uji.

| Node GLB | Wujudnya | Grup | Pusat | Ukuran |
| --- | --- | --- | --- | --- |
| `Cube` | Dua pelat lebar di sisi utara dan selatan badan | `osr` | 0, 0, 0 | 10,25 × 4,28 × 5,87 |
| `Cube.001` | Kotak badan beserta seluruh dindingnya | `bus` | 0,06, 0,36, 0 | 9,96 × 3,23 × 3,94 |
| `Cube.004` | Susunan pelat mendatar di ujung −X, dekat nosel | `bus` | −5,07, 0, 0 | 0,14 × 2,68 × 4,04 |
| `Cube.005` | Kotak-kotak perangkat kecil di sisi atas badan | `bus` | 0,34, 1,72, −0,03 | 4,46 × 0,39 × 3,21 |
| `Cylinder.001` | Siku kecil menempel di dinding badan | `bus` | −2,67, 1,6, −1,69 | 0,11 × 0,38 × 0,67 |
| `NurbsPath` | Pipa melengkung di dalam badan | `tank` | −1,03, 1,3, −0,09 | 1,81 × 1,08 × 1,58 |
| `Cube.003` | Dua sayap surya, lima panel per sayap | `solar` | 2,59, 0, 0 | 0,11 × 7,08 × **43,99** |
| `Cube.002` | Dua batang penopang dari badan ke sayap | `solar` | 2,59, 0, 0 | 0,31 × 2,46 × 12,19 |
| `Cylinder.002` | Dua reflektor di atas, satu di +Z satu di −Z | `antenna` | 3,97, 5,66, 0 | 0,59 × 3,81 × 10,72 |
| `Cylinder.003` | Dua lengan melengkung penopang reflektor atas | `antenna` | 4,56, 3,63, 0 | 0,57 × 4,2 × 7,05 |
| `Cylinder.004#1` | Reflektor bawah, menggantung di bawah badan | `antenna` | 4,97, −5,54, 0,32 | 0,73 × 3,81 × 3,81 |
| `Cylinder.005` | Menara umpan dari badan turun ke reflektor bawah | `antenna` | 5,13, −3,04, −0,11 | 1,29 × 5,14 × 1 |
| `Cylinder.004#0` | Serpih 4 segitiga, tidak terlihat | `antenna` | 5,34, −1,49, −0,49 | — |
| `Cylinder` | Nosel di ujung −X | `thruster` | −5,31, −1,37, −0,02 | 0,63 × 0,82 × 0,37 |

Tiga reflektor, bukan satu: dua di atas (`Cylinder.002`, satu mesh berisi
keduanya) dan satu menggantung di bawah (`Cylinder.004#1`).

## Yang tidak ada di model ini

Model kanvas yang lama punya lapisan **`tower`** (tabung struktural) dan
isi dalam bus. Model hasil pindaian ini **tidak memodelkan bagian dalam
bus sama sekali** — `Cube.001` adalah kotak tertutup, tidak ada tabung
tengah maupun tangki di dalamnya. Jadi:

- lapisan `tower` dihapus dari daftar lapisan;
- lapisan `tank` dipetakan ke `NurbsPath`, pipa propelan yang memang ada,
  bukan ke tangkinya. Pipa itu berada di dalam badan, jadi baru terlihat
  saat mode **Potongan** menyala;
- titik "Tabung tengah" dan "Tangki propelan" **tetap ada** — keduanya
  diarahkan ke dalam badan bus, dan keterangannya ditulis ulang supaya
  tidak menjanjikan bagian yang tidak tergambar.

`Cube` dipetakan ke `osr`, bukan `bus`, karena dua pelat itu memang kedua
sisi utara–selatan badan — dan pada satelit geostasioner sisi itulah yang
jadi radiator. Mematikan lapisan Radiator OSR sekarang benar-benar
membuka kedua dinding itu.

## Cara memeriksa ulang

```bash
python -m http.server 8731
```

lalu buka `http://127.0.0.1:8731/_satria/harness.html`. Di konsol:

- `daftar()` — pusat dan ukuran tiap bagian
- `sorot('Cube.004')` — satu bagian merah, sisanya pudar
- `grup('antenna')` — hanya satu grup lapisan
- `warnaUji(true)` — tiap bagian satu warna
- `sudut(yaw, pitch, muat)` — putar dan atur jarak kamera
