package com.pokefloor.pokemon;

import java.util.Set;

/** 1~4세대 전설·환상 포켓몬. 보스·카드에 잘 안 나오고, 던전 능력치는 종족값 합 600 기준으로 눌러 둠 */
public final class Legendary {
    private Legendary() {}

    public static final Set<Integer> IDS = Set.of(
            144, 145, 146, 150, 151,
            243, 244, 245, 249, 250, 251,
            377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
            480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493);

    /** 일반 포켓몬 대비 등장 가중치 */
    public static final double APPEAR_WEIGHT = 0.12;

    /** 던전 능력치 계산에 쓰는 종족값 합 상한 (일반 최종 진화 약 500 의 1.2배) */
    public static final int STAT_CAP = 600;

    public static boolean is(int id) {
        return IDS.contains(id);
    }
}
