package com.pokefloor.item;

import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * 상점에서 파는 아이템과 쓰임새.
 *  BALL         : 던전 보스를 쓰러뜨린 뒤 던져서 잡기 (value = 기본 포획률 %, 볼마다 잘 듣는 상황이 있음)
 *  HEAL         : 던전 안에서 1~3 키로 사용, 최대 체력의 value% 회복
 *  REVIVE       : 던전에서 쓰러지면 한 번 value% 체력으로 일어남
 *  BUFF_*       : 던전에 가지고 들어가면 그 판 동안 value% 효과
 *  CANDY        : 베이스캠프에서 포켓몬 레벨 +1
 */
public final class ShopItems {
    private ShopItems() {}

    public enum Use { BALL, HEAL, REVIVE, BUFF_ATTACK, BUFF_SPEED, BUFF_DEFENSE, BUFF_CRIT, BUFF_EXP, BUFF_GOLD, CANDY }

    public record Entry(String code, ItemKind kind, int price, Use use, int value, String desc) {}

    public static final List<Entry> ALL = List.of(
            // 몬스터볼
            new Entry("poke-ball", ItemKind.BALL, 200, Use.BALL, 50, "포획률 50%"),
            new Entry("premier-ball", ItemKind.BALL, 300, Use.BALL, 55, "포획률 55% · 싸고 예쁜 볼"),
            new Entry("great-ball", ItemKind.BALL, 500, Use.BALL, 60, "포획률 60%"),
            new Entry("ultra-ball", ItemKind.BALL, 1000, Use.BALL, 70, "포획률 70%"),
            new Entry("net-ball", ItemKind.BALL, 900, Use.BALL, 55, "물·벌레 타입 보스에게 85%"),
            new Entry("dive-ball", ItemKind.BALL, 900, Use.BALL, 55, "바다 바이옴에서 85%"),
            new Entry("dusk-ball", ItemKind.BALL, 900, Use.BALL, 55, "동굴·묘지 바이옴에서 85%"),
            new Entry("heavy-ball", ItemKind.BALL, 900, Use.BALL, 55, "100kg 이상 보스에게 85%"),
            new Entry("fast-ball", ItemKind.BALL, 900, Use.BALL, 55, "스피드 100 이상 보스에게 85%"),
            new Entry("moon-ball", ItemKind.BALL, 900, Use.BALL, 55, "고스트·에스퍼·페어리 보스에게 85%"),
            new Entry("level-ball", ItemKind.BALL, 900, Use.BALL, 50, "리더 레벨이 보스 레벨 이상이면 85%"),
            new Entry("quick-ball", ItemKind.BALL, 1200, Use.BALL, 50, "첫 번째로 던지면 85%"),
            new Entry("timer-ball", ItemKind.BALL, 1100, Use.BALL, 50, "던질수록 50 → 70 → 90%"),
            new Entry("luxury-ball", ItemKind.BALL, 1600, Use.BALL, 70, "포획률 70% · 잡은 포켓몬이 Lv.5 로 시작"),
            new Entry("master-ball", ItemKind.BALL, 5000, Use.BALL, 85, "어떤 보스든 85% (전설도 그대로)"),
            // 회복
            new Entry("potion", ItemKind.HEALING, 150, Use.HEAL, 25, "던전에서 체력 25% 회복"),
            new Entry("super-potion", ItemKind.HEALING, 350, Use.HEAL, 50, "던전에서 체력 50% 회복"),
            new Entry("hyper-potion", ItemKind.HEALING, 700, Use.HEAL, 100, "던전에서 체력 모두 회복"),
            new Entry("full-restore", ItemKind.HEALING, 1200, Use.HEAL, 100, "체력 모두 회복 + 3초 무적"),
            new Entry("revive", ItemKind.HEALING, 1500, Use.REVIVE, 50, "쓰러지면 한 번 체력 50%로 일어남"),
            // 전투 도구 (그 판 동안)
            new Entry("x-attack", ItemKind.TOOL, 400, Use.BUFF_ATTACK, 15, "그 판 공격력 +15%"),
            new Entry("x-speed", ItemKind.TOOL, 400, Use.BUFF_SPEED, 10, "그 판 이동·공격 속도 +10%"),
            new Entry("x-defense", ItemKind.TOOL, 400, Use.BUFF_DEFENSE, 15, "그 판 받는 피해 -15%"),
            new Entry("dire-hit", ItemKind.TOOL, 450, Use.BUFF_CRIT, 10, "그 판 급소 확률 +10%"),
            new Entry("lucky-egg", ItemKind.TOOL, 1800, Use.BUFF_EXP, 50, "그 판 포켓몬 경험치 +50%"),
            new Entry("amulet-coin", ItemKind.TOOL, 1800, Use.BUFF_GOLD, 50, "그 판 골드 +50%"),
            // 성장
            new Entry("rare-candy", ItemKind.TOOL, 600, Use.CANDY, 1, "포켓몬 레벨 +1"));

    public static Optional<Entry> byCode(String code) {
        return ALL.stream().filter(e -> e.code().equals(code)).findFirst();
    }

    /** 보스 포획 상황 */
    public record Ctx(String biome, List<String> bossTypes, double bossWeightKg, int bossSpeed, int bossLevel,
                      int leaderLevel, int throwIndex, boolean legendary) {}

    /** 볼 + 상황 → [포획률, 이유(없으면 null)] */
    public static Object[] ballRate(String code, Ctx c) {
        int base = byCode(code).filter(e -> e.use() == Use.BALL).map(Entry::value).orElse(code.equals("poke-ball") ? 50 : 60);
        int rate = base;
        String note = null;
        switch (code) {
            case "net-ball" -> { if (hasAny(c.bossTypes(), "물", "벌레")) { rate = 85; note = "물·벌레 타입!"; } }
            case "dive-ball" -> { if ("SEA".equals(c.biome())) { rate = 85; note = "바다에서!"; } }
            case "dusk-ball" -> { if ("CAVE".equals(c.biome()) || "GHOST".equals(c.biome())) { rate = 85; note = "어두운 곳!"; } }
            case "heavy-ball" -> { if (c.bossWeightKg() >= 100) { rate = 85; note = "무거운 보스!"; } }
            case "fast-ball" -> { if (c.bossSpeed() >= 100) { rate = 85; note = "빠른 보스!"; } }
            case "moon-ball" -> { if (hasAny(c.bossTypes(), "고스트", "에스퍼", "페어리")) { rate = 85; note = "신비한 타입!"; } }
            case "level-ball" -> { if (c.leaderLevel() >= c.bossLevel()) { rate = 85; note = "레벨이 높아요!"; } }
            case "quick-ball" -> { if (c.throwIndex() == 0) { rate = 85; note = "첫 번째 던지기!"; } }
            case "timer-ball" -> { rate = new int[]{50, 70, 90}[Math.min(2, c.throwIndex())]; note = (c.throwIndex() + 1) + "번째"; }
            default -> { }
        }
        // 전설·환상은 잡기 어려움 (마스터볼 제외)
        if (c.legendary() && !code.equals("master-ball")) {
            rate = (int) Math.round(rate * 0.7);
            note = note == null ? "전설은 잡기 어려워요" : note + " (전설 ×0.7)";
        }
        return new Object[]{rate, note};
    }

    private static boolean hasAny(List<String> types, String... want) {
        return types.stream().anyMatch(Set.of(want)::contains);
    }

    /** 오늘의 특가: 날짜마다 하나 30% 할인 (몬스터볼·성장 아이템 중) */
    public static String dealOf(java.time.LocalDate date) {
        List<Entry> pool = ALL.stream().filter(e -> e.price() >= 500).toList();
        return pool.get((int) Math.floorMod(date.toEpochDay() * 31 + 7, pool.size())).code();
    }

    public static int priceOf(Entry e, java.time.LocalDate date) {
        return e.code().equals(dealOf(date)) ? (int) Math.round(e.price() * 0.7 / 10.0) * 10 : e.price();
    }
}
