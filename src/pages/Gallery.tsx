import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ImageIcon, 
  Plus, 
  Folder, 
  Heart, 
  Share2, 
  Tag,
  ChevronRight
} from 'lucide-react';

export function GalleryPage() {
  const { profile } = useAuth();
  const [albums] = useState<any[]>([
    {
      id: '1',
      title: 'Оффлайн игры 2026',
      description: 'Фотоотчет с весеннего сезона игр в Москве',
      cover: 'https://picsum.photos/seed/event1/600/400',
      count: 24,
      date: 'Март 2026'
    },
    {
      id: '2',
      title: 'Победители сезона',
      description: 'Наши чемпионы и их награды',
      cover: 'https://picsum.photos/seed/winners/600/400',
      count: 12,
      date: 'Февраль 2026'
    }
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter text-primary">Галерея</h2>
          <p className="mt-2 text-foreground/60">Фотоотчеты с наших мероприятий и игр</p>
        </div>
        {profile?.role === 'admin' && (
          <button className="flex items-center gap-2 rounded-full bg-primary px-6 py-2 font-bold text-background transition-transform hover:scale-105">
            <Plus size={20} />
            <span>Создать альбом</span>
          </button>
        )}
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map(album => (
          <div key={album.id} className="group cursor-pointer overflow-hidden rounded-3xl border border-primary/20 bg-background shadow-xl transition-all hover:-translate-y-2">
            <div className="relative h-64">
              <img 
                src={album.cover} 
                alt={album.title} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                  <Folder size={14} />
                  <span>{album.count} фото</span>
                  <span className="mx-2 opacity-50">•</span>
                  <span>{album.date}</span>
                </div>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tighter text-white">{album.title}</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-foreground/60">{album.description}</p>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex gap-4">
                  <button className="text-foreground/40 hover:text-primary transition-colors">
                    <Heart size={18} />
                  </button>
                  <button className="text-foreground/40 hover:text-primary transition-colors">
                    <Share2 size={18} />
                  </button>
                </div>
                <button className="flex items-center gap-1 text-sm font-bold uppercase tracking-widest text-primary hover:underline">
                  Смотреть <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
