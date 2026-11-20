package com.pokefloor.collection;

/**
 * 포켓몬 성장: 던전에서 얻는 경험치로 레벨 1~100.
 * 레벨이 1 오를 때마다 던전 능력치 +2% (Lv.50 ≈ 2배, Lv.100 ≈ 3배)
 */
public final class Growth {
    private Growth() {}

    public static final int MAX_LEVEL = 100;

    /** lv → lv+1 에 필요한 경험치 */
    public static int toNext(int lv) {
        return 30 + 12 * lv;
    }

    /** 레벨 lv 이 시작되는 누적 경험치 */
    public static int expAt(int lv) {
        int sum = 0;
        for (int l = 1; l < lv; l++) sum += toNext(l);
        return sum;
    }

    public static int level(int exp) {
        int lv = 1, need = 0;
        while (lv < MAX_LEVEL) {
            need += toNext(lv);
            if (exp < need) break;
            lv++;
        }
        return lv;
    }

    /** 다음 레벨이 되는 누적 경험치 (최대면 null) */
    public static Integer nextLevelExp(int exp) {
        int lv = level(exp);
        return lv >= MAX_LEVEL ? null : expAt(lv + 1);
    }

    public static int maxExp() {
        return expAt(MAX_LEVEL);
    }

    /** 레벨 배율: 1 + 2% × (레벨-1) */
    public static double multiplier(int level) {
        return 1 + 0.02 * (level - 1);
    }
}
