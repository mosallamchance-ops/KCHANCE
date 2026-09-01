// Small outline icon set (stroke-based, matches the app's line-icon style).
// Each icon accepts a className so callers can size/color via Tailwind.

function base(props) {
  return {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props
  };
}

export function HomeIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function TicketIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M3 9.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.2a1.5 1.5 0 0 0 0 2.6v1.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.2a1.5 1.5 0 0 0 0-2.6Z" />
      <path d="M14 8v8" strokeDasharray="2.2 2.2" />
    </svg>
  );
}

export function ChartIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M4 20V10M10 20V4M16 20v-7M20.5 20H3.5" />
    </svg>
  );
}

export function WalletIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 8.2A2.2 2.2 0 0 1 5.7 6h11.6a2.2 2.2 0 0 1 2.2 2.2v9.1a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2Z" />
      <path d="M3.5 8.2 13 4.2a1.3 1.3 0 0 1 1.8 1.2V6" />
      <path d="M15.5 13.2h2.4" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.2" r="3.3" />
      <path d="M4.8 20c1-3.4 3.9-5.4 7.2-5.4s6.2 2 7.2 5.4" />
    </svg>
  );
}

export function BellIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.4 5.6 1.4 5.6H4.6S6 14 6 10Z" />
      <path d="M10.2 18.5a1.9 1.9 0 0 0 3.6 0" />
    </svg>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </svg>
  );
}

export function ShieldCheckIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.2 5 5.8v5.5c0 4.6 3 7.7 7 9.5 4-1.8 7-4.9 7-9.5V5.8Z" />
      <path d="m9 12 2 2 4-4.2" />
    </svg>
  );
}

export function ShieldQuestionIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.2 5 5.8v5.5c0 4.6 3 7.7 7 9.5 4-1.8 7-4.9 7-9.5V5.8Z" />
      <path d="M10.3 10.4a1.7 1.7 0 1 1 2.6 1.4c-.7.5-1 .9-1 1.6" />
      <circle cx="12" cy="16" r=".18" fill="currentColor" />
    </svg>
  );
}

export function DocumentIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M7 3.5h7l4 4V19a1.4 1.4 0 0 1-1.4 1.4H7A1.4 1.4 0 0 1 5.6 19V4.9A1.4 1.4 0 0 1 7 3.5Z" />
      <path d="M14 3.5V8h4.3" />
      <path d="M8.6 12.2h6.8M8.6 15.6h6.8" />
    </svg>
  );
}

export function HeadsetIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="1.4" />
      <rect x="17" y="13" width="4" height="6" rx="1.4" />
      <path d="M20 19v.6A3.4 3.4 0 0 1 16.6 23H14" />
    </svg>
  );
}

export function LockIcon(props) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DeviceIcon(props) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4.5" width="18" height="12" rx="1.6" />
      <path d="M9 20.5h6M12 16.5v4" />
    </svg>
  );
}

export function PinIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s-6.8-5.9-6.8-11A6.8 6.8 0 0 1 18.8 10c0 5.1-6.8 11-6.8 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function PhoneVerifyIcon(props) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="m9.3 12 1.9 1.9 3.5-3.8" />
    </svg>
  );
}

export function LogoutIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M14 16.5 19 12l-5-4.5M19 12H9" />
    </svg>
  );
}

export function CameraIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M4 8.2A1.7 1.7 0 0 1 5.7 6.5h1.9l1-1.7h6.8l1 1.7h1.9A1.7 1.7 0 0 1 20 8.2v9.1a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 17.3Z" />
      <circle cx="12" cy="12.3" r="3.3" />
    </svg>
  );
}

export function TrophyIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M7 4.5h10v5a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4.5a2 2 0 0 0 0 4H7M17 6h2.5a2 2 0 0 1 0 4H17" />
      <path d="M12 14.5V18M9 20.5h6" />
    </svg>
  );
}

export function CalendarIcon(props) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  );
}
