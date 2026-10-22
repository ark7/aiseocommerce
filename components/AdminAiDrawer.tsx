'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AdminAiDrawer() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Focus textarea when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Context-aware prompt suggestions based on current admin route
  const getContextChips = () => {
    if (pathname.includes('/admin/products')) {
      return [
        '✨ Buatkan copywriting deskripsi produk format AIDA',
        '🔍 Riset 5 rekomendasi keyword & SEO meta',
        '🏷️ Berikan 3 variasi judul produk menarik',
      ];
    }
    if (pathname.includes('/admin/analytics') || pathname.includes('/admin/finance')) {
      return [
        '📊 Rangkum performa penjualan dan tren produk',
        '⚠️ Produk apa yang berisiko jadi dead stock?',
        '💡 Ide strategi promo untuk meningkatkan omset',
      ];
    }
    if (pathname.includes('/admin/orders')) {
      return [
        '💬 Template chat WhatsApp follow-up konfirmasi pesanan',
        '📦 Template pesan resi pengiriman ke pembeli',
        '🤝 Cara ramah menangani pembeli yang komplain',
      ];
    }
    return [
      '🚀 Bagaimana cara meningkatkan penjualan toko ini?',
      '📝 Buat ide artikel blog untuk menarik trafik SEO',
      '🎯 Rekomendasi program diskon & voucher menarik',
    ];
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setErrorMessage(null);
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          context: {
            pathname,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menerima balasan dari AI');
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat berkomunikasi dengan AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (window.confirm('Bersihkan seluruh riwayat percakapan?')) {
      setMessages([]);
      setErrorMessage(null);
    }
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center space-x-2 border border-white/20 group"
        aria-label="Buka Asisten AI"
      >
        <div className="relative">
          <svg className="w-6 h-6 text-yellow-300 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L14.4 7.6L20 8.4L15.8 12.6L17 18.2L12 15.2L7 18.2L8.2 12.6L4 8.4L9.6 7.6L12 2Z" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400"></span>
          </span>
        </div>
        <span className="hidden sm:inline font-semibold text-sm tracking-wide">
          {isOpen ? 'Tutup AI' : 'Asisten AI'}
        </span>
      </button>

      {/* Slide-Over Backdrop (Mobile Only) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 sm:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-Over Chat Drawer (Right-Side Panel) */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl flex flex-col border-l border-gray-200 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-inner">
              <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L14.4 7.6L20 8.4L15.8 12.6L17 18.2L12 15.2L7 18.2L8.2 12.6L4 8.4L9.6 7.6L12 2Z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center space-x-1.5">
                <span>Asisten Toko AI</span>
                <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-400/20">
                  BYOK
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                Gemini / OpenAI Copilot
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                title="Bersihkan Percakapan"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              title="Tutup Panel"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
          {messages.length === 0 ? (
            <div className="text-center py-8 px-2">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h4 className="font-semibold text-slate-800 text-sm mb-1">
                Halo! Saya Asisten AI Toko Anda
              </h4>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-xs mx-auto">
                Tanyakan apa saja seputar pembuatan copywriting produk, riset SEO, analisis penjualan, atau ide promosi toko.
              </p>

              {/* Suggestions Chips */}
              <div className="space-y-2 text-left">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                  Saran Pertanyaan Cepat:
                </div>
                {getContextChips().map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    className="w-full text-left text-xs bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 p-2.5 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center justify-between group"
                  >
                    <span>{chip}</span>
                    <span className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[10px] text-slate-400 mb-1 px-1">
                  {msg.role === 'user' ? 'Anda' : 'Asisten AI'} • {msg.timestamp}
                </div>
                <div
                  className={`relative max-w-[92%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap select-text">{msg.content}</div>

                  {msg.role === 'assistant' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center space-x-1 font-medium transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>{copiedId === msg.id ? '✓ Disalin!' : 'Salin Teks'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex flex-col items-start">
              <div className="text-[10px] text-slate-400 mb-1 px-1">Asisten AI sedang berpikir...</div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-3.5 shadow-xs flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <div className="font-semibold mb-0.5 flex items-center space-x-1">
                <span>⚠️ Kendala Komunikasi AI:</span>
              </div>
              <p className="mb-2 leading-relaxed">{errorMessage}</p>
              {errorMessage.includes('belum diatur') && (
                <a
                  href="/admin/settings"
                  className="inline-block px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700"
                >
                  Buka Pengaturan AI Toko →
                </a>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Context Prompt Pills (Visible while chatting) */}
        {messages.length > 0 && !loading && (
          <div className="px-3 py-1.5 bg-slate-100/80 border-t border-slate-200 flex items-center space-x-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <span className="text-slate-400 shrink-0 font-medium text-[10px]">Saran:</span>
            {getContextChips().slice(0, 2).map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                className="shrink-0 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 px-2.5 py-1 rounded-full border border-slate-200 text-[11px] transition-colors truncate max-w-[200px]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Chat Input Section */}
        <div className="p-3 bg-white border-t border-slate-200">
          <div className="flex items-end space-x-2 bg-slate-50 border border-slate-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 rounded-2xl p-1.5 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanya AI atau minta buatkan copywriting..."
              disabled={loading}
              className="flex-1 bg-transparent border-0 resize-none focus:ring-0 text-xs p-1.5 text-slate-800 placeholder-slate-400 max-h-28 overflow-y-auto focus:outline-hidden"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl transition-all disabled:cursor-not-allowed shrink-0"
              aria-label="Kirim Pesan"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span>Tekan <kbd className="bg-slate-100 px-1 rounded border border-slate-300">Enter</kbd> untuk kirim</span>
            <span>Mendukung Google Gemini & OpenAI</span>
          </div>
        </div>
      </div>
    </>
  );
}
