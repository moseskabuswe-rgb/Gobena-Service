import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { Message, Shop } from '../types';
import { Send, Store, AlertCircle } from '../components/Icons';

type Thread = { shop: Shop; messages: Message[]; unread: number; lastAt: string };

export default function AdminMessagesPage() {
  const { user, profile } = useAuth();
  const [threads, setThreads]         = useState<Thread[]>([]);
  const [activeShopId, setActiveShopId] = useState<string | null>(null);
  const [body, setBody]               = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [error, setError]             = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const load = async () => {
    const [shopRes, msgRes] = await Promise.all([
      supabase.from('shops').select('id, name, city, status, contact_name, address, state, contact_email, contact_phone, approved_at, approved_by, notes, created_at').eq('status', 'approved').order('name'),
      supabase.from('messages').select('id, shop_id, sender_id, sender_role, sender_name, body, read_by_admin, read_by_partner, created_at').order('created_at', { ascending: true }),
    ]);

    const shops = (shopRes.data as unknown as Shop[]) || [];
    const msgs  = (msgRes.data as unknown as Message[]) || [];

    const built: Thread[] = shops.map(shop => {
      const shopMsgs = msgs.filter(m => m.shop_id === shop.id);
      const unread = shopMsgs.filter(m => m.sender_role === 'partner' && !m.read_by_admin).length;
      const last = shopMsgs[shopMsgs.length - 1];
      return { shop, messages: shopMsgs, unread, lastAt: last?.created_at || shop.created_at };
    }).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    setThreads(built);
    if (!activeShopId && built.length > 0) setActiveShopId(built[0].shop.id);
    setLoading(false);
  };

  useEffect(() => {
    load();

    channelRef.current = supabase.channel('admin-messages-all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new as Message;
        setThreads(prev => prev.map(t => {
          if (t.shop.id !== msg.shop_id) return t;
          const isActive = msg.shop_id === activeShopId;
          return {
            ...t,
            messages: [...t.messages, msg],
            unread: isActive ? 0 : t.unread + (msg.sender_role === 'partner' ? 1 : 0),
            lastAt: msg.created_at,
          };
        }).sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()));
        if (msg.shop_id === activeShopId) setTimeout(scrollToBottom, 50);
      })
      .subscribe();

    return () => { channelRef.current?.unsubscribe(); };
  }, []);

  // Mark as read when switching to a thread
  useEffect(() => {
    if (!activeShopId) return;
    supabase.from('messages')
      .update({ read_by_admin: true })
      .eq('shop_id', activeShopId)
      .eq('sender_role', 'partner')
      .eq('read_by_admin', false)
      .then(() => {
        setThreads(prev => prev.map(t =>
          t.shop.id === activeShopId ? { ...t, unread: 0 } : t
        ));
      });
    setTimeout(scrollToBottom, 100);
  }, [activeShopId]);

  const send = async () => {
    if (!body.trim() || !activeShopId || !user || !profile) return;
    setSending(true);
    setError('');
    const { error: err } = await supabase.from('messages').insert({
      shop_id:         activeShopId,
      sender_id:       user.id,
      sender_role:     'admin',
      sender_name:     profile.full_name,
      body:            body.trim(),
      read_by_admin:   true,
      read_by_partner: false,
    });
    if (err) setError('Failed to send.');
    else setBody('');
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const activeThread = threads.find(t => t.shop.id === activeShopId);

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen md:h-[calc(100vh-56px)] bg-stone-50">

      {/* Sidebar — shop list */}
      <aside className={`${activeShopId ? 'hidden md:flex' : 'flex'} md:w-72 w-full flex-col bg-white border-r border-stone-100 shrink-0`}>
        <div className="px-4 py-4 border-b border-stone-100">
          <h1 className="text-lg font-bold text-stone-900">Messages</h1>
          <p className="text-xs text-stone-400 mt-0.5">Shop conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">No approved shops yet</p>
          ) : threads.map(thread => (
            <button key={thread.shop.id}
              onClick={() => setActiveShopId(thread.shop.id)}
              className={`w-full px-4 py-3.5 text-left border-b border-stone-50 flex items-center gap-3 hover:bg-stone-50 transition ${
                activeShopId === thread.shop.id ? 'bg-amber-50 border-l-2 border-l-amber-600' : ''
              }`}
            >
              <div className="w-9 h-9 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                <Store size={16} className="text-stone-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-800 truncate">{thread.shop.name}</p>
                  {thread.unread > 0 && (
                    <span className="ml-2 shrink-0 w-5 h-5 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {thread.unread}
                    </span>
                  )}
                </div>
                {thread.messages.length > 0 && (
                  <p className="text-xs text-stone-400 truncate mt-0.5">
                    {thread.messages[thread.messages.length - 1].body}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat area */}
      {activeThread ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Thread header */}
          <div className="bg-white border-b border-stone-100 px-4 py-3.5 flex items-center gap-3 shrink-0">
            <button onClick={() => setActiveShopId(null)}
              className="md:hidden text-stone-400 hover:text-stone-600 mr-1">
              ←
            </button>
            <div>
              <p className="text-sm font-bold text-stone-900">{activeThread.shop.name}</p>
              <p className="text-xs text-stone-400">{activeThread.shop.city} · {activeThread.shop.contact_name}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3">
            {activeThread.messages.length === 0 && (
              <div className="text-center py-16 text-stone-400">
                <p className="text-sm">No messages yet — start the conversation</p>
              </div>
            )}
            {activeThread.messages.map((msg, i) => {
              const isOwn = msg.sender_role === 'admin';
              const showName = i === 0 || activeThread.messages[i - 1].sender_id !== msg.sender_id;
              return (
                <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {showName && (
                    <p className="text-[10px] text-stone-400 mb-1 px-1">
                      {isOwn ? 'You (Gobena)' : msg.sender_name}
                    </p>
                  )}
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-stone-900 text-white rounded-br-sm'
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
            <div className="px-4 pb-2">
              <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
            </div>
          )}

          {/* Input */}
          <div className="bg-white border-t border-stone-100 px-4 md:px-6 py-3 shrink-0">
            <div className="flex gap-2">
              <textarea value={body} onChange={e => setBody(e.target.value)} onKeyDown={handleKey}
                placeholder={`Reply to ${activeThread.shop.name}… (Enter to send)`}
                rows={1}
                className="flex-1 px-4 py-2.5 text-sm border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                style={{ maxHeight: 120, overflowY: 'auto' }}
              />
              <button onClick={send} disabled={sending || !body.trim()}
                className="px-4 py-2.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition disabled:opacity-40 shrink-0">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-stone-400">
          <p className="text-sm">Select a shop to view messages</p>
        </div>
      )}
    </div>
  );
}
