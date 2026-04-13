type Tab = 'discover' | 'favorites' | 'settings';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  readCount: number;
  dailyLimit: number;
}

export function BottomNav({ active, onChange, readCount }: Props) {
  const tabs: { id: Tab; label: string; icon: (a: boolean) => JSX.Element }[] = [
    {
      id: 'discover',
      label: '发现',
      icon: (a) => (
        <svg className={`w-[22px] h-[22px] transition-colors ${a ? 'text-emerald-600' : 'text-[#c0c0c0]'}`} fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.6} viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'favorites',
      label: '收藏',
      icon: (a) => (
        <svg className={`w-[22px] h-[22px] transition-colors ${a ? 'text-emerald-600' : 'text-[#c0c0c0]'}`} fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: '我的',
      icon: (a) => (
        <svg className={`w-[22px] h-[22px] transition-colors ${a ? 'text-emerald-600' : 'text-[#c0c0c0]'}`} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 glass border-t border-white/50 z-50"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="flex items-center justify-around py-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center gap-0.5 py-1.5 px-6 press-scale"
            >
              {tab.icon(isActive)}
              <span className={`text-[10px] transition-colors ${
                isActive ? 'text-emerald-600 font-semibold' : 'text-[#c0c0c0]'
              }`}>
                {tab.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-500 -mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
