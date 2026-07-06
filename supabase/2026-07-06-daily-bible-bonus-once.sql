-- 매일성경읽기 보너스: 한 아이당 하루(Asia/Seoul) 1건만 (동시 재계산 중복 차단)
-- 클라이언트 재계산(2026-07-06-daily-bible-bonus-patch.js)의 add-only 로직과 함께 쓰면
-- 두 선생님이 거의 동시에 지급/수정해도 보너스가 중복 삽입되지 않는다.
--
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행. (권장, 선택)

CREATE UNIQUE INDEX IF NOT EXISTS talent_daily_bible_bonus_once_per_day
  ON public.talent_transactions (
    student_id,
    ((created_at AT TIME ZONE 'Asia/Seoul')::date)
  )
  WHERE reason = '매일성경읽기 보너스';

-- 이미 같은 날 중복 보너스가 있으면 인덱스 생성이 실패한다. 아래로 먼저 확인:
-- SELECT student_id, (created_at AT TIME ZONE 'Asia/Seoul')::date AS day, count(*)
-- FROM public.talent_transactions
-- WHERE reason = '매일성경읽기 보너스'
-- GROUP BY 1,2 HAVING count(*) > 1 ORDER BY day DESC;
