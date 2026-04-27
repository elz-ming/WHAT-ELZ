'use client';

import { useState, useRef, useEffect } from 'react';
import type { Platform, Lead, Message } from '../_data/leads';

export function ChatWindow({ platform }: { platform: Platform }) {
  const [leads, setLeads] = useState<Lead[]>(() =>
    JSON.parse(JSON.stringify(platform.leads))
  );
  const [selectedId, setSelectedId] = useState(platform.leads[0].id);
  const [replyText, setReplyText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selected = leads.find(l => l.id === selectedId)!;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected.messages.length, isTyping]);

  function handleSend() {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    const autoReply = selected.autoReply;
    const currentId = selectedId;
    setReplyText('');

    const sent: Message = {
      id: Date.now().toString(),
      from: 'me',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setLeads(prev => prev.map(l =>
      l.id === currentId ? { ...l, messages: [...l.messages, sent], lastMessage: text } : l
    ));

    setTimeout(() => setIsTyping(true), 900);
    setTimeout(() => {
      setIsTyping(false);
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        from: 'lead',
        text: autoReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setLeads(prev => prev.map(l =>
        l.id === currentId
          ? { ...l, messages: [...l.messages, reply], lastMessage: reply.text, unread: 0 }
          : l
      ));
    }, 2600);
  }

  return (
    <div
      className="flex border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm"
      style={{ height: '520px' }}
    >
      {/* Left — contact list */}
      <div className="w-64 shrink-0 border-r border-zinc-200 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: platform.accent }} />
            <span className="text-sm font-medium text-zinc-800">{platform.name}</span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5">
            DEMO
          </span>
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-zinc-100">
          {leads.map(lead => {
            const active = lead.id === selectedId;
            return (
              <li key={lead.id}>
                <button
                  onClick={() => setSelectedId(lead.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50/60 border-l-2"
                  style={{
                    backgroundColor: active ? '#fafafa' : undefined,
                    borderLeftColor: active ? platform.accent : 'transparent',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: active ? platform.accent : '#a1a1aa' }}
                  >
                    {lead.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-900 truncate">{lead.name}</span>
                      <span className="text-[10px] text-zinc-400 shrink-0 ml-1">{lead.timestamp}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-zinc-500 truncate">{lead.lastMessage}</p>
                      {lead.unread > 0 && (
                        <span
                          className="ml-1 shrink-0 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                          style={{ backgroundColor: platform.accent }}
                        >
                          {lead.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Right — conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Contact header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-100">
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: platform.accent }}
          >
            {selected.initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">{selected.name}</p>
            {selected.company && <p className="text-xs text-zinc-400">{selected.company}</p>}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-zinc-50/30">
          {selected.messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  msg.from === 'me'
                    ? 'rounded-br-sm text-white'
                    : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm'
                }`}
                style={msg.from === 'me' ? { backgroundColor: platform.accent } : {}}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${msg.from === 'me' ? 'text-white/70 text-right' : 'text-zinc-400'}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-3">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply input */}
        <div className="px-4 py-3 border-t border-zinc-100 bg-white">
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-full px-4 py-2">
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Reply... (demo workspace)"
              className="flex-1 bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!replyText.trim()}
              className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
              style={{ backgroundColor: platform.accent }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-white" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
