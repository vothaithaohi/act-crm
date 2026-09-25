'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lead, TalentProfile, LeadStatus, CastingFilterCriteria } from '@/lib/types/crm';
import seedData from '@/data/seed_data.json';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface CRMContextType {
  leads: Lead[];
  talents: TalentProfile[];
  isLoading: boolean;
  isSupabaseConnected: boolean;
  addLead: (lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  updateLead: (lead: Lead) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
  convertToTalent: (leadId: string) => Promise<string>;
  getTalentById: (id: string) => TalentProfile | undefined;
  saveTalent: (talent: TalentProfile) => Promise<void>;
  deleteTalent: (id: string) => Promise<void>;
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
  roleWillingness: [],
  cities: [],
  genres: []
};

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<CastingFilterCriteria>(initialFilterCriteria);

  // Initialize from Supabase or fallback to localStorage / Excel seed data
  useEffect(() => {
    async function initData() {
      const supabase = createClient();

      if (supabase) {
        try {
          // Fetch leads & talents from Supabase live
          const [leadsRes, talentsRes] = await Promise.all([
            supabase.from('leads').select('*').order('created_at', { ascending: false }),
            supabase.from('talent_profiles').select('*').order('created_at', { ascending: false })
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
        } catch (err) {
          console.warn('Supabase query failed, falling back to local seed data:', err);
          loadLocalSeed();
        }
      } else {
        loadLocalSeed();
      }

      setIsLoading(false);
    }

    function loadLocalSeed() {
      try {
        const storedLeads = localStorage.getItem('act_crm_leads');
        const storedTalents = localStorage.getItem('act_crm_talents');

        if (storedLeads && storedTalents) {
          setLeads(JSON.parse(storedLeads));
          setTalents(JSON.parse(storedTalents));
        } else {
          const rawLeads = (seedData.leads as Lead[]) || [];
          const rawTalents = (seedData.talents as TalentProfile[]) || [];
          setLeads(rawLeads);
          setTalents(rawTalents);
          localStorage.setItem('act_crm_leads', JSON.stringify(rawLeads));
          localStorage.setItem('act_crm_talents', JSON.stringify(rawTalents));
        }
      } catch (e) {
        console.error('Failed to load local CRM data:', e);
        setLeads((seedData.leads as Lead[]) || []);
        setTalents((seedData.talents as TalentProfile[]) || []);
      }
    }

    initData();
  }, []);

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

  const resetFilters = () => {
    setFilterCriteria(initialFilterCriteria);
  };

  const resetAllData = () => {
    const rawLeads = (seedData.leads as Lead[]) || [];
    const rawTalents = (seedData.talents as TalentProfile[]) || [];
    syncLeadsLocal(rawLeads);
    syncTalentsLocal(rawTalents);
    resetFilters();
    toast.success('Đã khôi phục dữ liệu ban đầu từ file Excel!');
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

    return true;
  });

  return (
    <CRMContext.Provider
      value={{
        leads,
        talents,
        isLoading,
        isSupabaseConnected,
        addLead,
        updateLeadStatus,
        updateLead,
        deleteLead,
        convertToTalent,
        getTalentById,
        saveTalent,
        deleteTalent,
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
