package com.pokefloor.player;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 골드 지갑 (로그인 없는 1인용이라 id=1 한 줄) */
@Entity
@Table(name = "wallet")
public class Wallet {

    public static final long ID = 1L;

    @Id
    private Long id;

    private long gold;

    protected Wallet() {}

    public Wallet(long gold) {
        this.id = ID;
        this.gold = gold;
    }

    public long getGold() { return gold; }
    public void add(long n) { this.gold = Math.max(0, gold + n); }
}
