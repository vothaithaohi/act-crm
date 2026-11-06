'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { readLocal, writeLocal } from '@/lib/projects/types';
import { ImportedGuest } from './import-csv';
import { planGuestImport } from './import-plan';
import {
  LOCAL_GUEST_REVIEWS_KEY,
  LOCAL_GUESTS_KEY,
  LOCAL_INVITATIONS_KEY,
  ShowcaseGuest,
  ShowcaseGuestReview,
  ShowcaseInvitation
} from './types';

const MIGRATION_HINT = 'Hãy chạy migration 20261101_showcase_guests.sql trong Supabase.';
const nowIso = () => new Date().toISOString();

/** Khách mời showcase + lịch sử mời + nhận xét. Supabase (nhân sự CRM, RLS) hoặc bộ nhớ trình duyệt ở chế độ demo. */
export function useGuests() {
  const [guests, setGuests] = useState<ShowcaseGuest[]>([]);
  const [invitations, setInvitations] = useState<ShowcaseInvitation[]>([]);
  const [reviews, setReviews] = useState<ShowcaseGuestReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setGuests(readLocal<ShowcaseGuest>(LOCAL_GUESTS_KEY));
      setInvitations(readLocal<ShowcaseInvitation>(LOCAL_INVITATIONS_KEY));
      setReviews(readLocal<ShowcaseGuestReview>(LOCAL_GUEST_REVIEWS_KEY));
      setLoading(false);
      return;
    }
    // Supabase trả tối đa 1000 dòng mỗi lần: tải theo trang
    const fetchAll = async <T,>(table: string, order: string, ascending: boolean) => {
      const out: T[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from(table).select('*').order(order, { ascending }).order('id').range(from, from + 999);
        if (error) return { data: out, error };
        out.push(...((data || []) as T[]));
        if (!data || data.length < 1000) return { data: out, error: null };
      }
    };
    const [g, i, r] = await Promise.all([
      fetchAll<ShowcaseGuest>('showcase_guests', 'full_name', true),
      fetchAll<ShowcaseInvitation>('showcase_invitations', 'created_at', true),
      fetchAll<ShowcaseGuestReview>('showcase_guest_reviews', 'created_at', false)
    ]);
    const err = g.error || i.error || r.error;
    setProblem(err ? `Không tải được khách mời: ${err.message}. ${MIGRATION_HINT}` : '');
    setGuests((g.data || []) as ShowcaseGuest[]);
    setInvitations((i.data || []) as ShowcaseInvitation[]);
    setReviews((r.data || []) as ShowcaseGuestReview[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Ghi vào Supabase hoặc bộ nhớ trình duyệt; trả về bản ghi đã lưu. */
  const saveGuest = async (guest: ShowcaseGuest): Promise<ShowcaseGuest | null> => {
    const record = { ...guest, full_name: guest.full_name.trim(), updated_at: nowIso() };
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('showcase_guests').upsert(record).select('*').single();
      if (error) {
        toast.error('Không lưu được khách mời', { description: error.message });
        return null;
      }
      setGuests(prev => [...prev.filter(x => x.id !== data.id), data as ShowcaseGuest].sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi')));
      return data as ShowcaseGuest;
    }
    const next = [...readLocal<ShowcaseGuest>(LOCAL_GUESTS_KEY).filter(x => x.id !== record.id), record];
    writeLocal(LOCAL_GUESTS_KEY, next);
    setGuests(next.sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi')));
    return record;
  };

  const deleteGuest = async (id: string) => {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('showcase_guests').delete().eq('id', id);
      if (error) return toast.error('Không xoá được khách mời', { description: error.message });
    } else {
      writeLocal(LOCAL_GUESTS_KEY, readLocal<ShowcaseGuest>(LOCAL_GUESTS_KEY).filter(x => x.id !== id));
      writeLocal(LOCAL_INVITATIONS_KEY, readLocal<ShowcaseInvitation>(LOCAL_INVITATIONS_KEY).filter(x => x.guest_id !== id));
      writeLocal(LOCAL_GUEST_REVIEWS_KEY, readLocal<ShowcaseGuestReview>(LOCAL_GUEST_REVIEWS_KEY).filter(x => x.guest_id !== id));
    }
    setGuests(prev => prev.filter(x => x.id !== id));
    setInvitations(prev => prev.filter(x => x.guest_id !== id));
    setReviews(prev => prev.filter(x => x.guest_id !== id));
    toast.success('Đã xoá khách mời');
  };

  const saveInvitation = async (inv: ShowcaseInvitation): Promise<boolean> => {
    const record = { ...inv, term: inv.term.trim().toUpperCase(), updated_at: nowIso() };
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('showcase_invitations').upsert(record).select('*').single();
      if (error) {
        toast.error('Không lưu được lượt mời', { description: error.message });
        return false;
      }
      setInvitations(prev => [...prev.filter(x => x.id !== data.id), data as ShowcaseInvitation]);
      return true;
    }
    const next = [...readLocal<ShowcaseInvitation>(LOCAL_INVITATIONS_KEY).filter(x => x.id !== record.id), record];
    writeLocal(LOCAL_INVITATIONS_KEY, next);
    setInvitations(next);
    return true;
  };

  const deleteInvitation = async (id: string) => {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('showcase_invitations').delete().eq('id', id);
      if (error) return toast.error('Không xoá được lượt mời', { description: error.message });
    } else writeLocal(LOCAL_INVITATIONS_KEY, readLocal<ShowcaseInvitation>(LOCAL_INVITATIONS_KEY).filter(x => x.id !== id));
    setInvitations(prev => prev.filter(x => x.id !== id));
  };

  const addReview = async (review: Omit<ShowcaseGuestReview, 'id' | 'created_at'>): Promise<boolean> => {
    const record: ShowcaseGuestReview = { ...review, id: crypto.randomUUID(), created_at: nowIso() };
    const supabase = createClient();
    if (supabase) {
      const { data, error } = await supabase.from('showcase_guest_reviews').insert(record).select('*').single();
      if (error) {
        toast.error('Không lưu được nhận xét', { description: error.message });
        return false;
      }
      setReviews(prev => [data as ShowcaseGuestReview, ...prev]);
      return true;
    }
    const next = [record, ...readLocal<ShowcaseGuestReview>(LOCAL_GUEST_REVIEWS_KEY)];
    writeLocal(LOCAL_GUEST_REVIEWS_KEY, next);
    setReviews(next);
    return true;
  };

  const deleteReview = async (id: string) => {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('showcase_guest_reviews').delete().eq('id', id);
      if (error) return toast.error('Không xoá được nhận xét', { description: error.message });
    } else writeLocal(LOCAL_GUEST_REVIEWS_KEY, readLocal<ShowcaseGuestReview>(LOCAL_GUEST_REVIEWS_KEY).filter(x => x.id !== id));
    setReviews(prev => prev.filter(x => x.id !== id));
  };

  /**
   * Nhập từ file Excel: khách mời trùng (cùng email, SĐT hoặc họ tên) thì chỉ bổ sung thông tin còn trống
   * và các lượt mời chưa có; khách mời mới thì thêm mới. Nhập lại cùng file nhiều lần không bị trùng.
   */
  const importGuests = async (items: ImportedGuest[], createdBy: string | null): Promise<{ added: number; updated: number; invitations: number } | null> => {
    const { guestRows, invRows, added, updated } = planGuestImport(items, guests, invitations, createdBy, nowIso());
    const supabase = createClient();
    if (supabase) {
      for (let i = 0; i < guestRows.length; i += 200) {
        const { error } = await supabase.from('showcase_guests').upsert(guestRows.slice(i, i + 200));
        if (error) {
          const missing = error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message);
          toast.error('Nhập khách mời bị lỗi', { description: missing ? `${error.message}. ${MIGRATION_HINT}` : error.message });
          return null;
        }
      }
      for (let i = 0; i < invRows.length; i += 500) {
        const { error } = await supabase.from('showcase_invitations').insert(invRows.slice(i, i + 500));
        if (error) {
          toast.error('Nhập lịch sử mời bị lỗi', { description: error.message });
          return null;
        }
      }
      await refresh();
    } else {
      const gs = readLocal<ShowcaseGuest>(LOCAL_GUESTS_KEY);
      const ids = new Set(guestRows.map(g => g.id));
      writeLocal(LOCAL_GUESTS_KEY, [...gs.filter(g => !ids.has(g.id)), ...guestRows]);
      writeLocal(LOCAL_INVITATIONS_KEY, [...readLocal<ShowcaseInvitation>(LOCAL_INVITATIONS_KEY), ...invRows]);
      await refresh();
    }
    return { added, updated, invitations: invRows.length };
  };

  return {
    guests,
    invitations,
    reviews,
    loading,
    problem,
    refresh,
    saveGuest,
    deleteGuest,
    saveInvitation,
    deleteInvitation,
    addReview,
    deleteReview,
    importGuests
  };
}
