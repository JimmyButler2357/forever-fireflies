// Children service — CRUD for child profiles.
// When you create a child, a database trigger automatically links them
// to your family (via family_children table), so you don't need to
// worry about that relationship manually.

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

type Child = Database['public']['Tables']['children']['Row'];
type ChildInsert = Database['public']['Tables']['children']['Insert'];
type ChildUpdate = Database['public']['Tables']['children']['Update'];

export const childrenService = {
  /** Get all children in the user's family, ordered by display_order */
  async getChildren(): Promise<Child[]> {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw new Error(`Failed to fetch children: ${error.message}`, { cause: error });
    return data;
  },

  /** Create a new child profile.
   *  Uses a SECURITY DEFINER RPC function to bypass a PostgreSQL quirk where
   *  the children INSERT RLS policy fails despite auth.uid() being correct. */
  async createChild(child: Pick<ChildInsert, 'name' | 'birthday' | 'nickname' | 'color_index' | 'display_order'>) {
    const { data, error } = await supabase.rpc('create_child', {
      p_name: child.name,
      p_birthday: child.birthday,
      // Send null for "no nickname" — matches the DB column's nullable
      // semantics and matches the test contract. The RPC param is
      // declared `text` in the migration (which is nullable in Postgres),
      // but auto-generated TS types mark it non-null, so we cast.
      p_nickname: (child.nickname ?? null) as string,
      p_color_index: child.color_index ?? 0,
      p_display_order: child.display_order ?? 0,
    });

    if (error) throw new Error(`Failed to create child: ${error.message}`, { cause: error });
    return data as Child;
  },

  /** Update an existing child.
   *  Auth check first so logged-out callers see "please sign in" instead
   *  of a confusing "0 rows returned" from .single() (which is what RLS
   *  produces when it hides every row from an unauthenticated caller). */
  async updateChild(childId: string, updates: ChildUpdate) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated — please sign in again');

    const { data, error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', childId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update child: ${error.message}`, { cause: error });
    return data;
  },

  /** Delete a child (owner only) */
  async deleteChild(childId: string) {
    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', childId);

    if (error) throw new Error(`Failed to delete child: ${error.message}`, { cause: error });
  },
};
