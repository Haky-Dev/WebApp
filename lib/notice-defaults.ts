export type SlideFields = Record<string, string>

export type SlideData = {
  type: 'title' | 'rule' | 'prize' | 'event' | 'closing'
  fields: SlideFields
}

export const DEFAULT_SLIDES: SlideData[] = [
  {
    type: 'title',
    fields: {
      eyebrow: '// WeRO Darts Team Presents',
      sub: '위로 하우스 토너먼트',
      badge: '규칙 안내',
    },
  },
  {
    type: 'rule',
    fields: {
      phaseTag: 'Phase 01',
      phaseStyle: 'qualifying',
      title: '예선전',
      card1Label: '방식',
      card1Value: '라운드 로빈',
      card2Label: '핸디캡',
      card2Value: '오피셜 핸디캡',
      card3Label: '매치 구성',
      card3Value: '501 — S.Cri — 501',
      card4Label: '선공 규칙',
      card4Value: '코인 토스 / 패자 선공 / 코인 토스',
      card5Label: '참가 & 진출',
      card5Value: '상위 3위까지 본선 진출',
      card5Note: '(총 15팀, 1팀 부전승)',
      callout: '레이팅 B13 이상 — 마스터 아웃 적용',
    },
  },
  {
    type: 'rule',
    fields: {
      phaseTag: 'Phase 02',
      phaseStyle: 'finals',
      title: '본선전',
      card1Label: '방식',
      card1Value: '싱글 엘리미네이션',
      card2Label: '핸디캡',
      card2Value: '오피셜 핸디캡',
      card3Label: '매치 구성',
      card3Value: '501 — S.Cri — Choice',
      card4Label: '선공 규칙',
      card4Value: '코인 토스 / 패자 선공 / Cork 선',
      card5Label: '',
      card5Value: '',
      card5Note: '',
      callout: '레이팅 B13 이상 — 마스터 아웃 적용',
    },
  },
  {
    type: 'prize',
    fields: {
      totalLabel: '총 상금',
      total: '800,000원',
      item1Rank: '🥇',
      item1Desc: '1등',
      item1Sub: '참가비 40% + 피닉스컵 참가권 2장',
      item1Amount: '32만원',
      item2Rank: '🥈',
      item2Desc: '2등',
      item2Sub: '참가비 40%',
      item2Amount: '32만원',
      item3Rank: '🥉',
      item3Desc: '공동 3등',
      item3Sub: '참가비 20%',
      item3Amount: '16만원',
    },
  },
  {
    type: 'event',
    fields: {
      neonLabel: '참가자 이벤트 게임',
      gameName: '오픈 히든 크리켓',
      gameSubtitle: 'Open Hidden Cricket',
      class1Name: 'B · C 클래스',
      class1Rule: '두 발 기회',
      class2Name: 'A 클래스 이상',
      class2Rule: '한 발 기회',
      eventRule: "숨겨진 영역을 찾아 '오픈'까지 완료해야 성공!",
    },
  },
  {
    type: 'closing',
    fields: {
      neonLabel: 'WeRO Dart House',
      mainLine1: '그럼 이제',
      mainAccent: 'GAME ON!',
      sub: '모든 참가자분들의 대진운을 빕니다',
      cta: 'Good Luck & Have Fun',
    },
  },
]
