import Link from 'next/link';

interface FooterProps {
  moduleName?: string;
}

export default function Footer({ moduleName }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="foot">
      <div className="wrap foot__in">
        <span>
          Space Edu 3D {moduleName ? `· ${moduleName} ` : '· materi edukasi interaktif '}· {currentYear}
        </span>
        <span className="foot__links">
          <Link href="/">Beranda</Link>
          <Link href="/discovery">Discovery</Link>
          <Link href="/buran">Buran</Link>
          <Link href="/rascube">RASCube</Link>
          <Link href="/kratos">Kratos</Link>
        </span>
      </div>
    </footer>
  );
}
