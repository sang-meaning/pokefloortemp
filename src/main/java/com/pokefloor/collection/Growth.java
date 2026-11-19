package com.pokefloor.collection;

/**
 * 포켓몬 성장: 던전에서 얻는 경험치로 별 0~3개.
 * 별 하나마다 능력치 10~20% 상승 (종족값이 낮은 포켓몬일수록 많이 오름 → 약한 포켓몬도 쓸 만하게)
 */
public final class Growth {
    private Growth() {}

    public static final int MAX_STARS = 3;
    /** 별 n개가 되는 누적 경험치 */
    public static final int[] STAR_EXP = {0, 100, 350, 850};

    public static int stars(int exp) {
        int s = 0;
        while (s < MAX_STARS && exp >= STAR_EXP[s + 1]) s++;
        return s;
    }

    /** 다음 별까지 필요한 누적 경험치 (최대면 null) */
    public static Integer nextStarExp(int exp) {
        int s = stars(exp);
        return s >= MAX_STARS ? null : STAR_EXP[s + 1];
    }

    public static int maxExp() {
        return STAR_EXP[MAX_STARS];
    }

    /** 별 하나당 성장률 0.10~0.20 (종족값 합 600 이상 → 10%, 300 이하 → 20%) */
    public static double growthRate(int baseTotal) {
        double t = Math.max(0, Math.min(1, (600 - baseTotal) / 300.0));
        return 0.10 + 0.10 * t;
    }

    /** 별 개수만큼 성장한 배율 */
    public static double multiplier(int baseTotal, int stars) {
        return Math.pow(1 + growthRate(baseTotal), stars);
    }
}
