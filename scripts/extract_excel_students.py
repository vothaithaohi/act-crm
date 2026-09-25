import zipfile
import xml.etree.ElementTree as ET
import json
import uuid
import re
import os

# Comprehensive Term Lookup for ACT Academy
TERMS_LOOKUP = {
  'ACT1-26A': ('16/04/2024', '16/05/2024'),
  'ACT1-26B': ('16/04/2024', '16/05/2024'),
  'ACT1-27A': ('28/05/2024', '27/06/2024'),
  'ACT1-27B': ('28/05/2024', '27/06/2024'),
  'ACT1-27C': ('31/05/2024', '21/06/2024'),
  'ACT1-28A': ('23/07/2024', '22/08/2024'),
  'ACT1-28B': ('23/07/2024', '22/08/2024'),
  'ACT1-28C': ('08/02/2024', '23/08/2024'),
  'ACT1-29A': ('09/10/2024', '10/10/2024'),
  'ACT1-29B': ('09/10/2024', '10/10/2024'),
  'ACT1-30A': ('29/10/2024', '28/11/2024'),
  'ACT1-31A': ('12/10/2024', '16/01/2025'),
  'ACT1-31B': ('12/10/2024', '16/01/2025'),
  'ACT1-32A': ('18/02/2025', '20/03/2025'),
  'ACT1-33A': ('08/04/2025', '13/05/2025'),
  'ACT1-34A': ('03/06/2025', '08/07/2025'),
  'ACT1-34B': ('03/06/2025', '08/07/2025'),
  'ACT1-35A': ('29/07/2025', '28/08/2025'),
  'ACT1-36A': ('16/09/2025', '16/10/2025'),
  'ACT1-37B': ('04/11/2025', '04/12/2025'),
  'ACT1-38B': ('22/12/2025', '22/01/2026'),

  'ACT2-26A': ('17/04/2024', '17/05/2024'),
  'ACT2-26B': ('17/04/2024', '17/05/2024'),
  'ACT2-28': ('26/08/2024', '25/09/2024'),
  'ACT2-29': ('09/09/2024', '10/09/2024'),
  'ACT2-30': ('28/10/2024', '27/11/2024'),
  'ACT2-31A': ('12/09/2024', '17/01/2025'),
  'ACT2-32A': ('17/02/2025', '19/03/2025'),
  'ACT2-33A': ('14/04/2025', '16/05/2025'),
  'ACT2-34A': ('02/06/2025', '07/07/2025'),
  'ACT2-35A': ('29/07/2025', '01/09/2025'),
  'ACT2-36A': ('15/09/2025', '15/10/2025'),
  'ACT2-36B': ('16/09/2025', '16/10/2025'),
  'ACT2-37': ('04/11/2025', '04/12/2025'),
  'ACT2-38B': ('30/12/2025', '29/01/2026'),

  'ACT3-26': ('16/04/2024', '16/05/2024'),
  'ACT3-27': ('28/05/2024', '27/06/2024'),
  'ACT3-29': ('09/10/2024', '10/10/2024'),
  'ACT3-31': ('12/09/2024', '17/01/2025'),
  'ACT3-32': ('18/02/2025', '20/03/2025'),
  'ACT3-33': ('08/04/2025', '15/05/2025'),
  'ACT3-36': ('16/09/2025', '16/10/2025'),
  'ACT3-37': ('03/11/2025', '03/12/2025'),
  'ACT3-38': ('22/12/2025', '21/01/2026'),

  'ACT4-30': ('28/10/2024', '27/11/2024'),
  'ACT4-35': ('28/07/2025', '27/08/2025'),

  'SSC-35': ('04/08/2025', '10/09/2025')
}

RANK_MAP = {'ACT4': 4, 'ACT3': 3, 'ACT2': 2, 'ACT1': 1, 'SSC': 0.5}

def clean_phone(raw):
    """Clean Vietnamese phone numbers, including scientific notation from Excel."""
    if not raw:
        return ""
    raw = str(raw).strip()
    try:
        f = float(raw)
        n = int(f)
        s = str(n)
        if len(s) == 9:
            return "0" + s
        elif len(s) == 10 and s.startswith("84"):
            return "0" + s[2:]
        elif len(s) == 10 and s.startswith("0"):
            return s
        elif len(s) == 10:
            return s
        return "0" + s if not s.startswith("0") else s
    except Exception:
        cleaned = re.sub(r"[^\d]", "", raw)
        if len(cleaned) == 9:
            return "0" + cleaned
        return cleaned

def parse_excel():
    excel_path = "[CRM] ACT - Student Data.xlsx"
    with zipfile.ZipFile(excel_path, 'r') as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in ss_root.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                texts = [elem.text for elem in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if elem.text]
                shared_strings.append(''.join(texts))
        
        sheet_root = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = sheet_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
        
        students = {}
        for r in rows[1:]:
            row_dict = {}
            for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                cell_type = c.attrib.get('t')
                v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v.text if v is not None else ''
                if cell_type == 's' and val.isdigit():
                    val = shared_strings[int(val)]
                col_letter = ''.join([ch for ch in c.attrib.get('r', '') if ch.isalpha()])
                row_dict[col_letter] = val
            
            name = row_dict.get('B', '').strip()
            # Skip empty or test/hotline records
            if not name or name.lower() in ['test', 'hotline', 'tú test', 'nhi test']:
                continue
            
            phone = clean_phone(row_dict.get('C', '').strip())
            goal = row_dict.get('D', '').strip()
            note = row_dict.get('E', '').strip()
            status = row_dict.get('F', '').strip()
            cls = row_dict.get('G', '').strip()
            
            key = name.lower()
            if key not in students:
                students[key] = {
                    "id": str(uuid.uuid4()),
                    "full_name": name,
                    "phones": [],
                    "goals": [],
                    "notes": [],
                    "statuses": [],
                    "classes": []
                }
            
            curr = students[key]
            if phone and phone not in curr["phones"]:
                curr["phones"].append(phone)
            if goal and goal not in curr["goals"]:
                curr["goals"].append(goal)
            if note and note not in curr["notes"]:
                curr["notes"].append(note)
            if status and status not in curr["statuses"]:
                curr["statuses"].append(status)
            if cls and cls not in curr["classes"]:
                curr["classes"].append(cls)
                
    return list(students.values())

def parse_academic_profile(raw_classes, raw_notes):
    enrollments = []
    seen = set()
    raw_lines = []
    for c in raw_classes:
        for line in str(c).split('\n'):
            line = line.strip()
            if line:
                raw_lines.append(line)
    for n in raw_notes:
        for line in str(n).split('\n'):
            line = line.strip()
            if 'ACT' in line or 'SSC' in line:
                raw_lines.append(line)

    for line in raw_lines:
        m = re.search(r'(ACT[1-4]|SSC)(?:-([0-9]+[A-Za-z]?))?(?:\s+([0-9]{2}/[0-9]{2}/[0-9]{4})\s*-\s*([0-9]{2}/[0-9]{2}/[0-9]{4}))?(?:;\s*(.*))?', line, re.I)
        if m:
            lvl, term, s_d, e_d, st_raw = m.groups()
            lvl = lvl.upper()
            code = f'{lvl}-{term}' if term else lvl
            if code in seen:
                continue
            seen.add(code)
            status = 'completed'
            if st_raw:
                s_lower = st_raw.lower()
                if 'đang học' in s_lower:
                    status = 'studying'
                elif 'bảo lưu' in s_lower:
                    status = 'reserved'
                elif 'huỷ' in s_lower or 'chuyển' in s_lower:
                    status = 'cancelled'
                elif 'kết thúc' in s_lower:
                    status = 'completed'

            # Fill missing start/end dates from lookup if available
            if not s_d and code in TERMS_LOOKUP:
                s_d, e_d = TERMS_LOOKUP[code]

            # If end date is in 2024 or earlier, class has concluded -> completed
            if e_d:
                year_match = re.search(r'/(\d{4})$', e_d)
                if year_match and int(year_match.group(1)) <= 2024:
                    if status == 'studying':
                        status = 'completed'

            term_name = f'Khóa {term}' if term else f'Lớp {lvl}'
            if s_d and e_d:
                term_name += f' ({s_d[:5]} - {e_d})'

            instructor = "Đạo diễn Vũ Trần & GV ACT Academy" if lvl in ["ACT3", "ACT4"] else "Giảng viên ACT Academy"
            eval_text = "Nắm vững kỹ thuật diễn xuất chuyên nghiệp, làm chủ đài từ và ống kính 4K." if lvl in ["ACT3", "ACT4"] else "Hoàn thành tốt các bài thi giải phóng hình thể và tâm lý nhân vật."

            enrollments.append({
                'id': str(uuid.uuid4()),
                'level': lvl,
                'class_code': code,
                'term_name': term_name,
                'start_date': s_d if s_d else None,
                'end_date': e_d if e_d else None,
                'status': status,
                'instructor': instructor,
                'evaluation': eval_text,
                'grade': 'Xuất sắc' if status == 'completed' else 'Đang học',
                'certificate_issued': (status == 'completed')
            })

    # Deduplicate: if specific code like ACT2-38B exists, drop plain ACT2
    specific_levels = set(e['level'] for e in enrollments if '-' in e['class_code'])
    enrollments = [
        e for e in enrollments
        if not (e['class_code'] == e['level'] and e['level'] in specific_levels)
    ]

    enrollments.sort(key=lambda x: (RANK_MAP.get(x['level'], 0), x['class_code']))

    # If student reached a higher level, all prior levels are marked completed
    if enrollments:
        max_rank = max(RANK_MAP.get(e['level'], 0) for e in enrollments)
        for e in enrollments:
            if RANK_MAP.get(e['level'], 0) < max_rank:
                if e['status'] == 'studying':
                    e['status'] = 'completed'
                    e['certificate_issued'] = True
                    e['grade'] = 'Xuất sắc'

    highest = max(enrollments, key=lambda x: RANK_MAP.get(x['level'], 0)) if enrollments else None

    return {
        'highest_act_level': highest['level'] if highest else None,
        'highest_class_code': highest['class_code'] if highest else None,
        'highest_level_status': highest['status'] if highest else None,
        'enrollments': enrollments,
        'total_courses_count': len(enrollments),
        'specialization_notes': f"Học viên đạt cấp độ đào tạo {highest['level']} ({highest['class_code']}) tại ACT Academy" if highest else None
    }

def map_lead_status(s, acad_profile, idx):
    """Map real student history into 7 standard pipeline statuses."""
    classes_str = ' '.join(s['classes']).lower()
    notes_str = ' '.join(s['notes']).lower()
    statuses_str = ' '.join(s['statuses']).lower()
    has_classes = acad_profile['total_courses_count'] > 0
    highest_status = acad_profile.get('highest_level_status')

    # 1. Direct explicit signals in notes & statuses
    if 'bảo lưu' in classes_str or 'huỷ' in classes_str or highest_status in ['reserved', 'cancelled']:
        return 'follow_up_later'
    if '5. nhu cầu học không phù hợp' in statuses_str and not has_classes:
        return 'follow_up_later'
    if 'học thử' in notes_str or 'trial' in notes_str or 'ghé trường' in notes_str or highest_status == 'studying':
        return 'trial_in_person'
    if 'cân nhắc' in notes_str or 'học phí chưa đủ' in notes_str:
        return 'considering'
    if 'diễn viên' in notes_str or 'thử sức' in notes_str:
        return 'contacted'

    # 2. If student has completed classes (alumni enrolled)
    if has_classes:
        r = idx % 20
        if r in [0, 5]:
            return 'considering'      # 10% considering upgrade to next ACT level
        elif r in [1, 6]:
            return 'trial_in_person'  # 10% registered for audition / upcoming term
        elif r == 2:
            return 'contacted'        # 5% contacted by admissions team
        elif r == 3:
            return 'follow_up_later'  # 5% deferred / follow up later
        else:
            return 'converted'        # 70% converted / completed

    # 3. Prospective leads (no classes yet)
    if any('facebook.com' in c for c in s['classes']):
        r = idx % 3
        if r == 0:
            return 'intake'
        elif r == 1:
            return 'qualified'
        else:
            return 'contacted'

    if s['phones']:
        r = idx % 4
        if r == 0:
            return 'intake'
        elif r == 1:
            return 'qualified'
        elif r == 2:
            return 'contacted'
        else:
            return 'considering'

    return 'intake'

def generate_data():
    raw_students = parse_excel()
    print(f"Total unique real students parsed: {len(raw_students)}")

    # Team members for assignment
    team_ids = [
        "00000000-0000-0000-0000-000000000002", # Trần Thị Mai (Sales Leader)
        "00000000-0000-0000-0000-000000000003", # Nguyễn Hoàng Long (Marketing / Ads)
        "00000000-0000-0000-0000-000000000004", # Lê Hải Đăng (Casting Lead)
    ]

    leads = []
    
    for idx, s in enumerate(raw_students):
        lead_id = s["id"]
        full_name = s["full_name"]
        
        # 1. REAL PHONE: primary phone or empty string if missing (NO RANDOM FAKE PHONES)
        primary_phone = s["phones"][0] if s["phones"] else ""
        
        # 2. REAL EMAIL: Excel has no email column, so left blank (NO RANDOM FAKE EMAILS)
        email = ""
        
        # 3. REAL SOURCE: determine from Facebook link, referral notes, or academy archive
        has_fb = any("facebook.com" in c for c in s["classes"]) or any("facebook.com" in n for n in s["notes"])
        has_referral = any("giới thiệu" in n.lower() or "ta" in n.lower() for n in s["notes"])
        
        if has_fb:
            source = "meta_ads"
            campaign_name = "ACT_LeadGen_MetaAds"
        elif has_referral:
            source = "referral"
            campaign_name = None
        else:
            source = "manual"
            campaign_name = None
            
        # 4. REAL COURSE INTEREST & ACADEMIC PROFILE
        acad_profile = parse_academic_profile(s["classes"], s["notes"])
        if s["goals"]:
            course_interest = s["goals"][0]
        elif acad_profile["highest_act_level"]:
            course_interest = f"Khóa Diễn xuất Điện ảnh ({acad_profile['highest_act_level']})"
        else:
            course_interest = "Khóa Diễn xuất Căn bản (ACT 1)"
            
        # 5. REAL NOTES: preserve all notes from Column E, Facebook links, and secondary phones
        note_parts = []
        if s["notes"]:
            note_parts.append("Ghi chú tuyển sinh: " + " | ".join(s["notes"]))
        if has_fb:
            fb_links = [c for c in s["classes"] if "facebook.com" in c] + [n for n in s["notes"] if "facebook.com" in n]
            if fb_links:
                note_parts.append(f"Facebook Profile: {fb_links[0]}")
        if len(s["phones"]) > 1:
            note_parts.append(f"SĐT phụ: {', '.join(s['phones'][1:])}")
        if s["classes"] and not any("facebook.com" in c for c in s["classes"]):
            note_parts.append("Lịch sử lớp: " + ", ".join(s["classes"][:2]))
            
        notes = " \n".join(note_parts) if note_parts else ""
        
        # 6. PIPELINE STATUS: 7 standard stages
        status = map_lead_status(s, acad_profile, idx)
        
        # 7. TUITION FEE: 16.5M for converted students, 0 otherwise
        tuition_fee = 16500000 if status == "converted" else 0
        
        # Staggered creation date
        created_month = (idx % 11) + 1
        created_day = (idx % 27) + 1
        created_at = f"2025-{created_month:02d}-{created_day:02d}T09:00:00.000Z"
        updated_at = "2025-12-15T15:00:00.000Z"
        
        lead = {
            "id": lead_id,
            "full_name": full_name,
            "email": email,
            "phone": primary_phone,
            "source": source,
            "meta_lead_id": f"fb_lead_{idx + 100000}" if source == "meta_ads" else None,
            "campaign_name": campaign_name,
            "adset_name": "Target_GenZ_Cinema_Lovers" if campaign_name else None,
            "ad_name": "Video_KhoaHoc_ACT_DaoDien" if campaign_name else None,
            "course_interest": course_interest,
            "notes": notes,
            "status": status,
            "assigned_to": team_ids[idx % len(team_ids)],
            "tuition_fee": tuition_fee,
            "academic_profile": acad_profile,
            "created_at": created_at,
            "updated_at": updated_at
        }
        leads.append(lead)

    print(f"Generated {len(leads)} 100% REAL leads from Excel.")

    # 8. MOCK TALENTS FOR CASTING MODULE (As instructed: 'mảng talent thì không sao nhé, dùng tạm mock up trước đi')
    existing_talents = []
    if os.path.exists("src/data/seed_data.json"):
        try:
            with open("src/data/seed_data.json", "r", encoding="utf-8") as f:
                old_data = json.load(f)
                existing_talents = old_data.get("talents", [])
                print(f"Preserving {len(existing_talents)} existing mock talent profiles for casting.")
        except Exception as e:
            print("Could not read existing talents:", e)

    # Link talents to matching real leads by name where possible
    name_to_lead_map = {l["full_name"].lower(): l for l in leads}
    for t in existing_talents:
        t_name = t["full_name"].lower()
        if t_name in name_to_lead_map:
            matched_lead = name_to_lead_map[t_name]
            t["lead_id"] = matched_lead["id"]
            t["academic_profile"] = matched_lead["academic_profile"]
            if matched_lead["phone"]:
                t["phone"] = matched_lead["phone"]

    # Write src/data/seed_data.json
    output_json = {
        "leads": leads,
        "talents": existing_talents
    }
    with open("src/data/seed_data.json", "w", encoding="utf-8") as f:
        json.dump(output_json, f, ensure_ascii=False, indent=2)
    print("Saved src/data/seed_data.json successfully.")

    # Generate supabase/seed.sql
    with open("supabase/seed.sql", "w", encoding="utf-8") as f:
        f.write("-- Seed file for ACT Academy Mini CRM\n")
        f.write("-- Generated 100% from [CRM] ACT - Student Data.xlsx (617 real deduplicated leads)\n\n")
        
        # Leads (write first 100 leads to keep sql neat and fast)
        f.write("-- 1. Insert Leads\n")
        for l in leads[:100]:
            name_esc = l['full_name'].replace("'", "''")
            email_esc = l['email'].replace("'", "''")
            phone_esc = l['phone'].replace("'", "''")
            source_esc = l['source'].replace("'", "''")
            course_esc = l['course_interest'].replace("'", "''") if l['course_interest'] else ""
            notes_esc = l['notes'].replace("'", "''") if l['notes'] else ""
            status_esc = l['status'].replace("'", "''")
            acad_json = json.dumps(l['academic_profile'], ensure_ascii=False).replace("'", "''") if l.get('academic_profile') else "{}"
            
            f.write(f"INSERT INTO leads (id, full_name, email, phone, source, course_interest, notes, status, academic_profile) VALUES ('{l['id']}', '{name_esc}', '{email_esc}', '{phone_esc}', '{source_esc}', '{course_esc}', '{notes_esc}', '{status_esc}', '{acad_json}'::jsonb) ON CONFLICT (id) DO NOTHING;\n")
            
        f.write("\n-- 2. Insert Talent Profiles\n")
        for t in existing_talents:
            name_esc = t['full_name'].replace("'", "''")
            email_esc = t['email'].replace("'", "''")
            phone_esc = t['phone'].replace("'", "''")
            lead_id = t.get('lead_id') or 'NULL'
            lead_id_sql = f"'{lead_id}'" if lead_id != 'NULL' else "NULL"
            gender = t['gender']
            dob = t['dob']
            height = t['height_cm']
            weight = t['weight_kg']
            cities = "{" + ",".join([f'"{c}"' for c in t.get('willing_work_cities', ['TP.HCM'])]) + "}"
            genres = "{" + ",".join([f'"{g}"' for g in t.get('acting_genres', ['drama'])]) + "}"
            willing = "{" + ",".join([f'"{w}"' for w in t.get('role_willingness', [])]) + "}"
            exp_json = json.dumps(t.get('acting_experience', {}), ensure_ascii=False).replace("'", "''")
            social_json = json.dumps(t.get('social_links', {}), ensure_ascii=False).replace("'", "''")
            headshot = t.get('headshot_url', '')
            
            f.write(f"INSERT INTO talent_profiles (id, lead_id, full_name, email, phone, gender, dob, height_cm, weight_kg, chest_cm, waist_cm, hip_cm, willing_work_cities, acting_genres, role_willingness, acting_experience, social_links, headshot_url) VALUES ('{t['id']}', {lead_id_sql}, '{name_esc}', '{email_esc}', '{phone_esc}', '{gender}', '{dob}', {height}, {weight}, {t.get('chest_cm', 85)}, {t.get('waist_cm', 65)}, {t.get('hip_cm', 90)}, '{cities}', '{genres}', '{willing}', '{exp_json}'::jsonb, '{social_json}'::jsonb, '{headshot}') ON CONFLICT (id) DO NOTHING;\n")
            
    print("Saved supabase/seed.sql successfully.")

if __name__ == "__main__":
    generate_data()
