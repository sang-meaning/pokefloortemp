package com.pokefloor.collection;

import com.pokefloor.pokemon.PokemonDto;

import java.time.LocalDateTime;

/** 획득한 포켓몬 + 포켓몬 정보 */
public record OwnedDto(
        PokemonDto pokemon,
        String nickname,
        boolean placed,
        Long boxId,
        Integer x,
        Integer y,
        int exp,
        int level,             // 레벨 1~100 (던전 능력치 레벨당 +2%)
        int levelExp,          // 지금 레벨이 시작된 누적 경험치
        Integer nextLevelExp,  // 다음 레벨이 되는 누적 경험치 (Lv.100 이면 null)
        boolean shiny,         // 이로치를 얻었는지
        boolean showShiny,     // 박스에서 이로치 모습으로 보일지
        LocalDateTime obtainedAt
) {
    /** 화면에 표시할 이름: 별명이 있으면 별명 */
    public String displayName() {
        return nickname == null || nickname.isBlank() ? pokemon.nameKo() : nickname;
    }
}
