-- 달란트 차감 기능용 마이그레이션
-- talent_transactions.amount 를 음수(차감)까지 허용 (0만 금지)
-- 차감은 amount = -N, reason = '차감' 으로 기록되며, 기존 total_talents 트리거가 자동 반영한다.
-- students.total_talents 는 여전히 >= 0 제약이 있어 잔액 미만으로는 내려가지 않는다
-- (초과 차감은 앱에서 사전 차단).
--
-- ※ 이 마이그레이션은 Supabase(project ref eesdzgehomzccrrykrqb)에 이미 적용됨.
--    이름: allow_talent_deduction_negative_amount

alter table public.talent_transactions
  drop constraint if exists talent_transactions_amount_check;

alter table public.talent_transactions
  add constraint talent_transactions_amount_check check (amount <> 0);
