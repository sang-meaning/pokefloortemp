package com.pokefloor.run;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 바이옴별 던전 진행도: 클리어한 가장 높은 난이도 단계 (0 = 아직 없음, 1 = 이지 …) */
@Entity
@Table(name = "biome_progress")
public class BiomeProgress {

    @Id
    private String biome;

    private int cleared;

    protected BiomeProgress() {}

    public BiomeProgress(String biome) {
        this.biome = biome;
    }

    public String getBiome() { return biome; }
    public int getCleared() { return cleared; }

    /** 더 높은 단계를 깼으면 기록하고 true */
    public boolean clear(int no) {
        if (no <= cleared) return false;
        cleared = no;
        return true;
    }
}
