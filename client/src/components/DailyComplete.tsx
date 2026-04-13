interface Props {
  count: number;
  limit: number;
}

export function DailyComplete({ count, limit }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="text-6xl mb-4">🌿</div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        今天的内容看完了
      </h2>
      <p className="text-sm text-gray-500 text-center leading-relaxed">
        今日已读 {count}/{limit} 篇优质内容。
        <br />
        去做点别的事情吧，明天见。
      </p>
      <div className="mt-8 w-32 h-1 rounded-full bg-green-200" />
    </div>
  );
}
