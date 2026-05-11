export function ShieldLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={(size * 68) / 58}
      viewBox="0 0 58 68"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Genesis Air Systems"
    >
      <path
        d="M 29 2 L 54 12 L 54 36 Q 54 56 29 66 Q 4 56 4 36 L 4 12 Z"
        fill="#1E3A8A"
        stroke="#EA580C"
        strokeWidth="2"
      />
      <path
        d="M 16 28 L 29 18 L 42 28"
        stroke="#EA580C"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 16 38 L 29 28 L 42 38"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path
        d="M 16 48 L 29 38 L 42 48"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  )
}

export function FullLogo({ size = 'md', dark = false }) {
  const sizes = {
    sm: { shield: 28, name: 'text-base', sub: 'text-[9px]' },
    md: { shield: 36, name: 'text-lg', sub: 'text-[10px]' },
    lg: { shield: 48, name: 'text-2xl', sub: 'text-xs' },
  }
  const s = sizes[size]
  return (
    <div className="flex items-center gap-3">
      <ShieldLogo size={s.shield} />
      <div className={dark ? 'text-white' : 'text-navy-900'}>
        <div className={`font-serif ${s.name} leading-none tracking-tight`}>
          GENESIS AIR SYSTEMS
        </div>
        <div className={`${s.sub} uppercase tracking-[0.15em] mt-1 ${dark ? 'text-navy-200' : 'text-slate-500'}`}>
          Heating · Cooling · Service
        </div>
      </div>
    </div>
  )
}
