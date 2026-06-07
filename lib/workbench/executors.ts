// Apply-It Workbench — multi-provider executor abstraction.
// Runs a member's prompt against the chosen executor model and returns the raw
// output text. Providers are called directly via fetch, matching the codebase
// convention (lib/survey/summarize.ts) and because a single executor spans
// Anthropic + OpenAI + Google, which no one SDK covers uniformly.
//
// Any provider / config / empty-output failure throws ExecutorError. The caller
// (POST /api/workbench/run) refunds the consumed quota and returns 502 — failed
// provider calls must not consume a student's daily run budget.

import { EXECUTOR_MODELS, type ExecutorModelConfig } from '@/lib/workbench/models';
import type { WorkbenchExecutorModel } from '@/lib/workbench/types';

export type ExecutorErrorCode = 'CONFIG_ERROR' | 'PROVIDER_ERROR' | 'EMPTY_OUTPUT';

export class ExecutorError extends Error {
  readonly code: ExecutorErrorCode;
  constructor(code: ExecutorErrorCode, message: string) {
    super(message);
    this.name = 'ExecutorError';
    this.code = code;
  }
}

export interface RunExecutorParams {
  model: WorkbenchExecutorModel;
  promptText: string;
}

export interface RunExecutorResult {
  outputText: string;
}

export async function runExecutor({
  model,
  promptText,
}: RunExecutorParams): Promise<RunExecutorResult> {
  const config = EXECUTOR_MODELS[model];
  const apiKey = process.env[config.envVar];
  if (!apiKey) {
    throw new ExecutorError(
      'CONFIG_ERROR',
      `Executor "${model}" is not configured (${config.envVar} missing)`,
    );
  }

  const raw = await callProvider(config, apiKey, promptText);
  const outputText = raw.trim();
  if (!outputText) {
    throw new ExecutorError('EMPTY_OUTPUT', `Executor "${model}" returned no text`);
  }
  return { outputText };
}

function callProvider(
  config: ExecutorModelConfig,
  apiKey: string,
  promptText: string,
): Promise<string> {
  switch (config.provider) {
    case 'anthropic':
      return callAnthropic(config, apiKey, promptText);
    case 'openai':
      return callOpenAI(config, apiKey, promptText);
    case 'google':
      return callGoogle(config, apiKey, promptText);
    default: {
      const exhaustive: never = config.provider;
      throw new ExecutorError('CONFIG_ERROR', `Unknown provider ${String(exhaustive)}`);
    }
  }
}

/** fetch wrapped in an AbortController timeout (mirrors lib/survey/summarize.ts). */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    // Network error, abort/timeout, DNS, etc. — all surface as PROVIDER_ERROR.
    throw new ExecutorError(
      'PROVIDER_ERROR',
      err instanceof Error ? err.message : 'Provider request failed',
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function providerErrorBody(response: Response): Promise<string> {
  const text = await response.text().catch(() => '(unreadable)');
  return `${response.status}: ${text.slice(0, 500)}`;
}

async function callAnthropic(
  config: ExecutorModelConfig,
  apiKey: string,
  promptText: string,
): Promise<string> {
  const response = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.apiId,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        messages: [{ role: 'user', content: promptText }],
      }),
    },
    config.timeoutMs,
  );

  if (!response.ok) {
    throw new ExecutorError('PROVIDER_ERROR', `Anthropic ${await providerErrorBody(response)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  return (
    data.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('') ?? ''
  );
}

async function callOpenAI(
  config: ExecutorModelConfig,
  apiKey: string,
  promptText: string,
): Promise<string> {
  const response = await fetchWithTimeout(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.apiId,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        messages: [{ role: 'user', content: promptText }],
      }),
    },
    config.timeoutMs,
  );

  if (!response.ok) {
    throw new ExecutorError('PROVIDER_ERROR', `OpenAI ${await providerErrorBody(response)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}

async function callGoogle(
  config: ExecutorModelConfig,
  apiKey: string,
  promptText: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.apiId}:generateContent`;
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        generationConfig: {
          maxOutputTokens: config.maxTokens,
          temperature: config.temperature,
        },
      }),
    },
    config.timeoutMs,
  );

  if (!response.ok) {
    throw new ExecutorError('PROVIDER_ERROR', `Google ${await providerErrorBody(response)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  );
}
