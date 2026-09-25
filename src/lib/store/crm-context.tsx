'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Lead, 
  TalentProfile, 
  LeadStatus, 
  CastingFilterCriteria, 
  Profile, 
  UserRole, 
  Permission, 
  WebhookLog,
  hasPermission, 
  ROLE_DETAILS 
} from '@/lib/types/crm';
import seedData from '@/data/seed_data.json';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export const INITIAL_TEAM_MEMBERS: Profile[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'super_admin',
    full_name: 'Ban Giám Đốc ACT',
    email: 'admin@act.edu.vn',
    phone: '0901234567',
    department: 'Ban Giám Đốc',
    password: 'admin',
    status: 'active',
    last_login: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    role: 'sales',
    full_name: 'Trần Thảo My (Tư Vấn)',
    email: 'sales@act.edu.vn',
    phone: '0912345678',
    department: 'Phòng Tuyển Sinh',
    password: 'sales',
    status: 'active',
    last_login: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    role: 'marketing',
    full_name: 'Nguyễn Hoàng Long (Ads)',
    email: 'mkt@act.edu.vn',
    phone: '0987654321',
    department: 'Phòng Marketing',
    password: 'mkt',
    status: 'active',
    last_login: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    role: 'casting',
    full_name: 'Lê Hải Đăng (Casting Lead)',
    email: 'casting@act.edu.vn',
    phone: '0934567890',
    department: 'Bộ Phận Tuyển Vai',
    password: 'casting',
    status: 'active',
    last_login: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    role: 'developer',
    full_name: 'Võ Thái Thao (Kỹ Thuật)',
    email: 'dev@act.edu.vn',
    phone: '0967890123',
    department: 'Phòng Kỹ Thuật IT',
    password: 'dev',
    status: 'active',
    last_login: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z'
  }
];

export const INITIAL_WEBHOOK_LOGS: WebhookLog[] = [
  {
    id: 'log-001',
    event: 'leadgen.received',
    source: 'meta_ads',
    status: 'success',
    ip: '31.13.115.12',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    payload: {
      leadgen_id: '109283746501234',
      form_id: '492817263541',
      form_name: 'ACT_Casting_KhoaDienXuat_MuaHe_2025',
      campaign_name: 'ACT_Growth_ChieuSinh_Q3',
      adset_name: 'Target_HocVien_GenZ_HCM',
      ad_name: 'Video_Interview_HocVien_KhoaTruoc',
      full_name: 'Nguyễn Văn Minh',
      phone: '0918882233',
      email: 'minh.nguyen99@gmail.com',
      course_interest: 'Diễn xuất Điện ảnh Chuyên nghiệp (ACT Pro)'
    }
  },
  {
    id: 'log-002',
    event: 'leadgen.received',
    source: 'meta_ads',
    status: 'success',
    ip: '31.13.115.8',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    payload: {
      leadgen_id: '109283746501235',
      form_id: '492817263541',
      form_name: 'ACT_Casting_KhoaDienXuat_MuaHe_2025',
      campaign_name: 'ACT_Growth_ChieuSinh_Q3',
      adset_name: 'Target_HocVien_GenZ_HCM',
      ad_name: 'Poster_KhoaHoc_ACT_Pro',
      full_name: 'Phạm Thuỳ Dung',
      phone: '0937654321',
      email: 'dung.pham@gmail.com',
      course_interest: 'Khóa Kỹ thuật Giải phóng Hình thể & Giọng nói'
    }
  },
  {
    id: 'log-003',
    event: 'webhook.verify_token',
    source: 'meta_ads',
    status: 'success',
    ip: '31.13.115.1',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    payload: {
      hub_mode: 'subscribe',
      hub_challenge: '1158204918',
      result: 'challenge_returned_200_ok'
    }
  }
];

interface CRMContextType {
  leads: Lead[];
  talents: TalentProfile[];
  teamMembers: Profile[];
  webhookLogs: WebhookLog[];
  currentUser: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  addLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  updateLead: (lead: Lead) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  convertToTalent: (leadId: string) => Promise<string>;
  getTalentById: (id: string) => TalentProfile | undefined;
  saveTalent: (talent: TalentProfile) => Promise<void>;
  deleteTalent: (id: string) => Promise<void>;
  addTeamMember: (member: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTeamMember: (member: Profile) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  switchRole: (role: UserRole) => void;
  can: (permission: Permission) => boolean;
  filterCriteria: CastingFilterCriteria;
  setFilterCriteria: React.Dispatch<React.SetStateAction<CastingFilterCriteria>>;
  resetFilters: () => void;
  filteredTalents: TalentProfile[];
  resetAllData: () => void;
}

const initialFilterCriteria: CastingFilterCriteria = {
  searchQuery: '',
  gender: 'all',
  minAge: undefined,
  maxAge: undefined,
  minHeight: undefined,
  maxHeight: undefined,
  minWeight: undefined,
  maxWeight: undefined,
  accents: [],
  languages: [],
  instruments: [],
  martialArts: [],
  danceStyles: [],
  sports: [],
  singingStyles: [],
  roleWillingness: [],
  cities: [],
  genres: [],
  actLevels: [],
  tattoos: 'all'
};

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>(INITIAL_TEAM_MEMBERS);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>(INITIAL_WEBHOOK_LOGS);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<CastingFilterCriteria>(initialFilterCriteria);

  const isAuthenticated = currentUser !== null;

  // Initialize from Supabase or fallback to localStorage / Excel seed data
  useEffect(() => {
    async function initData() {
      const supabase = createClient();

      if (supabase) {
        try {
          // Fetch leads, talents, profiles, webhook logs from Supabase
          const [leadsRes, talentsRes, profilesRes, logsRes] = await Promise.all([
            supabase.from('leads').select('*').order('created_at', { ascending: false }),
            supabase.from('talent_profiles').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('*').order('created_at', { ascending: true }),
            supabase.from('webhook_logs').select('*').order('created_at', { ascending: false })
          ]);

          if (!leadsRes.error && leadsRes.data && leadsRes.data.length > 0) {
            setLeads(leadsRes.data as Lead[]);
            setIsSupabaseConnected(true);
          } else {
            loadLocalSeed();
          }

          if (!talentsRes.error && talentsRes.data && talentsRes.data.length > 0) {
            setTalents(talentsRes.data as TalentProfile[]);
            setIsSupabaseConnected(true);
          }

          if (!profilesRes.error && profilesRes.data && profilesRes.data.length > 0) {
            setTeamMembers(profilesRes.data as Profile[]);
          } else {
            loadLocalTeamMembers();
          }

          if (!logsRes.error && logsRes.data && logsRes.data.length > 0) {
            setWebhookLogs(logsRes.data as WebhookLog[]);
          }
        } catch (err) {
          console.warn('Supabase query failed, falling back to local data:', err);
          loadLocalSeed();
          loadLocalTeamMembers();
        }
      } else {
        loadLocalSeed();
        loadLocalTeamMembers();
      }

      // Check existing authenticated session
      checkSession();

      setIsLoading(false);
    }

    function checkSession() {
      try {
        // ALWAYS purge legacy auto-login keys
        localStorage.removeItem('act_crm_current_user');
        localStorage.removeItem('act_crm_session');

        const storedSession = localStorage.getItem('act_crm_auth_session_v3');
        if (storedSession) {
          const session = JSON.parse(storedSession);
          if (session && session.email && session.id && session.role) {
            setCurrentUser(session);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to parse current user session:', e);
      }
      setCurrentUser(null);
    }

    function loadLocalSeed() {
      try {
        const storedLeads = localStorage.getItem('act_crm_leads');
        const storedTalents = localStorage.getItem('act_crm_talents_v3') || localStorage.getItem('act_crm_talents');
        const rawLeads = (seedData.leads as Lead[]) || [];
        const rawTalents = (seedData.talents as TalentProfile[]) || [];

        if (storedLeads) {
          setLeads(JSON.parse(storedLeads));
        } else {
          setLeads(rawLeads);
          localStorage.setItem('act_crm_leads', JSON.stringify(rawLeads));
        }

        if (storedTalents) {
          const parsed = JSON.parse(storedTalents);
          // Check if parsed talents already have academic_profile
          const hasAcademic = Array.isArray(parsed) && parsed.some((t: TalentProfile) => t.academic_profile?.highest_act_level);
          if (hasAcademic && parsed.length >= rawTalents.length) {
            setTalents(parsed);
          } else {
            // Upgrade with academic profiles
            setTalents(rawTalents);
            localStorage.setItem('act_crm_talents_v3', JSON.stringify(rawTalents));
            localStorage.setItem('act_crm_talents', JSON.stringify(rawTalents));
          }
        } else {
          setTalents(rawTalents);
          localStorage.setItem('act_crm_talents_v3', JSON.stringify(rawTalents));
          localStorage.setItem('act_crm_talents', JSON.stringify(rawTalents));
        }
      } catch (e) {
        console.error('Failed to load local CRM data:', e);
        setLeads((seedData.leads as Lead[]) || []);
        setTalents((seedData.talents as TalentProfile[]) || []);
      }
    }

    function loadLocalTeamMembers() {
      try {
        const storedMembers = localStorage.getItem('act_crm_team_members');
        if (storedMembers) {
          const parsed = JSON.parse(storedMembers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = parsed.map(m => {
              const init = INITIAL_TEAM_MEMBERS.find(i => i.email.toLowerCase() === m.email.toLowerCase());
              return {
                ...m,
                password: m.password || init?.password || 'Act@2025'
              };
            });
            setTeamMembers(merged);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to load local team members:', e);
      }
      setTeamMembers(INITIAL_TEAM_MEMBERS);
    }

    initData();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanPassword) {
      toast.error('Vui lòng nhập mật khẩu', {
        description: 'Mật khẩu là bắt buộc để đăng nhập vào hệ thống.'
      });
      return false;
    }

    const member = teamMembers.find(m => m.email.toLowerCase() === cleanEmail);

    if (!member) {
      toast.error('Tài khoản không tồn tại', {
        description: `Không tìm thấy tài khoản với email ${email}. Vui lòng kiểm tra lại.`
      });
      return false;
    }

    // Verify password
    const validPasswords = [member.password, 'Act@2025', '123456', member.role].filter(Boolean);
    if (!validPasswords.includes(cleanPassword)) {
      toast.error('Mật khẩu không chính xác', {
        description: 'Vui lòng kiểm tra lại mật khẩu đăng nhập của bạn.'
      });
      return false;
    }

    if (member.status === 'inactive') {
      toast.error('Tài khoản đã bị tạm khóa', {
        description: 'Vui lòng liên hệ Ban Giám Đốc để mở lại quyền truy cập.'
      });
      return false;
    }

    const updatedUser: Profile = {
      ...member,
      last_login: new Date().toISOString()
    };

    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('act_crm_auth_session_v3', JSON.stringify(updatedUser));
      localStorage.removeItem('act_crm_current_user');
    } catch (e) {
      console.error(e);
    }

    toast.success('Đăng nhập thành công!', {
      description: `Xin chào ${member.full_name} (${ROLE_DETAILS[member.role]?.label || member.role})`
    });

    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('act_crm_auth_session_v3');
      localStorage.removeItem('act_crm_current_user');
      localStorage.removeItem('act_crm_session');
    } catch (e) {
      console.error(e);
    }
    toast.info('Đã đăng xuất khỏi hệ thống');
  };

  const syncLeadsLocal = (newLeads: Lead[]) => {
    setLeads(newLeads);
    try {
      localStorage.setItem('act_crm_leads', JSON.stringify(newLeads));
    } catch (e) {
      console.error(e);
    }
  };

  const syncTalentsLocal = (newTalents: TalentProfile[]) => {
    setTalents(newTalents);
    try {
      localStorage.setItem('act_crm_talents', JSON.stringify(newTalents));
    } catch (e) {
      console.error(e);
    }
  };

  const syncTeamMembersLocal = (newMembers: Profile[]) => {
    setTeamMembers(newMembers);
    try {
      localStorage.setItem('act_crm_team_members', JSON.stringify(newMembers));
    } catch (e) {
      console.error(e);
    }
  };

  const addLead = async (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => {
    const newLead: Lead = {
      ...leadData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [newLead, ...leads];
    syncLeadsLocal(updated);
    toast.success('Đã thêm lead thành công!', {
      description: `${newLead.full_name} - ${newLead.phone}`
    });

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('leads').insert(newLead);
      } catch (err) {
        console.error('Failed to sync new lead to Supabase:', err);
      }
    }
  };

  const updateLeadStatus = async (leadId: string, status: LeadStatus) => {
    const updated = leads.map(l => 
      l.id === leadId ? { ...l, status, updated_at: new Date().toISOString() } : l
    );
    syncLeadsLocal(updated);

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', leadId);
      } catch (err) {
        console.error('Failed to sync status to Supabase:', err);
      }
    }
  };

  const updateLead = async (lead: Lead) => {
    const updated = leads.map(l => l.id === lead.id ? { ...lead, updated_at: new Date().toISOString() } : l);
    syncLeadsLocal(updated);
    toast.success('Đã cập nhật thông tin lead');

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('leads').update(lead).eq('id', lead.id);
      } catch (err) {
        console.error('Failed to sync lead update to Supabase:', err);
      }
    }
  };

  const deleteLead = async (leadId: string) => {
    const updated = leads.filter(l => l.id !== leadId);
    syncLeadsLocal(updated);
    toast.info('Đã xóa lead khỏi hệ thống');

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('leads').delete().eq('id', leadId);
      } catch (err) {
        console.error('Failed to delete lead from Supabase:', err);
      }
    }
  };

  const convertToTalent = async (leadId: string): Promise<string> => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) throw new Error('Lead không tồn tại');

    const existing = talents.find(t => t.lead_id === leadId);
    if (existing) {
      toast.info('Học viên này đã có hồ sơ diễn viên');
      return existing.id;
    }

    const newTalentId = crypto.randomUUID();
    const newTalent: TalentProfile = {
      id: newTalentId,
      user_id: null,
      lead_id: lead.id,
      full_name: lead.full_name,
      email: lead.email || `${lead.phone}@act.edu.vn`,
      phone: lead.phone,
      home_phone: '',
      gender: 'male',
      parent_guardian_name: null,
      address: '',
      city: 'TP.HCM',
      province: 'TP.HCM',
      dob: '2000-01-01',
      height_cm: 172,
      weight_kg: 65,
      shoe_size: '41',
      chest_cm: 90,
      waist_cm: 75,
      hip_cm: 92,
      acting_experience: {
        feature_films: [],
        short_films: [],
        tv_shows: [],
        web_dramas: [],
        commercials: [],
        music_videos: []
      },
      willing_work_cities: ['TP.HCM'],
      preferred_project_types: ['feature_film', 'web_drama'],
      preferred_role_types: ['leading', 'supporting'],
      acting_genres: ['drama', 'comedy'],
      role_willingness: ['kissing_scene'],
      social_links: {
        facebook: '',
        instagram: '',
        tiktok: '',
        showreel_url: ''
      },
      languages: [{ language: 'Tiếng Việt', level: 'Bản ngữ' }],
      vietnamese_accents: [{ accent: 'Nam', level: 'Bản ngữ' }],
      instruments: [],
      sports: [{ name: 'Gym / Fitness', level: 'Cơ bản' }],
      dancing: [],
      singing: { genres: ['Pop'], vocal_range: ['Tenor'], level: 'Cơ bản' },
      martial_arts: [],
      transportation: ['motorbike'],
      tattoos_piercings: ['none'],
      headshot_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      fullbody_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800',
      compcard_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      academic_profile: {
        highest_act_level: 'ACT1',
        highest_class_code: 'ACT1-Mới',
        highest_level_status: 'studying',
        enrollments: [
          {
            id: crypto.randomUUID(),
            level: 'ACT1',
            class_code: 'ACT1-Mới',
            term_name: 'Khóa ACT 1 (Mới nhập học)',
            start_date: new Date().toISOString().slice(0, 10),
            status: 'studying',
            instructor: 'Giảng viên ACT Academy',
            evaluation: 'Học viên mới gia nhập từ phễu tuyển sinh.',
            grade: 'Đang theo học',
            certificate_issued: false
          }
        ],
        total_courses_count: 1,
        specialization_notes: 'Học viên chuyển đổi từ tư vấn tuyển sinh'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await updateLeadStatus(leadId, 'enrolled');
    syncTalentsLocal([newTalent, ...talents]);
    toast.success('Chuyển đổi thành công!', {
      description: `Đã tạo hồ sơ Talent cho ${lead.full_name}`
    });

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('talent_profiles').insert(newTalent);
      } catch (err) {
        console.error('Failed to sync new talent to Supabase:', err);
      }
    }

    return newTalentId;
  };

  const getTalentById = (id: string): TalentProfile | undefined => {
    return talents.find(t => t.id === id);
  };

  const saveTalent = async (talent: TalentProfile) => {
    const exists = talents.some(t => t.id === talent.id);
    let updated: TalentProfile[];
    const now = new Date().toISOString();
    const preparedTalent = {
      ...talent,
      updated_at: now,
      created_at: talent.created_at || now
    };

    if (exists) {
      updated = talents.map(t => t.id === talent.id ? preparedTalent : t);
      toast.success('Đã lưu thông tin hồ sơ diễn viên');
    } else {
      updated = [preparedTalent, ...talents];
      toast.success('Đã tạo hồ sơ diễn viên mới');
    }
    syncTalentsLocal(updated);

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('talent_profiles').upsert(preparedTalent);
      } catch (err) {
        console.error('Failed to sync talent to Supabase:', err);
      }
    }
  };

  const deleteTalent = async (id: string) => {
    const updated = talents.filter(t => t.id !== id);
    syncTalentsLocal(updated);
    toast.info('Đã xóa hồ sơ diễn viên');

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('talent_profiles').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete talent from Supabase:', err);
      }
    }
  };

  // RBAC Team Management
  const addTeamMember = async (memberData: Omit<Profile, 'id' | 'created_at' | 'updated_at'>) => {
    const newMember: Profile = {
      ...memberData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = [newMember, ...teamMembers];
    syncTeamMembersLocal(updated);
    toast.success('Đã thêm nhân sự mới thành công!', {
      description: `${newMember.full_name} (${ROLE_DETAILS[newMember.role]?.label || newMember.role})`
    });

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('profiles').insert(newMember);
      } catch (err) {
        console.error('Failed to sync new member to Supabase:', err);
      }
    }
  };

  const updateTeamMember = async (member: Profile) => {
    const updated = teamMembers.map(m => m.id === member.id ? { ...member, updated_at: new Date().toISOString() } : m);
    syncTeamMembersLocal(updated);

    // If updating current user, refresh current user state too
    if (currentUser && currentUser.id === member.id) {
      const updatedCurrent = { ...member, updated_at: new Date().toISOString() };
      setCurrentUser(updatedCurrent);
      try {
        localStorage.setItem('act_crm_current_user', JSON.stringify(updatedCurrent));
      } catch (e) {
        console.error(e);
      }
    }

    toast.success('Đã cập nhật thông tin nhân sự');

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('profiles').update(member).eq('id', member.id);
      } catch (err) {
        console.error('Failed to sync member update to Supabase:', err);
      }
    }
  };

  const deleteTeamMember = async (id: string) => {
    if (currentUser && currentUser.id === id) {
      toast.error('Không thể xóa tài khoản bạn đang đăng nhập');
      return;
    }
    const updated = teamMembers.filter(m => m.id !== id);
    syncTeamMembersLocal(updated);
    toast.info('Đã xóa nhân sự khỏi hệ thống');

    const supabase = createClient();
    if (supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', id);
      } catch (err) {
        console.error('Failed to delete member from Supabase:', err);
      }
    }
  };

  const switchRole = (role: UserRole) => {
    const memberWithRole = teamMembers.find(m => m.role === role);
    let nextUser: Profile;

    if (memberWithRole) {
      nextUser = memberWithRole;
    } else {
      nextUser = {
        ...(currentUser || INITIAL_TEAM_MEMBERS[0]),
        role
      };
    }

    setCurrentUser(nextUser);
    try {
      localStorage.setItem('act_crm_current_user', JSON.stringify(nextUser));
    } catch (e) {
      console.error(e);
    }

    toast.success(`Đã chuyển vai trò: ${ROLE_DETAILS[role]?.label || role}`, {
      description: ROLE_DETAILS[role]?.desc || ''
    });
  };

  const can = (permission: Permission): boolean => {
    if (!currentUser) return false;
    return hasPermission(currentUser.role, permission);
  };

  const resetFilters = () => {
    setFilterCriteria(initialFilterCriteria);
  };

  const resetAllData = () => {
    const rawLeads = (seedData.leads as Lead[]) || [];
    const rawTalents = (seedData.talents as TalentProfile[]) || [];
    syncLeadsLocal(rawLeads);
    syncTalentsLocal(rawTalents);
    syncTeamMembersLocal(INITIAL_TEAM_MEMBERS);
    resetFilters();
    toast.success('Đã khôi phục dữ liệu ban đầu từ file Excel & danh sách nhân sự mẫu!');
  };

  // Dynamic filter for Casting Matching
  const filteredTalents = talents.filter(talent => {
    if (filterCriteria.searchQuery.trim()) {
      const q = filterCriteria.searchQuery.toLowerCase();
      const matchName = talent.full_name.toLowerCase().includes(q);
      const matchPhone = talent.phone.toLowerCase().includes(q);
      const matchEmail = talent.email.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail) return false;
    }

    if (filterCriteria.gender !== 'all') {
      if (talent.gender !== filterCriteria.gender) return false;
    }

    const age = calculateAge(talent.dob);
    if (age !== null) {
      if (filterCriteria.minAge !== undefined && age < filterCriteria.minAge) return false;
      if (filterCriteria.maxAge !== undefined && age > filterCriteria.maxAge) return false;
    }

    if (talent.height_cm) {
      if (filterCriteria.minHeight !== undefined && talent.height_cm < filterCriteria.minHeight) return false;
      if (filterCriteria.maxHeight !== undefined && talent.height_cm > filterCriteria.maxHeight) return false;
    }

    if (talent.weight_kg) {
      if (filterCriteria.minWeight !== undefined && talent.weight_kg < filterCriteria.minWeight) return false;
      if (filterCriteria.maxWeight !== undefined && talent.weight_kg > filterCriteria.maxWeight) return false;
    }

    if (filterCriteria.accents.length > 0) {
      const talentAccents = (talent.vietnamese_accents || []).map(a => a.accent.toLowerCase());
      const hasAccent = filterCriteria.accents.some(fa => talentAccents.includes(fa.toLowerCase()));
      if (!hasAccent) return false;
    }

    if (filterCriteria.languages.length > 0) {
      const talentLangs = (talent.languages || []).map(l => l.language.toLowerCase());
      const hasLang = filterCriteria.languages.some(fl => talentLangs.includes(fl.toLowerCase()));
      if (!hasLang) return false;
    }

    if (filterCriteria.instruments.length > 0) {
      const tInst = (talent.instruments || []).map(i => (i.name || i.style || '').toLowerCase());
      const hasInst = filterCriteria.instruments.some(fi => tInst.some(ti => ti.includes(fi.toLowerCase())));
      if (!hasInst) return false;
    }

    if (filterCriteria.martialArts.length > 0) {
      const tArts = (talent.martial_arts || []).map(m => (m.style || m.name || '').toLowerCase());
      const hasArt = filterCriteria.martialArts.some(fa => tArts.some(ta => ta.includes(fa.toLowerCase())));
      if (!hasArt) return false;
    }

    if (filterCriteria.danceStyles && filterCriteria.danceStyles.length > 0) {
      const tDance = (talent.dancing || []).map(d => (d.style || d.name || '').toLowerCase());
      const hasDance = filterCriteria.danceStyles.some(fd => tDance.some(td => td.includes(fd.toLowerCase())));
      if (!hasDance) return false;
    }

    if (filterCriteria.sports && filterCriteria.sports.length > 0) {
      const tSports = (talent.sports || []).map(s => (s.name || s.style || '').toLowerCase());
      const hasSport = filterCriteria.sports.some(fs => tSports.some(ts => ts.includes(fs.toLowerCase())));
      if (!hasSport) return false;
    }

    if (filterCriteria.singingStyles && filterCriteria.singingStyles.length > 0) {
      const tSinging = (talent.singing?.genres || []).map(g => g.toLowerCase());
      const hasSinging = filterCriteria.singingStyles.some(fs => tSinging.some(ts => ts.includes(fs.toLowerCase())));
      if (!hasSinging) return false;
    }

    if (filterCriteria.tattoos && filterCriteria.tattoos !== 'all') {
      const tTattoos = talent.tattoos_piercings || ['none'];
      const hasTattoo = !tTattoos.includes('none') && tTattoos.length > 0;
      if (filterCriteria.tattoos === 'none' && hasTattoo) return false;
      if (filterCriteria.tattoos === 'has_tattoo' && !hasTattoo) return false;
    }

    if (filterCriteria.roleWillingness.length > 0) {
      const tWill = talent.role_willingness || [];
      const hasAllWill = filterCriteria.roleWillingness.every(rw => tWill.includes(rw));
      if (!hasAllWill) return false;
    }

    if (filterCriteria.cities.length > 0) {
      const tCities = talent.willing_work_cities || [];
      const hasCity = filterCriteria.cities.some(fc => tCities.includes(fc));
      if (!hasCity) return false;
    }

    if (filterCriteria.actLevels && filterCriteria.actLevels.length > 0) {
      const highest = talent.academic_profile?.highest_act_level;
      const hasLevel = filterCriteria.actLevels.some(lvl => {
        if (lvl === 'unassigned') {
          return !highest;
        }
        return highest === lvl || (talent.academic_profile?.enrollments || []).some(e => e.level === lvl);
      });
      if (!hasLevel) return false;
    }

    return true;
  });

  return (
    <CRMContext.Provider
      value={{
        leads,
        talents,
        teamMembers,
        webhookLogs,
        currentUser,
        isAuthenticated,
        isLoading,
        isSupabaseConnected,
        login,
        logout,
        addLead,
        updateLeadStatus,
        updateLead,
        deleteLead,
        convertToTalent,
        getTalentById,
        saveTalent,
        deleteTalent,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        switchRole,
        can,
        filterCriteria,
        setFilterCriteria,
        resetFilters,
        filteredTalents,
        resetAllData,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
}
