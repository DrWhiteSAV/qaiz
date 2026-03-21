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
        <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Новости</h2>
        {profile?.role === 'admin' && (
          <button className="flex items-center gap-2 rounded-full bg-primary px-6 py-2 font-bold text-background transition-transform hover:scale-105">
            <Plus size={20} />
            <span>Создать новость</span>
          </button>
        )}
      </div>

      <div className="grid gap-8">
        {news.length > 0 ? news.map(post => (
          <article key={post.id} className="overflow-hidden rounded-3xl border border-primary/20 bg-background shadow-xl">
            {post.image_url && (
              <img 
                src={post.image_url} 
                alt={post.title} 
                className="h-64 w-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="p-8">
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-foreground/40">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User size={14} />
                  <span>{post.author_name || 'Администрация'}</span>
                </div>
              </div>
              <h3 className="mt-4 text-3xl font-black uppercase tracking-tighter text-primary">{post.title}</h3>
              <p className="mt-4 text-lg leading-relaxed text-foreground/80">{post.content}</p>
              
              <div className="mt-8 flex items-center gap-6 border-t border-primary/10 pt-6">
                <button className="flex items-center gap-2 font-bold text-foreground/60 transition-colors hover:text-primary">
                  <Heart size={20} />
                  <span>{post.likes_count || 0}</span>
                </button>
                <button className="flex items-center gap-2 font-bold text-foreground/60 transition-colors hover:text-primary">
                  <MessageSquare size={20} />
                  <span>{post.comments_count || 0}</span>
                </button>
                <button className="flex items-center gap-2 font-bold text-foreground/60 transition-colors hover:text-primary">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </article>
        )) : (
          <div className="text-center py-20 text-foreground/40 italic">Новостей пока нет</div>
        )}
      </div>
    </div>
  );
}
