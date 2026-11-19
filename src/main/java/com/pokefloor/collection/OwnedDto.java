package com.pokefloor.collection;

import com.pokefloor.pokemon.PokemonDto;

import java.time.LocalDateTime;

/** 획득한 포켓몬 + 포켓몬 정보 */
public record OwnedDto(
        PokemonDto pokemon,
        String nickname,
        boolean placed,
        LocalDateTime obtainedAt
) {
    /** 화면에 표시할 이름: 별명이 있으면 별명 */
    public String displayName() {
        return nickname == null || nickname.isBlank() ? pokemon.nameKo() : nickname;
    }
}
