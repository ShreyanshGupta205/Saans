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

export function AskSaansChat({ profile, aqiData, isHindi = false }: AskSaansChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: isHindi
        ? `नमस्ते! मैं साँस (Saans) हूँ। आपके इलाके में वर्तमान वायु गुणवत्ता सूचकांक ${aqiData.aqi} (${aqiData.categoryHi}) है। मास्क, प्यूरीफायर, दिनचर्या या वायु प्रदूषण की भ्रांतियों के बारे में मुझसे पूछें।`
        : `Hello! I am Saans. The current AQI in ${profile.locationName} is ${aqiData.aqi} (${aqiData.category}). How can I help your family navigate the smog today? You can ask me about masks, purifiers, routines, or common smog myths.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          profile,
          currentAqi: aqiData.aqi,
          dominantPollutant: aqiData.dominantPollutant,
          language: isHindi ? 'hi' : 'en',
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('Streaming response body unavailable');
      }

      const decoder = new TextDecoder();
      let assistantText = '';

      // Initialize assistant placeholder
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantText += chunk;

        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [...prev.slice(0, -1), { role: 'assistant', content: assistantText }];
          }
          return prev;
        });
      }
    } catch {
      // Degraded fallback reply
      const fallbackReply = isHindi
        ? 'क्षमा करें, कनेक्शन बाधित हुआ है। याद रखें: गंभीर स्मॉग के दौरान N95 मास्क पहनें, सुबह की सैर टालें, और खिड़कियां बंद रखें।'
        : 'Connection interrupted. Remember: Wear a tight-fitting N95 respirator outdoors, avoid early morning exertion, and keep windows sealed until midday.';

      setMessages((prev) => [...prev, { role: 'assistant', content: fallbackReply }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <section aria-labelledby="chat-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-emerald-400" aria-hidden="true" />
        <h2 id="chat-heading" className="text-xl font-bold tracking-tight text-zinc-100">
          {isHindi ? 'साँस से पूछें (स्मॉग सहायक)' : 'Ask Saans (Grounded Smog Assistant)'}
        </h2>
      </div>

      {/* Quick Myth-Buster Pills */}
      <div>
        <span className="text-xs text-zinc-400 mb-2 block font-medium">
          {isHindi ? 'अक्सर पूछे जाने वाले सवाल और भ्रांतियां:' : 'Common Smog Questions & Myth-Busters:'}
        </span>
        <div className="flex flex-wrap gap-2">
          {SMOG_MYTHS.map((myth) => (
            <button
              key={myth.id}
              onClick={() => sendMessage(isHindi ? myth.mythHi : myth.mythEn)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 text-left min-h-[36px]"
            >
              <Sparkles className="w-3 h-3 text-emerald-400 inline mr-1" />
              <span>{isHindi ? myth.mythHi : myth.mythEn}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 h-96 overflow-y-auto space-y-4 shadow-inner"
        role="log"
        aria-live="polite"
        aria-label="Conversation log"
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className="text-[11px] text-zinc-500 mb-1 px-1">
              {m.role === 'user' ? (isHindi ? 'आप' : 'You') : isHindi ? 'साँस' : 'Saans'}
            </span>
            <div
              className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-bl-none shadow-sm'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 p-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{isHindi ? 'साँस उत्तर तैयार कर रहा है...' : 'Saans is thinking...'}</span>
          </div>
        )}
      </div>

      {/* Chat Input Form */}
      <form onSubmit={handleFormSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder={
            isHindi
              ? 'मास्क, प्यूरीफायर, वेंटिलेशन या प्रदूषण से जुड़े सवाल पूछें...'
              : 'Ask anything about masks, purifiers, routines, or myths...'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
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

      {/* Mandatory Medical Safety Disclaimer */}
      <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-200/90 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          {isHindi
            ? 'चिकित्सा सुरक्षा चेतावनी: साँस वायु प्रदूषण और बचाव मार्गदर्शन प्रदान करता है, कोई चिकित्सकीय परामर्श या निदान नहीं। सांस फूलने, छाती में जकड़न या अस्थमा के गंभीर दौरों में तुरंत नजदीकी आपातकालीन अस्पताल में डॉक्टर से संपर्क करें। निर्धारित दवाइयां या इनहेलर कभी बंद न करें।'
            : 'Medical Safety Notice: Saans provides air quality guidance, not medical diagnosis or prescription. For severe breathing distress or asthma emergencies, seek urgent emergency hospital care. Never discontinue prescribed inhalers or medication.'}
        </p>
      </div>
    </section>
  );
}
