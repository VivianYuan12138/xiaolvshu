import { useState, useRef } from 'react';

const HISTORY_KEY = 'xlvs_search_history';
const MAX_HISTORY = 8;

function loadHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveHistory(q: string) {
  const list = loadHistory().filter(h => h !== q);
  list.unshift(q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
}

export function SearchBar({ value, onChange, onFocus }: Props) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    setHistory(loadHistory());
    setShowHistory(true);
    onFocus?.();
  };

  const handleBlur = () => {
    // delay to allow click on history item
    setTimeout(() => setShowHistory(false), 200);
  };

  const handleChange = (v: string) => {
    onChange(v);
    if (!v.trim()) {
      setHistory(loadHistory());
      setShowHistory(true);
    } else {
      setShowHistory(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && value.trim()) {
      saveHistory(value.trim());
      inputRef.current?.blur();
    }
  };

  const selectHistory = (q: string) => {
    onChange(q);
    saveHistory(q);
    setShowHistory(false);
  };

  const handleClear = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div className="px-4 py-2.5 relative">
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="搜索感兴趣的内容"
          className="w-full pl-10 pr-4 py-2.5 bg-emerald-50/60 rounded-2xl text-sm text-[#333]
                     placeholder:text-emerald-300 focus:outline-none focus:bg-emerald-50 focus:ring-2 focus:ring-emerald-200
                     transition-all"
        />
      </div>
      {showHistory && history.length > 0 && !value.trim() && (
        <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-2xl shadow-lg border border-[#f0f0f0] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
            <span className="text-xs text-[#999] font-medium">搜索历史</span>
            <button onClick={handleClear} className="text-[11px] text-[#ccc] press-scale">清除</button>
          </div>
          <div className="px-3 pb-3 flex flex-wrap gap-2">
            {history.map(q => (
              <button
                key={q}
                onClick={() => selectHistory(q)}
                className="px-3 py-1.5 bg-[#f5f5f5] rounded-full text-xs text-[#666] press-scale"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
