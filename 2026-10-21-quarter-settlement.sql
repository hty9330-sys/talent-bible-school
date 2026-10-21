-- 2026-10-21 분기 결산(달란트 잔치) 적립 리셋
-- 분기 잔치에서 차감한 뒤 남은 달란트를 "이전 분기 잔액"으로 저장해두고,
-- 다음 분기 적립(이번 분기 적립 = 보유 - 이전 분기 잔액)은 0부터 다시 계산되게 한다.
-- 보유 달란트(total_talents) 자체는 바뀌지 않으므로, 쓰고 싶을 때는 그대로 전체에서 차감한다.

alter table public.students
  add column if not exists quarter_carryover integer not null default 0;

alter table public.students
  add column if not exists quarter_started_at timestamptz not null default now();

alter table public.students
  drop constraint if exists students_quarter_carryover_check;

alter table public.students
  add constraint students_quarter_carryover_check check (quarter_carryover >= 0);
