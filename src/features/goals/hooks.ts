import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Goal } from '@/lib/types/database';

const KEY = (userId: string | undefined) => ['goals', userId];

export function useGoals(userId: string | undefined) {
  return useQuery({
    queryKey: KEY(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId!)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
  });
}

export function useGoal(id: string | undefined) {
  return useQuery({
    queryKey: ['goal', id],
    enabled: !!id,
    queryFn: async (): Promise<Goal | null> => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as Goal | null;
    },
  });
}

export function useUpsertGoal(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<Goal>) => {
      if (row.id) {
        const { id, ...patch } = row;
        const { data, error } = await supabase
          .from('goals')
          .update(patch as never)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data as Goal;
      }
      const payload = { ...row, user_id: row.user_id ?? userId! };
      const { data, error } = await supabase
        .from('goals')
        .insert(payload as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: (g) => {
      qc.invalidateQueries({ queryKey: KEY(userId) });
      qc.invalidateQueries({ queryKey: ['goal', g.id] });
    },
  });
}

export function useReorderGoals(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, position) =>
        supabase.from('goals').update({ position } as never).eq('id', id),
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });
}

export function useDeleteGoal(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });
}
