export interface Hotspot {
  n: number;
  pos: [number, number, number];
  kat: string;
  layer: string;
  label: string;
  note: string;
  link?: string;
}

export interface LayerDef {
  id: string;
  label: string;
  groups: string[];
  note: string;
}

export interface TourStep {
  title: string;
  text: string;
  yaw: number;
  pitch: number;
  dist: number;
  layer?: string;
  doors?: boolean;
  section?: boolean;
}

export interface MissionData {
  id: string;
  title: string;
  subtitle: string;
  agency: string;
  country: string;
  countryCode: string;
  accentColor: string;
  accentDim: string;
  variants: { id: string; label: string }[];
  overview: string;
  specs: { label: string; value: string; unit?: string }[];
  layers: Record<string, LayerDef[]>;
  hotspots: Record<string, Hotspot[]>;
  tours: Record<string, TourStep[]>;
  facts: string[];
}

export const MISSIONS: Record<string, MissionData> = {
  discovery: {
    id: 'discovery',
    title: 'Space Shuttle Discovery (OV-103)',
    subtitle: 'Wahana Ulang-Alik Bersejarah NASA (1984 – 2011)',
    agency: 'NASA / Rockwell International',
    country: 'Amerika Serikat',
    countryCode: 'USA',
    accentColor: 'var(--usa)',
    accentDim: 'var(--usa-dim)',
    variants: [
      { id: 'discovery', label: 'Orbiter Saja' },
      { id: 'stack', label: 'Tumpukan Peluncuran (Launch Stack)' },
    ],
    overview:
      'Space Shuttle Discovery (OV-103) adalah pesawat ulang-alik ketiga NASA yang paling sering terbang: 39 misi, 365 hari di orbit, menempuh 238 juta kilometer. Discovery menerbangkan Teleskop Hubble, kembali ke antariksa setelah bencana Challenger dan Columbia, serta merakit modul utama Stasiun Luar Angkasa Internasional (ISS).',
    specs: [
      { label: 'Panjang Orbiter', value: '37,24', unit: 'meter' },
      { label: 'Bentang Sayap', value: '23,79', unit: 'meter' },
      { label: 'Tinggi Tumpukan', value: '56,1', unit: 'meter' },
      { label: 'Massa Lepas Landas', value: '2.050.000', unit: 'kg' },
      { label: 'Kapasitas Kargo', value: '27.500', unit: 'kg' },
      { label: 'Kru', value: '5 – 7', unit: 'astronaut' },
      { label: 'Total Penerbangan', value: '39', unit: 'misi sukses' },
      { label: 'Kecepatan Reentry', value: 'Mach 25 (28.000 km/j)' },
    ],
    layers: {
      discovery: [
        { id: 'body', label: 'Badan Utama & Kabin', groups: ['body'], note: 'Rangka aluminium paduan monokok dengan kabin awak tiga dek bertekanan udara.' },
        { id: 'bay', label: 'Ruang Muatan (Payload Bay)', groups: ['bay', 'door'], note: 'Ruang sepanjang 18 meter x diameter 4,6 meter dengan pintu radiator ganda.' },
        { id: 'wing', label: 'Sayap Delta Ganda', groups: ['wing', 'flap'], note: 'Sayap delta dengan sudut sapuan 81° di pangkal dan 45° di luar.' },
        { id: 'fin', label: 'Sirip Vertikal & Rudder', groups: ['fin'], note: 'Sirip penstabil dengan bilah rudder ganda yang bisa membuka sebagai speed brake.' },
        { id: 'engine', label: 'Mesin Utama RS-25 (SSME)', groups: ['engine'], note: 'Tiga mesin roket siklus pembakaran bertingkat hydrolox bersuhu pembakaran ekstrem.' },
        { id: 'pod', label: 'Polong OMS / RCS', groups: ['pod'], note: 'Sistem penggerak manuver orbit dan reaksi kontrol sikap di buritan.' },
      ],
      stack: [
        { id: 'orbiter', label: 'Orbiter Discovery', groups: ['orb', 'orbEngine'], note: 'Pesawat ulang-alik berawak yang menempel di sisi tangki bahan bakar.' },
        { id: 'et', label: 'External Tank (Tangki Luar)', groups: ['etLH2', 'etInter', 'etLOX'], note: 'Tangki jingga berbusa penyimpan 735.000 liter hidrogen cair dan oksigen cair.' },
        { id: 'srb', label: 'Solid Rocket Booster (SRB)', groups: ['srb', 'srbNozzle'], note: 'Dua pendorong roket padat berbahan bakar amonium perklorat berkekuatan dorong raksasa.' },
        { id: 'strut', label: 'Penopang Sambungan', groups: ['strut'], note: 'Batang mekanis pembawa beban getaran dan pemisah piroteknik.' },
      ],
    },
    hotspots: {
      discovery: [
        { n: 1, pos: [17.6, 0.4, 0], kat: 'tps', layer: 'wing', label: 'Kerucut Hidung (RCC)', note: 'Dilapisi material Reinforced Carbon-Carbon yang menahan panas reentry melampaui 1.650°C tanpa meleleh.' },
        { n: 2, pos: [13.2, 4.4, 0], kat: 'awak', layer: 'body', label: 'Flight Deck (Kokpit)', note: 'Enam jendela depan kuarsa tahan tekanan. Komandan dan Pilot mengendalikan wahana dari panel instrumen digital GLASS cockpit.' },
        { n: 3, pos: [14.0, 2.9, 0], kat: 'awak', layer: 'body', label: 'Kabin Bertekanan Tiga Dek', note: 'Dek atas untuk navigasi, dek tengah (middeck) untuk kamar tidur, dapur, toilet, dan airlock, dek bawah untuk avionik.' },
        { n: 4, pos: [0, 5.6, 2.6], kat: 'muatan', layer: 'bay', label: 'Pintu Radiator Kargo', note: 'Selalu dibuka segera setelah mencapai orbit. Bagian dalam pintu dilapisi panel radiator perak untuk membuang kelebihan panas ke ruang hampa.' },
        { n: 5, pos: [0, 2.9, 0], kat: 'muatan', layer: 'bay', label: 'Ruang Muatan 18 Meter', note: 'Volume sebesar gerbong kereta yang mengangkut satelit komunikasi, Teleskop Hubble, dan modul ISS seperti Kibo dan Harmony.' },
        { n: 6, pos: [-9.5, -0.8, 12.0], kat: 'struktur', layer: 'wing', label: 'Sayap Delta Ganda', note: 'Bentuk aerodinamika hipersonik yang memungkinkan orbiter bermanuver melayang (gliding) sejauh ribuan kilometer melintasi benua sebelum mendarat.' },
        { n: 7, pos: [8.0, -1.2, 3.2], kat: 'tps', layer: 'wing', label: 'Ubin Silika Hitam (HRSI)', note: 'Lebih dari 24.000 ubin silika kuarsa berkepadatan rendah. Mampu menahan panas membara hingga 1.260°C namun langsung dingin saat disentuh di tepi beberapa detik setelah keluar tungku.' },
        { n: 8, pos: [-19.5, 2.2, 0], kat: 'mesin', layer: 'engine', label: 'Tiga Mesin Utama RS-25', note: 'Mengonsumsi hidrogen dan oksigen cair dari External Tank. Menghasilkan daya dorong gabungan 5,25 MN dengan efisiensi impuls spesifik tertinggi di dunia roket.' },
        { n: 9, pos: [-17.5, 10.9, 0], kat: 'struktur', layer: 'fin', label: 'Sirip Vertikal & Speed Brake', note: 'Bilah rudder terbelah dua yang berfungsi sebagai rem udara untuk mengontrol laju descent tajam 20 derajat tanpa mesin pendorong.' },
      ],
      stack: [
        { n: 1, pos: [19.0, 0, 0], kat: 'struktur', layer: 'et', label: 'Tangki Oksigen Cair (LOX)', note: 'Terletak di ujung kubah atas External Tank, menampung 553.000 liter LOX pada suhu kriogenik -183°C.' },
        { n: 2, pos: [0.8, 4.6, 0], kat: 'struktur', layer: 'et', label: 'Intertank Ring', note: 'Struktur rusuk baja unpressurized tempat tumpuan beban dorong dari kedua Solid Rocket Booster ke tangki utama.' },
        { n: 3, pos: [-14.0, -4.6, 0], kat: 'struktur', layer: 'et', label: 'Tangki Hidrogen Cair (LH2)', note: 'Tangki raksasa di bagian bawah berkapasitas 1.497.000 liter pada suhu -253°C (hanya 20 derajat di atas nol mutlak).' },
        { n: 4, pos: [2.0, 0, 7.0], kat: 'mesin', layer: 'srb', label: 'Solid Rocket Booster (SRB)', note: 'Roket padat berbobot 590 ton masing-masing. Begitu dinyalakan pada T-0, roket tidak dapat dimatikan hingga propelan habis terbakar dalam 123 detik.' },
        { n: 5, pos: [-29.5, 0, 7.0], kat: 'mesin', layer: 'srb', label: 'Nosel Vektor SRB', note: 'Nosel fleksibel hidrolik yang dapat digerakkan 8 derajat untuk memandu lintasan tumpukan menembus atmosfer tebal.' },
      ],
    },
    tours: {
      discovery: [
        { title: 'Anatomi Wahana Discovery', text: 'Space Shuttle Discovery adalah perpaduan antara kapsul antariksa saat lepas landas dan pesawat layang hipersonik saat kembali ke Bumi.', yaw: -0.75, pitch: 0.3, dist: 64 },
        { title: 'Pelindung Termal Hidung', text: 'Kerucut hidung karbon RCC menahan kompresi plasma udara super-panas saat menembus atmosfer pada kecepatan Mach 25.', yaw: -0.45, pitch: 0.22, dist: 38, layer: 'body' },
        { title: 'Ruang Muatan & Radiator', text: 'Pintu kargo dibuka untuk mengekspos panel radiator perak yang mendinginkan cairan freon pendingin komputer dan kru.', yaw: -0.85, pitch: 0.62, dist: 50, doors: true, layer: 'bay' },
        { title: 'Perut Berlapis Ubin Hitam', text: 'Seluruh permukaan bawah dilindungi ubin silika hitam HRSI yang memancarkan kembali 90% radiasi panas ke atmosfer.', yaw: -2.3, pitch: -0.55, dist: 58, layer: 'wing' },
        { title: 'Klaster Mesin RS-25', text: 'Tiga nosel mesin utama miring mengarah ke titik berat massa tumpukan roket, bekerja berkesinambungan hingga orbit.', yaw: -2.6, pitch: 0.25, dist: 42, layer: 'engine' },
      ],
      stack: [
        { title: 'Konfigurasi Launch Stack', text: 'Tumpukan peluncuran terdiri dari 4 elemen raksasa yang berdiri setinggi gedung 18 lantai di Pad 39A Kennedy Space Center.', yaw: -0.75, pitch: 0.3, dist: 90 },
        { title: 'External Tank (Tangki Luar)', text: 'Tangki oranye berbusa isolasi 2,5 cm berfungsi sebagai tulang punggung struktural pembawa 2 juta liter propelan roket cair.', yaw: -0.45, pitch: 0.16, dist: 75, layer: 'et' },
        { title: 'Sepasang Solid Rocket Booster', text: 'SRB menyumbang 80% daya dorong saat lepas landas dengan suara gemuruh yang menggetarkan bumi hingga radius puluhan kilometer.', yaw: -1.2, pitch: 0.22, dist: 72, layer: 'srb' },
      ],
    },
    facts: [
      'Discovery adalah pesawat ulang-alik yang menerbangkan astronaut tertua dalam sejarah: John Glenn pada usia 77 tahun (misi STS-95).',
      'Discovery menjadi wahana yang mengantarkan kosmonot Rusia pertama terbang di atas wahana antariksa Amerika (STS-60).',
      'Ubin pelindung panas Discovery begitu buruk menghantar panas sehingga bisa diambil dengan tangan telanjang dari tungku 1.200°C di ujung sudutnya.',
    ],
  },

  buran: {
    id: 'buran',
    title: 'Pesawat Ulang-Alik Buran (OK-1K1)',
    subtitle: 'Wahana Reusable Soviet & Peluncur Super Energia (1988)',
    agency: 'NPO Energiya / Roscosmos',
    country: 'Uni Soviet / Rusia',
    countryCode: 'USSR',
    accentColor: 'var(--ussr)',
    accentDim: 'var(--ussr-dim)',
    variants: [
      { id: 'buran', label: 'Orbiter Buran' },
      { id: 'buranStack', label: 'Tumpukan Energia + Buran' },
    ],
    overview:
      'Buran (Badai Salju) adalah jawaban Uni Soviet terhadap program Space Shuttle AS. Meskipun bentuk luar serupa karena hukum fisika aerodinamika yang identik, filosofi teknik Buran sangat revolusioner: Buran tidak membawa mesin utama di orbiter (semua mesin dipasang di roket Energia), dan berhasil melakukan penerbangan perdana ke orbit serta pendaratan 100% otomatis tanpa awak.',
    specs: [
      { label: 'Panjang Wahana', value: '36,37', unit: 'meter' },
      { label: 'Bentang Sayap', value: '23,92', unit: 'meter' },
      { label: 'Tinggi Energia + Buran', value: '58,7', unit: 'meter' },
      { label: 'Daya Angkut Energia', value: '100.000', unit: 'kg ke LEO' },
      { label: 'Muatan Kargo Buran', value: '30.000', unit: 'kg' },
      { label: 'Penerbangan Bersejarah', value: '15 Nov 1988 (Otonom)' },
      { label: 'Kapasitas Kru Rencana', value: 'Hingga 10 kosmonot' },
      { label: 'Sistem Kendali', value: 'Komputer Otonom Biser-4' },
    ],
    layers: {
      buran: [
        { id: 'body', label: 'Badan Pesawat Buran', groups: ['body'], note: 'Bodi pesawat tanpa mesin utama berat di buritan, memberi kapasitas muatan lebih besar.' },
        { id: 'bay', label: 'Pintu Kargo & Radiator', groups: ['bay', 'door'], note: 'Pintu kargo dengan sistem pelepas satelit berbobot hingga 30 ton.' },
        { id: 'wing', label: 'Sayap Delta dengan Elevon', groups: ['wing'], note: 'Sayap komposit serat karbon dengan ubin keramik kuarsa Soviet.' },
        { id: 'fin', label: 'Sirip Ekor Vertikal', groups: ['fin'], note: 'Sirip penstabil dengan rudal pemandu aerodinamik dan rem udara terbelah.' },
        { id: 'pod', label: 'Mesin Manuver Orbit (DOM)', groups: ['pod', 'engine'], note: 'Mesin bahan bakar hidrokarbon ramah lingkungan sintin/LOX untuk penyesuaian orbit.' },
      ],
      buranStack: [
        { id: 'buran', label: 'Orbiter Buran', groups: ['orb', 'orbEngine'], note: 'Orbiter bertindak murni sebagai muatan di lambung samping Energia.' },
        { id: 'core', label: 'Roket Inti Energia (Core)', groups: ['core', 'et'], note: 'Tahap inti pembawa 4 mesin hidrogen cair RD-0120 bertekanan super-tinggi.' },
        { id: 'booster', label: '4 Booster Zenit (RD-170)', groups: ['booster', 'srb'], note: 'Booster cair berbahan bakar minyak tanah RP-1/LOX dengan mesin roket 4 ruang terkuat di dunia.' },
      ],
    },
    hotspots: {
      buran: [
        { n: 1, pos: [17.6, 0.4, 0], kat: 'tps', layer: 'wing', label: 'Hidung Tahan Panas Gravitasi', note: 'Dilapisi komposit karbon Gravimol yang dikembangkan khusus oleh lembaga riset material Soviet VIAM.' },
        { n: 2, pos: [13.2, 4.4, 0], kat: 'navigasi', layer: 'body', label: 'Komputer Navigasi Biser-4', note: 'Arsitektur quad-redundant komputasi otonom 32-bit yang mengendalikan seluruh fase terbang tanpa intervensi awak darat.' },
        { n: 3, pos: [-20.5, 3.4, 0], kat: 'mesin', layer: 'pod', label: 'Buritan Tanpa Mesin Utama', note: 'Perbedaan arsitektur kunci: Buran tidak memikul beban mesin roket peluncur seberat 10 ton di buritan saat mendarat.' },
        { n: 4, pos: [-9.5, -0.8, 12.0], kat: 'struktur', layer: 'wing', label: 'Sayap Delta Soviet', note: 'Dilengkapi 38.000 ubin tahan panas keramik buatan Soviet yang terbukti hanya kehilangan 8 ubin setelah mendarat dari orbit.' },
        { n: 5, pos: [14.5, -2.6, 0], kat: 'struktur', layer: 'body', label: 'Roda Pendarat Otomatis', note: 'Mendarat otomatis pada kecepatan 260 km/j di Baikonur saat badai angin samping kencang dengan deviasi lintasan hanya 1,5 meter.' },
      ],
      buranStack: [
        { n: 1, pos: [20.0, 0, 0], kat: 'struktur', layer: 'core', label: 'Inti Energia Berisi Hidrogen', note: 'Berbeda dengan External Tank AS yang hanya tangki pasif, tahap inti Energia adalah roket utuh bertenaga 4 mesin RD-0120.' },
        { n: 2, pos: [0, 0, 8.0], kat: 'mesin', layer: 'booster', label: 'Booster Zenit RD-170', note: 'Empat booster cair bertenaga mesin RD-170. Mesin ini menghasilkan daya dorong 7,55 MN per booster — roket pendorong cair terkuat.' },
      ],
    },
    tours: {
      buran: [
        { title: 'Pesawat Antariksa Buran', text: 'Buran mewakili puncak kemampuan rekayasa kedirgantaraan Uni Soviet di era Perang Dingin.', yaw: -0.75, pitch: 0.3, dist: 64 },
        { title: 'Buritan Bersih Tanpa SSME', text: 'Karena mesin roket berada di peluncur Energia, Buran memiliki distribusi bobot yang jauh lebih stabil untuk manuver aerodinamis pendaratan.', yaw: -2.6, pitch: 0.25, dist: 44, layer: 'engine' },
        { title: 'Penerbangan Tanpa Awak 1988', text: 'Pada 15 November 1988, Buran mengitari Bumi 2 kali dan mendarat sempurna tanpa satu pun manusia di dalam kokpit.', yaw: -1.6, pitch: 0.1, dist: 46, layer: 'fin' },
      ],
      buranStack: [
        { title: 'Sistem Peluncur Super Energia', text: 'Energia dirancang sebagai peluncur serbaguna yang bisa meluncurkan kargo antariksa raksasa hingga 100 ton dengan atau tanpa Buran.', yaw: -0.75, pitch: 0.3, dist: 92 },
      ],
    },
    facts: [
      'Buran mendarat otomatis dalam kondisi angin silang (crosswind) kecepatan 61 km/j, melakukan manuver koreksi tak terduga yang mengejutkan operator darat.',
      'Sistem roket Energia dapat menerbangkan stasiun militer Polyus seberat 80 ton ke orbit rendah bumi.',
      'Bahasa pemrograman yang digunakan untuk mengendalikan Buran disebut PROPOLIS dan DRAKON, yang mengutamakan verifikasi logika keselamatan mutlak.',
    ],
  },

  'satria-1': {
    id: 'satria-1',
    title: 'Satelit SATRIA-1 (Indonesia)',
    subtitle: 'Satelit Multifungsi VHTS 150 Gbps Terbesar di Asia (146° BT)',
    agency: 'BAKTI Kominfo / PT Pasifik Satelit Nusantara / Thales Alenia Space',
    country: 'Indonesia',
    countryCode: 'IDN',
    accentColor: 'var(--geo)',
    accentDim: 'var(--geo-dim)',
    variants: [{ id: 'satria', label: 'Satelit Lengkap di Orbit' }],
    overview:
      'SATRIA-1 (Satelit Republik Indonesia-1) adalah satelit komunikasi geostasioner berkapasitas sangat tinggi (Very High Throughput Satellite / VHTS) sebesar 150 Gbps. Diluncurkan dengan roket Falcon 9 SpaceX pada 18 Juni 2023, satelit ini beroperasi di slot orbit 146° Bujur Timur untuk menyediakan akses internet berkecepatan tinggi bagi 150.000 titik layanan publik di daerah 3T (Tertinggal, Terdepan, Terluar) Indonesia.',
    specs: [
      { label: 'Kapasitas Throughput', value: '150', unit: 'Gbps VHTS' },
      { label: 'Slot Orbit Geostasioner', value: '146°', unit: 'Bujur Timur (35.786 km)' },
      { label: 'Platform / Bus Satelit', value: 'Spacebus NEO-200', unit: 'Thales Alenia Space' },
      { label: 'Massa Peluncuran', value: '4.600', unit: 'kg' },
      { label: 'Bentang Panel Surya', value: '38', unit: 'meter di orbit' },
      { label: 'Daya Listrik Surya', value: '20', unit: 'kilowatt' },
      { label: 'Sistem Propulsi', value: 'Full Electric (SPT-100 / Hall-Effect)' },
      { label: 'Masa Operasional Desain', value: '15', unit: 'tahun minimum' },
    ],
    layers: {
      satria: [
        { id: 'bus', label: 'Badan Satelit (Bus Platform)', groups: ['bus'], note: 'Struktur rangka Spacebus NEO berlapis selimut insulasi multi-lapis (MLI) emas dan perak.' },
        { id: 'solar', label: 'Panel Surya Deployable', groups: ['solar', 'boom'], note: 'Dua sayap sel fotovoltaik GaAs efisiensi tinggi berdaya 20 kW.' },
        { id: 'antenna', label: 'Antena Reflektor Ka-Band', groups: ['antenna', 'subdish'], note: 'Empat reflektor jaring karbon yang membentuk spot beam terarah ke kepulauan Indonesia.' },
        { id: 'osr', label: 'Radiator Termal OSR', groups: ['osr'], note: 'Optical Solar Reflector yang membuang panas dari transponder komunikasi ke antariksa dingin.' },
        { id: 'thruster', label: 'Pendorong Plasma Listrik', groups: ['thruster', 'hall'], note: 'Empat thruster ion plasma gas Xenon untuk orbit raising dan station-keeping tanpa roket kimia.' },
        { id: 'tank', label: 'Tangki Gas Xenon', groups: ['tank', 'tower'], note: 'Tangki serat komposit tekanan tinggi penyimpan gas Xenon terionisasi.' },
      ],
    },
    hotspots: {
      satria: [
        { n: 1, pos: [0, 0.2, 22.0], kat: 'daya', layer: 'solar', label: 'Sayap Panel Surya 38 Meter', note: 'Bentang panel surya 38 meter berputar otomatis 360 derajat sekali dalam 24 jam untuk selalu menghadap Matahari.' },
        { n: 2, pos: [6.8, 2.6, 3.0], kat: 'antena', layer: 'antenna', label: 'Reflektor Ka-Band Spot Beam', note: 'Memancarkan 116 spot-beam frekuensi Ka-band (26,5–40 GHz) yang mencakup seluruh pulau dari Sabang sampai Merauke.' },
        { n: 3, pos: [0, 4.4, 0], kat: 'termal', layer: 'osr', label: 'Radiator Reflektor Surya Optik (OSR)', note: 'Cermin kuarsa tipis di sisi utara dan selatan yang tahan terik radiasi matahari sambil memancarkan radiasi inframerah panas.' },
        { n: 4, pos: [-5.0, 2.6, 2.6], kat: 'mesin', layer: 'thruster', label: 'Pendorong Listrik Hall-Effect', note: 'Mendorong satelit dengan akselerasi ion Xenon berkecepatan 30 km/detik menggunakan tenaga listrik surya, menghemat berton-ton bahan bakar cair.' },
        { n: 5, pos: [1.6, 0, 2.5], kat: 'mesin', layer: 'tank', label: 'Tangki Propelan Gas Xenon', note: 'Menyimpan gas mulia Xenon yang menjamin satelit tetap stabil di posisinya (station keeping) selama lebih dari 15 tahun misi.' },
      ],
    },
    tours: {
      satria: [
        { title: 'Satelit VHTS SATRIA-1', text: 'SATRIA-1 adalah infrastruktur digital strategis Indonesia di antariksa, menghubungkan sekolah, puskesmas, dan kantor pemda pelosok nusantara.', yaw: -0.75, pitch: 0.3, dist: 92 },
        { title: 'Cakupan Spot-Beam Ka-Band', text: 'Reflektor antena Ka-Band mengonsentrasikan sinyal pada titik-titik padat kebutuhan internet pelosok Indonesia.', yaw: 1.45, pitch: 0.1, dist: 62, layer: 'antenna' },
        { title: 'Propulsi Listrik Canggih', text: 'Dengan propulsi listrik murni, efisiensi bahan bakar melonjak hingga 5 kali lipat dibanding roket kimia apogee konvensional.', yaw: -1.75, pitch: 0.22, dist: 56, layer: 'thruster' },
      ],
    },
    facts: [
      'SATRIA-1 berada di orbit 35.786 km di atas ekuator, berputar seirama dengan rotasi Bumi sehingga tampak diam dari stasiun bumi (geostasioner).',
      'Kapasitas 150 Gbps SATRIA-1 setara dengan 3 kali lipat total kapasitas seluruh satelit komunikasi yang disewa Indonesia sebelum tahun 2023.',
      'Satelit ini dikendalikan dari Pusat Pengendali Satelit Utama di Cikarang, Jawa Barat, dengan stasiun cadangan di Banjarmasin.',
    ],
  },

  cubesat: {
    id: 'cubesat',
    title: 'Nanosatelit CubeSat 1U & FlatSat',
    subtitle: 'Standar Satelit Edukasi, Riset Mahasiswa, dan Meja Uji Hardware-in-the-Loop',
    agency: 'CalPoly / Stanford / LAPAN / Robinson Aerospace',
    country: 'Standar Internasional',
    countryCode: 'EDU',
    accentColor: 'var(--nano)',
    accentDim: 'var(--nano-dim)',
    variants: [
      { id: 'cubesat', label: 'CubeSat 1U Satelit Terbang' },
      { id: 'flatsat', label: 'FlatSat Meja Uji Laboratorium' },
    ],
    overview:
      'CubeSat adalah revolusi satelit mini berstandar 10 x 10 x 10 cm dengan massa maksimal 1,33 kg (1U). Standar ini membuka pintu bagi universitas, sekolah, dan startup untuk merancang, membangun, dan meluncurkan wahana antariksa sendiri ke orbit rendah Bumi (LEO) dengan biaya terjangkau. Sebelum dirakit ke rangka kubus, seluruh subsistem diuji di meja kerja terbuka yang disebut FlatSat.',
    specs: [
      { label: 'Dimensi Standar 1U', value: '10 x 10 x 10', unit: 'cm' },
      { label: 'Massa Maksimum 1U', value: '1,33', unit: 'kg' },
      { label: 'Tegangan Bus Daya', value: '3,3 V & 5,0 V', unit: 'DC (EPS)' },
      { label: 'Frekuensi Radio', value: 'UHF (435 MHz) & VHF (145 MHz)' },
      { label: 'Ketinggian Orbit Khas', value: '400 – 550', unit: 'km LEO' },
      { label: 'Masa Hidup di Orbit', value: '1 – 3', unit: 'tahun (deorbit alami)' },
      { label: 'Standar Deployer', value: 'P-POD / Nanoracks NRCSD' },
      { label: 'Bahasa Pemrograman OBC', value: 'C / C++ / MicroPython' },
    ],
    layers: {
      cubesat: [
        { id: 'rangka', label: 'Rangka Aluminium 6061 & Rel', groups: ['rangka'], note: 'Empat rel bersudut presisi beranodisasi keras agar lancar meluncur keluar dari tabung deployer roket.' },
        { id: 'panel', label: 'Panel Surya Bodi', groups: ['panel'], note: 'Sel surya triple-junction yang ditempelkan di 4 dinding luar kubus.' },
        { id: 'deploy', label: 'Sayap Surya Tambahan', groups: ['deploy'], note: 'Panel surya lipat yang terbuka otomatis setelah kawat nilon pelepas dipanaskan.' },
        { id: 'antena', label: 'Antena Pita Logam (Tape Spring)', groups: ['antena'], note: 'Antena pita tipis lentur seperti meteran tukang yang menggulung lalu memanjang sendiri saat dilepas.' },
        { id: 'papan', label: 'Tumpukan Papan Subsistem', groups: ['papan'], note: 'Tumpukan papan sirkuit PC104: OBC (komputer), EPS (daya), COMMS (radio), dan ADCS (sikap).' },
        { id: 'baterai', label: 'Paket Baterai Li-Ion', groups: ['baterai'], note: 'Penyimpan energi untuk memberi daya saat satelit masuk ke bayangan malam Bumi selama 35 menit tiap putaran orbit.' },
        { id: 'muatan', label: 'Sensor Muatan (Payload)', groups: ['muatan'], note: 'Kamera digital mini atau sensor radiasi eksperimen sains siswa.' },
      ],
      flatsat: [
        { id: 'meja', label: 'Meja Uji Laboratorium', groups: ['meja'], note: 'Alas kerja antistatis tempat seluruh subsistem dibentangkan terpisah.' },
        { id: 'papan', label: 'Papan Subsistem Terbuka', groups: ['papan'], note: 'Papan subsistem ditaruh mendatar agar titik ukur osiloskop dan multimeter mudah diakses insinyur.' },
        { id: 'kabel', label: 'Kabel Harness Penghubung', groups: ['kabel'], note: 'Kabel pita dan kabel jumper simulasi bus daya dan komunikasi serial I2C/SPI.' },
        { id: 'ujistand', label: 'Instrumen Catu Daya & Monitor', groups: ['ujistand'], note: 'Power supply presisi dan laptop Ground Control Software untuk simulasi perintah terbang.' },
      ],
    },
    hotspots: {
      cubesat: [
        { n: 1, pos: [0, 5.2, 5.2], kat: 'struktur', layer: 'rangka', label: 'Rel Peluncur Sudut (Hard Anodized)', note: 'Empat rel sudut wajib memenuhi toleransi geser sub-milimeter agar tidak macet di dalam tabung deployer P-POD.' },
        { n: 2, pos: [0, 5.2, 0], kat: 'daya', layer: 'panel', label: 'Sel Surya Bodi Triple-Junction', note: 'Menghasilkan daya listrik sekitar 2 hingga 3 Watt saat terkena sinar matahari langsung di orbit.' },
        { n: 3, pos: [0, 5.4, 12.0], kat: 'daya', layer: 'deploy', label: 'Sayap Surya Deployable', note: 'Meningkatkan luas tangkapan surya hingga 3x lipat, menghasilkan daya 10-15 Watt untuk muatan intensif daya.' },
        { n: 4, pos: [-5.2, 1.2, 6.0], kat: 'antena', layer: 'antena', label: 'Antena Monopol Pita Baja', note: 'Menyebarkan gelombang beacon morse dan data telemetri ke stasiun radio amatir di seluruh dunia.' },
        { n: 5, pos: [0.4, 0, 0], kat: 'komputer', layer: 'papan', label: 'Komputer On-Board (OBC)', note: 'Mikrokontroler ARM Cortex atau STM32 dengan sistem operasi real-time (FreeRTOS) pemantau status satelit.' },
        { n: 6, pos: [-4.0, 0, 2.4], kat: 'daya', layer: 'baterai', label: 'Baterai 18650 Space-Grade', note: 'Dua sel lithium-ion berkepadatan tinggi dilengkapi pemanas internal agar baterai tidak beku di suhu ekstrem -40°C.' },
      ],
      flatsat: [
        { n: 1, pos: [-12.0, 0.9, -4.3], kat: 'komputer', layer: 'papan', label: 'Papan Subsistem Terurai', note: 'Setiap papan dapat diuji tegangan, ripple arus, dan transmisi paket serialnya sebelum dimasukkan ke bodi sempit.' },
        { n: 2, pos: [15.0, 3.9, -5.2], kat: 'uji', layer: 'ujistand', label: 'Simulator Sel Surya Bangku', note: 'Menyuntikkan kurva arus-tegangan solar array ke papan EPS untuk menguji logika pengisian baterai.' },
        { n: 3, pos: [12.0, 5.6, 4.8], kat: 'uji', layer: 'ujistand', label: 'Software Mission Control Ground', note: 'Menerima paket telemetri hex langsung melalui protokol AX.25 radio satelit amatir.' },
      ],
    },
    tours: {
      cubesat: [
        { title: 'Konsep Standar 1U (10 cm)', text: 'CubeSat 1U adalah kubus kecil yang mengubah industri antariksa dengan mengizinkan siswa meluncurkan satelit nyata.', yaw: -0.75, pitch: 0.3, dist: 36 },
        { title: 'Antena Pita Penggulung Sendiri', text: 'Menggunakan mekanisme mekanis sederhana tanpa motor kompleks: kawat nilon dibakar dengan resistor panas, membebaskan pita pegas.', yaw: -2.3, pitch: 0.24, dist: 32, layer: 'antena' },
        { title: 'Papan Elektronik Bertingkat', text: 'Di dalam rangka aluminium, papan-papan sirkuit tersambung melalui header 104-pin standar industri PC104.', yaw: -0.85, pitch: 0.35, dist: 28, section: true, layer: 'papan' },
      ],
      flatsat: [
        { title: 'Mengapa Perlu FlatSat?', text: 'Mendiagnosis masalah kabel di dalam kubus 10 cm sangat sulit. Di meja FlatSat, seluruh sirkuit terbuka untuk probing instrumen.', yaw: -0.6, pitch: 0.55, dist: 58 },
      ],
    },
    facts: [
      'CubeSat pertama dikembangkan pada tahun 1999 oleh Prof. Jordi Puig-Suari (CalPoly) dan Prof. Bob Twiggs (Stanford).',
      'Indonesia meluncurkan satelit nano buatan anak bangsa pertama, Surya Satellite-1 (SS-1), ke ISS pada tahun 2022.',
      'Sebagian besar CubeSat terbakar habis di atmosfer atas saat deorbit alami, sehingga tidak meninggalkan sampah antariksa permanen.',
    ],
  },
};
