package com.pokefloor.pokemon;

import java.util.List;

/** 화면에 내려주는 포켓몬 정보 */
public record PokemonDto(
        int id,
        String nameKo,
        String nameEn,
        String genusKo,        // 예: "씨앗포켓몬"
        String flavorTextKo,   // 도감 설명
        List<String> typesKo,  // 예: ["풀", "독"]
        double heightM,
        double weightKg,
        boolean active,
        Sprites sprites,
        Stats stats,
        boolean legendary
) {
    /** 종족값 (bst = 합계) */
    public record Stats(int hp, int attack, int defense, int spAttack, int spDefense, int speed, int bst) {}

    private static final String SPR = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";

    /**
     * frontAnimated/backAnimated : 움직이는 GIF (아래쪽/위쪽으로 걸을 때)
     * frontStatic                : 기본 도트 PNG
     * home                       : 고해상도 3D 렌더 PNG (512px, 정지)
     * officialArtwork            : 고해상도 공식 일러스트 PNG (정지)
     */
    public record Sprites(String frontAnimated, String backAnimated, String frontStatic,
                          String home, String officialArtwork,
                          String shinyAnimated, String shinyBackAnimated, String shinyStatic, String shinyArtwork) {}

    public static PokemonDto from(Pokemon p) {
        return new PokemonDto(p.getId(), p.getNameKo(), p.getNameEn(), p.getGenusKo(), p.getFlavorTextKo(),
                p.typeList(), p.getHeightM(), p.getWeightKg(), p.isActive(),
                new Sprites(p.getFrontAnimated(), p.getBackAnimated(), p.getFrontStatic(),
                        p.getHome(), p.getOfficialArtwork(),
                        // 이로치(색이 다른 포켓몬): PokéAPI sprites 저장소의 shiny 폴더 규칙
                        SPR + "other/showdown/shiny/" + p.getId() + ".gif",
                        SPR + "other/showdown/back/shiny/" + p.getId() + ".gif",
                        SPR + "shiny/" + p.getId() + ".png",
                        SPR + "other/official-artwork/shiny/" + p.getId() + ".png"),
                p.hasStats() ? new Stats(p.getStatHp(), p.getStatAttack(), p.getStatDefense(),
                        p.getStatSpAttack(), p.getStatSpDefense(), p.getStatSpeed(), p.baseTotal()) : null,
                Legendary.is(p.getId()));
    }
}
