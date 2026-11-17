# PokeFloor

Floor796 스타일의 아이소메트릭 방 안에서 포켓몬이 돌아다니는 Spring Boot 웹앱.

## 실행
```
./gradlew bootRun        # Windows: gradlew.bat bootRun
```
- http://localhost:8080 : 기본은 이상해씨(1번)만 나와요.
- http://localhost:8080/?ids=1,4,7,25,143 : 여러 마리를 띄울 수 있어요.

요구사항: JDK 21 (IntelliJ에서 열면 Gradle이 자동으로 세팅돼요)

## 구조
| 파일 | 역할 |
|---|---|
| `pokemon/PokeApiClient` | PokéAPI 호출 (pokemon, pokemon-species, type) |
| `pokemon/PokemonService` | 한국어 이름/분류/설명/타입 + 앞·뒤 애니메이션 스프라이트 추출, 메모리 캐시 |
| `pokemon/PokemonController` | `GET /api/pokemon/{id}` |
| `static/app.js` | 아이소메트릭 방 렌더링, 가구, 포켓몬 배회(BFS 경로), 정보 패널, 줌/드래그 |

## 에셋 출처
- 가구·벽: Kenney Furniture Kit (CC0) – www.kenney.nl (`static/assets/kenney/License.txt`)
- 포켓몬 정보·스프라이트: PokéAPI (pokeapi.co), github.com/PokeAPI/sprites

## 다음 단계
- 방, 가구 정의(`ROOMS`, `FURNITURE`)를 DB로 옮기고 추가/삭제/이동 API 만들기
- Kenney 가구 더 추가 (팩 원본 480장 중 35장만 사용 중)
- PokéAPI 데이터를 미리 받아 DB에 저장하는 수집 배치
