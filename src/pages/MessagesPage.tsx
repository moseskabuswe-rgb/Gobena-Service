import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { Message } from '../types';
import { Send, AlertCircle } from '../components/Icons';

export default function MessagesPage() {
  const { user, profile, shop } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const shopId = shop?.id;

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const load = async () => {
    if (!shopId) { setLoading(false); return; }
    const { data } = await supabase
      .from('messages')
      .select('id, shop_id, sender_id, sender_role, sender_name, body, read_by_admin, read_by_partner, created_at')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true })
      .limit(100);
    setMessages((data as unknown as Message[]) || []);
    setLoading(false);

    // Mark messages sent by admin as read by partner
    if (data && data.length > 0) {
      await supabase.from('messages')
        .update({ read_by_partner: true })
        .eq('shop_id', shopId)
        .eq('sender_role', 'admin')
        .eq('read_by_partner', false);
    }
  };

  useEffect(() => {
    load();

    if (!shopId) return;

    channelRef.current = supabase
      .channel(`messages-${shopId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `shop_id=eq.${shopId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(scrollToBottom, 50);
      })
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, [shopId]);

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  const send = async () => {
    if (!body.trim() || !shopId || !user || !profile) return;
    setSending(true);
    setError('');

    const { error: err } = await supabase.from('messages').insert({
      shop_id:          shopId,
      sender_id:        user.id,
      sender_role:      profile.role,
      sender_name:      profile.full_name,
      body:             body.trim(),
      read_by_admin:    false,
      read_by_partner:  profile.role === 'partner',
    });

    if (err) { setError('Failed to send. Try again.'); }
    else { setBody(''); }
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-56px)] bg-stone-50 pb-16 md:pb-0">

      {/* Header */}
      <div className="bg-white border-b border-stone-100 px-4 md:px-8 py-4 shrink-0">
        <h1 className="text-lg font-bold text-stone-900">Messages</h1>
        <p className="text-xs text-stone-400 mt-0.5">Direct line to Gobena Coffee</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-3 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send size={20} className="text-stone-400" />
            </div>
            <p className="text-sm font-medium text-stone-500">No messages yet</p>
            <p className="text-xs mt-1">Send a message to Gobena below</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === user?.id;
          const showName = i === 0 || messages[i - 1].sender_id !== msg.sender_id;
          const isAdmin = msg.sender_role === 'admin';

          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              {showName && (
                <p className="text-[10px] text-stone-400 mb-1 px-1">
                  {isAdmin ? '🟤 Gobena' : msg.sender_name}
                </p>
              )}
              <div className={`max-w-[80%] md:max-w-[60%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                isOwn
                  ? 'bg-stone-900 text-white rounded-br-sm'
                  : isAdmin
                    ? 'bg-amber-50 text-stone-800 border border-amber-200 rounded-bl-sm'
                    : 'bg-white text-stone-800 border border-stone-100 rounded-bl-sm'
              }`}>
                {msg.body}
              </div>
              <p className="text-[10px] text-stone-300 mt-1 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 md:px-8 pb-2 max-w-3xl mx-auto w-full">
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle size={12} />{error}
          </p>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-stone-100 px-4 md:px-8 py-3 shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message Gobena… (Enter to send)"
            rows={1}
            className="flex-1 px-4 py-2.5 text-sm border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            style={{ maxHeight: 120, overflowY: 'auto' }}
          />
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            className="px-4 py-2.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition disabled:opacity-40 shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
