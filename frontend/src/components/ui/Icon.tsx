import type { SVGProps } from 'react';

const PATHS = {
  dashboard: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  events: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  marketplace: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6',
  staff: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 010 6M18 14c2 .8 3 3 3 6',
  reviews: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1L15 3h-4l-.4 2.6a7 7 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1L11 21h4l.4-2.6a7 7 0 001.7-1l2.4 1 2-3.4z',
  help: 'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4',
  add: 'M12 5v14M5 12h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  location: 'M12 21s7-6.2 7-11.5a7 7 0 10-14 0C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  alert: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v5M12 16h.01',
  pending: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9',
  budget: 'M3 7h18v10H3zM12 14.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6 10v4M18 10v4',
  checklist: 'M4 4h16v16H4zM8 12l3 3 5-6',
  agenda: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  exhibitors: 'M4 4h16v11H4zM12 15v5M8 20h8',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  tickets: 'M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4zM14 7v10',
  view: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  check: 'M5 12l5 5L20 7',
  stats: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6zM9 12l2 2 4-4',
  user: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 12a3 3 0 100-6 3 3 0 000 6zM6.5 18.5a6 6 0 0111 0',
  hall: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 11h.01M15 11h.01',
  chairs: 'M7 4h10v8H7zM5 12h14v3H5zM7 15v5M17 15v5',
  canopy: 'M2 10l10-6 10 6zM5 10v10M19 10v10M12 10v10',
  sound: 'M7 3h10v18H7zM12 17a3 3 0 100-6 3 3 0 000 6zM12 7h.01',
  catering: 'M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-1.7 0-3 2-3 5s1 4 3 4v9',
  decoration: 'M12 8a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 17v5M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1',
  other: 'M5 12h.01M12 12h.01M19 12h.01',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  whatsapp: 'M3 21l1.6-4.7A9 9 0 1112 21a9 9 0 01-4.3-1.1zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1a5 5 0 01-2.5-2.5l1-1-1-2z',} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
