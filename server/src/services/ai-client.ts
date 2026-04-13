import OpenAI from 'openai';

// Provider configs - all use OpenAI-compatible API format
const PROVIDER_CONFIGS: Record<string, { baseURL: string; apiKeyEnv: string; scoreModel: string; rewriteModel: string }> = {
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKeyEnv: 'GEMINI_API_KEY',
    scoreModel: 'gemini-2.0-flash-lite',
    rewriteModel: 'gemini-2.0-flash',
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    scoreModel: 'deepseek-chat',
    rewriteModel: 'deepseek-chat',
  },
  qwen: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'QWEN_API_KEY',
    scoreModel: 'qwen-turbo',
    rewriteModel: 'qwen-plus',
  },
  openai: {
    baseURL: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    scoreModel: 'gpt-4o-mini',
    rewriteModel: 'gpt-4o',
  },
};

function getProvider(): string {
  return process.env.AI_PROVIDER || 'gemini';
}

function getConfig() {
  const provider = getProvider();
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error(`Unknown AI provider: ${provider}. Supported: ${Object.keys(PROVIDER_CONFIGS).join(', ')}`);
  }
  return config;
}

function createClient(): OpenAI {
  const config = getConfig();
  const apiKey = process.env[config.apiKeyEnv];

  // Allow env overrides for base URL
  const baseURL = process.env[`${getProvider().toUpperCase()}_BASE_URL`] || config.baseURL;

  if (!apiKey) {
    throw new Error(`Missing API key: set ${config.apiKeyEnv} in .env`);
  }

  return new OpenAI({ apiKey, baseURL });
}

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

export function getScoreModel(): string {
  const config = getConfig();
  const envKey = `${getProvider().toUpperCase()}_SCORE_MODEL`;
  return process.env[envKey] || config.scoreModel;
}

export function getRewriteModel(): string {
  const config = getConfig();
  const envKey = `${getProvider().toUpperCase()}_REWRITE_MODEL`;
  return process.env[envKey] || config.rewriteModel;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: { model?: string; maxTokens?: number; temperature?: number; retries?: number } = {}
): Promise<string> {
  const client = getClient();
  const maxRetries = options.retries ?? 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: options.model || getRewriteModel(),
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature ?? 0.7,
        messages,
      });

      const text = response.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('Empty response from AI');
      }
      return text;
    } catch (err: any) {
      const status = err?.status || err?.statusCode;
      if (status === 429 && attempt < maxRetries) {
        const wait = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
        console.log(`  ⏳ 限流，等待 ${wait / 1000}s 后重试 (${attempt + 1}/${maxRetries})`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export function parseJSON<T>(text: string): T {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response does not contain valid JSON');
  }
  return JSON.parse(jsonMatch[0]);
}
