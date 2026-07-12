(() => {
  // 2026-07-12 하루성경 탭
  //  - 원본: 성경-2026-07-02-분리보관.py (Streamlit) 의 성경읽기 기능을 순수 JS로 이식
  //  - 날짜별 통독표(시편/구약/신약) 표시 + 대한성서공회 성경플랫폼 '읽기' 링크
  //  - 개인별 읽음 체크(bible_reading_checks) + 올해 진행률/연속읽기 + 1년 달력
  //  - 노출 대상: 교사 이상(선생님·관리자). 달란트 연동 없음.
  //  - 날짜→본문 매핑은 원본과 동일: 주말은 통독표 없음, 조회는 (선택일 - 1일) 기준.
  if (typeof state === "undefined" || typeof layout !== "function" || typeof render !== "function") return;

  const BOOK_CODES = {
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
    "유": "jud", "계": "rev"
  };
  const FULL_NAMES = {
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
    "유": "유다서", "계": "요한계시록"
  };

  // 통독표: "월-일" -> [시편, 구약, 신약] (readings.csv 260행 내장)
  const BIBLE_READINGS = {
    "1-4": ["시1","창1-2","마1"],
    "1-5": ["시2","창3-4","마2"],
    "1-6": ["시3","창5-7","마3"],
    "1-7": ["시4","창8-10","마4"],
    "1-8": ["시5","창11-12","마5"],
    "1-11": ["시6","창13-15","마6"],
    "1-12": ["시7","창16-18","마7"],
    "1-13": ["시8","창19-21","마8"],
    "1-14": ["시9","창22-24","마9"],
    "1-15": ["시10","창25-26","마10"],
    "1-18": ["시11","창27-28","마11"],
    "1-19": ["시12","창29-30","마12"],
    "1-20": ["시13","창31-32","마13"],
    "1-21": ["시14","창33-35","마14"],
    "1-22": ["시15","창36-38","마15"],
    "1-26": ["시16","창39-41","마16"],
    "1-27": ["시17","창42-43","마17"],
    "1-28": ["시18:1-30","창44-46","마18"],
    "1-29": ["시18:31-50","창47-48","마19"],
    "1-30": ["시19","창49-50","마20"],
    "2-1": ["시20","출1-3","마21"],
    "2-2": ["시21","출4-6","마22"],
    "2-3": ["시22:1-21","출7-9","마23"],
    "2-4": ["시22:22-31","출10-12","마24"],
    "2-5": ["시23","출13-15","마25"],
    "2-8": ["시24","출16-18","마26"],
    "2-9": ["시25","출19-21","마27"],
    "2-10": ["시26","출22-25","마28"],
    "2-11": ["시27","출26-28","롬1"],
    "2-12": ["시28","출29-31","롬2"],
    "2-15": ["시29","출32-34","롬3"],
    "2-16": ["시30","출35-37","롬4"],
    "2-17": ["시31","출38-40","롬5"],
    "2-18": ["시32","레1-3","롬6"],
    "2-19": ["시33","레4-6","롬7"],
    "2-22": ["시34","레7-8","롬8"],
    "2-23": ["시35:1-18","레9-11","롬9"],
    "2-24": ["시35:19-28","레12-14","롬10"],
    "2-25": ["시36","출15-17","롬11"],
    "2-26": ["시37:1-22","출18-20","롬12"],
    "3-1": ["시37:23-40","출21-23","롬13"],
    "3-2": ["시38","출24-25","롬14"],
    "3-3": ["시39","출26-27","롬15"],
    "3-4": ["시40","민1-3","롬16"],
    "3-5": ["시41","민4-6","고전1"],
    "3-8": ["욥1","민7-8","고전2"],
    "3-9": ["욥2","민9-11","고전3"],
    "3-10": ["욥3","민12-14","고전4"],
    "3-11": ["욥4","민15-17","고전5"],
    "3-12": ["욥5","민18-20","고전6"],
    "3-15": ["욥6","민21-23","고전7"],
    "3-16": ["욥7","민24-26","고전8"],
    "3-17": ["욥8","민27-29","고전9"],
    "3-18": ["욥9","민30-32","고전10"],
    "3-19": ["욥10","민33-36","고전11"],
    "3-22": ["욥11","신1-2","고전12"],
    "3-23": ["욥12","신3-4","고전13"],
    "3-24": ["욥13","신5-7","고전14"],
    "3-25": ["욥14","신8-10","고전15"],
    "3-26": ["욥15","신11-13","고전16"],
    "3-29": ["욥16","신14-16","고후1"],
    "3-30": ["욥17","신17-19","고후2"],
    "3-31": ["욥18","신20-22","고후3"],
    "4-1": ["욥19","신23-25","고후4"],
    "4-2": ["욥20","신26-28","고후5"],
    "4-5": ["욥21","신29-30","고후6"],
    "4-6": ["욥22","신31-32","고후7"],
    "4-7": ["욥23","신33-34","고후8"],
    "4-8": ["욥24","수1-3","고후9"],
    "4-9": ["욥25","수4-6","고후10"],
    "4-12": ["욥26","수7-9","고후11"],
    "4-13": ["욥27","수10-11","고후12"],
    "4-14": ["욥28","수12-14","고후13"],
    "4-15": ["욥29","수15-17","막1"],
    "4-16": ["욥30","수18-20","막2"],
    "4-19": ["욥31","수21-22","막3"],
    "4-20": ["욥32","수23-24","막4"],
    "4-21": ["욥33","삿1-2","막5"],
    "4-22": ["욥34","삿3-5","막6"],
    "4-23": ["욥35","삿6-7","막7"],
    "4-26": ["욥36","삿8-9","막8"],
    "4-27": ["욥37","삿10-12","막9"],
    "4-28": ["욥38","삿13-15","막10"],
    "4-29": ["욥39","삿16-18","막11"],
    "4-30": ["욥40","삿19-21","막12"],
    "5-3": ["욥41","룻1-4","막13"],
    "5-4": ["욥42","삼상1-2","막14"],
    "5-5": ["시42","삼상3-5","막15"],
    "5-6": ["시43","삼상6-8","막16"],
    "5-7": ["시44:1-8","삼상9-11","갈1"],
    "5-10": ["시44:9-26","삼상12-14","갈2"],
    "5-11": ["시45","삼상15-16","갈3"],
    "5-12": ["시46","삼상17-18","갈4"],
    "5-13": ["시47","삼상19-21","갈5"],
    "5-14": ["시48","삼상22-24","갈6"],
    "5-17": ["시49","삼상25-27","엡1"],
    "5-18": ["시50","삼상28-31","엡2"],
    "5-19": ["시51","삼하1-2","엡3"],
    "5-20": ["시52","삼하3-5","엡4"],
    "5-21": ["시53","삼하6-8","엡5"],
    "5-24": ["시54","삼하9-11","엡6"],
    "5-25": ["시55","삼하12-13","빌1"],
    "5-26": ["시56","삼하14-15","빌2"],
    "5-27": ["시57","삼하16-17","빌3"],
    "5-28": ["시58","삼하17-19","빌4"],
    "5-31": ["시59","삼하20-22","골1"],
    "6-1": ["시60","삼하23-24","골2"],
    "6-2": ["시61","왕상1-2","골3"],
    "6-3": ["시62","왕상3-5","골4"],
    "6-4": ["시63","왕상6-7","살전1"],
    "6-7": ["시64","왕상8-9","살전2"],
    "6-8": ["시65","왕상10-11","살전3"],
    "6-9": ["시66","왕상12-13","살전4"],
    "6-10": ["시67","왕상14-16","살전5"],
    "6-11": ["시68","왕상17-19","살후1"],
    "6-14": ["시69:1-18","왕상18-19","살후2"],
    "6-15": ["시69:19-36","왕상20-22","살후3"],
    "6-16": ["시70","왕하1-2","딤전1"],
    "6-17": ["시71","왕하3-4","딤전2"],
    "6-18": ["시72","왕하5-7","딤전3"],
    "6-21": ["잠1","왕하8-9","딤전4"],
    "6-22": ["잠2","왕하10-12","딤전5"],
    "6-23": ["잠3","왕하13-15","딤전6"],
    "6-24": ["잠4","왕하16-17","딤후1"],
    "6-25": ["잠5","왕하18-19","딤후2"],
    "6-28": ["잠6","왕하20-22","딤후3"],
    "6-29": ["잠7","왕하23-25","딤후4"],
    "6-30": ["잠8","대상1-3","딛1"],
    "7-1": ["잠9","대상4-6","딛2"],
    "7-2": ["잠10","대상7-9","딛3"],
    "7-5": ["잠11","대상10-12","눅1"],
    "7-6": ["잠12","대상13-15","눅2"],
    "7-7": ["잠13","대상16-18","눅3"],
    "7-8": ["잠14","대상19-21","눅4"],
    "7-9": ["잠15","대상22-24","눅5"],
    "7-12": ["잠16","대상25-27","눅6"],
    "7-13": ["잠17","대상28-29","눅7"],
    "7-14": ["잠18","대하1-3","눅8"],
    "7-15": ["잠19","대하4-6","눅9"],
    "7-16": ["잠20","대하7-9","눅10"],
    "7-19": ["잠21","대하10-12","눅11"],
    "7-20": ["잠22","대하13-15","눅12"],
    "7-21": ["잠23","대하16-18","눅13"],
    "7-22": ["잠24","대하19-20","눅14"],
    "7-23": ["잠25","대하21-23","눅15"],
    "7-26": ["잠26","대하24-25","눅16"],
    "7-27": ["잠27","대하26-28","눅17"],
    "7-28": ["잠28","대하29-30","눅18"],
    "7-29": ["잠29","대하31-33","눅19"],
    "7-30": ["잠30","대하34-36","눅20"],
    "8-2": ["잠31","스1","눅21"],
    "8-3": ["시73","스2","눅22"],
    "8-4": ["시74","스3","눅23"],
    "8-5": ["시75","스4","눅24"],
    "8-6": ["시76","스5","행1"],
    "8-9": ["시77","스6","행2"],
    "8-10": ["시78:1-39","스7","행3"],
    "8-11": ["시78:40-72","스8","행4"],
    "8-12": ["시79","스9","행5"],
    "8-13": ["시80","스10","행6"],
    "8-16": ["시81","느1-3","행7"],
    "8-17": ["시82","느4-7","행8"],
    "8-18": ["시83","느8-11","행9"],
    "8-19": ["시84","느12-13","행10"],
    "8-20": ["시85","에1-3","행11"],
    "8-23": ["시86","에4-6","행12"],
    "8-24": ["시87","에7-10","행13"],
    "8-25": ["시88","사1-3","행14"],
    "8-26": ["시89:1-18","사4-6","행15"],
    "8-27": ["시89:19-52","사7-9","행16"],
    "8-30": ["전1","사10-12","행17"],
    "8-31": ["전2","사13-16","행18"],
    "9-1": ["전3","사17-21","행19"],
    "9-2": ["전4","사22-24","행20"],
    "9-3": ["전5","사25-28","행21"],
    "9-6": ["전6","사29-31","행22"],
    "9-7": ["전7","사32-34","행23"],
    "9-8": ["전8","사35-37","행24"],
    "9-9": ["전9","사38-40","행25"],
    "9-10": ["전10","사41-43","행26"],
    "9-13": ["전11","사44-45","행27"],
    "9-14": ["전12","사46-48","행28"],
    "9-15": ["시90","사49-51","히1"],
    "9-16": ["시91","사52-54","히2"],
    "9-17": ["시92","사55-57","히3"],
    "9-20": ["시93","사58-60","히4"],
    "9-21": ["시94","사61-63","히5"],
    "9-22": ["시95","사64-66","히6"],
    "9-23": ["시96","렘1-2","히7"],
    "9-24": ["시97","렘3-4","히8"],
    "9-27": ["시98","렘5-6","히9"],
    "9-28": ["시99","렘7-8","히10"],
    "9-29": ["시100","렘9-10","히11"],
    "9-30": ["시101","렘11-13","히12"],
    "10-1": ["시102","렘14-16","히13"],
    "10-4": ["시103","렘17-19","약1"],
    "10-5": ["시104","렘20-22","약2"],
    "10-6": ["시105","렘23-24","약3"],
    "10-7": ["시106","렘25-26","약4"],
    "10-8": ["아1","렘27-28","약5"],
    "10-11": ["아2","렘29-30","요1"],
    "10-12": ["아3","렘31-32","요2"],
    "10-13": ["아4","렘33-34","요3"],
    "10-14": ["아5","렘35-36","요4"],
    "10-15": ["아6","렘37-38","요5"],
    "10-18": ["아7","렘39-41","요5"],
    "10-19": ["아8","렘42-45","요6"],
    "10-20": ["시107","렘46-48","요7"],
    "10-21": ["시108","렘49-50","요8"],
    "10-22": ["시109","렘51-52","요9"],
    "10-25": ["시110","애1-2","요10"],
    "10-26": ["시111","애3-5","요11"],
    "10-27": ["시112","겔1-3","요12"],
    "10-28": ["시113","겔4-6","요13"],
    "10-29": ["시114","겔7-9","요14"],
    "11-1": ["시115","겔10-12","요15"],
    "11-2": ["시116","겔13-15","요16"],
    "11-3": ["시117","겔16-17","요17"],
    "11-4": ["시118","겔18-19","요18"],
    "11-5": ["시119:1-16","겔20-21","요19"],
    "11-8": ["시119:17-32","겔22-23","요20"],
    "11-9": ["시119:33-48","겔24-26","요21"],
    "11-10": ["시119:49-64","겔27-28","벧전1"],
    "11-11": ["시119:65-80","겔29-31","벧전2"],
    "11-12": ["시119:81-96","겔32-33","벧전3"],
    "11-15": ["시119:97-112","겔34-35","벧전4"],
    "11-16": ["시119:113-128","겔36-37","벧전5"],
    "11-17": ["시119:129-144","겔38-39","벧후1"],
    "11-18": ["시119:145-160","겔40-42","벧후2"],
    "11-19": ["시119:161-176","겔43-44","벧후3"],
    "11-22": ["시120","겔45-46","요일1"],
    "11-23": ["시121","겔47-48","요일2"],
    "11-24": ["시122","단1-2","요일3"],
    "11-25": ["시123","단3-4","요일4"],
    "11-26": ["시124","단5-6","요일5"],
    "11-29": ["시125","단7-8","요이1"],
    "11-30": ["시126","단9-10","요삼1"],
    "12-1": ["시127","단11-12","유1"],
    "12-2": ["시128","호1-4","계1"],
    "12-3": ["시129","호5-9","계2"],
    "12-6": ["시130","호10-14","계3"],
    "12-7": ["시131","욜1-3","계4"],
    "12-8": ["시132","암1-2","계5"],
    "12-9": ["시133-134","암3-4","계6"],
    "12-10": ["시135","암5-6","계7"],
    "12-13": ["시136","암7-8","계8"],
    "12-14": ["시137","암9/옵1","계9"],
    "12-15": ["시138","욘1-4","계10"],
    "12-16": ["시139","미1-4","계11"],
    "12-17": ["시140","미5-7","계12"],
    "12-20": ["시141","나1-3","계13"],
    "12-21": ["시142","합1-3","계14"],
    "12-22": ["시143","습1-3","계15"],
    "12-23": ["시144","학1-2","계16"],
    "12-24": ["시145","슥1-3","계17"],
    "12-27": ["시146","슥4-6","계18"],
    "12-28": ["시147","슥7-9","계19"],
    "12-29": ["시148","슥10-12","계20"],
    "12-30": ["시149","슥13-14","계21"],
    "12-31": ["시150","말1-4","계22"]
  };

  const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];
  const BSK_HOME = "https://www.bskorea.or.kr/bible/korbibReadpage.php";

  function isDailyBibleStaff() {
    return typeof isStaff === "function" && isStaff();
  }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function todaySeoulISO() {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .reduce((acc, part) => { acc[part.type] = part.value; return acc; }, {});
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  function isoParts(iso) { const [y, m, d] = String(iso).split("-").map(Number); return { y, m, d }; }
  function isoToDate(iso) { const { y, m, d } = isoParts(iso); return new Date(y, m - 1, d); }
  function dateToISO(dt) { return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`; }
  function addDaysISO(iso, n) { const dt = isoToDate(iso); dt.setDate(dt.getDate() + n); return dateToISO(dt); }
  function weekdayOfISO(iso) { return isoToDate(iso).getDay(); }

  function splitReference(ref) {
    const clean = String(ref || "").trim().replace(/\s/g, "");
    const keys = Object.keys(BOOK_CODES).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      if (clean.startsWith(key)) {
        const rest = clean.slice(key.length);
        const match = rest.match(/\d+/);
        if (!match) return [key, null];
        return [key, parseInt(match[0], 10)];
      }
    }
    return [null, null];
  }
  function prettyReference(ref) {
    const [book] = splitReference(ref);
    if (!book) return String(ref);
    return String(ref).replace(book, FULL_NAMES[book] || book);
  }
  function bskUrl(ref) {
    const [book, chap] = splitReference(ref);
    if (!book || !chap) return BSK_HOME;
    const params = new URLSearchParams({ book: BOOK_CODES[book], chap: String(chap), version: "GAE" });
    return `${BSK_HOME}?${params.toString()}`;
  }
  function findReadingForDate(iso) {
    const wd = weekdayOfISO(iso);
    if (wd === 0 || wd === 6) return null; // 주말 통독표 없음(원본 동일)
    const prev = isoParts(addDaysISO(iso, -1)); // 원본: (선택일 - 1일) 기준 조회
    return BIBLE_READINGS[`${prev.m}-${prev.d}`] || null;
  }

  state.dailyBibleDate = state.dailyBibleDate || todaySeoulISO();
  state.bibleReadingChecks = state.bibleReadingChecks || [];

  function buildDoneMap() {
    const map = {};
    (state.bibleReadingChecks || []).forEach((row) => {
      if (!row || !row.reading_date || !row.section) return;
      (map[row.reading_date] = map[row.reading_date] || new Set()).add(row.section);
    });
    return map;
  }
  function checksForDate(iso) {
    const set = new Set();
    (state.bibleReadingChecks || []).forEach((row) => { if (row.reading_date === iso) set.add(row.section); });
    return set;
  }
  function doneCountFromSet(set) {
    if (!set) return 0;
    return ["psalm", "old", "new"].reduce((sum, key) => sum + (set.has(key) ? 1 : 0), 0);
  }
  function validWeekdaysOfYear(year) {
    const list = [];
    const dt = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    while (dt <= end) {
      const wd = dt.getDay();
      if (wd >= 1 && wd <= 5) list.push(dateToISO(dt));
      dt.setDate(dt.getDate() + 1);
    }
    return list;
  }
  function computeStats(year) {
    const doneMap = buildDoneMap();
    const valid = validWeekdaysOfYear(year);
    const todayISO = todaySeoulISO();
    let read = 0, completeDays = 0;
    valid.forEach((iso) => {
      const c = doneCountFromSet(doneMap[iso]);
      read += c;
      if (c === 3) completeDays += 1;
    });
    const total = valid.length * 3;
    let streak = 0;
    const upToToday = valid.filter((iso) => iso <= todayISO);
    for (let i = upToToday.length - 1; i >= 0; i -= 1) {
      if (doneCountFromSet(doneMap[upToToday[i]]) === 3) streak += 1;
      else break;
    }
    const pct = total ? Math.round((read / total) * 1000) / 10 : 0;
    return { read, total, completeDays, streak, pct };
  }

  async function loadYearChecks() {
    if (!state.client || !state.session || !isDailyBibleStaff()) { state.bibleReadingChecks = []; return; }
    try {
      const year = Number(todaySeoulISO().slice(0, 4));
      const result = await state.client
        .from("bible_reading_checks")
        .select("reading_date,section")
        .eq("user_id", state.session.user.id)
        .gte("reading_date", `${year}-01-01`)
        .lte("reading_date", `${year}-12-31`);
      state.bibleReadingChecks = result.data || [];
    } catch {
      state.bibleReadingChecks = [];
    }
  }
  async function setReadingCheck(iso, section, checked) {
    const uid = state.session?.user?.id;
    if (!uid || !state.client) return;
    try {
      await state.client.from("bible_reading_checks").delete()
        .eq("user_id", uid).eq("reading_date", iso).eq("section", section);
      if (checked) {
        const { error } = await state.client.from("bible_reading_checks")
          .insert({ user_id: uid, reading_date: iso, section });
        if (error) { setMessage(error.message); }
      }
    } catch (error) {
      setMessage(error.message || "읽음 상태를 저장하지 못했습니다.");
    }
    await loadYearChecks();
    render();
  }

  function buildCalendarHtml(year, selectedISO) {
    const doneMap = buildDoneMap();
    const todayISO = todaySeoulISO();
    let html = `<div class="db-year-grid">`;
    for (let m = 1; m <= 12; m += 1) {
      html += `<div class="db-month-box"><div class="db-month-title">${m}월</div><table class="db-cal"><tr><th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th></tr>`;
      const startPad = new Date(year, m - 1, 1).getDay();
      const daysIn = new Date(year, m, 0).getDate();
      const cells = [];
      for (let i = 0; i < startPad; i += 1) cells.push(null);
      for (let d = 1; d <= daysIn; d += 1) cells.push(d);
      while (cells.length % 7 !== 0) cells.push(null);
      for (let w = 0; w < cells.length; w += 7) {
        html += "<tr>";
        for (let i = 0; i < 7; i += 1) {
          const d = cells[w + i];
          if (!d) { html += `<td class="db-empty"></td>`; continue; }
          const iso = `${year}-${pad2(m)}-${pad2(d)}`;
          const wd = new Date(year, m - 1, d).getDay();
          if (wd === 0 || wd === 6) { html += `<td class="db-none">${d}</td>`; continue; }
          const cnt = doneCountFromSet(doneMap[iso]);
          let cls = cnt === 3 ? "db-done" : (cnt > 0 ? "db-partial" : "db-notdone");
          if (iso === todayISO) cls += " db-today";
          if (iso === selectedISO) cls += " db-selected";
          html += `<td class="${cls}"><a href="#" data-db-date="${iso}">${d}</a></td>`;
        }
        html += "</tr>";
      }
      html += "</table></div>";
    }
    html += "</div>";
    return html;
  }

  function dailyBibleView() {
    const iso = state.dailyBibleDate || todaySeoulISO();
    const { y, m, d } = isoParts(iso);
    const wd = weekdayOfISO(iso);
    const reading = findReadingForDate(iso);
    const done = checksForDate(iso);
    const stats = computeStats(y);
    const sections = [["🌿", "시편", "psalm", 0], ["📘", "구약", "old", 1], ["✝️", "신약", "new", 2]];

    let rowsHtml = "";
    if (wd === 0 || wd === 6) {
      rowsHtml = `<p class="empty">이 통독표는 월~금 기준입니다. 월요일부터 금요일 날짜를 선택해 주세요.</p><a class="secondary-button" href="${BSK_HOME}" target="_blank" rel="noopener">📖 대한성서공회 성경 읽기</a>`;
    } else if (!reading) {
      rowsHtml = `<p class="empty">이 날짜의 통독표가 아직 없습니다.</p><a class="secondary-button" href="${BSK_HOME}" target="_blank" rel="noopener">📖 대한성서공회 성경 읽기</a>`;
    } else {
      rowsHtml = sections.map(([icon, label, key, idx]) => {
        const ref = reading[idx];
        const checked = done.has(key) ? "checked" : "";
        return `<div class="feed-item db-row"><span class="db-ref"><b>${icon} ${label}</b> · ${escapeHtml(prettyReference(ref))}</span><div class="feed-actions"><a class="secondary-button" href="${escapeHtml(bskUrl(ref))}" target="_blank" rel="noopener">📖 읽기</a><label class="db-check-label"><input type="checkbox" data-db-check="${key}" ${checked} /> 읽음</label></div></div>`;
      }).join("");
      const cnt = doneCountFromSet(done);
      const msg = cnt === 3 ? "오늘 성경읽기를 모두 완료했습니다. ✅" : (cnt > 0 ? `오늘 ${cnt}/3개를 읽었습니다.` : "읽은 항목을 체크해 주세요.");
      rowsHtml += `<div class="db-progress"><div class="db-progress-bar" style="width:${Math.round((cnt / 3) * 100)}%"></div></div><p class="empty">${msg}</p>`;
    }

    return `<section class="stack">`
      + `<div class="section-heading"><h2>📖 하루성경</h2><span>대한성서공회 연결</span></div>`
      + `<div class="form-panel compact">`
      + `<div class="db-datenav"><button class="secondary-button" type="button" data-db-prev>‹</button><input class="db-date-input" type="date" data-db-date-input value="${iso}" /><button class="secondary-button" type="button" data-db-next>›</button><button class="secondary-button" type="button" data-db-today>오늘</button></div>`
      + `<h3>${y}년 ${m}월 ${d}일 (${WEEKDAY_KR[wd]})</h3>`
      + rowsHtml
      + `</div>`
      + `<div class="form-panel compact"><div class="section-heading"><h2>📊 올해 성경읽기</h2><span>${y}년</span></div>`
      + `<div class="metric-grid"><div class="metric"><span>올해 진행률</span><strong>${stats.pct}%</strong></div><div class="metric"><span>완료 항목</span><strong>${stats.read}/${stats.total}</strong></div><div class="metric"><span>완료일</span><strong>${stats.completeDays}일</strong></div><div class="metric"><span>연속 읽기</span><strong>${stats.streak}일</strong></div></div>`
      + `<details class="db-calendar-details"><summary>📅 1년 달력 보기</summary>${buildCalendarHtml(y, iso)}</details>`
      + `</div>`
      + `<p class="empty db-copyright">📖 성경 본문은 대한성서공회 성경플랫폼을 통해 제공됩니다. 본 웹앱은 성경 본문을 저장하거나 제공하지 않으며, 읽기 버튼으로 대한성서공회 성경플랫폼에 연결됩니다. 성경 저작권 © 대한성서공회</p>`
      + `</section>`;
  }

  function bindDailyBibleEvents(root) {
    root.querySelector("[data-db-prev]")?.addEventListener("click", () => { state.dailyBibleDate = addDaysISO(state.dailyBibleDate, -1); render(); });
    root.querySelector("[data-db-next]")?.addEventListener("click", () => { state.dailyBibleDate = addDaysISO(state.dailyBibleDate, 1); render(); });
    root.querySelector("[data-db-today]")?.addEventListener("click", () => { state.dailyBibleDate = todaySeoulISO(); render(); });
    root.querySelector("[data-db-date-input]")?.addEventListener("change", (event) => { if (event.target.value) { state.dailyBibleDate = event.target.value; render(); } });
    root.querySelectorAll("[data-db-check]").forEach((cb) => cb.addEventListener("change", () => setReadingCheck(state.dailyBibleDate, cb.getAttribute("data-db-check"), cb.checked)));
    root.querySelectorAll("[data-db-date]").forEach((a) => a.addEventListener("click", (event) => { event.preventDefault(); state.dailyBibleDate = a.getAttribute("data-db-date"); render(); }));
  }

  // 스타일 1회 주입
  if (!document.getElementById("daily-bible-style")) {
    const styleEl = document.createElement("style");
    styleEl.id = "daily-bible-style";
    styleEl.textContent = [
      ".db-datenav{display:flex;align-items:center;gap:6px;margin-bottom:10px;}",
      ".db-datenav .db-date-input{flex:1;min-width:0;padding:8px;border:1px solid #d9d4c7;border-radius:8px;font-size:15px;background:#fff;}",
      ".db-datenav button{flex:0 0 auto;min-width:40px;}",
      ".db-row{flex-wrap:wrap;gap:8px;}",
      ".db-ref{display:block;}",
      ".db-row .feed-actions{display:flex;align-items:center;gap:12px;}",
      ".db-check-label{font-size:14px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;}",
      ".db-progress{height:8px;background:rgba(47,111,99,0.15);border-radius:6px;overflow:hidden;margin:10px 0 4px;}",
      ".db-progress-bar{height:100%;background:linear-gradient(90deg,#2f6f63,#4a9c8c);border-radius:6px;transition:width .3s ease;}",
      ".db-copyright{font-size:12px;line-height:1.5;}",
      ".db-calendar-details{margin-top:10px;}",
      ".db-calendar-details summary{cursor:pointer;font-weight:600;padding:6px 0;}",
      ".db-year-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:8px;}",
      ".db-month-box{border:1px solid #e5e7eb;border-radius:12px;padding:8px;background:#fff;}",
      ".db-month-title{font-weight:800;text-align:center;margin-bottom:4px;color:#111827;font-size:13px;}",
      ".db-cal{width:100%;border-collapse:separate;border-spacing:2px;font-size:11px;}",
      ".db-cal th{color:#6b7280;font-weight:700;padding:1px;}",
      ".db-cal td{text-align:center;height:20px;border-radius:5px;}",
      ".db-cal a{display:block;text-decoration:none;color:#111827;padding:3px 0;border-radius:5px;}",
      ".db-none{background:#f3f4f6;color:#9ca3af;}",
      ".db-empty{background:transparent;}",
      ".db-notdone a{background:#f9fafb;border:1px solid #e5e7eb;}",
      ".db-partial a{background:#fde68a;border:1px solid #f59e0b;font-weight:700;}",
      ".db-done a{background:#86efac;border:1px solid #22c55e;font-weight:800;}",
      ".db-today a{outline:2px solid #2563eb;}",
      ".db-selected a{outline:2px solid #ef4444;}",
      "@media(min-width:700px){.db-year-grid{grid-template-columns:repeat(3,1fr);}}"
    ].join("\n");
    document.head.appendChild(styleEl);
  }

  // 하단 네비에 '하루성경' 탭 추가 (교사 이상)
  const previousLayoutForDaily = layout;
  layout = function dailyBibleLayout(content) {
    let html = previousLayoutForDaily(content);
    if (isDailyBibleStaff()) {
      const anchor = `data-view="bible">학습</button>`;
      if (html.includes(anchor)) {
        const active = state.view === "dailybible" ? "active" : "";
        html = html.replace(anchor, `${anchor}<button type="button" class="${active}" data-view="dailybible">하루성경</button>`);
      }
    }
    return html;
  };

  // setView 가 'dailybible'을 허용 (화이트리스트 통과)
  const previousSetViewForDaily = setView;
  setView = function dailyBibleSetView(view) {
    if (view === "dailybible") {
      if (isDailyBibleStaff()) { state.view = "dailybible"; state.message = ""; render(); return; }
      state.view = "home"; state.message = "이 탭은 선생님·관리자만 사용할 수 있습니다."; render(); return;
    }
    return previousSetViewForDaily(view);
  };

  // render 래핑 (talent-deduct-patch와 동일한 패턴)
  const previousRenderForDaily = render;
  render = function dailyBibleRender() {
    if (state.view === "dailybible") {
      if (typeof isConfigured === "function" && isConfigured() && !state.session) { state.view = "login"; return previousRenderForDaily(); }
      if (!isDailyBibleStaff()) { state.view = state.session ? "home" : "login"; return previousRenderForDaily(); }
      const root = document.getElementById("root");
      root.innerHTML = layout(dailyBibleView());
      bindEvents(root);
      bindDailyBibleEvents(root);
      return;
    }
    return previousRenderForDaily();
  };

  // 로그인 사용자별 올해 읽음기록 로딩
  const previousLoadRemoteDataForDaily = loadRemoteData;
  loadRemoteData = async function dailyBibleLoadRemoteData() {
    await previousLoadRemoteDataForDaily();
    await loadYearChecks();
  };

  const previousClearRemoteStateForDaily = clearRemoteState;
  clearRemoteState = function dailyBibleClearRemoteState() {
    previousClearRemoteStateForDaily();
    state.bibleReadingChecks = [];
    state.dailyBibleDate = todaySeoulISO();
  };
})();
