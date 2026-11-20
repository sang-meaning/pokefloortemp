package com.pokefloor.run;

/**
 * 던전 난이도 5단계. 앞 단계를 클리어해야 다음 단계가 열림.
 *  hp·dmg·spawn: 몬스터·보스 체력/공격력/몰려오는 양 배율 (브라우저 전투에 적용)
 *  gold·exp: 보상 배율, legend: 전설 보스 등장 가중치 배율, bossLv: 보스 레벨 보정
 */
public enum Tier {
    EASY("EASY", "이지", 0.7, 0.7, 0.85, 0.8, 0.8, 0.5, -2),
    NORMAL("NORMAL", "노말", 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0),
    HARD("HARD", "하드", 1.7, 1.4, 1.15, 1.6, 1.4, 2.0, 8),
    EXTREME("EXTREME", "익스트림", 2.8, 1.9, 1.3, 2.4, 1.9, 3.5, 18),
    NIGHTMARE("NIGHTMARE", "나이트메어", 4.5, 2.6, 1.45, 3.5, 2.6, 6.0, 30);

    public final String label, nameKo;
    public final double hp, dmg, spawn, gold, exp, legend;
    public final int bossLv;

    Tier(String label, String nameKo, double hp, double dmg, double spawn, double gold, double exp, double legend, int bossLv) {
        this.label = label; this.nameKo = nameKo; this.hp = hp; this.dmg = dmg; this.spawn = spawn;
        this.gold = gold; this.exp = exp; this.legend = legend; this.bossLv = bossLv;
    }

    /** 단계 번호 1~5 */
    public int no() { return ordinal() + 1; }

    public RunDtos.TierInfo info(int cleared) {
        return new RunDtos.TierInfo(name(), label, nameKo, no(), hp, dmg, spawn, gold, exp, legend,
                no() <= cleared + 1, no() <= cleared);
    }
}
