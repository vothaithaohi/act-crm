'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  ApplicationStatus,
  CastingProject,
  LOCAL_APPLICATIONS_KEY,
  LOCAL_PROJECTS_KEY,
  ProjectApplication,
  readLocal,
  writeLocal
} from './types';
import { SITE_URL } from '@/lib/dienvienvn/hosts';

/**
 * Địa chỉ gốc của trang công khai, dùng để tạo link dự án và link gửi NSX.
 * Luôn là tên miền chính (https://www.dienvienvn.com) để link gửi ra ngoài ngắn gọn, không lộ tên miền Vercel;
 * chỉ khi chạy thử trên máy (localhost) mới dùng đường dẫn nội bộ /dienvienvn.
 */
export function publicSiteBase(): string {
  const configured = process.env.NEXT_PUBLIC_DIENVIENVN_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(window.location.hostname)) {
    return `${window.location.origin}/dienvienvn`;
  }
  return SITE_URL;
}

export function producerLink(p: Pick<CastingProject, 'share_token'>): string {
  return `${publicSiteBase()}/nsx/${p.share_token}`;
}

export function publicProjectLink(p: Pick<CastingProject, 'id'>): string {
  return `${publicSiteBase()}/du-an/${p.id}`;
}

/**
 * Dữ liệu dự án & đơn ứng tuyển cho CRM.
 * Có Supabase: đọc/ghi trực tiếp (RLS chỉ cho nhân sự đã đăng nhập). Không có: localStorage (demo).
 */
export function useProjects() {
  const [projects, setProjects] = useState<CastingProject[]>([]);
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const live = typeof window !== 'undefined' && !!createClient();

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setProjects(readLocal<CastingProject>(LOCAL_PROJECTS_KEY));
      setApplications(readLocal<ProjectApplication>(LOCAL_APPLICATIONS_KEY));
      setLoading(false);
      return;
    }
    const [p, a] = await Promise.all([
      supabase.from('casting_projects').select('*').order('created_at', { ascending: false }),
      supabase.from('project_applications').select('*').order('created_at', { ascending: false })
    ]);
    if (p.error || a.error) {
      toast.error('Không tải được dự án casting', {
        description: (p.error || a.error)?.message || 'Hãy chạy migration 20261013_casting_projects_and_security.sql.'
      });
    }
    setProjects((p.data || []) as CastingProject[]);
    setApplications((a.data || []) as ProjectApplication[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_PROJECTS_KEY || e.key === LOCAL_APPLICATIONS_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);

    const supabase = createClient();
    const channel = supabase
      ?.channel(`casting_projects_changes_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_applications' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'casting_projects' }, () => refresh())
      .subscribe();
    return () => {
      window.removeEventListener('storage', onStorage);
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [refresh]);

  const saveProject = async (project: CastingProject): Promise<boolean> => {
    const now = new Date().toISOString();
    const record = { ...project, updated_at: now, created_at: project.created_at || now };
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('casting_projects').upsert(record);
      if (error) {
        toast.error('Không lưu được dự án', {
          description: error.code === '23505' ? `Mã dự án ${project.code} đã tồn tại, hãy đổi mã khác.` : error.message
        });
        return false;
      }
    } else {
      const list = readLocal<CastingProject>(LOCAL_PROJECTS_KEY);
      if (list.some(p => p.id !== project.id && p.code.toLowerCase() === project.code.toLowerCase())) {
        toast.error(`Mã dự án ${project.code} đã tồn tại, hãy đổi mã khác.`);
        return false;
      }
      const exists = list.some(p => p.id === project.id);
      writeLocal(LOCAL_PROJECTS_KEY, exists ? list.map(p => (p.id === project.id ? record : p)) : [record, ...list]);
    }
    await refresh();
    return true;
  };

  const deleteProject = async (id: string) => {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('casting_projects').delete().eq('id', id);
      if (error) return toast.error('Không xoá được dự án', { description: error.message });
    } else {
      writeLocal(LOCAL_PROJECTS_KEY, readLocal<CastingProject>(LOCAL_PROJECTS_KEY).filter(p => p.id !== id));
      writeLocal(LOCAL_APPLICATIONS_KEY, readLocal<ProjectApplication>(LOCAL_APPLICATIONS_KEY).filter(a => a.project_id !== id));
    }
    toast.success('Đã xoá dự án');
    await refresh();
  };

  const updateApplicationStatus = async (id: string, status: ApplicationStatus) => {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('project_applications').update({ status }).eq('id', id);
      if (error) return toast.error('Không cập nhật được trạng thái', { description: error.message });
    } else {
      writeLocal(
        LOCAL_APPLICATIONS_KEY,
        readLocal<ProjectApplication>(LOCAL_APPLICATIONS_KEY).map(a => (a.id === id ? { ...a, status, updated_at: new Date().toISOString() } : a))
      );
    }
    await refresh();
  };

  const addApplication = async (a: Pick<ProjectApplication, 'project_id' | 'role_id' | 'talent_id'>): Promise<boolean> => {
    const now = new Date().toISOString();
    const record: ProjectApplication = { ...a, id: crypto.randomUUID(), status: 'shortlisted', created_at: now, updated_at: now };
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('project_applications').insert(record);
      if (error) {
        toast.error(error.code === '23505' ? 'Diễn viên này đã có trong vai này.' : 'Không thêm được diễn viên', {
          description: error.code === '23505' ? undefined : error.message
        });
        return false;
      }
    } else {
      const list = readLocal<ProjectApplication>(LOCAL_APPLICATIONS_KEY);
      if (list.some(x => x.project_id === a.project_id && x.role_id === a.role_id && x.talent_id === a.talent_id)) {
        toast.error('Diễn viên này đã có trong vai này.');
        return false;
      }
      writeLocal(LOCAL_APPLICATIONS_KEY, [record, ...list]);
    }
    toast.success('Đã thêm diễn viên vào dự án');
    await refresh();
    return true;
  };

  const removeApplication = async (id: string) => {
    const supabase = createClient();
    if (supabase) {
      const { error } = await supabase.from('project_applications').delete().eq('id', id);
      if (error) return toast.error('Không xoá được', { description: error.message });
    } else {
      writeLocal(LOCAL_APPLICATIONS_KEY, readLocal<ProjectApplication>(LOCAL_APPLICATIONS_KEY).filter(a => a.id !== id));
    }
    await refresh();
  };

  return { projects, applications, loading, live, refresh, saveProject, deleteProject, updateApplicationStatus, addApplication, removeApplication };
}
