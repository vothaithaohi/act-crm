import zipfile
import xml.etree.ElementTree as ET
import json
import uuid
import re
import os
import random
from datetime import datetime, date

def clean_phone(raw):
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
    except:
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
            if not name:
                continue
            
            raw_phone = row_dict.get('C', '').strip()
            phone = clean_phone(raw_phone)
            goal = row_dict.get('D', '').strip()
            note = row_dict.get('E', '').strip()
            status = row_dict.get('F', '').strip()
            cls = row_dict.get('G', '').strip()
            
            key = name.lower()
            if key not in students:
                students[key] = {
                    "id": str(uuid.uuid4()),
                    "full_name": name,
                    "phone": phone,
                    "goals": [],
                    "notes": [],
                    "statuses": [],
                    "classes": []
                }
            
            curr = students[key]
            if phone and not curr["phone"]:
                curr["phone"] = phone
            if goal and goal not in curr["goals"]:
                curr["goals"].append(goal)
            if note and note not in curr["notes"]:
                curr["notes"].append(note)
            if status and status not in curr["statuses"]:
                curr["statuses"].append(status)
            if cls and cls not in curr["classes"]:
                curr["classes"].append(cls)
                
    return list(students.values())

def map_lead_status(raw_statuses, classes):
    # 'new', 'contacted', 'audition_scheduled', 'audition_passed', 'enrolled', 'lost'
    for s in raw_statuses:
        if "6. HV chính thức" in s:
            return "enrolled"
        if "5. Nhu cầu học không phù hợp" in s:
            return "lost"
    # If student has completed or taken classes:
    for c in classes:
        if "Kết thúc" in c or "Đang học" in c or "ACT" in c or "SSC" in c:
            return "enrolled"
        if "Chờ khai giảng" in c:
            return "audition_passed"
        if "Bảo lưu" in c:
            return "audition_passed"
        if "Huỷ" in c:
            return "lost"
    return "contacted"

RANK_MAP = {'ACT4': 4, 'ACT3': 3, 'ACT2': 2, 'ACT1': 1, 'SSC': 0.5}

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

    highest = max(enrollments, key=lambda x: RANK_MAP.get(x['level'], 0)) if enrollments else None

    return {
        'highest_act_level': highest['level'] if highest else None,
        'highest_class_code': highest['class_code'] if highest else None,
        'highest_level_status': highest['status'] if highest else None,
        'enrollments': enrollments,
        'total_courses_count': len(enrollments),
        'specialization_notes': f"Học viên đạt cấp độ đào tạo {highest['level']} ({highest['class_code']}) tại ACT Academy" if highest else None
    }

def generate_data():
    raw_students = parse_excel()
    print(f"Total students parsed: {len(raw_students)}")

    # Pre-defined avatar/headshots for realistic talent profiles
    male_avatars = [
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=800"
    ]
    female_avatars = [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800"
    ]
    fullbody_samples = [
        "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=800"
    ]

    leads = []
    talents = []

    # Female indicators in Vietnamese names
    female_keywords = ["thị", "hương", "trang", "linh", "anh", "mai", "hoa", "phương", "ngọc", "thảo", "quỳnh", "nhi", "vy", "huyền", "my", "lan", "hằng", "châu", "ngân", "thư", "yến", "dung"]

    sources = ["meta_ads", "manual", "website_form", "referral"]
    campaigns = [
        "ACT_LeadGen_DienXuat_Q1", 
        "ACT_Summer_Acting_Bootcamp", 
        "ACT_Pro_Casting_2025", 
        "MetaAds_Koc_DienXuat_ChuyenNghiep"
    ]

    # Pre-parse academic profile for all students
    student_acad_map = {}
    for s in raw_students:
        student_acad_map[s["id"]] = parse_academic_profile(s["classes"], s["notes"])

    # Balanced talent selection across ACT4, ACT3, ACT2, ACT1
    # Group students by highest level
    by_level = {'ACT4': [], 'ACT3': [], 'ACT2': [], 'ACT1': [], 'SSC': [], 'None': []}
    for s in raw_students:
        hl = student_acad_map[s["id"]]["highest_act_level"] or 'None'
        by_level[hl].append(s)

    # Sort each group by course count descending
    for lvl in by_level:
        by_level[lvl].sort(key=lambda s: student_acad_map[s["id"]]["total_courses_count"], reverse=True)

    talent_candidate_ids = set()
    # All ACT4 (11)
    for s in by_level['ACT4']:
        talent_candidate_ids.add(s["id"])
    # Top 25 ACT3
    for s in by_level['ACT3'][:25]:
        talent_candidate_ids.add(s["id"])
    # Top 25 ACT2
    for s in by_level['ACT2'][:25]:
        talent_candidate_ids.add(s["id"])
    # Top 25 ACT1
    for s in by_level['ACT1'][:25]:
        talent_candidate_ids.add(s["id"])
    # Top SSC
    for s in by_level['SSC'][:3]:
        talent_candidate_ids.add(s["id"])

    sources = ["meta_ads", "manual", "website_form", "referral"]
    campaigns = [
        "ACT_LeadGen_DienXuat_Q1", 
        "ACT_Summer_Acting_Bootcamp", 
        "ACT_Pro_Casting_2025", 
        "MetaAds_Koc_DienXuat_ChuyenNghiep"
    ]

    for idx, s in enumerate(raw_students):
        lead_id = s["id"]
        full_name = s["full_name"]
        phone = s["phone"] if s["phone"] else f"09{random.randint(10000000, 99999999)}"
        email_clean = re.sub(r"[^a-zA-Z0-9]", "", full_name.lower())[:15]
        email = f"{email_clean}_{random.randint(100, 999)}@gmail.com"
        
        status = map_lead_status(s["statuses"], s["classes"])
        course = s["goals"][0] if s["goals"] else "Khóa Diễn xuất Điện ảnh Chuyên sâu (ACT Pro)"
        
        # Build note from classes & original notes
        notes_parts = []
        if s["classes"]:
            notes_parts.append("Lớp đã học: " + ", ".join(s["classes"][:3]))
        if s["notes"]:
            notes_parts.append("Ghi chú: " + " | ".join(s["notes"]))
        note_str = " \n".join(notes_parts) if notes_parts else "Học viên từ cơ sở dữ liệu ACT Academy"
        
        source = sources[idx % len(sources)]
        campaign = campaigns[idx % len(campaigns)] if source == "meta_ads" else None

        lead = {
            "id": lead_id,
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "source": source,
            "meta_lead_id": f"fb_lead_{random.randint(100000000, 999999999)}" if source == "meta_ads" else None,
            "campaign_name": campaign,
            "adset_name": "Target_GenZ_Cinema_Lovers" if campaign else None,
            "ad_name": "Video_KhoaHoc_ACT_DaoDien" if campaign else None,
            "course_interest": course,
            "notes": note_str,
            "status": status,
            "created_at": "2025-01-15T09:00:00.000Z",
            "updated_at": "2025-02-10T14:30:00.000Z"
        }
        leads.append(lead)

        # Create Talent profiles for notable students, prioritizing high ACT levels (ACT4, ACT3, ACT2, ACT1)
        if (s["id"] in talent_candidate_ids) or (status in ["enrolled", "audition_passed"] and len(talents) < 65):
            is_female = any(kw in full_name.lower() for kw in female_keywords)
            gender = "female" if is_female else "male"
            
            birth_year = random.randint(1995, 2005)
            birth_month = random.randint(1, 12)
            birth_day = random.randint(1, 28)
            dob = f"{birth_year}-{birth_month:02d}-{birth_day:02d}"

            height = random.randint(158, 172) if is_female else random.randint(170, 186)
            weight = random.randint(45, 56) if is_female else random.randint(62, 78)

            chest = random.randint(80, 92) if is_female else random.randint(90, 105)
            waist = random.randint(58, 68) if is_female else random.randint(72, 85)
            hip = random.randint(85, 96) if is_female else random.randint(88, 98)

            avatar_list = female_avatars if is_female else male_avatars
            headshot = avatar_list[len(talents) % len(avatar_list)]
            fullbody = fullbody_samples[len(talents) % len(fullbody_samples)]

            # Sample acting experiences
            acting_exp = {
                "feature_films": [
                    {"title": "Mùa Hè Năm Ấy", "role": "supporting", "character": "Minh", "year": 2024},
                    {"title": "Bóng Đêm Rực Rỡ", "role": "cameo", "character": "Thanh tra trẻ", "year": 2023}
                ] if len(talents) % 2 == 0 else [],
                "short_films": [
                    {"title": "Chuyến Xe Lúc Nửa Đêm", "role": "leading", "character": "Nhân vật chính", "year": 2024},
                    {"title": "Tàn Tro", "role": "supporting", "character": "Bạn thân", "year": 2023}
                ],
                "tv_shows": [
                    {"title": "Ánh Bình Minh", "role": "supporting", "character": "Hải Yến", "year": 2023}
                ] if len(talents) % 3 == 0 else [],
                "web_dramas": [
                    {"title": "Thanh Xuân Có Hạn", "role": "leading", "character": "Linh Đan", "year": 2024}
                ],
                "commercials": [
                    {"brand": "Vinamilk Super Nut", "role": "leading", "year": 2024},
                    {"brand": "Shopee 11.11", "role": "supporting", "year": 2024}
                ],
                "music_videos": [
                    {"artist": "Vũ Cát Tường", "song": "Hành Tinh Ánh Sáng", "role": "leading", "year": 2023}
                ] if len(talents) % 2 == 1 else []
            }

            all_cities = ["TP.HCM", "Hà Nội", "Đà Nẵng", "Miền Tây", "Hạ Long"]
            willing_cities = random.sample(all_cities, k=random.randint(2, 4))
            if "TP.HCM" not in willing_cities:
                willing_cities.append("TP.HCM")

            genres = random.sample(["rom_com", "drama", "action", "thriller", "comedy", "horror"], k=random.randint(2, 4))
            
            # Role willingness
            willingness_pool = ["hair_color", "cut_hair", "kissing_scene", "swimsuit", "lingerie", "partial_nudity"]
            role_willing = random.sample(willingness_pool, k=random.randint(2, 5))

            # Accents & Languages
            accents = [
                {"accent": "Nam", "level": "Bản ngữ"} if len(talents) % 2 == 0 else {"accent": "Bắc", "level": "Bản ngữ"}
            ]
            if len(talents) % 3 == 0:
                accents.append({"accent": "Trung", "level": "Tốt"})

            langs = [
                {"language": "Tiếng Việt", "level": "Bản ngữ"},
                {"language": "Tiếng Anh", "level": "Giao tiếp trôi chảy" if len(talents) % 2 == 0 else "Cơ bản"}
            ]
            if len(talents) % 4 == 0:
                langs.append({"language": "Tiếng Hàn", "level": "Sơ cấp"})

            instruments = []
            if len(talents) % 3 == 0:
                instruments.append({"name": "Guitar", "level": "Thành thạo"})
            if len(talents) % 5 == 0:
                instruments.append({"name": "Piano", "level": "Cơ bản"})

            martial_arts = []
            if len(talents) % 2 == 0:
                martial_arts.append({"style": "Boxing", "level": "Trung cấp"})
            if len(talents) % 4 == 0:
                martial_arts.append({"style": "Vovinam", "level": "Khá"})

            dancing = []
            if is_female or len(talents) % 3 == 0:
                dancing.append({"style": "Đương đại / Kpop", "level": "Trung cấp"})

            singing = {
                "level": "Tốt" if len(talents) % 3 == 0 else "Cơ bản",
                "genres": ["Pop", "Ballad"],
                "vocal_range": ["Soprano" if is_female else "Baritone"]
            }

            sports = [
                {"name": "Bơi lội", "level": "Tốt"},
                {"name": "Gym / Fitness", "level": "Nâng cao"}
            ]

            tattoo_opts = ["none", "arms_shoulder", "legs_feet", "unseen"]
            tattoo = [random.choice(tattoo_opts)]

            talent = {
                "id": str(uuid.uuid4()),
                "user_id": None,
                "lead_id": lead_id,
                "full_name": full_name,
                "email": email,
                "phone": phone,
                "home_phone": "",
                "gender": gender,
                "parent_guardian_name": None,
                "address": "Quận 1",
                "city": "TP.HCM",
                "province": "TP.HCM",
                "dob": dob,
                "height_cm": height,
                "weight_kg": weight,
                "shoe_size": "38" if is_female else "42",
                "chest_cm": chest,
                "waist_cm": waist,
                "hip_cm": hip,
                "acting_experience": acting_exp,
                "willing_work_cities": willing_cities,
                "preferred_project_types": ["feature_film", "web_drama", "commercial", "short_film"],
                "preferred_role_types": ["leading", "supporting"],
                "acting_genres": genres,
                "role_willingness": role_willing,
                "social_links": {
                    "facebook": f"https://facebook.com/{email_clean}",
                    "instagram": f"https://instagram.com/{email_clean}",
                    "tiktok": f"https://tiktok.com/@{email_clean}",
                    "showreel_url": "https://youtube.com/watch?v=sample_showreel"
                },
                "languages": langs,
                "vietnamese_accents": accents,
                "instruments": instruments,
                "sports": sports,
                "dancing": dancing,
                "singing": singing,
                "martial_arts": martial_arts,
                "transportation": ["motorbike", "car"] if not is_female else ["motorbike"],
                "tattoos_piercings": tattoo,
                "headshot_url": headshot,
                "fullbody_url": fullbody,
                "compcard_url": headshot,
                "academic_profile": student_acad_map[s["id"]],
                "created_at": "2025-01-20T10:00:00.000Z",
                "updated_at": "2025-02-15T16:00:00.000Z"
            }
            talents.append(talent)

    print(f"Generated {len(leads)} leads and {len(talents)} detailed talent profiles.")
    
    # Save to src/data/seed_data.json
    output_json = {
        "leads": leads,
        "talents": talents
    }
    with open("src/data/seed_data.json", "w", encoding="utf-8") as f:
        json.dump(output_json, f, ensure_ascii=False, indent=2)
    print("Saved src/data/seed_data.json")

    # Generate SQL seed file: supabase/seed.sql
    with open("supabase/seed.sql", "w", encoding="utf-8") as f:
        f.write("-- Seed file for ACT Academy Mini CRM\n")
        f.write("-- Generated from [CRM] ACT - Student Data.xlsx\n\n")
        
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
            
            f.write(f"INSERT INTO leads (id, full_name, email, phone, source, course_interest, notes, status) VALUES ('{l['id']}', '{name_esc}', '{email_esc}', '{phone_esc}', '{source_esc}', '{course_esc}', '{notes_esc}', '{status_esc}') ON CONFLICT (id) DO NOTHING;\n")
            
        f.write("\n-- 2. Insert Talent Profiles\n")
        for t in talents:
            name_esc = t['full_name'].replace("'", "''")
            email_esc = t['email'].replace("'", "''")
            phone_esc = t['phone'].replace("'", "''")
            lead_id = t['lead_id']
            gender = t['gender']
            dob = t['dob']
            height = t['height_cm']
            weight = t['weight_kg']
            cities = "{" + ",".join([f'"{c}"' for c in t['willing_work_cities']]) + "}"
            genres = "{" + ",".join([f'"{g}"' for g in t['acting_genres']]) + "}"
            willing = "{" + ",".join([f'"{w}"' for w in t['role_willingness']]) + "}"
            exp_json = json.dumps(t['acting_experience'], ensure_ascii=False).replace("'", "''")
            social_json = json.dumps(t['social_links'], ensure_ascii=False).replace("'", "''")
            headshot = t['headshot_url']
            
            f.write(f"INSERT INTO talent_profiles (id, lead_id, full_name, email, phone, gender, dob, height_cm, weight_kg, chest_cm, waist_cm, hip_cm, willing_work_cities, acting_genres, role_willingness, acting_experience, social_links, headshot_url) VALUES ('{t['id']}', '{lead_id}', '{name_esc}', '{email_esc}', '{phone_esc}', '{gender}', '{dob}', {height}, {weight}, {t['chest_cm']}, {t['waist_cm']}, {t['hip_cm']}, '{cities}', '{genres}', '{willing}', '{exp_json}'::jsonb, '{social_json}'::jsonb, '{headshot}') ON CONFLICT (id) DO NOTHING;\n")
            
    print("Saved supabase/seed.sql")

if __name__ == "__main__":
    generate_data()
