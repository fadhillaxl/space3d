/* =====================================================================
   rascube-poin.js — enam titik komponen RASCube V2
   =====================================================================

   Dipindahkan dari HOTSPOTS.rascube pada cubesat.html yang lama:
   label, koordinat, dan catatannya sama. Koordinatnya tetap sahih karena
   rascube-model.js dibangun pada sumbu dan skala yang sama dengan model
   kanvas yang dulu memakainya.

   Yang ditambahkan hanya dua hal yang dibutuhkan viewer ini: sudut
   pandang untuk tiap poin, dan butir rincian untuk kartu keterangan.
   Butir bertanda "QSG:" diambil dari Quick Start Guide V2.0
   (_nano/dokumen/rascube-qsg-v2.pdf).
   ===================================================================== */

window.RASCUBE_POIN = [
  {
    n: 1, label: 'Antena cambuk', lapisan: 'antena',
    pos: [2.5, 11.8, -0.3], pandang: { yaw: -0.55, pitch: 0.32 },
    teks: 'Batang tunggal pada dudukan berulir di dek, dipasang menepi supaya tidak menaungi antena patch. Pada kit kelas, antena inilah yang mengirim data sensor ke perangkat lunak Mission Control di meja sebelah — bukan ke stasiun bumi.',
    rinci: ['Dudukan berulir di dek atas', 'Mengirim data ke Mission Control secara nirkabel',
            'QSG: radio LoRa 915 MHz, frekuensinya sedikit beda per nomor seri',
            'QSG: jangan nyalakan kit tanpa antena terpasang, karena pemancarnya bisa rusak']
  },
  {
    n: 2, label: 'Antena patch', lapisan: 'antena',
    pos: [-2.2, 5.5, -0.3], pandang: { yaw: -0.4, pitch: 0.95 },
    teks: 'Pelat tembaga yang menempel rata pada dek dan menyerong beberapa derajat agar bebas dari dudukan cambuk. Bentuk rata seperti ini yang dipakai satelit sungguhan untuk penerima navigasi.',
    rinci: ['Menempel rata pada dek', 'Posisi GPS termasuk data yang dikumpulkan kit',
            'QSG: papan antena punya dua konektor, “GPS” dari Modul Sensor dan “Telem” dari Modul Telemetri']
  },
  {
    n: 3, label: 'Bidang sablon', lapisan: 'dinding',
    pos: [0, 2.2, 5.1], pandang: { yaw: 0.12, pitch: 0.12 },
    teks: 'Nama pembuat disablon langsung pada dinding depan — dinding yang tetap terbaca ketika kit sudah berdiri di meja. Dua baris kecil di bawahnya tidak terbaca pada render sumber, jadi tidak ikut dibangun di model ini.',
    rinci: ['Robinson Aerospace Systems, Australia Selatan']
  },
  {
    n: 4, label: 'Konektor depan', lapisan: 'konektor',
    pos: [0, -0.3, 5.6], pandang: { yaw: 0.25, pitch: 0.05 },
    teks: 'Empat konektor dikumpulkan pada satu dinding: satu bundar besar di tengah, dua persegi mengapitnya, satu lonjong kecil di bawah. Mengumpulkannya di satu sisi membuat urutan mencolok selalu sama, dan itu penting saat satu kit dipakai bergantian oleh banyak kelompok.',
    rinci: ['Satu bundar, dua persegi, satu lonjong', 'Label cetaknya tidak terbaca pada render sumber',
            'QSG: konektor USB dan kamera berada pada satu sisi yang sama',
            'QSG: pin RBF masuk ke lubang bertanda “ON/OFF”, dan dicabut untuk menyalakan kit']
  },
  {
    n: 5, label: 'Panel berlubang', lapisan: 'jala',
    pos: [-5.1, -2.1, 0], pandang: { yaw: -1.35, pitch: 0.1 },
    teks: 'Dua panel berlubang pada tiap dinding samping, dibenamkan ke dalam dinding dan bukan ditempel di atasnya. Lubangnya mengalirkan udara saat kit bekerja di meja — hal yang justru tidak berguna di orbit, tempat panas hanya bisa keluar sebagai radiasi.',
    rinci: ['Dua per dinding samping', 'Untuk aliran udara di meja, bukan untuk orbit',
            'QSG: dinding samping ada dua tipe, A (bertakik, tanpa ulir) dan B (berulir perak)']
  },
  {
    n: 6, label: 'Tiang sudut', lapisan: 'rangka',
    pos: [4.7, -3.4, 4.7], pandang: { yaw: 0.8, pitch: 0.15 },
    teks: 'Empat tiang inilah rangka kit: dinding, dek, dan pelat dasar semuanya disekrupkan padanya. Susunannya meniru rel sudut CubeSat sungguhan, tetapi tujuannya berbeda — supaya bisa dibongkar pasang berulang kali.',
    rinci: ['Rangka aluminium yang dirakit siswa sendiri', 'Bagian pertama dalam urutan perakitan',
            'QSG: empat rel tepi dengan sisipan ulir kuningan, kaki flanel di dasarnya']
  }
];
