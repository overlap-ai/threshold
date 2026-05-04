import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { IncomeSource } from '@/lib/types/database';

const KEY = (userId: string | undefined) => ['income', userId];

export function useIncome(userId: string | undefined) {
  return useQuery({
    queryKey: KEY(userId),
    enabled: !!userId,
    queryFn: async (): Promise<IncomeSource[]> => {
      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', userId!)
        .order('next_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as IncomeSource[];
    },
  });
}

export function useUpsertIncome(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<IncomeSource>) => {
      if (row.id) {
        const { id, ...patch } = row;
        const { data, error } = await supabase
          .from('income_sources')
          .update(patch as never)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data as IncomeSource;
      }
      const payload = { ...row, user_id: row.user_id ?? userId! };
      const { data, error } = await supabase
        .from('income_sources')
        .insert(payload as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as IncomeSource;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });
}

export function useDeleteIncome(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('income_sources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });
}
