import React from 'react';

// Call Icon — Filled telephone handset
export function IconCall({ size = 20, color = "#d85028", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
    </svg>
  );
}

// Mail / SMS Icon — Envelope with flap
export function IconMail({ size = 20, color = "#d85028", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

// WhatsApp Icon — Circular green WhatsApp logo
export function IconWhatsApp({ size = 22, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.891.525 3.66 1.438 5.168L2 22l4.982-1.396A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm-1.07 14.835c-2.427-1.11-4.01-3.32-4.144-3.52-.133-.2-1.082-1.442-1.082-2.753 0-1.312.686-1.956.93-2.221.245-.266.534-.333.712-.333.178 0 .356.002.512.01.167.008.39-.063.611.467.222.532.756 1.841.823 1.975.067.133.111.289.022.466-.089.178-.133.289-.267.444-.133.156-.28.349-.4.467-.133.133-.272.278-.117.544.156.266.69 1.139 1.48 1.843 1.015.904 1.87 1.184 2.137 1.317.267.133.422.111.578-.067.156-.178.667-.777.844-1.044.178-.266.356-.222.599-.133.245.089 1.556.733 1.823.866.267.133.445.2.512.311.066.111.066.644-.156 1.266-.222.622-1.31 1.222-1.82 1.266-.512.044-1.156.066-3.712-1.044z" fill="#25D366"/>
    </svg>
  );
}

// Speaker / Voice Audio Icon
export function IconAudio({ size = 20, color = "#e53935", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

// View Icon — Eye outline with pupil
export function IconView({ size = 20, color = "#d85028", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" fill={color} stroke="none" />
    </svg>
  );
}

// Edit Icon — Pencil outline
export function IconEdit({ size = 20, color = "#d85028", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
