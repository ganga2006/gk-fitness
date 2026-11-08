type Props = { name: string; size?: number; className?: string; strokeWidth?: number };

const P: Record<string, string> = {
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M8 5v14M16 5v14',
  next: 'M6 5l9 7-9 7zM19 5v14',
  prev: 'M18 5l-9 7 9 7zM5 5v14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M4.5 12.5l5 5 10-11',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  flame: 'M12 3c1.5 3.5-1 5-1 7a3 3 0 006 0c0-1-.3-2-1-3 2.5 1.5 4 4 4 6.5a8 8 0 11-16 0C4 9 8.5 6.5 12 3z',
  clock: 'M12 7v5l3.5 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  bolt: 'M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z',
  calendar: 'M7 3v3M17 3v3M3.5 9.5h17M5 5.5h14a1.5 1.5 0 011.5 1.5v12A1.5 1.5 0 0119 20.5H5A1.5 1.5 0 013.5 19V7A1.5 1.5 0 015 5.5z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  dumbbell: 'M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12',
  user: 'M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5M12 11.5a4 4 0 100-8 4 4 0 000 8z',
  search: 'M20 20l-4.2-4.2M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z',
  chevronRight: 'M9.5 5l7 7-7 7',
  chevronLeft: 'M14.5 5l-7 7 7 7',
  chevronDown: 'M5 9.5l7 7 7-7',
  settings: 'M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5v.2a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 010-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 014 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1h.2a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1z',
  volume: 'M11 5L6.5 9H3v6h3.5L11 19V5zM15.5 9.5a3.5 3.5 0 010 5M18.5 7a7 7 0 010 10',
  mute: 'M11 5L6.5 9H3v6h3.5L11 19V5zM16 10l4 4M20 10l-4 4',
  trophy: 'M8 4h8v5a4 4 0 11-8 0V4zM8 6H5v1a3 3 0 003 3M16 6h3v1a3 3 0 01-3 3M10 17h4M9 20h6M12 13v4',
  medal: 'M12 15.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM8.5 3L10 7M15.5 3L14 7',
  shield: 'M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  spark: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z',
  download: 'M12 3v12M7.5 11L12 15.5 16.5 11M4 19.5h16',
  upload: 'M12 16V4M7.5 8.5L12 4l4.5 4.5M4 19.5h16',
  trash: 'M4.5 7h15M9 7V4.5h6V7M7 7l1 13h8l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM14.5 5.5l4 4',
  skip: 'M5 5l8 7-8 7zM16 5l8 7-8 7',
  heart: 'M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0112 8a4.1 4.1 0 017.5 2.6C19.5 15.4 12 20 12 20z',
  refresh: 'M3.5 12a8.5 8.5 0 0114.6-6M20.5 12a8.5 8.5 0 01-14.6 6M18 3v4h-4M6 21v-4h4',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 7.5v.5',
  scale: 'M12 4v3M5 7h14l2.5 9a5 5 0 01-4.9 6H7.4a5 5 0 01-4.9-6L5 7z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
};

export function Icon({ name, size = 20, className, strokeWidth = 1.9 }: Props) {
  const d = P[name] ?? P.info;
  const filled = name === 'play' || name === 'next' || name === 'prev' || name === 'skip';
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <path d={d} />
    </svg>
  );
}
