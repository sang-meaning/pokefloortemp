package com.pokefloor.game;

import com.pokefloor.collection.OwnedDto;

import java.util.List;

public final class GameDtos {
    private GameDtos() {}

    public record StartRequest(GameLevel level) {}

    /** 카드 한 장 (뒤집었을 때 보이는 포켓몬) */
    public record Card(int index, int pokemonId, String name, String image) {}

    public record StartResponse(String gameId, GameLevel level, int rows, int cols, int limitSeconds,
                                List<Card> cards, int newCandidates) {}

    /** matchedPairs: 맞춘 카드 위치 쌍 목록 [[0,5],[2,9],...] */
    public record FinishRequest(List<List<Integer>> matchedPairs) {}

    public enum Result { WIN, TIME_OVER, INVALID }

    /** reward 가 null 이면 이번 판 포켓몬을 이미 다 가지고 있던 경우 */
    public record FinishResponse(Result result, double elapsedSeconds, OwnedDto reward, String message) {}

    /** legendChance: 판에 전설·환상 카드가 한 장 섞일 확률 (0~1) */
    public record LevelInfo(GameLevel level, String label, int rows, int cols, int pairs, int limitSeconds, double legendChance) {}

    public record Overview(List<LevelInfo> levels, int poolSize, int owned) {}
}
