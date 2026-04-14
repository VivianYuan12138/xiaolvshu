/**
 * 正文提取器 - 从文章原始 URL 抓取并提取正文内容
 * 使用 @mozilla/readability + linkedom 实现，无需浏览器环境
 */
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

const FETCH_TIMEOUT = 10000;
const MAX_HTML_SIZE = 500_000; // 500KB, skip huge pages
const MIN_USEFUL_CONTENT = 100; // chars after stripping HTML

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REDDIT_USER_AGENT = 'Mozilla/5.0 (compatible; XiaoLvShu/0.3)';

/**
 * 从 URL 抓取并提取正文
 * 返回 { title, content, excerpt } 或 null
 */
export async function extractContent(url: string): Promise<{
  title: string;
  content: string;    // HTML 正文
  textContent: string; // 纯文本正文
  excerpt: string;
} | null> {
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      redirect: 'follow',
    });

    if (!resp.ok) return null;

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
      return null; // PDF, image, etc.
    }

    const html = await resp.text();
    if (html.length > MAX_HTML_SIZE) return null;

    const { document } = parseHTML(html);
    const reader = new Readability(document as any);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.trim().length < MIN_USEFUL_CONTENT) {
      return null;
    }

    return {
      title: article.title || '',
      content: article.content || '',
      textContent: article.textContent.trim(),
      excerpt: article.excerpt || '',
    };
  } catch {
    return null;
  }
}

/**
 * 判断文章内容是否"贫瘠"——只有链接/元数据，没有实质正文
 * 去掉 HTML 标签和 URL 后看纯文本长度
 */
export function isContentThin(content: string | null | undefined, threshold = MIN_USEFUL_CONTENT): boolean {
  if (!content) return true;
  const text = content
    .replace(/<[^>]+>/g, '')          // strip HTML tags
    .replace(/https?:\/\/\S+/g, '')   // strip URLs
    .replace(/\s+/g, ' ')            // normalize whitespace
    .trim();
  return text.length < threshold;
}

/**
 * 从 HN/Reddit 等链接型 RSS 的 content 中提取原文 URL
 */
export function extractArticleUrl(htmlContent: string): string | null {
  // HN format: <p>Article URL: <a href="...">...</a></p>
  const hnMatch = htmlContent.match(/Article URL:.*?href=["']([^"']+)["']/i);
  if (hnMatch) return hnMatch[1];

  // Generic: first <a> link that's not a comment/discussion/social link
  const links = [...htmlContent.matchAll(/href=["']([^"']+)["']/gi)]
    .map(m => m[1])
    .filter(url =>
      url.startsWith('http') &&
      !url.includes('news.ycombinator.com') &&
      !url.includes('reddit.com') &&
      !url.includes('producthunt.com') &&
      !url.includes('x.com/i/') &&
      !url.includes('twitter.com') &&
      !url.includes('#')
    );

  return links[0] || null;
}

/**
 * 从 Reddit 帖子页面提取外部原文链接
 * Reddit 的 JSON API: append .json to any reddit URL
 */
export async function extractRedditExternalUrl(redditUrl: string): Promise<string | null> {
  try {
    const jsonUrl = redditUrl.endsWith('/') ? redditUrl + '.json' : redditUrl + '/.json';
    const resp = await fetch(jsonUrl, {
      headers: { 'User-Agent': REDDIT_USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as any;
    const postData = data?.[0]?.data?.children?.[0]?.data;
    if (!postData) return null;

    // If it's a link post (not self-post), url points to external article
    if (postData.url && !postData.is_self && !postData.url.includes('reddit.com')) {
      return postData.url;
    }
    // Self-posts have selftext — we can use that directly
    if (postData.selftext && postData.selftext.length > 100) {
      return null; // No external URL, but has content (handled elsewhere)
    }
    return null;
  } catch {
    return null;
  }
}
