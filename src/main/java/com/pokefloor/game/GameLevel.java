package com.pokefloor.game;

/** 카드 게임 난이도: 판 크기(행×열), 제한시간, 판에 전설·환상 카드가 섞일 확률 */
public enum GameLevel {
    EASY("쉬움", 3, 4, 45, 0.02),
    NORMAL("보통", 4, 4, 60, 0.06),
    HARD("어려움", 4, 5, 80, 0.15);

    public final String label;
    public final int rows;
    public final int cols;
    public final int limitSeconds;
    public final double legendChance;

    GameLevel(String label, int rows, int cols, int limitSeconds, double legendChance) {
        this.label = label;
        this.rows = rows;
        this.cols = cols;
        this.limitSeconds = limitSeconds;
        this.legendChance = legendChance;
    }

    public int pairs() {
        return rows * cols / 2;
    }
}
