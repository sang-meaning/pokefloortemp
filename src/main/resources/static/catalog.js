/* 배경 편집에서 고를 수 있는 Kenney 가구 목록 (Kenney Furniture Kit, CC0)
 *  base    : 이미지 이름 (뒤에 _SE/_SW/_NE/_NW 를 붙여 방향 선택)
 *  flat    : 바닥 깔개 → 위로 걸어다닐 수 있고 항상 맨 아래에 그려짐
 *  top     : 작은 소품 → 책상·테이블처럼 surface 가 있는 가구 위에 놓으면 그 위에 얹힘
 *  surface : 위에 소품을 얹을 수 있는 높이 (원본 이미지 px)
 */
const FURNITURE_CATEGORIES = ['거실', '침실', '서재', '주방', '욕실', '소품', '바닥'];

const FURNITURE_CATALOG = [
  // 거실
  { base: 'loungeSofa', name: '소파', cat: '거실' },
  { base: 'loungeSofaLong', name: '긴 소파', cat: '거실' },
  { base: 'loungeChair', name: '라운지 체어', cat: '거실' },
  { base: 'loungeChairRelax', name: '안락의자', cat: '거실' },
  { base: 'loungeSofaOttoman', name: '오토만', cat: '거실' },
  { base: 'tableCoffee', name: '커피 테이블', cat: '거실', surface: 22 },
  { base: 'tableCoffeeGlass', name: '유리 테이블', cat: '거실', surface: 22 },
  { base: 'cabinetTelevision', name: 'TV 장', cat: '거실', surface: 30 },
  { base: 'televisionModern', name: 'TV', cat: '거실', top: true },
  { base: 'televisionVintage', name: '옛날 TV', cat: '거실', top: true },
  { base: 'speaker', name: '스피커', cat: '거실' },
  { base: 'radio', name: '라디오', cat: '거실', top: true },
  { base: 'bookcaseOpen', name: '책장', cat: '거실' },
  { base: 'bookcaseClosedWide', name: '넓은 책장', cat: '거실' },
  { base: 'coatRackStanding', name: '옷걸이', cat: '거실' },
  { base: 'bench', name: '벤치', cat: '거실' },

  // 침실
  { base: 'bedDouble', name: '더블 침대', cat: '침실' },
  { base: 'bedSingle', name: '싱글 침대', cat: '침실' },
  { base: 'bedBunk', name: '2층 침대', cat: '침실' },
  { base: 'cabinetBedDrawerTable', name: '협탁', cat: '침실', surface: 30 },
  { base: 'sideTable', name: '사이드 테이블', cat: '침실', surface: 30 },
  { base: 'bookcaseOpenLow', name: '낮은 책장', cat: '침실', surface: 34 },
  { base: 'lampRoundTable', name: '탁상 스탠드', cat: '침실', top: true },
  { base: 'bear', name: '곰인형', cat: '침실', top: true },

  // 서재
  { base: 'desk', name: '책상', cat: '서재', surface: 46 },
  { base: 'deskCorner', name: '코너 책상', cat: '서재', surface: 46 },
  { base: 'chairDesk', name: '사무용 의자', cat: '서재' },
  { base: 'computerScreen', name: '모니터', cat: '서재', top: true },
  { base: 'laptop', name: '노트북', cat: '서재', top: true },
  { base: 'books', name: '책 더미', cat: '서재', top: true },
  { base: 'lampSquareFloor', name: '사각 스탠드', cat: '서재' },
  { base: 'lampRoundFloor', name: '둥근 스탠드', cat: '서재' },

  // 주방
  { base: 'kitchenFridge', name: '냉장고', cat: '주방' },
  { base: 'kitchenStove', name: '가스레인지', cat: '주방' },
  { base: 'kitchenSink', name: '싱크대', cat: '주방' },
  { base: 'kitchenCabinet', name: '조리대', cat: '주방', surface: 52 },
  { base: 'kitchenCabinetDrawer', name: '서랍 조리대', cat: '주방', surface: 52 },
  { base: 'kitchenBar', name: '바 테이블', cat: '주방', surface: 56 },
  { base: 'kitchenMicrowave', name: '전자레인지', cat: '주방', top: true },
  { base: 'kitchenCoffeeMachine', name: '커피 머신', cat: '주방', top: true },
  { base: 'kitchenBlender', name: '믹서기', cat: '주방', top: true },
  { base: 'table', name: '식탁', cat: '주방', surface: 44 },
  { base: 'tableRound', name: '둥근 식탁', cat: '주방', surface: 44 },
  { base: 'chair', name: '의자', cat: '주방' },
  { base: 'chairCushion', name: '쿠션 의자', cat: '주방' },
  { base: 'stoolBar', name: '바 의자', cat: '주방' },

  // 욕실
  { base: 'bathtub', name: '욕조', cat: '욕실' },
  { base: 'toilet', name: '변기', cat: '욕실' },
  { base: 'bathroomSink', name: '세면대', cat: '욕실' },
  { base: 'shower', name: '샤워부스', cat: '욕실' },
  { base: 'washer', name: '세탁기', cat: '욕실' },
  { base: 'dryer', name: '건조기', cat: '욕실' },

  // 소품
  { base: 'pottedPlant', name: '화분', cat: '소품' },
  { base: 'plantSmall1', name: '작은 화분 1', cat: '소품', top: true },
  { base: 'plantSmall2', name: '작은 화분 2', cat: '소품', top: true },
  { base: 'plantSmall3', name: '작은 화분 3', cat: '소품', top: true },
  { base: 'cardboardBoxClosed', name: '상자', cat: '소품' },
  { base: 'cardboardBoxOpen', name: '열린 상자', cat: '소품' },
  { base: 'trashcan', name: '휴지통', cat: '소품' },

  // 바닥
  { base: 'rugRectangle', name: '사각 러그', cat: '바닥', flat: true },
  { base: 'rugRound', name: '원형 러그', cat: '바닥', flat: true },
  { base: 'rugRounded', name: '둥근 사각 러그', cat: '바닥', flat: true },
  { base: 'rugSquare', name: '정사각 러그', cat: '바닥', flat: true },
];

const DIRECTIONS = ['SE', 'SW', 'NW', 'NE'];   // 회전 순서 (시계 방향)
const baseOf = sprite => sprite.replace(/_(SE|SW|NE|NW)$/, '');
const dirOf = sprite => sprite.slice(-2);
const catalogOf = sprite => FURNITURE_CATALOG.find(c => c.base === baseOf(sprite)) || { name: baseOf(sprite) };
