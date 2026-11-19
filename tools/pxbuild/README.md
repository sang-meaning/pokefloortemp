# 도트 소품 만들기

1. 아래 Kenney 팩(CC0)을 내려받아 압축을 풉니다.
   - Roguelike/RPG pack → `Roguelike_pack/`
   - Roguelike Caves & Dungeons → `Roguelike_Cave_pack/`
   - Tiny Town → `kenney_tiny-town/`, Tiny Dungeon → `kenney_tinydungeon/`
2. `specs.py` 맨 위 경로(RL, CV, TT, TD)를 압축 푼 위치로 바꿉니다.
3. `python build.py src/main/resources/static/assets/px`
   → 소품 PNG + `props.json`(key, 이름, 어울리는 바이옴, 크기) 생성

시트 좌표 확인: `python region.py <시트.png> <열시작> <열끝> <행시작> <행끝> out.png`
