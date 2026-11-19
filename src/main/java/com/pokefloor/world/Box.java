package com.pokefloor.world;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

/**
 * 박스 = 12×12 타일짜리 땅 한 덩어리. 바이옴은 박스마다 하나.
 * (bx, by) 는 박스 격자 좌표. 메인 박스는 (0, 0) 에 고정이고 지울 수 없음.
 */
@Entity
@Table(name = "box", uniqueConstraints = @UniqueConstraint(columnNames = {"bx", "by"}))
public class Box {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int bx;

    @Column(nullable = false)
    private int by;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Biome biome;

    private boolean main;

    private LocalDateTime createdAt;

    protected Box() {}

    public Box(int bx, int by, Biome biome, boolean main) {
        this.bx = bx;
        this.by = by;
        this.biome = biome;
        this.main = main;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public int getBx() { return bx; }
    public int getBy() { return by; }
    public Biome getBiome() { return biome; }
    public boolean isMain() { return main; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
