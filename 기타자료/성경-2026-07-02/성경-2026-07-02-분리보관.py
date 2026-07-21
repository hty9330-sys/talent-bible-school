"""
성경읽기 기능 분리 보관본
원본: C:/Users/lg/OneDrive/Desktop/codex/2026-06-28/2026-06-28-2.py
분리일: 2026-07-02

이 파일은 다른 Streamlit 앱에 붙여 넣기 위한 코드 보관본입니다.
필요 의존성: streamlit as st, pandas as pd, calendar, re, date/timedelta, urlencode, supabase, today_kst, get_user_id, todo_card_container, WEEKDAY_KR
필요 데이터: readings.csv
필요 Supabase 테이블: reading_checks
"""

BOOK_CODES = {
    "창": "gen", "출": "exo", "레": "lev", "민": "num", "신": "deu",
    "수": "jos", "삿": "jdg", "룻": "rut", "삼상": "1sa", "삼하": "2sa",
    "왕상": "1ki", "왕하": "2ki", "대상": "1ch", "대하": "2ch",
    "스": "ezr", "느": "neh", "에": "est", "욥": "job", "시": "psa", "잠": "pro",
    "전": "ecc", "아": "sng", "사": "isa", "렘": "jer", "애": "lam", "겔": "ezk", "단": "dan",
    "호": "hos", "욜": "jol", "암": "amo", "옵": "oba", "욘": "jon", "미": "mic", "나": "nam",
    "합": "hab", "습": "zep", "학": "hag", "슥": "zec", "말": "mal",
    "마": "mat", "막": "mrk", "눅": "luk", "요": "jhn", "행": "act", "롬": "rom",
    "고전": "1co", "고후": "2co", "갈": "gal", "엡": "eph", "빌": "php", "골": "col",
    "살전": "1th", "살후": "2th", "딤전": "1ti", "딤후": "2ti", "딛": "tit", "몬": "phm",
    "히": "heb", "약": "jas", "벧전": "1pe", "벧후": "2pe", "요일": "1jn", "요이": "2jn", "요삼": "3jn",
    "유": "jud", "계": "rev",
}

FULL_NAMES = {
    "창": "창세기", "출": "출애굽기", "레": "레위기", "민": "민수기", "신": "신명기",
    "수": "여호수아", "삿": "사사기", "룻": "룻기", "삼상": "사무엘상", "삼하": "사무엘하",
    "왕상": "열왕기상", "왕하": "열왕기하", "대상": "역대상", "대하": "역대하",
    "스": "에스라", "느": "느헤미야", "에": "에스더", "욥": "욥기", "시": "시편", "잠": "잠언",
    "전": "전도서", "아": "아가", "사": "이사야", "렘": "예레미야", "애": "예레미야애가", "겔": "에스겔", "단": "다니엘",
    "호": "호세아", "욜": "요엘", "암": "아모스", "옵": "오바댜", "욘": "요나", "미": "미가", "나": "나훔",
    "합": "하박국", "습": "스바냐", "학": "학개", "슥": "스가랴", "말": "말라기",
    "마": "마태복음", "막": "마가복음", "눅": "누가복음", "요": "요한복음", "행": "사도행전", "롬": "로마서",
    "고전": "고린도전서", "고후": "고린도후서", "갈": "갈라디아서", "엡": "에베소서", "빌": "빌립보서", "골": "골로새서",
    "살전": "데살로니가전서", "살후": "데살로니가후서", "딤전": "디모데전서", "딤후": "디모데후서", "딛": "디도서", "몬": "빌레몬서",
    "히": "히브리서", "약": "야고보서", "벧전": "베드로전서", "벧후": "베드로후서", "요일": "요한일서", "요이": "요한이서", "요삼": "요한삼서",
    "유": "유다서", "계": "요한계시록",
}


def split_reference(ref: str):
    ref = str(ref).strip().replace(" ", "")
    keys = sorted(BOOK_CODES.keys(), key=len, reverse=True)
    for key in keys:
        if ref.startswith(key):
            rest = ref[len(key):]
            m = re.search(r"\d+", rest)
            if not m:
                return key, None
            return key, int(m.group())
    return None, None


def pretty_reference(ref: str) -> str:
    book, _ = split_reference(ref)
    if not book:
        return str(ref)
    return str(ref).replace(book, FULL_NAMES.get(book, book), 1)


def bsk_url(ref: str) -> str:
    book, chap = split_reference(ref)
    if not book or not chap:
        return "https://www.bskorea.or.kr/bible/korbibReadpage.php"
    params = urlencode({"book": BOOK_CODES[book], "chap": chap, "version": "GAE"})
    return f"https://www.bskorea.or.kr/bible/korbibReadpage.php?{params}"


@st.cache_data
def load_bible_readings():
    df = pd.read_csv("readings.csv", encoding="utf-8-sig")
    df.columns = [str(c).replace("\ufeff", "").strip().lower() for c in df.columns]
    rename_map = {
        "월": "month", "일": "day", "시편": "psalm", "구약": "old_testament", "신약": "new_testament",
        "old": "old_testament", "new": "new_testament", "ot": "old_testament", "nt": "new_testament",
    }
    df = df.rename(columns=rename_map)
    required = ["month", "day", "psalm", "old_testament", "new_testament"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"readings.csv 열 이름 확인 필요: {missing}")
    df["month"] = df["month"].astype(int)
    df["day"] = df["day"].astype(int)
    return df


def find_bible_reading(df: pd.DataFrame, selected: date):
    if selected.weekday() >= 5:
        return None
    lookup = selected - timedelta(days=1)
    row = df[(df["month"] == lookup.month) & (df["day"] == lookup.day)]
    if row.empty:
        return None
    return row.iloc[0]


def load_bible_done(selected: date):
    user_id = get_user_id()
    result = supabase.table("reading_checks").select("id,book_name,chapter_num,checked_at").eq("user_id", user_id).eq("reading_date", selected.isoformat()).execute()
    return result.data


def set_bible_done(selected: date, section_key: str, checked: bool):
    user_id = get_user_id()
    supabase.table("reading_checks").delete().eq("user_id", user_id).eq("reading_date", selected.isoformat()).eq("book_name", section_key).execute()
    if checked:
        supabase.table("reading_checks").insert({
            "user_id": user_id, "reading_date": selected.isoformat(),
            "book_name": section_key, "chapter_num": 0,
        }).execute()


def get_today_bible_count():
    today = today_kst()
    try:
        done = load_bible_done(today)
        return len(done)
    except Exception:
        return 0


def load_bible_done_year(year: int):
    user_id = get_user_id()
    start_date = date(year, 1, 1).isoformat()
    end_date = date(year, 12, 31).isoformat()
    result = supabase.table("reading_checks").select("reading_date,book_name").eq("user_id", user_id).gte("reading_date", start_date).lte("reading_date", end_date).execute()
    return result.data


def bible_done_count_for_date(done_map, d: date):
    sections = done_map.get(d.isoformat(), set())
    return len(sections & {"psalm", "old", "new"})


def bible_valid_dates_for_year(year: int):
    valid = set()
    d = date(year, 1, 1)
    end = date(year, 12, 31)
    while d <= end:
        if d.weekday() < 5:
            valid.add(d)
        d += timedelta(days=1)
    return valid


def get_bible_year_stats(year: int = None):
    if year is None:
        year = today_kst().year
    try:
        rows = load_bible_done_year(year)
    except Exception:
        return {"year": year, "read_items": 0, "total_items": 0, "progress_ratio": 0, "progress_pct": 0,
                "complete_days": 0, "partial_days": 0, "psalm_count": 0, "old_count": 0, "new_count": 0,
                "streak": 0, "expected_pct": 0}

    done_map = {}
    for row in rows:
        d = row.get("reading_date")
        section = row.get("book_name")
        if d and section:
            done_map.setdefault(str(d), set()).add(section)

    valid_dates = sorted(bible_valid_dates_for_year(year))
    today0 = today_kst()
    valid_until_today = [d for d in valid_dates if d <= today0]

    def count_for(d):
        return bible_done_count_for_date(done_map, d)

    read_items = sum(count_for(d) for d in valid_dates)
    total_items = len(valid_dates) * 3
    complete_days = sum(1 for d in valid_dates if count_for(d) == 3)
    partial_days = sum(1 for d in valid_dates if 0 < count_for(d) < 3)
    psalm_count = sum(1 for d in valid_dates if "psalm" in done_map.get(d.isoformat(), set()))
    old_count = sum(1 for d in valid_dates if "old" in done_map.get(d.isoformat(), set()))
    new_count = sum(1 for d in valid_dates if "new" in done_map.get(d.isoformat(), set()))

    streak = 0
    for d in reversed(valid_until_today):
        if count_for(d) == 3:
            streak += 1
        elif d.weekday() < 5:
            break

    progress_ratio = (read_items / total_items) if total_items else 0
    elapsed_items = len(valid_until_today) * 3
    current_pace = (read_items / elapsed_items) if elapsed_items else 0
    expected_pct = min(100, int(current_pace * 100)) if elapsed_items else 0

    return {"year": year, "read_items": read_items, "total_items": total_items, "progress_ratio": progress_ratio,
            "progress_pct": round(progress_ratio * 100, 1), "complete_days": complete_days, "partial_days": partial_days,
            "psalm_count": psalm_count, "old_count": old_count, "new_count": new_count, "streak": streak, "expected_pct": expected_pct}


def render_bible_stats_summary(location="home"):
    stats = get_bible_year_stats(today_kst().year)
    if location == "home":
        st.metric("📊 올해 성경 진행률", f"{stats['progress_pct']}%")
        st.metric("🔥 연속 읽기", f"{stats['streak']}일")
        return
    st.markdown("### 📊 올해 성경읽기 요약")
    c1, c2, c3 = st.columns(3)
    c1.metric("올해 진행률", f"{stats['progress_pct']}%")
    c2.metric("연속 읽기", f"{stats['streak']}일")
    c3.metric("연말 예상", f"{stats['expected_pct']}%")
    st.progress(stats["progress_ratio"])
    st.caption(f"완료 항목 {stats['read_items']} / {stats['total_items']}개 · 완료일 {stats['complete_days']}일 · 부분 완료 {stats['partial_days']}일")
    d1, d2, d3 = st.columns(3)
    d1.metric("시편", f"{stats['psalm_count']}회")
    d2.metric("구약", f"{stats['old_count']}회")
    d3.metric("신약", f"{stats['new_count']}회")


def render_bible_year_calendar(selected: date):
    st.markdown("### 📅 1년 달력 보기")
    try:
        rows = load_bible_done_year(selected.year)
    except Exception as e:
        st.error(f"연간 성경읽기 기록을 불러오지 못했습니다: {e}")
        return

    done_map = {}
    for row in rows:
        d = row.get("reading_date")
        section = row.get("book_name")
        if d and section:
            done_map.setdefault(str(d), set()).add(section)

    valid_dates = bible_valid_dates_for_year(selected.year)
    total_items = len(valid_dates) * 3
    read_items = sum(bible_done_count_for_date(done_map, d) for d in valid_dates)
    complete_days = sum(1 for d in valid_dates if bible_done_count_for_date(done_map, d) == 3)
    partial_days = sum(1 for d in valid_dates if 0 < bible_done_count_for_date(done_map, d) < 3)
    progress_ratio = (read_items / total_items) if total_items else 0

    c1, c2, c3 = st.columns(3)
    c1.metric("올해 진행률", f"{progress_ratio * 100:.1f}%")
    c2.metric("완료 항목", f"{read_items}/{total_items}")
    c3.metric("완료일", f"{complete_days}일")
    st.progress(progress_ratio)
    st.caption(f"🟩 완료 · 🟨 일부 완료({partial_days}일) · ⬜ 미완료 · 회색은 주말/통독표 제외")

    cal = calendar.Calendar(firstweekday=6)
    html = """<style>
    .year-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .month-box{border:1px solid #e5e7eb;border-radius:14px;padding:10px;background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,0.04)}
    .month-title{font-weight:800;margin-bottom:6px;text-align:center;color:#111827}
    .cal-table{width:100%;border-collapse:separate;border-spacing:3px;font-size:12px}
    .cal-table th{color:#6b7280;font-weight:700;padding:2px}
    .cal-table td{text-align:center;height:25px;border-radius:7px}
    .cal-table a{display:block;text-decoration:none;color:#111827;padding:4px 0;border-radius:7px}
    .none{background:#f3f4f6;color:#9ca3af}.empty{background:#ffffff}
    .notdone a{background:#f9fafb;border:1px solid #e5e7eb}
    .partial a{background:#fde68a;border:1px solid #f59e0b;font-weight:700}
    .done a{background:#86efac;border:1px solid #22c55e;font-weight:800}
    .today a{outline:2px solid #2563eb}.selected a{outline:2px solid #ef4444}
    @media(max-width:900px){.year-grid{grid-template-columns:repeat(1,1fr)}}
    </style><div class="year-grid">"""

    today0 = today_kst()
    for m in range(1, 13):
        html += f'<div class="month-box"><div class="month-title">{m}월</div>'
        html += '<table class="cal-table"><tr><th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th></tr>'
        for week in cal.monthdatescalendar(selected.year, m):
            html += "<tr>"
            for d in week:
                if d.month != m:
                    html += '<td class="empty"></td>'
                elif d not in valid_dates:
                    html += f'<td class="none">{d.day}</td>'
                else:
                    cnt = bible_done_count_for_date(done_map, d)
                    cls = "done" if cnt == 3 else ("partial" if cnt > 0 else "notdone")
                    if d == today0:
                        cls += " today"
                    if d == selected:
                        cls += " selected"
                    html += f'<td class="{cls}"><a href="?bible_selected={d.isoformat()}">{d.day}</a></td>'
            html += "</tr>"
        html += "</table></div>"
    html += "</div>"
    st.components.v1.html(html, height=1350, scrolling=True)


def render_bible_row(icon: str, label: str, ref: str, section_key: str, selected: date, done_keys: set):
    card = todo_card_container()
    with card:
        c1, c2, c3 = st.columns([1.1, 3.2, 1.2], vertical_alignment="center")
        with c1:
            st.markdown(f"**{icon} {label}**")
        with c2:
            st.markdown(f"### {pretty_reference(ref)}")
        with c3:
            st.link_button("📖 읽기", bsk_url(ref), use_container_width=True)
        checked = st.checkbox("읽음 완료", value=(section_key in done_keys), key=f"bible_{selected.isoformat()}_{section_key}")
        if checked != (section_key in done_keys):
            set_bible_done(selected, section_key, checked)
            st.rerun()


def render_bible_page(compact=False):
    st.markdown("## 📖 성경읽기")
    st.caption("성경 본문은 저장하지 않고 대한성서공회 성경플랫폼으로 연결합니다.")
    today = today_kst()

    try:
        q_selected = st.query_params.get("bible_selected")
        if isinstance(q_selected, list):
            q_selected = q_selected[0]
        if q_selected:
            parsed = date.fromisoformat(str(q_selected))
            if st.session_state.get("_last_bible_selected_query") != str(q_selected):
                st.session_state.bible_date = parsed
                st.session_state._last_bible_selected_query = str(q_selected)
    except Exception:
        pass

    if "bible_date" not in st.session_state:
        st.session_state.bible_date = today

    today_marker = today.isoformat()
    has_calendar_selected = bool(st.query_params.get("bible_selected"))
    if st.session_state.get("_bible_today_marker") != today_marker and not has_calendar_selected:
        st.session_state.bible_date = today
        st.session_state._bible_today_marker = today_marker

    # ✅ Fix #3: ‹ 날짜 › 오늘 4열 레이아웃
    c1, c2, c3, c4 = st.columns([1, 3, 1, 1])
    with c1:
        if st.button("‹", key=f"bible_prev_{compact}"):
            st.session_state.bible_date = st.session_state.bible_date - timedelta(days=1)
            st.rerun()
    with c2:
        selected = st.date_input("성경읽기 날짜", value=st.session_state.bible_date, key=f"bible_date_input_{compact}", label_visibility="collapsed")
        if selected != st.session_state.bible_date:
            st.session_state.bible_date = selected
            st.rerun()
    with c3:
        if st.button("›", key=f"bible_next_{compact}"):
            st.session_state.bible_date = st.session_state.bible_date + timedelta(days=1)
            st.rerun()
    with c4:
        if st.button("오늘", key=f"bible_today_{compact}"):
            st.session_state.bible_date = today
            try:
                if "bible_selected" in st.query_params:
                    del st.query_params["bible_selected"]
            except Exception:
                pass
            st.rerun()

    selected = st.session_state.bible_date
    st.markdown(f"### {selected.year}년 {selected.month}월 {selected.day}일 ({WEEKDAY_KR[selected.weekday()]})")

    try:
        df = load_bible_readings()
        reading = find_bible_reading(df, selected)
    except Exception as e:
        reading = None
        st.warning(f"readings.csv를 불러오지 못했습니다: {e}")
        st.link_button("📖 대한성서공회 성경 읽기", "https://www.bskorea.or.kr/bible/korbibReadpage.php", use_container_width=True)

    if selected.weekday() >= 5:
        st.info("이 통독표는 월~금 기준입니다. 월요일부터 금요일 날짜를 선택해 주세요.")
    elif reading is None:
        st.info("이 날짜의 통독표가 아직 없습니다.")
    else:
        done_rows = load_bible_done(selected)
        done_keys = {r.get("book_name") for r in done_rows}
        render_bible_row("🌿", "시편", reading["psalm"], "psalm", selected, done_keys)
        render_bible_row("📘", "구약", reading["old_testament"], "old", selected, done_keys)
        render_bible_row("✝️", "신약", reading["new_testament"], "new", selected, done_keys)
        done_count = len(done_keys & {"psalm", "old", "new"})
        st.progress(done_count / 3)
        if done_count == 3:
            st.success("오늘 성경읽기를 모두 완료했습니다. ✅")
        elif done_count > 0:
            st.warning(f"오늘 {done_count}/3개를 읽었습니다.")
        else:
            st.info("읽은 항목을 체크해 주세요.")

    st.divider()
    render_bible_stats_summary(location="bible")
    st.divider()
    with st.expander("📅 1년 달력 보기", expanded=False):
        render_bible_year_calendar(selected)
    st.divider()
    st.markdown("### 🙏 오늘의 다짐")
    st.info("하나님의 말씀을 읽고 묵상하는 하루가 되게 하소서.")
    st.caption("📖 성경 본문은 대한성서공회 성경플랫폼을 통해 제공됩니다. 본 웹앱은 성경 본문을 저장하거나 제공하지 않으며, 읽기 버튼을 통해 대한성서공회 성경플랫폼으로 연결됩니다. 성경 저작권 © 대한성서공회")


