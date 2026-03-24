import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Newspaper, 
  Heart, 
  MessageSquare, 
  Share2, 
  Plus, 
  Calendar,
  User,
  Loader2
} from 'lucide-react';
import { getSupabase } from '../supabase';

export function NewsPage() {
  const { profile } = useAuth();
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching news:', error);
    } else {
      setNews(data || []);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-8 text-xl font-bold text-primary animate-pulse">Загрузка новостей...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-black uppercase tracking-tighter text-white drop-shadow-sm">Новости</h2>
        {profile?.role === 'admin' && (
          <button className="flex items-center gap-2 rounded-full bg-primary px-6 py-2 font-bold text-background transition-transform hover:scale-105">
            <Plus size={20} />
            <span>Создать новость</span>
          </button>
        )}
      </div>

      <div className="grid gap-8">
        {news.length > 0 ? news.map(post => (
          <article key={post.id} className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl transition-all hover:border-primary/40">
            {post.media_urls && post.media_urls.length > 0 && (
              <div className={`grid gap-1 ${post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {post.media_urls.map((url: string, idx: number) => (
                  <img 
                    key={idx}
                    src={url} 
                    alt={post.title} 
                    className={`w-full object-cover ${post.media_urls.length === 1 ? 'h-96' : 'h-48'}`}
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            )}
            <div className="p-8">
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-white/40">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User size={14} />
                  <span>{post.author_name || 'Администрация'}</span>
                </div>
              </div>
              <h3 className="mt-4 text-3xl font-black uppercase tracking-tighter text-white drop-shadow-sm">{post.title}</h3>
              <p className="mt-4 text-lg leading-relaxed text-white/80">{post.content}</p>
              
              <div className="mt-8 flex items-center gap-6 border-t border-white/10 pt-6">
                <button className="flex items-center gap-2 font-bold text-white/60 transition-colors hover:text-white">
                  <Heart size={20} />
                  <span>{post.likes_count || 0}</span>
                </button>
                <button className="flex items-center gap-2 font-bold text-white/60 transition-colors hover:text-white">
                  <MessageSquare size={20} />
                  <span>{post.comments_count || 0}</span>
                </button>
                <button className="flex items-center gap-2 font-bold text-white/60 transition-colors hover:text-white">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </article>
        )) : (
          <div className="text-center py-20 text-white/40 italic drop-shadow-sm">Новостей пока нет</div>
        )}
      </div>
    </div>
  );
}
