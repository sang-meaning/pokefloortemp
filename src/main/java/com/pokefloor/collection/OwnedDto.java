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
        int stars,
        Integer nextStarExp,   // 다음 별까지 누적 경험치 (별 3개면 null)
        int starExp,           // 지금 별이 된 누적 경험치
        boolean shiny,         // 이로치를 얻었는지
        boolean showShiny,     // 박스에서 이로치 모습으로 보일지
        LocalDateTime obtainedAt
) {
    /** 화면에 표시할 이름: 별명이 있으면 별명 */
    public String displayName() {
        return nickname == null || nickname.isBlank() ? pokemon.nameKo() : nickname;
    }
}
