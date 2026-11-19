package com.pokefloor.item;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 아이템 도감(카탈로그). PokéAPI 의 아이템 + 관동 배지.
 * id: PokéAPI 아이템 번호. 배지는 겹치지 않게 BADGE_BASE + 배지 번호
 */
@Entity
@Table(name = "item")
public class Item {

    public static final int BADGE_BASE = 900_000;

    @Id
    private Integer id;

    /** PokéAPI 영문 키 (poke-ball 등) */
    @Column(nullable = false, length = 60)
    private String code;

    @Column(nullable = false, length = 60)
    private String nameKo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ItemKind kind;

    @Column(length = 300)
    private String sprite;

    protected Item() {}

    public Item(Integer id, String code, String nameKo, ItemKind kind, String sprite) {
        this.id = id;
        this.code = code;
        this.nameKo = nameKo;
        this.kind = kind;
        this.sprite = sprite;
    }

    public Integer getId() { return id; }
    public String getCode() { return code; }
    public String getNameKo() { return nameKo; }
    public ItemKind getKind() { return kind; }
    public String getSprite() { return sprite; }
}
