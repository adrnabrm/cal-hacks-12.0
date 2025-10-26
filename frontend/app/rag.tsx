'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Send, BookOpen, Trash2, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
  retrieved?: string[];
}

export default function RAGChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 🔐 Check auth
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
    })();
  }, [router]);

  // 📜 Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 💬 Submit query to RAG endpoint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: input }),
      });

      const data = await response.json();

      if (data.ok) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.answer,
          timestamp: new Date(),
          metadata: data.metadata,
          retrieved: data.retrieved,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 🗑 Clear chat history
  const handleClearChat = () => {
    const confirmClear = confirm('Clear all chat history?');
    if (confirmClear) {
      setMessages([]);
    }
  };

  // 🚪 Log out
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full bg-white border-b border-green-100 p-4 shadow-sm"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="text-green-600 w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold text-green-800">Research Assistant</h1>
              <p className="text-sm text-green-600">Ask questions about your research</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-full transition"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full shadow transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Chat Messages */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="flex-1 overflow-y-auto p-4 pb-24"
      >
        <div className="max-w-4xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <BookOpen className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-green-800 mb-2">
                  Start a conversation
                </h2>
                <p className="text-green-600">
                  Ask any question about your research documents
                </p>
              </motion.div>
            )}

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 shadow-md ${
                    message.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-white text-green-900 border border-green-100'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-green-100' : 'text-green-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                  {message.retrieved && message.retrieved.length > 0 && (
                    <details className="mt-2 text-xs text-green-600">
                      <summary className="cursor-pointer hover:underline">
                        Sources ({message.retrieved.length})
                      </summary>
                      <ul className="mt-1 space-y-1 pl-4">
                        {message.retrieved.map((id, idx) => (
                          <li key={idx}>• {id}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-white rounded-2xl p-4 shadow-md border border-green-100">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </motion.section>

      {/* Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-green-100 p-4 shadow-lg"
      >
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your research..."
            className="flex-1 px-4 py-3 rounded-full border-2 border-green-200 focus:border-green-500 focus:outline-none text-green-900 placeholder-green-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-6 py-3 rounded-full shadow-md transition flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        <div className="max-w-4xl mx-auto mt-2 text-center">
          <Link
            href="/library"
            className="text-sm text-green-600 hover:underline"
          >
            ← Back to Library
          </Link>
        </div>
      </motion.div>
    </main>
  );
}