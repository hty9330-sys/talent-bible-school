-- 매일성경읽기: 한 아이당 하루(Asia/Seoul) 1회 제한 (DB 무결성 보강)
-- 클라이언트 검사(2026-07-06-daily-bible-once-patch.js)와 함께 사용하면
-- 동시 지급/우회로 인한 중복도 DB에서 최종 차단된다.
--
-- 실행 방법: Supabase 대시보드 > SQL Editor 에 붙여넣고 실행.
-- (선택 사항이지만, 두 선생님이 거의 동시에 지급하는 경쟁 상황을 막으려면 권장)

CREATE UNIQUE INDEX IF NOT EXISTS talent_daily_bible_once_per_day
  ON public.talent_transactions (
    student_id,
    ((created_at AT TIME ZONE 'Asia/Seoul')::date)
  )
  WHERE reason = '매일성경읽기';

-- 참고: 이미 같은 날 중복 기록이 존재하면 인덱스 생성이 실패한다.
-- 그 경우 아래 쿼리로 중복을 먼저 확인/정리한 뒤 다시 생성한다.
--
-- SELECT student_id,
--        (created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
--        count(*)
-- FROM public.talent_transactions
-- WHERE reason = '매일성경읽기'
-- GROUP BY 1, 2
-- HAVING count(*) > 1
-- ORDER BY day DESC;
