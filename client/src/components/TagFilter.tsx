import type { Tag } from '../api';

interface Props {
  tags: Tag[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
}

const DEFAULT_TABS = ['推荐', '技术', 'AI', '商业', '开源', '产品'];

export function TagFilter({ tags, selected, onSelect }: Props) {
  const allTabs = tags.length > 0
    ? ['推荐', ...tags.map(t => t.tag)]
    : DEFAULT_TABS;

  const uniqueTabs = [...new Set(allTabs)].slice(0, 12);

  return (
    <div className="flex overflow-x-auto no-scrollbar px-2 pb-2 pt-0.5 gap-1.5">
      {uniqueTabs.map((tab) => {
        const isSelected = tab === '推荐' ? selected === null : tab === selected;
        return (
          <button
            key={tab}
            onClick={() => onSelect(tab === '推荐' ? null : tab)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-[13px] transition-all press-scale ${
              isSelected
                ? 'bg-emerald-500 text-white font-semibold shadow-sm shadow-emerald-200'
                : 'bg-white text-[#666] hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
