import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import type { Notification } from '../types';
import { Bell, CheckCircle, AlertCircle, Send, Wrench, Store } from '../components/Icons';

const typeIcon: Record<string, React.FC<{ size?: number; className?: string }>> = {
  new_issue:       AlertCircle,
  issue_resolved:  CheckCircle,
  new_message:     Send,
  equipment_added: Wrench,
  shop_approved:   Store,
};
const typeColor: Record<string, string> = {
  new_issue:       'bg-red-100 text-red-600',
  issue_resolved:  'bg-green-100 text-green-600',
  new_message:     'bg-blue-100 text-blue-600',
  equipment_added: 'bg-stone-100 text-stone-600',
  shop_approved:   'bg-amber-100 text-amber-600',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('notifications')
      .select('id, user_id, type, title, body, link, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifications((data as unknown as Notification[]) || []);
        setLoading(false);
      });
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unread = notifications.filter(n => !n.read).length;

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-24 md:pb-10">
      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-6 md:pt-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Notifications</h1>
            {unread > 0 && (
              <p className="text-xs text-stone-400 mt-0.5">{unread} unread</p>
            )}
          </div>
          {unread > 0 && (
            <button onClick={markAllRead}
              className="text-xs text-amber-700 font-medium hover:underline">
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <Bell size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const Icon = typeIcon[n.type] || Bell;
              const colorCls = typeColor[n.type] || 'bg-stone-100 text-stone-600';
              const content = (
                <div className={`bg-white rounded-2xl border px-4 py-4 flex items-start gap-3 transition ${
                  n.read ? 'border-stone-100' : 'border-amber-200'
                }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${colorCls}`}>
                    <Icon size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${n.read ? 'text-stone-600' : 'text-stone-900'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-stone-300 mt-1.5">
                      {new Date(n.created_at).toLocaleDateString()} · {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );

              return n.link ? (
                <Link key={n.id} to={n.link} onClick={() => markRead(n.id)}>
                  {content}
                </Link>
              ) : (
                <div key={n.id} onClick={() => markRead(n.id)} className="cursor-pointer">
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
