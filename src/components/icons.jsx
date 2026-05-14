// Icon set — line icons in Apple Maps style
const Ico = ({ d, size = 18, stroke = 2, fill, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"}
       stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

window.Icons = {
  Search: (p) => <Ico {...p} d={<><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>} />,
  Close:  (p) => <Ico {...p} d="M18 6 6 18M6 6l12 12" />,
  ArrowLeft: (p) => <Ico {...p} d="m15 18-6-6 6-6" />,
  Compass:(p) => <Ico {...p} d={<><circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2z"/></>} />,
  Crosshair: (p) => <Ico {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></>} />,
  Plus:   (p) => <Ico {...p} d="M12 5v14M5 12h14" />,
  Minus:  (p) => <Ico {...p} d="M5 12h14" />,
  Sun:    (p) => <Ico {...p} d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>} />,
  Moon:   (p) => <Ico {...p} d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  Globe:  (p) => <Ico {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>} />,
  Pin:    (p) => <Ico {...p} d={<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></>} />,
  Phone:  (p) => <Ico {...p} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
  Share:  (p) => <Ico {...p} d={<><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 21h14a2 2 0 0 0 2-2v-7"/><path d="M3 12v7a2 2 0 0 0 2 2"/></>} />,
  Clock:  (p) => <Ico {...p} d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />,
  Map:    (p) => <Ico {...p} d={<><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z"/><path d="M9 3v15M15 6v15"/></>} />,
  Menu:   (p) => <Ico {...p} d="M3 12h18M3 6h18M3 18h18" />,
  Settings:(p) => <Ico {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>} />,
  Layers: (p) => <Ico {...p} d={<><path d="m12 2 10 6-10 6L2 8l10-6z"/><path d="m2 14 10 6 10-6"/></>} />,
  Check:  (p) => <Ico {...p} d="m5 12 5 5L20 7" />,
  Droplet:(p) => <Ico {...p} d="M12 2.5S5 9.5 5 14a7 7 0 0 0 14 0c0-4.5-7-11.5-7-11.5z" />,
  CreditCard:(p) => <Ico {...p} d={<><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M7 15h2M11 15h4"/></>} />,
  Store:  (p) => <Ico {...p} d={<><path d="M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9"/><path d="M3 9h18M9 9v12"/><path d="M2 5l2-2h16l2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z"/></>} />,
};
