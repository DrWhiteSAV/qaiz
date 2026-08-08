// SQLite REST API client for Quiz Application database operations

class QueryBuilder {
  private tableName: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private data: any = null;
  private eqConditions: Record<string, any> = {};
  private inConditions: Record<string, any[]> = {};
  private orderConfig: { column: string; ascending: boolean } | null = null;
  private limitCount: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields?: string) {
    if (this.action !== 'insert' && this.action !== 'update') {
      this.action = 'select';
    }
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.data = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.data = data;
    return this;
  }

  upsert(data: any, options?: any) {
    if (this.tableName === 'profiles') {
      this.action = 'update';
      this.data = data;
    } else {
      this.action = 'insert';
      this.data = data;
    }
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.eqConditions[column] = value;
    return this;
  }

  neq(column: string, value: any) {
    return this;
  }

  or(filterString: string) {
    return this;
  }

  in(column: string, values: any[]) {
    this.inConditions[column] = values;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderConfig = {
      column,
      ascending: options?.ascending !== false
    };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(resolve: (res: { data: any; error: any }) => void, reject?: (err: any) => void) {
    try {
      if (this.tableName === 'game_sessions' && this.action === 'select') {
        const url = new URL('/api/game_sessions', window.location.origin);
        if (this.eqConditions['user_id']) url.searchParams.set('user_id', this.eqConditions['user_id']);
        if (this.eqConditions['game_id']) url.searchParams.set('game_id', this.eqConditions['game_id']);
        const res = await fetch(url.toString());
        const json = await res.json();
        let rows = json.data || [];
        if (this.isSingle) rows = rows[0] || null;
        resolve({ data: rows, error: null });
        return;
      }

      if (this.tableName === 'game_sessions' && this.action === 'insert') {
        const res = await fetch('/api/game_sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.data)
        });
        const json = await res.json();
        resolve({ data: json.data, error: null });
        return;
      }

      if (this.tableName === 'news' && this.action === 'select') {
        const res = await fetch('/api/news');
        const json = await res.json();
        resolve({ data: json.data || [], error: null });
        return;
      }

      if (this.tableName === 'news' && this.action === 'insert') {
        const res = await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.data)
        });
        const json = await res.json();
        resolve({ data: json.data, error: null });
        return;
      }

      if (this.tableName === 'news' && this.action === 'update' && this.eqConditions['id']) {
        const res = await fetch(`/api/news/${this.eqConditions['id']}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.data)
        });
        const json = await res.json();
        resolve({ data: json.data, error: null });
        return;
      }

      if (this.tableName === 'news' && this.action === 'delete' && this.eqConditions['id']) {
        await fetch(`/api/news/${this.eqConditions['id']}`, { method: 'DELETE' });
        resolve({ data: null, error: null });
        return;
      }

      if (this.tableName === 'profiles' && this.action === 'select' && (this.eqConditions['uid'] || this.eqConditions['id'])) {
        const uid = this.eqConditions['uid'] || this.eqConditions['id'];
        const res = await fetch(`/api/profiles/by-uid/${uid}`);
        const json = await res.json();
        let p = json.data;
        if (p && !this.isSingle && !this.isMaybeSingle) p = [p];
        resolve({ data: p, error: null });
        return;
      }

      if (this.tableName === 'profiles' && this.action === 'update') {
        const uid = this.eqConditions['uid'] || this.eqConditions['id'] || (this.data && (this.data.uid || this.data.id));
        if (uid) {
          const res = await fetch(`/api/profiles/${uid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.data)
          });
          const json = await res.json();
          resolve({ data: json.data, error: null });
          return;
        }
      }

      // Generic fallback REST query to SQLite /api/db/query
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.tableName,
          action: this.action,
          data: this.data,
          eq: this.eqConditions,
          order: this.orderConfig,
          limit: this.limitCount
        })
      });
      const json = await res.json();
      let resultData = json.data;
      if ((this.isSingle || this.isMaybeSingle) && Array.isArray(resultData)) {
        resultData = resultData[0] || null;
      }
      resolve({ data: resultData, error: json.error || null });
    } catch (err) {
      console.error(`Database query failed for table ${this.tableName}:`, err);
      resolve({ data: null, error: err });
    }
  }
}

export const sqliteClient = {
  from(tableName: string) {
    return new QueryBuilder(tableName);
  },
  auth: {
    async signOut() {
      localStorage.removeItem('user_session');
      localStorage.removeItem('user_email_session');
      return { error: null };
    },
    async getSession() {
      const stored = localStorage.getItem('user_session');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          return { data: { session: { user } }, error: null };
        } catch (_) {}
      }
      return { data: { session: null }, error: null };
    },
    onAuthStateChange(callback: any) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
  }
};

export const db = sqliteClient;
export const supabase = sqliteClient; // backwards compatibility alias
export const getDb = () => sqliteClient;

type StoredGameProgress = {
  id?: string;
  user_id: string;
  pack_id: string;
  game_type: string;
  current_step: number;
  total_steps: number;
  state: any;
  created_at?: string;
  updated_at?: string;
};

export const saveGameSession = async (session: {
  userId: string;
  gameId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  mode: string;
  difficulty: string;
  topic?: string;
  pricePaid: number;
  isWin?: boolean;
}) => {
  try {
    const res = await fetch('/api/game_sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: session.userId,
        game_id: session.gameId,
        score: session.score,
        total_questions: session.totalQuestions,
        correct_answers: session.correctAnswers,
        mode: session.mode,
        difficulty: session.difficulty,
        topic: session.topic,
        price_paid: session.pricePaid,
        is_win: session.isWin
      })
    });
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Failed to save game session:', err);
    return null;
  }
};

export const saveGameProgress = async (progress: {
  userId: string;
  packId: string;
  gameType: string;
  currentStep: number;
  totalSteps: number;
  state: any;
}): Promise<StoredGameProgress | null> => {
  try {
    const res = await fetch('/api/game_progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: progress.userId,
        pack_id: progress.packId,
        game_type: progress.gameType,
        current_step: progress.currentStep,
        total_steps: progress.totalSteps,
        state: progress.state
      })
    });
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error('Failed to save game progress:', err);
    return null;
  }
};

export const getGameProgress = async (userId: string, packId: string, gameType: string): Promise<StoredGameProgress | null> => {
  try {
    const url = new URL('/api/game_progress', window.location.origin);
    url.searchParams.set('user_id', userId);
    url.searchParams.set('pack_id', packId);
    url.searchParams.set('game_type', gameType);

    const res = await fetch(url.toString());
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error('Failed to get game progress:', err);
    return null;
  }
};

export const deleteGameProgress = async (userId: string, packId: string, gameType: string) => {
  try {
    const url = new URL('/api/game_progress', window.location.origin);
    url.searchParams.set('user_id', userId);
    url.searchParams.set('pack_id', packId);
    url.searchParams.set('game_type', gameType);

    await fetch(url.toString(), { method: 'DELETE' });
    return true;
  } catch (err) {
    console.error('Failed to delete game progress:', err);
    return false;
  }
};
