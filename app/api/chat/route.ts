/**
 * @file route.ts
 * @description API route handler for grounded streaming chat with prompt injection defense.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModelName, getGenAIClient } from '@/lib/llm/client';
import { buildChatPrompt, SAANS_SYSTEM_PROMPT } from '@/lib/llm/prompt';
import { ChatRequestSchema } from '@/lib/llm/schema';
import { enforceRateLimit } from '@/lib/rate-limit/helpers';

interface MessageItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function buildChatContents(grounding: string, messages: MessageItem[]) {
  return [
    { role: 'user', parts: [{ text: grounding }] },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [
        {
          text: m.role === 'user' ? `<untrusted_user_message>\n${m.content}\n</untrusted_user_message>` : m.content,
        },
      ],
    })),
  ];
}

function getOfflineFallback(language: 'en' | 'hi'): Response {
  const fallback =
    language === 'hi'
      ? 'वर्तमान में एआई चैट ऑफ़लाइन मोड में है। गंभीर स्मॉग के दौरान कृपया बाहर जाने से बचें, एन95 मास्क का प्रयोग करें और खिड़कियां केवल दोपहर 1 से 3 बजे के बीच ही 10 मिनट के लिए खोलें।'
      : 'AI chat is running in offline fallback mode. During high smog episodes, please avoid morning exertion, wear an N95 respirator outdoors, and keep windows tightly sealed until midday.';
  return new Response(fallback, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

function createTextStream(streamResult: AsyncIterable<{ text?: string }>): Response {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamResult) {
          if (chunk.text) controller.enqueue(new TextEncoder().encode(chunk.text));
        }
        controller.close();
      } catch (streamErr) {
        controller.error(streamErr);
      }
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
  });
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body: unknown = await request.json();
    const parseResult = ChatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid chat request structure.' }, { status: 400 });
    }

    const { messages, profile, currentAqi, dominantPollutant, language } = parseResult.data;
    const client = getGenAIClient();
    if (!client) return getOfflineFallback(language);

    const grounding = buildChatPrompt(profile, currentAqi, dominantPollutant, language);
    const streamResult = await client.models.generateContentStream({
      model: getGeminiModelName(),
      contents: buildChatContents(grounding, messages as MessageItem[]),
      config: {
        systemInstruction: { parts: [{ text: SAANS_SYSTEM_PROMPT }] },
        maxOutputTokens: 1024,
        temperature: 0.2,
      },
    });

    return createTextStream(streamResult);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Chat failed' }, { status: 500 });
  }
}
