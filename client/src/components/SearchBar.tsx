interface Props {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
}

export function SearchBar({ value, onChange, onFocus }: Props) {
  return (
    <div className="px-4 py-2.5">
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder="搜索感兴趣的内容"
          className="w-full pl-10 pr-4 py-2.5 bg-emerald-50/60 rounded-2xl text-sm text-[#333]
                     placeholder:text-emerald-300 focus:outline-none focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-200
                     transition-all"
        />
      </div>
    </div>
  );
}
