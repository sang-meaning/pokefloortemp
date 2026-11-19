package com.pokefloor.collection;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * 사용자가 획득한 포켓몬. 기본키가 도감 번호라서 같은 포켓몬은 한 번만 획득할 수 있음.
 * (로그인 없는 1인용 기준)
 */
@Entity
@Table(name = "owned_pokemon")
public class OwnedPokemon {

    @Id
    private Integer pokemonId;

    /** 본래 이름과 별개로 붙이는 별명 (없으면 null) */
    private String nickname;

    /** 방에 나와서 돌아다니는지 */
    private boolean placed;

    private LocalDateTime obtainedAt;

    protected OwnedPokemon() {}

    public OwnedPokemon(Integer pokemonId) {
        this.pokemonId = pokemonId;
        this.obtainedAt = LocalDateTime.now();
    }

    public Integer getPokemonId() { return pokemonId; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public boolean isPlaced() { return placed; }
    public void setPlaced(boolean placed) { this.placed = placed; }
    public LocalDateTime getObtainedAt() { return obtainedAt; }
}
