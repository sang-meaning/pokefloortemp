package com.pokefloor.furniture;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 방에 놓인 가구 하나.
 *  sprite : Kenney 이미지 이름 (예: loungeSofa_SW, 끝의 _SE/_SW/_NE/_NW 가 방향)
 *  x, y   : 놓인 타일
 *  lift   : 다른 가구 위에 얹을 때 높이 (원본 이미지 px 기준, 바닥이면 0)
 */
@Entity
@Table(name = "furniture")
public class Furniture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sprite;
    private int x;
    private int y;
    private int lift;

    protected Furniture() {}

    public Furniture(String sprite, int x, int y, int lift) {
        this.sprite = sprite;
        this.x = x;
        this.y = y;
        this.lift = lift;
    }

    public void update(String sprite, int x, int y, int lift) {
        this.sprite = sprite;
        this.x = x;
        this.y = y;
        this.lift = lift;
    }

    public Long getId() { return id; }
    public String getSprite() { return sprite; }
    public int getX() { return x; }
    public int getY() { return y; }
    public int getLift() { return lift; }
}
