package com.pokefloor.pokemon;

import java.util.List;

/** 화면에 필요한 포켓몬 정보만 추린 응답 객체 */
public record PokemonDto(
        int id,
        String nameKo,
        String nameEn,
        String genusKo,        // 예: "씨앗포켓몬"
        String flavorTextKo,   // 도감 설명
        List<String> typesKo,  // 예: ["풀", "독"]
        double heightM,
        double weightKg,
        Sprites sprites
) {
    /**
     * frontAnimated/backAnimated : 움직이는 GIF (아래쪽/위쪽으로 걸을 때)
     * frontStatic                : 기본 도트 PNG
     * home                       : 고해상도 3D 렌더 PNG (512px, 정지)
     * officialArtwork            : 고해상도 공식 일러스트 PNG (정지)
     */
    public record Sprites(String frontAnimated, String backAnimated, String frontStatic,
                          String home, String officialArtwork) {}
}
