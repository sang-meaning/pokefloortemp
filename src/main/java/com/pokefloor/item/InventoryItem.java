package com.pokefloor.item;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 내 인벤토리: 아이템별 개수 (박스에 놓은 것은 빠짐) */
@Entity
@Table(name = "inventory_item")
public class InventoryItem {

    @Id
    private Integer itemId;

    private int qty;

    protected InventoryItem() {}

    public InventoryItem(Integer itemId, int qty) {
        this.itemId = itemId;
        this.qty = qty;
    }

    public Integer getItemId() { return itemId; }
    public int getQty() { return qty; }
    public void add(int n) { this.qty = Math.max(0, qty + n); }
}
