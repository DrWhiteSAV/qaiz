import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Newspaper, 
  Heart, 
  MessageSquare, 
  Share2, 
  Plus, 
  Calendar,
  User
} from 'lucide-react';

export function NewsPage() {
  const { profile } = useAuth();
  const [news] = useState<any[]>([
    {
      id: '1',
      title: 'Запуск платформы Квайз!',
      content: 'Мы рады объявить о запуске нашей новой платформы для онлайн-квизов. Теперь вы можете играть в любимые игры прямо в браузере или через Telegram!',
      author: 'Администрация',
      date: '20.03.2026',
      likes: 42,
      comments: 5,
      image: 'https://picsum.photos/seed/launch/800/400'
    },
    {
      id: '2',
      title: 'Новый режим: Угадай мелодию',
      content: 'Добавлен новый игровой режим "Угадай мелодию". Испытайте свой слух и скорость реакции!',
      author: 'Разработчик',
      date: '19.03.2026',
      likes: 28,
      comments: 2,
      image: 'https://picsum.photos/seed/music/800/400'
    }
  ]);

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
        {news.map(post => (
          <article key={post.id} className="overflow-hidden rounded-3xl border border-primary/20 bg-background shadow-xl">
            <img 
              src={post.image} 
              alt={post.title} 
              className="h-64 w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="p-8">
              <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-foreground/40">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User size={14} />
                  <span>{post.author}</span>
                </div>
              </div>
              <h3 className="mt-4 text-3xl font-black uppercase tracking-tighter text-primary">{post.title}</h3>
              <p className="mt-4 text-lg leading-relaxed text-foreground/80">{post.content}</p>
              
              <div className="mt-8 flex items-center gap-6 border-t border-primary/10 pt-6">
                <button className="flex items-center gap-2 font-bold text-foreground/60 transition-colors hover:text-primary">
                  <Heart size={20} />
                  <span>{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 font-bold text-foreground/60 transition-colors hover:text-primary">
                  <MessageSquare size={20} />
                  <span>{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 font-bold text-foreground/60 transition-colors hover:text-primary">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
