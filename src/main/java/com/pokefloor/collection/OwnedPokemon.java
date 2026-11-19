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

    /** 던전에서 얻은 경험치 (별 0~3개, Growth 참고) */
    private Integer exp;

    /** 이로치(색이 다른 모습)를 얻었는지, 박스에서 이로치 모습으로 보일지 */
    private Boolean shiny;
    private Boolean showShiny;

    /** 놓인 박스와 박스 안 타일(0~11). 인벤토리(미배치)면 모두 null */
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
    public int getExp() { return exp == null ? 0 : exp; }
    /** 경험치 더하기 (최대치에서 멈춤) → 더해진 양 */
    public int addExp(int n) {
        int before = getExp();
        this.exp = Math.min(Growth.maxExp(), before + Math.max(0, n));
        return this.exp - before;
    }
    public boolean isShiny() { return Boolean.TRUE.equals(shiny); }
    public void setShiny(boolean shiny) { this.shiny = shiny; }
    public boolean isShowShiny() { return isShiny() && !Boolean.FALSE.equals(showShiny); }
    public void setShowShiny(boolean showShiny) { this.showShiny = showShiny; }

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
