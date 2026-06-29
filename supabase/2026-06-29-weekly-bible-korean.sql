alter table public.weekly_bible_lessons
add column if not exists verse_ko text not null default '';

update public.weekly_bible_lessons
set verse_ko = '아버지께서는 모든 충만으로 예수 안에 거하게 하시고 그의 십자가의 피로 화평을 이루사 만물이 그로 말미암아 자기와 화목하게 되기를 기뻐하심이라.'
where verse_ko = ''
  and verse_ref = 'Colossians 1:19-20 (CSB)';
