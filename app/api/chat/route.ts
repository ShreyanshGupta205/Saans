/**
 * @file route.ts
 * @description API route handler for grounded streaming chat with prompt injection defense.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModelName, getGenAIClient } from '@/lib/llm/client';
import { buildChatPrompt, SAANS_SYSTEM_PROMPT } from '@/lib/llm/prompt';
import { ChatRequestSchema } from '@/lib/llm/schema';
import { globalRateLimiter } from '@/lib/rate-limit/limiter';

export async function POST(request: NextRequest) {
  // 1. IP Rate Limiting
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const rateCheck = await globalRateLimiter.check(clientIp);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before retrying.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateCheck.retryAfterSeconds ?? 60),
          'X-RateLimit-Limit': String(rateCheck.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const body = await request.json();
    const parseResult = ChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid chat request structure.', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { messages, profile, currentAqi, dominantPollutant, language } = parseResult.data;
    const client = getGenAIClient();

    // Fallback if no Gemini client is configured
    if (!client) {
      const fallbackReply =
        language === 'hi'
          ? 'वर्तमान में एआई चैट ऑफ़लाइन मोड में है। गंभीर स्मॉग के दौरान कृपया बाहर जाने से बचें, एन95 मास्क का प्रयोग करें और खिड़कियां केवल दोपहर 1 से 3 बजे के बीच ही 10 मिनट के लिए खोलें।'
          : 'AI chat is running in offline fallback mode. During high smog episodes, please avoid morning exertion, wear an N95 respirator outdoors, and keep windows tightly sealed until the midday sun disperses the inversion layer.';

      return new Response(fallbackReply, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const model = getGeminiModelName();
    const chatGrounding = buildChatPrompt(profile, currentAqi, dominantPollutant, language);

    // Format conversation history into Gemini format with strict user content sandboxing
    const contents = [
      {
        role: 'user',
        parts: [{ text: chatGrounding }],
      },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [
          {
            text:
              m.role === 'user'
                ? `<untrusted_user_message>\n${m.content}\n</untrusted_user_message>`
                : m.content,
          },
        ],
      })),
    ];

    const streamResult = await client.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: {
          parts: [{ text: SAANS_SYSTEM_PROMPT }],
        },
        maxOutputTokens: 1024,
        temperature: 0.2,
      },
    });

    // Create ReadableStream to stream chunks to client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult) {
            const chunkText = chunk.text;
            if (chunkText) {
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }
          controller.close();
        } catch (streamErr) {
          controller.error(streamErr);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chat execution failed' },
      { status: 500 }
    );
  }
}
