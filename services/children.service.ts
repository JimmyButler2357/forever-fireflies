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
      p_nickname: child.nickname ?? '',
      p_color_index: child.color_index ?? 0,
      p_display_order: child.display_order ?? 0,
    });

    if (error) throw new Error(`Failed to create child: ${error.message}`, { cause: error });
    return data as Child;
  },

  /** Update an existing child */
  async updateChild(childId: string, updates: ChildUpdate) {
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
