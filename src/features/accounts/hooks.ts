import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Account } from '@/lib/types/database';

const KEY = (userId: string | undefined) => ['accounts', userId];

export function useAccounts(userId: string | undefined) {
  return useQuery({
    queryKey: KEY(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId!)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });
}

export function useUpsertAccount(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<Account>) => {
      if (row.id) {
        const { id, ...patch } = row;
        const { data, error } = await supabase
          .from('accounts')
          .update(patch as never)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data as Account;
      }
      const payload = { ...row, user_id: row.user_id ?? userId! };
      const { data, error } = await supabase
        .from('accounts')
        .insert(payload as never)
        .select('*')
        .single();
      if (error) throw error;
      return data as Account;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });
}

export function useDeleteAccount(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(userId) }),
  });
}
