package com.pokefloor.item;

import java.util.List;
import java.util.Optional;

/**
 * 상점에서 파는 아이템과 쓰임새.
 *  BALL    : 던전 보스를 쓰러뜨린 뒤 던져서 잡기 (value = 포획률 %)
 *  HEAL    : 던전 안에서 단축키로 사용, 최대 체력의 value% 회복
 *  BUFF_*  : 던전에 가지고 들어가면 그 판 동안 value% 효과
 *  CANDY   : 베이스캠프에서 포켓몬에게 사용, 경험치 +value
 */
public final class ShopItems {
    private ShopItems() {}

    public enum Use { BALL, HEAL, BUFF_ATTACK, BUFF_SPEED, BUFF_DEFENSE, CANDY }

    public record Entry(String code, ItemKind kind, int price, Use use, int value, String desc) {}

    public static final List<Entry> ALL = List.of(
            new Entry("poke-ball", ItemKind.BALL, 200, Use.BALL, 50, "보스 포획률 50%"),
            new Entry("great-ball", ItemKind.BALL, 500, Use.BALL, 60, "보스 포획률 60%"),
            new Entry("ultra-ball", ItemKind.BALL, 1000, Use.BALL, 70, "보스 포획률 70%"),
            new Entry("quick-ball", ItemKind.BALL, 1800, Use.BALL, 80, "보스 포획률 80%"),
            new Entry("dusk-ball", ItemKind.BALL, 1800, Use.BALL, 80, "보스 포획률 80%"),
            new Entry("master-ball", ItemKind.BALL, 5000, Use.BALL, 85, "보스 포획률 85%"),
            new Entry("potion", ItemKind.HEALING, 150, Use.HEAL, 25, "던전에서 체력 25% 회복"),
            new Entry("super-potion", ItemKind.HEALING, 350, Use.HEAL, 50, "던전에서 체력 50% 회복"),
            new Entry("hyper-potion", ItemKind.HEALING, 700, Use.HEAL, 100, "던전에서 체력 모두 회복"),
            new Entry("x-attack", ItemKind.TOOL, 400, Use.BUFF_ATTACK, 15, "가지고 들어가면 그 판 공격력 +15%"),
            new Entry("x-speed", ItemKind.TOOL, 400, Use.BUFF_SPEED, 10, "가지고 들어가면 그 판 이동·공격 속도 +10%"),
            new Entry("x-defense", ItemKind.TOOL, 400, Use.BUFF_DEFENSE, 15, "가지고 들어가면 그 판 받는 피해 -15%"),
            new Entry("rare-candy", ItemKind.TOOL, 600, Use.CANDY, 120, "포켓몬 경험치 +120"));

    public static Optional<Entry> byCode(String code) {
        return ALL.stream().filter(e -> e.code().equals(code)).findFirst();
    }

    /** 몬스터볼 포획률: 상점 목록에 없는 볼(관리자 지급 등)은 일반 볼 50%, 그 밖의 특수볼 80% */
    public static int ballRate(String code) {
        return byCode(code).filter(e -> e.use() == Use.BALL).map(Entry::value)
                .orElse(code.equals("poke-ball") ? 50 : 80);
    }
}
