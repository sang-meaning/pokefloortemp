package com.pokefloor.game;

/** 카드 게임 난이도: 판 크기(행×열)와 제한시간 */
public enum GameLevel {
    EASY("쉬움", 3, 4, 45),
    NORMAL("보통", 4, 4, 60),
    HARD("어려움", 4, 5, 80);

    public final String label;
    public final int rows;
    public final int cols;
    public final int limitSeconds;

    GameLevel(String label, int rows, int cols, int limitSeconds) {
        this.label = label;
        this.rows = rows;
        this.cols = cols;
        this.limitSeconds = limitSeconds;
    }

    public int pairs() {
        return rows * cols / 2;
    }
}
