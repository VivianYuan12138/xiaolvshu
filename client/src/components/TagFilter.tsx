import type { Tag } from '../api';

interface Props {
  tags: Tag[];
  selected: string | null;
  onSelect: (tag: string | null) => void;
}

// 默认频道（即使没有标签数据也显示）
const DEFAULT_TABS = ['推荐', '技术', '投资', '生活', '深度'];

export function TagFilter({ tags, selected, onSelect }: Props) {
  const allTabs = tags.length > 0
    ? ['推荐', ...tags.map(t => t.tag)]
    : DEFAULT_TABS;

  // 去重
  const uniqueTabs = [...new Set(allTabs)];

  return (
    <div className="flex overflow-x-auto no-scrollbar border-b border-gray-100">
      {uniqueTabs.map((tab) => {
        const isSelected = tab === '推荐' ? selected === null : tab === selected;
        return (
          <button
            key={tab}
            onClick={() => onSelect(tab === '推荐' ? null : tab)}
            className={`shrink-0 px-4 py-2.5 text-sm relative transition-colors ${
              isSelected
                ? 'text-gray-900 font-semibold'
                : 'text-gray-400'
            }`}
          >
            {tab}
            {isSelected && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-green-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
