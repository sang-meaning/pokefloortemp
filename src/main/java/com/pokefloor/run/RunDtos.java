package com.pokefloor.run;

import com.pokefloor.collection.OwnedDto;
import com.pokefloor.pokemon.PokemonDto;

import java.util.List;
import java.util.Map;

public final class RunDtos {
    private RunDtos() {}

    public record BiomeOption(String id, String name, String emoji, String description,
                              List<String> bossTypes, List<String> mobTypes) {}

    /** 오늘의 던전: 날짜로 정해지는 바이옴 3개 */
    public record Today(String date, List<BiomeOption> options, long gold) {}

    /** party: 데려갈 포켓몬 번호(1~3마리, 첫 번째가 리더), bring: 가져갈 상처약·X아이템 {code: 개수} */
    public record StartRequest(String biome, List<Integer> party, Map<String, Integer> bring) {}

    /** 던전용 능력치 (종족값 × 별 성장) */
    public record Combat(double hp, double attack, double defense, double speed, int stars, double multiplier) {}

    public record Member(OwnedDto owned, Combat combat) {}

    public record Brought(String code, int itemId, String name, String sprite, int qty, String use, int value) {}

    public record Start(String runId, BiomeOption biome, List<Member> party, PokemonDto boss, boolean bossShiny,
                        boolean bossCapturable, List<PokemonDto> mobs, List<Brought> brought,
                        double difficulty, long gold) {}

    /** used: 던전 안에서 쓴 상처약 {code: 개수}. 안 쓴 것은 인벤토리로 돌아감 */
    public record FinishRequest(boolean won, int kills, int elites, double timeSec, int gold, Map<String, Integer> used) {}

    public record ExpGain(OwnedDto owned, int gained, int expBefore, int starsBefore) {}

    public record Ball(String code, int itemId, String name, String sprite, int qty, int rate) {}

    public record Finish(boolean won, int gold, long walletGold, List<ExpGain> exp,
                         boolean capturable, String captureNote, List<Ball> balls) {}

    public record CaptureRequest(String ball) {}

    public record Capture(boolean success, int shakes, int throwsLeft, boolean fled, OwnedDto caught, List<Ball> balls) {}
}
