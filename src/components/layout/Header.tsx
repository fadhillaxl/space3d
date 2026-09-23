import Link from 'next/link';

interface HeaderProps {
  currentMission?: 'home' | 'discovery' | 'buran' | 'rascube' | 'kratos' | 'satria' | 'cubesat';
}

export default function Header({ currentMission = 'home' }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="wrap topbar__in">
        <Link href="/" className="brand" title="Space Edu 3D — Beranda">
          <span className="brand__dot"></span>
          <span>Space Edu 3D</span>
        </Link>
        <nav className="topnav" aria-label="Navigasi utama">
          <Link
            href="/"
            aria-current={currentMission === 'home' ? 'page' : undefined}
          >
            Beranda
          </Link>
          <Link
            href="/discovery"
            aria-current={currentMission === 'discovery' ? 'page' : undefined}
          >
            USA
          </Link>
          <Link
            href="/buran"
            aria-current={currentMission === 'buran' ? 'page' : undefined}
          >
            Uni Soviet
          </Link>
          <Link
            href="/rascube"
            aria-current={currentMission === 'rascube' ? 'page' : undefined}
          >
            RASCube
          </Link>
          <Link
            href="/kratos"
            aria-current={currentMission === 'kratos' ? 'page' : undefined}
          >
            Kratos
          </Link>
        </nav>
      </div>
    </header>
  );
}
