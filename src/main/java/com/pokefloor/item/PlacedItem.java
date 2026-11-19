package com.pokefloor.item;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/** 박스에 꺼내 놓은 아이템 1개. 회수하면 인벤토리 개수 +1 */
@Entity
@Table(name = "placed_item", indexes = @Index(columnList = "boxId"))
public class PlacedItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer itemId;

    @Column(nullable = false)
    private Long boxId;

    private int x;
    private int y;

    protected PlacedItem() {}

    public PlacedItem(Integer itemId, Long boxId, int x, int y) {
        this.itemId = itemId;
        this.boxId = boxId;
        this.x = x;
        this.y = y;
    }

    public Long getId() { return id; }
    public Integer getItemId() { return itemId; }
    public Long getBoxId() { return boxId; }
    public int getX() { return x; }
    public int getY() { return y; }

    public void moveTo(Long boxId, int x, int y) {
        this.boxId = boxId;
        this.x = x;
        this.y = y;
    }
}
