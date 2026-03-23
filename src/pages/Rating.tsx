import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, User } from 'lucide-react';
import { getSupabase } from '../supabase';

export const RatingPage = () => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('balance', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setLeaders(data || []);
      }
    } catch (error) {
      console.error('Error fetching leaders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter title-glow">Рейтинг игроков</h1>
        <p className="text-foreground/60">Лучшие знатоки нашей платформы</p>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          leaders.map((leader, index) => (
            <div 
              key={leader.uid}
              className={`flex items-center justify-between p-4 rounded-2xl border-glow transition-all hover:scale-[1.01] ${
                index === 0 ? 'bg-primary/20 border-primary' : 'bg-card shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/60 font-black text-primary border border-primary/20">
                  {index + 1}
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 overflow-hidden border border-primary/20">
                  {leader.photo_url ? (
                    <img src={leader.photo_url} alt={leader.display_name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={24} className="text-primary" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-lg leading-none">{leader.display_name}</p>
                  <p className="text-xs text-foreground/40 mt-1 uppercase tracking-widest">{leader.role}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-black text-primary leading-none">{leader.balance}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Очков</p>
                </div>
                {index === 0 && <Trophy className="text-yellow-500 animate-bounce" size={32} />}
                {index === 1 && <Medal className="text-slate-400" size={28} />}
                {index === 2 && <Medal className="text-amber-600" size={24} />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
