import { NavLink, Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useStore } from '../store/store';
import { nextGameWeek } from '../store/selectors';
import { Crest } from './Crest';
import {
  BankIcon,
  HistoryIcon,
  HomeIcon,
  MuteIcon,
  SettingsIcon,
  ShameIcon,
  VolumeIcon,
  WheelIcon,
} from './Icons';
import styles from './Layout.module.css';

const NAV = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/bank', label: 'Bank', icon: BankIcon },
  { to: '/spin', label: 'Spin', icon: WheelIcon, spin: true },
  { to: '/shame', label: 'Shame', icon: ShameIcon },
  { to: '/history', label: 'History', icon: HistoryIcon },
];

function MuteButton() {
  const muted = useStore((s) => s.settings.muted);
  const setMuted = useStore((s) => s.setMuted);
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => setMuted(!muted)}
      aria-label={muted ? 'Unmute' : 'Mute'}
      aria-pressed={muted}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? <MuteIcon /> : <VolumeIcon />}
    </button>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const gameWeeks = useStore((s) => s.gameWeeks);
  const ritual = useStore((s) => s.ritualInProgress);
  const next = nextGameWeek(gameWeeks);
  const gw = ritual?.gameWeek ?? next;

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand} aria-label="Spinazonke home">
            <Crest size={36} />
            <span className={styles.wordmark}>Spinazonke</span>
          </Link>
          <div className={styles.scoreBug} aria-label={gw ? `Game week ${gw}` : 'Season over'}>
            <span className={styles.scoreBugLabel}>{gw ? 'GW' : 'FT'}</span>
            <span className={styles.scoreBugValue}>{gw ?? '38'}</span>
          </div>
          <nav className={styles.desktopNav} aria-label="Main">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className={styles.headerActions}>
            <MuteButton />
            <NavLink to="/settings" className="icon-btn" aria-label="Settings" title="Settings">
              <SettingsIcon />
            </NavLink>
          </div>
        </div>
      </header>

      {children}

      <nav className={styles.tabBar} aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, spin }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `${styles.tab} ${spin ? styles.tabSpin : ''} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.tabIcon}>
              <Icon size={spin ? 28 : 22} />
            </span>
            <span className={styles.tabLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
