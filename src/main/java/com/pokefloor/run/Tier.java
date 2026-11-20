package com.pokefloor.run;

/**
 * 던전 난이도 6단계(마지막은 숨김). 바이옴마다 따로, 앞 단계를 클리어해야 다음 단계가 열림.
 *  hp·dmg·spawn: 몬스터·보스 체력/공격력/몰려오는 양 배율 (브라우저 전투에 적용)
 *  gold·exp: 보상 배율, legend: 보스가 전설·환상일 확률(0~1), bossLv: 보스 레벨 보정
 */
public enum Tier {
    EASY("EASY", "이지", 0.7, 0.7, 0.85, 0.8, 0.8, 0.005, -2),
    NORMAL("NORMAL", "노말", 1.0, 1.0, 1.0, 1.0, 1.0, 0.01, 0),
    HARD("HARD", "하드", 1.7, 1.4, 1.15, 1.6, 1.4, 0.02, 8),
    EXTREME("EXTREME", "익스트림", 2.8, 1.9, 1.3, 2.4, 1.9, 0.03, 18),
    NIGHTMARE("NIGHTMARE", "나이트메어", 5.0, 3.0, 1.5, 4.0, 3.0, 0.05, 35),
    /** 숨겨진 단계: 나이트메어를 깨야 열림 */
    ABYSS("ABYSS", "어비스", 9.0, 4.5, 1.75, 7.0, 5.0, 0.10, 60);

    public final String label, nameKo;
    public final double hp, dmg, spawn, gold, exp, legend;
    public final int bossLv;

    Tier(String label, String nameKo, double hp, double dmg, double spawn, double gold, double exp, double legend, int bossLv) {
        this.label = label; this.nameKo = nameKo; this.hp = hp; this.dmg = dmg; this.spawn = spawn;
        this.gold = gold; this.exp = exp; this.legend = legend; this.bossLv = bossLv;
    }

    /** 단계 번호 1~6 */
    public int no() { return ordinal() + 1; }

    public RunDtos.TierInfo info(int cleared) {
        return new RunDtos.TierInfo(name(), label, nameKo, no(), hp, dmg, spawn, gold, exp, legend,
                no() <= cleared + 1, no() <= cleared);
    }
}
