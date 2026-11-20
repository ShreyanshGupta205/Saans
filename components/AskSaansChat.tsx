'use client';

import React, { useState } from 'react';
import { Send, MessageSquare, Sparkles, AlertTriangle } from 'lucide-react';
import { SMOG_MYTHS } from '@/data/myths';
import { ComputedAQIResult } from '@/lib/aqi/types';
import { HouseholdProfile } from '@/lib/impact/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AskSaansChatProps {
  readonly profile: HouseholdProfile;
  readonly aqiData: ComputedAQIResult;
  readonly isHindi?: boolean;
}

function ChatMythPills({
  onSelectMyth,
  isLoading,
  isHindi,
}: {
  readonly onSelectMyth: (text: string) => void;
  readonly isLoading: boolean;
  readonly isHindi: boolean;
}) {
  return (
    <div>
      <span className="text-xs text-zinc-400 mb-2 block font-medium">
        {isHindi ? 'अक्सर पूछे जाने वाले सवाल और भ्रांतियां:' : 'Common Smog Questions & Myth-Busters:'}
      </span>
      <div className="flex flex-wrap gap-2">
        {SMOG_MYTHS.map((myth) => (
          <button
            key={myth.id}
            onClick={() => onSelectMyth(isHindi ? myth.mythHi : myth.mythEn)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 text-left min-h-[36px]"
          >
            <Sparkles className="w-3 h-3 text-emerald-400 inline mr-1" />
            <span>{isHindi ? myth.mythHi : myth.mythEn}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message, isHindi }: { readonly message: Message; readonly isHindi: boolean }) {
  const isUser = message.role === 'user';
  const roleName = isUser ? (isHindi ? 'आप' : 'You') : isHindi ? 'साँस' : 'Saans';
  const bubbleClass = isUser
    ? 'bg-emerald-600 text-white rounded-br-none'
    : 'bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-bl-none shadow-sm';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <span className="text-[11px] text-zinc-500 mb-1 px-1">{roleName}</span>
      <div className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${bubbleClass}`}>
        {message.content}
      </div>
    </div>
  );
}

function ChatMessageList({
  messages,
  isLoading,
  isHindi,
}: {
  readonly messages: readonly Message[];
  readonly isLoading: boolean;
  readonly isHindi: boolean;
}) {
  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 h-96 overflow-y-auto space-y-4 shadow-inner"
      role="log"
      aria-live="polite"
      aria-label="Conversation log"
    >
      {messages.map((m, idx) => (
        <ChatBubble key={idx} message={m} isHindi={isHindi} />
      ))}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{isHindi ? 'साँस उत्तर तैयार कर रहा है...' : 'Saans is thinking...'}</span>
        </div>
      )}
    </div>
  );
}

function ChatInputForm({
  input,
  onChange,
  onSubmit,
  isLoading,
  isHindi,
}: {
  readonly input: string;
  readonly onChange: (val: string) => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly isLoading: boolean;
  readonly isHindi: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder={
          isHindi
            ? 'मास्क, प्यूरीफायर, वेंटिलेशन या प्रदूषण से जुड़े सवाल पूछें...'
            : 'Ask anything about masks, purifiers, routines, or myths...'
        }
        value={input}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px]"
        aria-label="Send message"
      >
        <Send className="w-4 h-4" />
        <span className="hidden sm:inline">{isHindi ? 'पूछें' : 'Send'}</span>
      </button>
    </form>
  );
}

async function streamAssistantReply(
  url: string,
  body: object,
  onToken: (tok: string) => void
) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error('Streaming unavailable');

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onToken(decoder.decode(value, { stream: true }));
  }
}

function useChatAssistant(profile: HouseholdProfile, aqiData: ComputedAQIResult, isHindi: boolean) {
  const greeting = isHindi
    ? `नमस्ते! मैं साँस हूँ। AQI ${aqiData.aqi} (${aqiData.categoryHi}) है। मास्क, प्यूरीफायर या स्मॉग के बारे में पूछें।`
    : `Hello! I am Saans. Current AQI in ${profile.locationName} is ${aqiData.aqi} (${aqiData.category}). Ask me about masks, purifiers, or myths.`;

  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text: string) => {
    const clean = text.trim();
    if (!clean || isLoading) return;
    const nextMsgs = [...messages, { role: 'user' as const, content: clean }];
    setMessages([...nextMsgs, { role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);

    try {
      let acc = '';
      await streamAssistantReply('/api/chat', {
        messages: nextMsgs, profile, currentAqi: aqiData.aqi, dominantPollutant: aqiData.dominantPollutant, language: isHindi ? 'hi' : 'en',
      }, (chunk) => {
        acc += chunk;
        setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: acc }]);
      });
    } catch {
      const fb = isHindi ? 'कनेक्शन बाधित हुआ। N95 मास्क पहनें और खिड़कियां बंद रखें।' : 'Connection interrupted. Wear N95 respirator and keep windows closed.';
      setMessages((prev) => [...prev.slice(0, -1), { role: 'assistant', content: fb }]);
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, input, setInput, isLoading, sendMessage };
}

export function AskSaansChat({ profile, aqiData, isHindi = false }: AskSaansChatProps) {
  const { messages, input, setInput, isLoading, sendMessage } = useChatAssistant(profile, aqiData, isHindi);

  return (
    <section aria-labelledby="chat-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-emerald-400" aria-hidden="true" />
        <h2 id="chat-heading" className="text-xl font-bold tracking-tight text-zinc-100">{isHindi ? 'साँस से पूछें (स्मॉग सहायक)' : 'Ask Saans (Grounded Smog Assistant)'}</h2>
      </div>
      <ChatMythPills onSelectMyth={sendMessage} isLoading={isLoading} isHindi={isHindi} />
      <ChatMessageList messages={messages} isLoading={isLoading} isHindi={isHindi} />
      <ChatInputForm input={input} onChange={setInput} onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} isLoading={isLoading} isHindi={isHindi} />
      <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-200/90 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p>{isHindi ? 'चिकित्सा सुरक्षा चेतावनी: साँस वायु प्रदूषण मार्गदर्शन प्रदान करता है, कोई चिकित्सकीय परामर्श नहीं।' : 'Medical Notice: Saans provides air quality guidance, not medical diagnosis or prescription.'}</p>
      </div>
    </section>
  );
}
