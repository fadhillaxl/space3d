import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Satelit GEO Satria-1 — Space Edu 3D',
  description:
    'Modul satelit geostasioner Satria-1 — model 3D pindaian dengan tujuh titik komponen, kapasitas 150 Gbps pita Ka, wahana Spacebus NEO, diluncurkan Falcon 9 pada 19 Juni 2023.',
};

export default function SatriaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
