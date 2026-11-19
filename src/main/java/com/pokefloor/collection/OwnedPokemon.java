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

    /** 박스에 나와서 돌아다니는지 (false = 인벤토리) */
    private boolean placed;

    private LocalDateTime obtainedAt;

    /** 놓인 박스와 박스 안 타일(0~7). 인벤토리(미배치)면 모두 null */
    private Long boxId;
    private Integer tileX;
    private Integer tileY;

    protected OwnedPokemon() {}

    public OwnedPokemon(Integer pokemonId) {
        this.pokemonId = pokemonId;
        this.obtainedAt = LocalDateTime.now();
    }

    public Integer getPokemonId() { return pokemonId; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public boolean isPlaced() { return placed; }
    public Long getBoxId() { return boxId; }
    public Integer getTileX() { return tileX; }
    public Integer getTileY() { return tileY; }

    /** 박스의 (x, y) 칸에 꺼내 놓기 */
    public void placeAt(Long boxId, int x, int y) {
        this.placed = true;
        this.boxId = boxId;
        this.tileX = x;
        this.tileY = y;
    }

    /** 인벤토리로 넣기 (미배치) */
    public void unplace() {
        this.placed = false;
        this.boxId = null;
        this.tileX = null;
        this.tileY = null;
    }
    public LocalDateTime getObtainedAt() { return obtainedAt; }
}
