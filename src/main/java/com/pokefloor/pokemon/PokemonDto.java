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
    /** front = 화면 아래쪽(관람자 쪽)으로 걸을 때, back = 위쪽(안쪽)으로 걸을 때 */
    public record Sprites(String frontAnimated, String backAnimated, String frontStatic) {}
}
