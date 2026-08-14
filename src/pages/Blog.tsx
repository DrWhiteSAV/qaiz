import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Calendar,
  User,
  Loader2,
  BookOpen
} from 'lucide-react';
import { db } from '../db';

export function BlogPage() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts');
      const json = await res.json();
      setPosts(json.data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-base font-medium text-foreground/70">Загрузка блога...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Блог</h1>
            <p className="text-sm text-foreground/60">Статьи, обновления и анонсы платформы</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {posts.length > 0 ? posts.map(post => (
          <article 
            key={post.id} 
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg transition-all hover:border-primary/30"
          >
            {post.image_url && (
              <div className="w-full overflow-hidden">
                <img 
                  src={post.image_url} 
                  alt={post.title} 
                  className="w-full h-64 object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 text-sm text-foreground/50">
                <div className="flex items-center gap-1.5">
                  <Calendar size={15} />
                  <span>{new Date(post.created_at || Date.now()).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User size={15} />
                  <span>{post.author_name || 'Команда Квайз'}</span>
                </div>
                {post.platforms && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                    {post.platforms}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-foreground hover:text-primary transition-colors">{post.title}</h2>
              <div className="prose prose-invert max-w-none text-base leading-relaxed text-foreground/85">
                <Markdown>{post.content}</Markdown>
              </div>
              
              <div className="flex items-center gap-6 border-t border-white/10 pt-4">
                <button className="flex items-center gap-2 text-sm font-medium text-foreground/60 transition-colors hover:text-primary">
                  <Heart size={18} />
                  <span>{post.likes_count || 0}</span>
                </button>
                <button className="flex items-center gap-2 text-sm font-medium text-foreground/60 transition-colors hover:text-primary">
                  <MessageSquare size={18} />
                  <span>{post.comments_count || 0}</span>
                </button>
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: post.title, text: post.content, url: window.location.href }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Ссылка скопирована в буфер обмена');
                    }
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-foreground/60 transition-colors hover:text-primary ml-auto"
                >
                  <Share2 size={18} />
                  <span>Поделиться</span>
                </button>
              </div>
            </div>
          </article>
        )) : (
          <div className="text-center py-20 text-foreground/40 text-base italic rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            Записей в блоге пока нет
          </div>
        )}
      </div>
    </div>
  );
}
