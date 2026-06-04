-- 인터랙티브 추첨용 중간 상태 추가 (등록은 잠기되 결과는 비공개)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('collecting', 'drawing', 'closed'));

-- 그룹 라벨 (예: 'A1'). snake 모드는 NULL.
ALTER TABLE pairs ADD COLUMN IF NOT EXISTS group_label text;
