import type { Article } from '../api';
import { ArticleCard } from './ArticleCard';

interface Props {
  favorites: Article[];
  onArticleClick: (article: Article) => void;
}

export function FavoritesPage({ favorites, onArticleClick }: Props) {
  const favArticles = favorites;

  if (favArticles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 px-8">
        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-[#ddd]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <p className="text-sm text-[#999] mb-1">还没有收藏</p>
        <p className="text-xs text-[#ccc]">在文章详情页点击收藏按钮</p>
      </div>
    );
  }

  return (
    <div className="px-1.5 pt-1.5 pb-20">
      <div className="columns-2 gap-2">
        {favArticles.map((article, i) => (
          <ArticleCard
            key={article.id}
            article={article}
            onClick={() => onArticleClick(article)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
