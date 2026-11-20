package com.pokefloor.admin;

import com.pokefloor.run.BiomeProgress;
import com.pokefloor.run.BiomeProgressRepository;
import com.pokefloor.run.Tier;
import com.pokefloor.world.Biome;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** 관리자용 던전 도구: 모든 바이옴의 난이도 해금 / 초기화. 시연용이라 잠금 없음 */
@RestController
@RequestMapping("/api/admin/dungeon")
public class AdminDungeonController {

    private final BiomeProgressRepository progress;

    public AdminDungeonController(BiomeProgressRepository progress) {
        this.progress = progress;
    }

    /** cleared 단계까지 깬 것으로 기록 (기본: 마지막 앞 단계까지 → 숨겨진 단계 포함 전부 열림, 0 이면 초기화) */
    @PostMapping("/unlock")
    @Transactional
    public Map<String, Integer> unlock(@RequestParam(defaultValue = "-1") int cleared) {
        int max = Tier.values().length;
        int c = cleared < 0 ? max - 1 : Math.min(cleared, max);
        for (Biome b : Biome.values()) {
            BiomeProgress p = progress.findById(b.name()).orElseGet(() -> new BiomeProgress(b.name()));
            p.set(c);
            progress.save(p);
        }
        return Map.of("cleared", c);
    }
}
