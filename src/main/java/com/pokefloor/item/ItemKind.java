package com.pokefloor.item;

import java.util.List;

/** 아이템 분류. categories = 이 분류로 받아올 PokéAPI item-category 이름 */
public enum ItemKind {
    BALL("몬스터볼", List.of("standard-balls", "special-balls", "apricorn-balls")),
    EVOLUTION("진화 도구", List.of("evolution")),
    HEALING("회복약", List.of("healing")),
    BERRY("나무열매", List.of("medicine")),
    HELD("지닌 물건", List.of("held-items")),
    TOOL("도구", List.of()),
    BADGE("배지", List.of());

    private final String nameKo;
    private final List<String> categories;

    ItemKind(String nameKo, List<String> categories) {
        this.nameKo = nameKo;
        this.categories = categories;
    }

    public String nameKo() { return nameKo; }
    public List<String> categories() { return categories; }
}
