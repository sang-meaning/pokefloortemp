package com.pokefloor.world;

import java.util.List;

/**
 * 박스 하나를 채우는 지형(바이옴). 박스를 추가할 때 고름.
 * 바닥 색·무늬는 프론트(world.js 의 BIOME_STYLE)에서 그림.
 */
public enum Biome {
    MEADOW("들판", "🌿", "특색 없이 무난한 초원. 대부분의 포켓몬과 잘 어울려요",
            List.of("노말", "비행"), List.of("노말", "비행", "풀", "벌레")),
    FOREST("숲", "🌲", "울창한 나무와 버섯, 벌레·풀 포켓몬의 집",
            List.of("풀", "벌레"), List.of("벌레", "풀", "독")),
    CAVE("동굴", "🪨", "어둑한 바위 바닥과 석순",
            List.of("바위", "격투"), List.of("바위", "땅", "격투", "독")),
    VOLCANO("화산", "🌋", "검은 현무암 사이로 용암이 흐르는 땅",
            List.of("불꽃", "드래곤"), List.of("불꽃", "바위", "땅")),
    SEA("바다", "🌊", "물 위의 섬. 산호와 해초",
            List.of("물"), List.of("물", "얼음")),
    DESERT("사막", "🏜", "모래 언덕과 선인장",
            List.of("땅"), List.of("땅", "바위", "독")),
    SNOW("설원", "❄", "눈 덮인 나무와 얼음 결정",
            List.of("얼음"), List.of("얼음", "물")),
    VILLAGE("마을", "🏘", "돌길과 텐트, 생활 소품",
            List.of("전기", "에스퍼", "강철"), List.of("노말", "전기", "에스퍼", "강철")),
    GHOST("묘지", "👻", "보랏빛 안개가 낀 묘지",
            List.of("고스트", "독"), List.of("고스트", "독", "에스퍼"));

    private final String nameKo;
    private final String emoji;
    private final String description;
    /** 던전 보스로 나오는 타입 / 일반 몬스터로 나오는 타입 */
    private final List<String> bossTypes;
    private final List<String> mobTypes;

    Biome(String nameKo, String emoji, String description, List<String> bossTypes, List<String> mobTypes) {
        this.nameKo = nameKo;
        this.emoji = emoji;
        this.description = description;
        this.bossTypes = bossTypes;
        this.mobTypes = mobTypes;
    }

    public List<String> bossTypes() { return bossTypes; }
    public List<String> mobTypes() { return mobTypes; }

    public String nameKo() { return nameKo; }
    public String emoji() { return emoji; }
    public String description() { return description; }
    /** props.json 의 biomes 태그 (소문자) */
    public String tag() { return name().toLowerCase(); }
}
