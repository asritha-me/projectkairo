import { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  Trash2,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { ChatMessage } from '@/types';
import { Spinner, EmptyState } from '@/components/Loading';
import { cn, timeAgo } from '@/lib/utils';

const SUGGESTED_QUESTIONS = [
  'Can you explain my latest blood test in simple language?',
  'What medicines are listed in my uploaded prescription?',
  'Summarize my discharge report.',
  'What questions could I ask my doctor about my report?',
  'Which medical records did I upload recently?',
  'Show me how my documented test values changed over time.',
];

export function AiCopilot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) || []);
    setLoading(false);
  };

  const handleSend = async (question?: string) => {
    const message = (question || input).trim();
    if (!message || sending) return;

    setError(null);
    setInput('');

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: 'temp-user',
      user_id: user?.id || '',
      role: 'user',
      content: message,
      sources: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'temp-user')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ message, history }),
        }
      );

      if (!response.ok) {
        throw new Error('Request failed. Please try again.');
      }

      const data = await response.json();

      if (data.configured === false) {
        setAiConfigured(false);
      } else {
        setAiConfigured(true);
      }

      const assistantMsg: ChatMessage = {
        id: 'temp-assistant',
        user_id: user?.id || '',
        role: 'assistant',
        content: data.reply || 'I was unable to generate a response.',
        sources: data.sources || [],
        created_at: new Date().toISOString(),
      };

      // Save both messages to database
      const { data: savedUser } = await supabase
        .from('chat_messages')
        .insert({ role: 'user', content: message })
        .select()
        .single();

      const { data: savedAssistant } = await supabase
        .from('chat_messages')
        .insert({
          role: 'assistant',
          content: assistantMsg.content,
          sources: assistantMsg.sources,
        })
        .select()
        .single();

      // Replace temp messages with saved ones
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== 'temp-user' && m.id !== 'temp-assistant'),
        savedUser as ChatMessage,
        savedAssistant as ChatMessage,
      ]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMsg);
      // Remove temp user message on error
      setMessages((prev) => prev.filter((m) => m.id !== 'temp-user'));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = async () => {
    if (!confirm('Clear all chat history? This cannot be undone.')) return;
    await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-ai flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-midnight-900">AI Health Copilot</h1>
            <p className="text-xs text-midnight-400">Ask questions about your medical records</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClearChat} className="btn-ghost text-sm text-rose-600 hover:bg-rose-50">
            <Trash2 size={16} /> Clear
          </button>
        )}
      </div>

      {aiConfigured === false && (
        <div className="card p-3 mb-3 bg-amber-50/60 border-amber-100 flex items-start gap-2">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            The Gemini API key has not been configured yet. Responses will be limited until it's added.
            Contact your project administrator to add the GEMINI_API_KEY secret.
          </p>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto card p-4 lg:p-6 mb-4">
        {messages.length === 0 && !sending ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-sky-50 flex items-center justify-center mb-5">
              <MessageSquare size={28} className="text-teal-500" />
            </div>
            <h3 className="text-lg font-semibold text-midnight-800 mb-2">
              Ask KAIRO about your health records
            </h3>
            <p className="text-sm text-midnight-400 text-center max-w-md mb-6">
              I can explain your lab results, summarize documents, and answer questions based on
              your uploaded medical records.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-left p-3 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all text-sm text-midnight-600 group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-teal-400 group-hover:text-teal-600" />
                    {q}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onCopy={() => handleCopy(msg.content, msg.id)}
                copied={copiedId === msg.id}
              />
            ))}
            {sending && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-ai flex items-center justify-center flex-shrink-0">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div className="card p-3 flex items-center gap-2">
                  <Spinner size={16} />
                  <span className="text-sm text-midnight-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && (
        <div className="card p-3 mb-3 bg-rose-50 border-rose-200 flex items-center gap-2 animate-fade-in">
          <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          <span className="text-sm text-rose-700 flex-1">{error}</span>
          <button onClick={() => handleSend()} className="btn-ghost text-sm text-rose-600">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="card p-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your health records..."
          rows={1}
          className="flex-1 resize-none outline-none text-sm text-midnight-800 placeholder:text-midnight-300 bg-transparent px-2 py-2 max-h-32"
          style={{ minHeight: '40px' }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || sending}
          className="btn-primary px-3 py-2.5 flex-shrink-0"
        >
          <Send size={18} />
        </button>
      </div>

      <p className="text-xs text-midnight-300 mt-2 text-center">
        AI responses are informational only and based on your uploaded records. Not medical advice.
      </p>
    </div>
  );
}

function MessageBubble({
  message,
  onCopy,
  copied,
}: {
  message: ChatMessage;
  onCopy: () => void;
  copied: boolean;
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end animate-fade-in-up">
        <div className="bg-teal-600 text-white rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[80%]">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-teal-700">
          You
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <div className="w-8 h-8 rounded-lg bg-gradient-ai flex items-center justify-center flex-shrink-0">
        <Sparkles size={16} className="text-white" />
      </div>
      <div className="max-w-[80%]">
        <div className="card p-4 rounded-2xl rounded-tl-md">
          <div className="prose-chat text-sm">
            <RenderMarkdown content={message.content} />
          </div>

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-medium text-midnight-400 mb-1.5">Sources:</p>
              <div className="flex flex-wrap gap-1.5">
                {message.sources.map((src, i) => (
                  <span key={i} className="badge bg-sky-50 text-sky-700">
                    <FileText size={12} />
                    {src.documentName}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 ml-1">
          <button
            onClick={onCopy}
            className="text-xs text-midnight-400 hover:text-teal-600 flex items-center gap-1 transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RenderMarkdown({ content }: { content: string }) {
  // Simple markdown rendering: bold, headers, lists, paragraphs
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      if (listType === 'ul') {
        elements.push(<ul key={`ul-${elements.length}`}>{listItems.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(li) }} />)}</ul>);
      } else {
        elements.push(<ol key={`ol-${elements.length}`}>{listItems.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(li) }} />)}</ol>);
      }
      listItems = [];
      listType = null;
    }
  };

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={elements.length}>{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(<h3 key={elements.length}>{line.slice(3)}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(line.replace(/^\d+\.\s/, ''));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={elements.length} dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />);
    }
  }
  flushList();

  return <>{elements}</>;
}

function inlineFormat(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}
