import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { isSupabaseConfigured, saveLocalSupabaseConfig, supabase } from "./supabase.js";
import "./styles.css";

const reasons = ["출석", "성경암송", "예배태도", "친구도움", "과제완료", "찬양참여", "특별칭찬", "기타"];
const quickAmounts = [1, 2, 5, 10];

const sampleStudents = [
  { id: "sample-1", name: "김하은", grade: "초2", group_name: "믿음반", total_talents: 18, is_active: true },
  { id: "sample-2", name: "박준서", grade: "초4", group_name: "소망반", total_talents: 27, is_active: true },
  { id: "sample-3", name: "이서윤", grade: "초1", group_name: "사랑반", total_talents: 12, is_active: true }
];

const sampleTransactions = [
  { id: "tx-1", student_id: "sample-2", teacher_id: "teacher", amount: 5, reason: "성경암송", memo: "요절을 또렷하게 암송함", created_at: new Date().toISOString(), students: { name: "박준서" }, users: { name: "정선생" } },
  { id: "tx-2", student_id: "sample-1", teacher_id: "teacher", amount: 2, reason: "찬양참여", memo: "율동 참여가 적극적이었음", created_at: new Date().toISOString(), students: { name: "김하은" }, users: { name: "정선생" } }
];

const sampleNotes = [
  { id: "note-1", student_id: "sample-3", teacher_id: "teacher", note: "예배 집중도가 좋아지고 있음", created_at: new Date().toISOString(), students: { name: "이서윤" }, users: { name: "정선생" } },
  { id: "note-2", student_id: "sample-1", teacher_id: "teacher", note: "친구를 먼저 도와주는 모습이 보였음", created_at: new Date().toISOString(), students: { name: "김하은" }, users: { name: "정선생" } }
];

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("home");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [students, setStudents] = useState(sampleStudents);
  const [transactions, setTransactions] = useState(sampleTransactions);
  const [notes, setNotes] = useState(sampleNotes);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedStudent = students.find((student) => student.id === selectedStudentId) || students[0];
  const role = profile?.role || "teacher";
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id, data.session.user.email);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) loadProfile(nextSession.user.id, nextSession.user.email);
      if (!nextSession) setProfile(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadDashboardData();
  }, [session]);

  async function loadProfile(userId, email) {
    if (!supabase) return;
    const { data } = await supabase.from("users").select("id,name,email,role").eq("id", userId).maybeSingle();
    setProfile(data || { id: userId, name: "선생님", email, role: "teacher" });
  }

  async function loadDashboardData() {
    if (!supabase) return;
    setLoading(true);

    const [studentResult, transactionResult, noteResult] = await Promise.all([
      supabase.from("students").select("*").eq("is_active", true).order("name"),
      supabase.from("talent_transactions").select("*, students(name), users(name)").order("created_at", { ascending: false }).limit(50),
      supabase.from("student_notes").select("*, students(name), users(name)").order("created_at", { ascending: false }).limit(50)
    ]);

    if (studentResult.data) setStudents(studentResult.data);
    if (transactionResult.data) setTransactions(transactionResult.data);
    if (noteResult.data) setNotes(noteResult.data);
    setLoading(false);
  }

  async function signIn(email, password) {
    setMessage("");
    if (!supabase) {
      setMessage("Supabase URL과 anon key를 먼저 입력해주세요.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setView("home");
  }

  async function awardTalent(payload) {
    const targetStudent = students.find((student) => student.id === payload.studentId);
    const nextTotal = (targetStudent?.total_talents || 0) + Number(payload.amount);
    const newTransaction = {
      id: crypto.randomUUID(),
      student_id: payload.studentId,
      teacher_id: profile?.id || "teacher",
      amount: Number(payload.amount),
      reason: payload.reason,
      memo: payload.memo,
      created_at: new Date().toISOString(),
      students: { name: targetStudent?.name || "아이" },
      users: { name: profile?.name || "선생님" }
    };

    if (supabase && session) {
      const { error } = await supabase.from("talent_transactions").insert({
        student_id: payload.studentId,
        teacher_id: profile.id,
        amount: Number(payload.amount),
        reason: payload.reason,
        memo: payload.memo
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      await loadDashboardData();
    } else {
      setStudents((items) => items.map((student) => (
        student.id === payload.studentId ? { ...student, total_talents: nextTotal } : student
      )));
      setTransactions((items) => [newTransaction, ...items]);
    }

    setMessage(`${newTransaction.students.name}에게 ${payload.amount} 달란트를 지급했습니다.`);
    setSelectedStudentId(payload.studentId);
    setView("student");
  }

  async function addNote(payload) {
    const newNote = {
      id: crypto.randomUUID(),
      student_id: payload.studentId,
      teacher_id: profile?.id || "teacher",
      note: payload.note,
      created_at: new Date().toISOString(),
      students: { name: students.find((student) => student.id === payload.studentId)?.name },
      users: { name: profile?.name || "선생님" }
    };

    if (supabase && session) {
      const { error } = await supabase.from("student_notes").insert({
        student_id: payload.studentId,
        teacher_id: profile.id,
        note: payload.note
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      await loadDashboardData();
    } else {
      setNotes((items) => [newNote, ...items]);
    }

    setMessage("메모를 저장했습니다.");
    setSelectedStudentId(payload.studentId);
    setView("student");
  }

  async function createStudent(payload) {
    if (supabase && session) {
      const { error } = await supabase.from("students").insert(payload);
      if (error) {
        setMessage(error.message);
        return;
      }
      await loadDashboardData();
    } else {
      setStudents((items) => [{ id: crypto.randomUUID(), total_talents: 0, is_active: true, ...payload }, ...items]);
    }
    setMessage("아이를 등록했습니다.");
  }

  const todayTotal = useMemo(() => {
    const today = new Date().toDateString();
    return transactions
      .filter((item) => new Date(item.created_at).toDateString() === today)
      .reduce((sum, item) => sum + Number(item.amount), 0);
  }, [transactions]);

  if (!session && isSupabaseConfigured) {
    return <LoginScreen message={message} onLogin={signIn} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">달란트 성경학교</p>
          <h1>아이들의 성장을 함께 기록해요</h1>
        </div>
        <button className="ghost-button" type="button" onClick={session ? signOut : () => setView("settings")}>
          {session ? "로그아웃" : "설정"}
        </button>
      </header>

      {!isSupabaseConfigured && (
        <div className="notice">
          지금은 샘플 데이터 모드입니다. Supabase 정보를 입력하면 로그인과 실제 DB 저장을 사용할 수 있습니다.
        </div>
      )}

      {message && <div className="toast">{message}</div>}

      <main>
        {view === "home" && (
          <Home
            todayTotal={todayTotal}
            transactions={transactions}
            notes={notes}
            loading={loading}
            onNavigate={setView}
            onSelectStudent={(studentId) => {
              setSelectedStudentId(studentId);
              setView("student");
            }}
          />
        )}
        {view === "students" && (
          <StudentList
            students={students}
            onSelect={(studentId) => {
              setSelectedStudentId(studentId);
              setView("student");
            }}
          />
        )}
        {view === "student" && selectedStudent && (
          <StudentDetail
            student={selectedStudent}
            transactions={transactions.filter((item) => item.student_id === selectedStudent.id)}
            notes={notes.filter((item) => item.student_id === selectedStudent.id)}
            onAward={() => setView("award")}
            onNote={() => setView("note")}
          />
        )}
        {view === "award" && (
          <AwardForm students={students} selectedStudentId={selectedStudent?.id} onSubmit={awardTalent} />
        )}
        {view === "note" && (
          <NoteForm students={students} selectedStudentId={selectedStudent?.id} onSubmit={addNote} />
        )}
        {view === "admin" && (
          <AdminPanel
            isAdmin={isAdmin}
            students={students}
            transactions={transactions}
            notes={notes}
            onCreateStudent={createStudent}
          />
        )}
        {view === "settings" && <Settings />}
      </main>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        <button type="button" className={view === "home" ? "active" : ""} onClick={() => setView("home")}>홈</button>
        <button type="button" className={view === "students" ? "active" : ""} onClick={() => setView("students")}>아이</button>
        <button type="button" className={view === "award" ? "active" : ""} onClick={() => setView("award")}>지급</button>
        <button type="button" className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>관리</button>
      </nav>
    </div>
  );
}

function LoginScreen({ message, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={(event) => {
        event.preventDefault();
        onLogin(email, password);
      }}>
        <p className="eyebrow">달란트 성경학교</p>
        <h1>선생님 로그인</h1>
        <label>이메일<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label>
        <label>비밀번호<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label>
        {message && <p className="form-message">{message}</p>}
        <button className="primary-button" type="submit">로그인</button>
      </form>
    </div>
  );
}

function Home({ todayTotal, transactions, notes, loading, onNavigate, onSelectStudent }) {
  return (
    <section className="stack">
      <div className="hero-panel">
        <span>오늘 지급한 달란트</span>
        <strong>{todayTotal}</strong>
        <p>{loading ? "불러오는 중..." : "칭찬과 관찰을 함께 남겨주세요."}</p>
      </div>
      <div className="quick-grid">
        <button type="button" onClick={() => onNavigate("students")}>아이 목록</button>
        <button type="button" onClick={() => onNavigate("award")}>달란트 지급</button>
        <button type="button" onClick={() => onNavigate("note")}>메모 작성</button>
        <button type="button" onClick={() => onNavigate("admin")}>관리자</button>
      </div>
      <Feed title="최근 달란트 지급" items={transactions.slice(0, 4)} onSelectStudent={onSelectStudent} />
      <NoteFeed title="최근 작성된 메모" items={notes.slice(0, 4)} onSelectStudent={onSelectStudent} />
    </section>
  );
}

function StudentList({ students, onSelect }) {
  const [query, setQuery] = useState("");
  const filtered = students.filter((student) => [student.name, student.grade, student.group_name].join(" ").includes(query));

  return (
    <section className="stack">
      <div className="section-heading">
        <h2>아이 목록</h2>
        <span>{filtered.length}명</span>
      </div>
      <input className="search-input" placeholder="이름, 학년, 그룹 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="student-list">
        {filtered.map((student) => (
          <button className="student-row" key={student.id} type="button" onClick={() => onSelect(student.id)}>
            <span>
              <strong>{student.name}</strong>
              <small>{student.grade} · {student.group_name}</small>
            </span>
            <b>{student.total_talents} 달란트</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function StudentDetail({ student, transactions, notes, onAward, onNote }) {
  return (
    <section className="stack">
      <div className="profile-panel">
        <p>{student.grade} · {student.group_name}</p>
        <h2>{student.name}</h2>
        <strong>{student.total_talents} 달란트</strong>
      </div>
      <div className="action-row">
        <button className="primary-button" type="button" onClick={onAward}>달란트 지급</button>
        <button className="secondary-button" type="button" onClick={onNote}>메모 작성</button>
      </div>
      <Feed title="전체 달란트 지급 기록" items={transactions} />
      <NoteFeed title="선생님 메모 기록" items={notes} />
    </section>
  );
}

function AwardForm({ students, selectedStudentId, onSubmit }) {
  const [studentId, setStudentId] = useState(selectedStudentId || students[0]?.id || "");
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState(reasons[0]);
  const [memo, setMemo] = useState("");

  return (
    <form className="form-panel" onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ studentId, amount, reason, memo });
    }}>
      <h2>달란트 지급</h2>
      <label>아이 선택<SelectStudent students={students} value={studentId} onChange={setStudentId} /></label>
      <div className="amount-grid">
        {quickAmounts.map((value) => (
          <button key={value} className={amount === value ? "selected" : ""} type="button" onClick={() => setAmount(value)}>
            {value} 달란트
          </button>
        ))}
      </div>
      <label>지급 사유<select value={reason} onChange={(event) => setReason(event.target.value)}>{reasons.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>메모<textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="칭찬 내용이나 상황을 적어주세요." /></label>
      <button className="primary-button" type="submit">지급 저장</button>
    </form>
  );
}

function NoteForm({ students, selectedStudentId, onSubmit }) {
  const [studentId, setStudentId] = useState(selectedStudentId || students[0]?.id || "");
  const [note, setNote] = useState("");

  return (
    <form className="form-panel" onSubmit={(event) => {
      event.preventDefault();
      if (note.trim()) onSubmit({ studentId, note });
    }}>
      <h2>메모 작성</h2>
      <label>아이 선택<SelectStudent students={students} value={studentId} onChange={setStudentId} /></label>
      <label>관찰 메모<textarea required value={note} onChange={(event) => setNote(event.target.value)} placeholder="예배 태도, 친구 관계, 암송, 보호자 전달 사항 등을 기록해주세요." /></label>
      <button className="primary-button" type="submit">메모 저장</button>
    </form>
  );
}

function SelectStudent({ students, value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.group_name}</option>)}
    </select>
  );
}

function AdminPanel({ isAdmin, students, transactions, notes, onCreateStudent }) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [groupName, setGroupName] = useState("");

  return (
    <section className="stack">
      <div className="section-heading">
        <h2>관리자 화면</h2>
        <span>{isAdmin ? "관리자" : "보기 제한"}</span>
      </div>
      {!isAdmin && <div className="notice">현재 계정은 선생님 권한입니다. 샘플 모드에서는 관리자 화면 구성을 미리 볼 수 있습니다.</div>}
      <form className="form-panel compact" onSubmit={(event) => {
        event.preventDefault();
        onCreateStudent({ name, grade, group_name: groupName, is_active: true });
        setName("");
        setGrade("");
        setGroupName("");
      }}>
        <h3>아이 등록</h3>
        <label>이름<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <label>학년<input value={grade} onChange={(event) => setGrade(event.target.value)} required /></label>
        <label>반 또는 그룹<input value={groupName} onChange={(event) => setGroupName(event.target.value)} required /></label>
        <button className="primary-button" type="submit">등록</button>
      </form>
      <div className="metric-grid">
        <Metric label="전체 아이" value={`${students.length}명`} />
        <Metric label="전체 지급 기록" value={`${transactions.length}건`} />
        <Metric label="전체 메모" value={`${notes.length}건`} />
      </div>
      <Feed title="전체 달란트 지급 내역" items={transactions} />
    </section>
  );
}

function Settings() {
  const [url, setUrl] = useState(localStorage.getItem("talent_supabase_url") || "");
  const [anonKey, setAnonKey] = useState(localStorage.getItem("talent_supabase_anon_key") || "");

  return (
    <form className="form-panel" onSubmit={(event) => {
      event.preventDefault();
      saveLocalSupabaseConfig(url, anonKey);
      location.reload();
    }}>
      <h2>Supabase 연결</h2>
      <label>Project URL<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://xxxx.supabase.co" /></label>
      <label>Anon key<input value={anonKey} onChange={(event) => setAnonKey(event.target.value)} placeholder="public anon key" /></label>
      <button className="primary-button" type="submit">저장 후 다시 열기</button>
    </form>
  );
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function Feed({ title, items, onSelectStudent }) {
  return (
    <section className="feed">
      <h2>{title}</h2>
      {items.length === 0 && <p className="empty">기록이 없습니다.</p>}
      {items.map((item) => (
        <button className="feed-item" type="button" key={item.id} onClick={() => onSelectStudent?.(item.student_id)}>
          <span><b>{item.students?.name || "아이"}</b> · {item.reason}</span>
          <strong>+{item.amount}</strong>
          <small>{formatDate(item.created_at)} · {item.users?.name || "선생님"}</small>
          {item.memo && <p>{item.memo}</p>}
        </button>
      ))}
    </section>
  );
}

function NoteFeed({ title, items, onSelectStudent }) {
  return (
    <section className="feed">
      <h2>{title}</h2>
      {items.length === 0 && <p className="empty">메모가 없습니다.</p>}
      {items.map((item) => (
        <button className="feed-item note" type="button" key={item.id} onClick={() => onSelectStudent?.(item.student_id)}>
          <span><b>{item.students?.name || "아이"}</b></span>
          <small>{formatDate(item.created_at)} · {item.users?.name || "선생님"}</small>
          <p>{item.note}</p>
        </button>
      ))}
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
