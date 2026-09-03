import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconFrame({ children, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16" {...props}>
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return <IconFrame {...props}><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></IconFrame>;
}

export function GridIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /></IconFrame>;
}

export function ListIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.9" /></IconFrame>;
}

export function CompassIcon(props: IconProps) {
  return <IconFrame {...props}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" /><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /></IconFrame>;
}

export function ActivityIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></IconFrame>;
}

export function CrownIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m4 8 4 3 4-6 4 6 4-3-1.5 10h-13L4 8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /></IconFrame>;
}

export function PortfolioIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M4 7.5h16v11H4zM8 7.5V5h8v2.5M4 12h16" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /></IconFrame>;
}

export function LeaderboardIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M5 20V11h4v9M10 20V5h4v15M15 20v-6h4v6M3 20h18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></IconFrame>;
}

export function ProfileIcon(props: IconProps) {
  return <IconFrame {...props}><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" /><path d="M5.5 19c.7-3.2 3-5 6.5-5s5.8 1.8 6.5 5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" /></IconFrame>;
}

export function PlusIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></IconFrame>;
}

export function ArrowIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" /></IconFrame>;
}

export function ChevronIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m9 5 7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></IconFrame>;
}

export function MessageIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M5 5h14v11H9l-4 3V5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /></IconFrame>;
}

export function InfoIcon(props: IconProps) {
  return <IconFrame {...props}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" /><path d="M12 10.5V17" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /><circle cx="12" cy="7.5" fill="currentColor" r="1" /></IconFrame>;
}

export function BookIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 4H11v15H7.5A3.5 3.5 0 0 0 4 20.5v-15ZM20 5.5A3.5 3.5 0 0 0 16.5 4H13v15h3.5a3.5 3.5 0 0 1 3.5 1.5v-15Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.6" /></IconFrame>;
}

export function CloseIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></IconFrame>;
}

export function ShareIcon(props: IconProps) {
  return <IconFrame {...props}><circle cx="18" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="6" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="18" cy="19" r="2" stroke="currentColor" strokeWidth="1.5" /><path d="m8 11 8-5M8 13l8 5" stroke="currentColor" strokeWidth="1.5" /></IconFrame>;
}

export function XIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M5 4.5 18.5 19.5M18.5 4.5 5 19.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></IconFrame>;
}

export function DiscordIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M7.2 7.1A15 15 0 0 1 12 6.3a15 15 0 0 1 4.8.8c1.2 1.8 1.9 4 2.1 6.4a12 12 0 0 1-3.1 2.2l-.8-1.1c.6-.2 1.1-.5 1.6-.9a9.4 9.4 0 0 1-9.2 0c.5.4 1 .7 1.6.9l-.8 1.1a12 12 0 0 1-3.1-2.2c.2-2.4.9-4.6 2.1-6.4Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" /><circle cx="9.1" cy="11.5" fill="currentColor" r="1" /><circle cx="14.9" cy="11.5" fill="currentColor" r="1" /></IconFrame>;
}

export function GlobeIcon(props: IconProps) {
  return <IconFrame {...props}><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5C9.8 18.2 8.7 15.4 8.7 12S9.8 5.8 12 3.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></IconFrame>;
}
