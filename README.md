# PokeFloor

Floor796처럼 위에서 비스듬히 내려다보는 아이소메트릭 방에서, **카드 게임으로 모은 포켓몬**이 돌아다니는 Spring Boot 웹앱.
가구는 배경 편집 모드에서 자유롭게 꾸미고, 도감을 하나씩 채워 가요.

## 실행
```
./gradlew bootRun        # Windows: gradlew.bat bootRun
```
- http://localhost:8080 접속
- JDK 21이 없어도 Gradle이 자동으로 내려받아요 (foojay toolchain resolver)
- DB는 설치가 필요 없는 **H2 파일 DB**예요. 프로젝트 폴더의 `data/pokefloor.mv.db`에 저장돼요.
  - `data/` 폴더를 지우면 처음 상태로 돌아가요 (포켓몬 다시 받기, 획득 기록·가구 초기화)
- **처음 실행할 때** 1세대 포켓몬 151마리를 PokéAPI에서 받아 저장해요. 백그라운드에서 10초 안팎이 걸려요.

## 페이지

| 주소 | 내용 |
|---|---|
| `/` 내 방 | 꺼내 둔 포켓몬이 돌아다님. 🎒 내 포켓몬(꺼내기/넣기, 별명), 🛠 배경 편집 |
| `/game.html` 카드 게임 | 같은 포켓몬 카드 짝맞추기. 성공하면 포켓몬 1마리 획득 |
| `/dex.html` 도감 | 전체 포켓몬. 획득 전에는 그림자와 `???`, 획득하면 채워짐 |
| `/admin.html` 관리자 | 포켓몬 추가(번호/범위), 켜기·끄기, 다시 받기, 삭제 (시연용이라 잠금 없음) |

## 규칙

### 카드 게임
- 난이도: 쉬움 3×4(6쌍, 45초) · 보통 4×4(8쌍, 60초) · 어려움 4×5(10쌍, 80초)
- 카드의 포켓몬은 **활성화된 포켓몬 중 완전 랜덤**이고, 모두 서로 다른 쌍이에요.
- 제한시간 안에 모두 맞추면, 이번 판 포켓몬 중 **아직 없는 것 1마리**를 랜덤으로 얻어요.
  - 이번 판 포켓몬을 이미 다 가지고 있으면 클리어만 돼요.
- 서버가 검증해요: 시작 시각 기준 제한시간(+2초 여유), 보낸 카드 쌍이 실제로 같은 포켓몬인지, 같은 판을 두 번 정산하는지

### 획득 / 배치
- **모든 포켓몬은 최대 1번만** 획득할 수 있어요 (획득 테이블의 기본키가 도감 번호).
- 본래 이름과 별개로 **별명**(최대 12자)을 붙일 수 있어요. 방·가방·도감에는 별명이 먼저 보여요.
- 얻은 포켓몬은 가방에 들어가고, 꺼내면 방에서 돌아다녀요.

### 배경 편집 모드 (🛠)
- 켜면 포켓몬은 흐려지고 가구만 조작할 수 있어요.
- **가구 클릭** = 선택, **끌기** = 이동 (타일 단위로 맞춰지고, 겹치거나 방 밖이면 빨갛게 표시된 뒤 원위치)
- **R** 회전(4방향) · **Delete** 삭제 · **Esc** 선택 해제
- 왼쪽 목록(거실/침실/서재/주방/욕실/소품/바닥 65종)에서 골라 바닥을 클릭하면 배치
- 모니터·TV·커피 머신 같은 **소품은 책상·테이블 위에 얹을 수 있어요.** 가구를 옮기면 같이 따라가요.
- 방 뒤쪽 벽에 붙은 칸에 벽을 등지게 놓으면 벽에 딱 붙어요. 큰 가구(침대 등)는 여러 칸을 차지해요.
- "기본 배치로"를 누르면 처음 배치로 돌아가요.

## 구조

| 패키지 / 파일 | 역할 |
|---|---|
| `pokemon/` | 포켓몬 엔티티, PokéAPI 변환(`PokemonFetcher`), 첫 실행 시드·범위 가져오기(`PokemonSeeder`), `GET /api/pokemon` |
| `admin/` | `/api/admin/pokemon` 추가·범위 추가·켜기/끄기·삭제 |
| `game/` | 카드 게임 판 생성·정산 (`/api/game/start`, `/api/game/{id}/finish`) |
| `collection/` | 획득 기록(별명, 방 배치) `/api/collection` |
| `furniture/` | 가구 배치 CRUD·기본 배치 `/api/furniture` |
| `static/app.js` | 아이소메트릭 방 그리기, 가구 렌더링, 포켓몬 배회(BFS), 줌/드래그 |
| `static/room.js` | 내 방: 가방, 꺼내기/넣기, 별명 |
| `static/editor.js` | 배경 편집 모드 |
| `static/catalog.js` | 편집에서 고를 수 있는 가구 목록 |
| `static/game.js`, `dex.js`, `admin.js` | 각 페이지 |
| `static/common.js`, `pages.css` | 공통 상단 메뉴, API 호출, 타입 색 |

### API 요약

| 메서드 | 주소 | 설명 |
|---|---|---|
| GET | `/api/pokemon` | 게임·도감에 등장하는 포켓몬 |
| GET | `/api/pokemon/seed-status` | 포켓몬 받기 진행 상황 |
| GET | `/api/game` | 난이도 목록, 포켓몬 수, 획득 수 |
| POST | `/api/game/start` | `{"level":"NORMAL"}` → 판 생성 |
| POST | `/api/game/{id}/finish` | `{"matchedPairs":[[0,5],...]}` → 결과·보상 |
| GET | `/api/collection` | 획득한 포켓몬 |
| PATCH | `/api/collection/{id}` | `{"nickname":"..."}` 또는 `{"placed":true}` |
| GET/POST | `/api/furniture` | 가구 목록 / 추가 |
| PUT/DELETE | `/api/furniture/{id}` | 이동·회전 / 삭제 |
| POST | `/api/furniture/reset` | 기본 배치로 |
| GET | `/api/admin/pokemon` | 전체(꺼진 것 포함) |
| POST | `/api/admin/pokemon/{id}` | 번호로 추가(다시 받기) |
| POST | `/api/admin/pokemon/import?from=&to=` | 범위 추가(백그라운드) |
| PATCH | `/api/admin/pokemon/{id}?active=` | 켜기/끄기 |
| DELETE | `/api/admin/pokemon/{id}` | 삭제 (획득 기록도 삭제) |

## 옵션
- `?mon=home` : 포켓몬을 고해상도 HOME 3D 렌더(정지 이미지 + 코드 애니메이션)로 표시
- `application.properties`의 `pokefloor.seed.from/to` : 첫 실행 때 받아올 범위 (기본 1~151)

## 에셋 출처
- 가구·벽: Kenney Furniture Kit (CC0) – www.kenney.nl
- 포켓몬 정보·스프라이트: PokéAPI (pokeapi.co), github.com/PokeAPI/sprites
  (포켓몬 이미지의 권리는 Nintendo / Game Freak 에 있어요. 수업 시연용으로만 사용)
