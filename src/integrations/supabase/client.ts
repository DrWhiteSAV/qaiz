// SQLite REST API client adapter providing unified database access

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

      // Generic fallback to /api/db/query
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

export const supabase = {
  from(tableName: string) {
    return new QueryBuilder(tableName);
  },
  auth: {
    async signOut() {
      localStorage.removeItem('user_session');
      return { error: null };
    },
    async getSession() {
      return { data: { session: null }, error: null };
    },
    onAuthStateChange(callback: any) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    async signInWithOAuth(options: any) {
      window.location.href = `/google-callback?code=mock_google_oauth_code`;
      return { data: null, error: null };
    }
  }
};

export default supabase;
