package com.pokefloor.pokemon;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 처음 실행할 때 DB 가 비어 있으면 1세대(1~151번) 포켓몬을 PokéAPI 에서 받아 저장.
 * 서버 시작을 막지 않도록 백그라운드에서 진행하고, 진행 상황은 /api/pokemon/seed-status 로 확인.
 */
@Component
public class PokemonSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PokemonSeeder.class);

    private final PokemonService service;
    private final int from;
    private final int to;

    private final AtomicInteger done = new AtomicInteger();
    private volatile int total = 0;
    private volatile boolean running = false;

    public PokemonSeeder(PokemonService service,
                         @Value("${pokefloor.seed.from:1}") int from,
                         @Value("${pokefloor.seed.to:151}") int to) {
        this.service = service;
        this.from = from;
        this.to = to;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (service.count() > 0) return;
        total = to - from + 1;
        running = true;
        Thread.ofVirtual().name("pokemon-seeder").start(this::seed);
    }

    private void seed() {
        log.info("포켓몬 {}~{}번을 PokéAPI 에서 받아오는 중...", from, to);
        try (ExecutorService pool = Executors.newFixedThreadPool(6)) {
            for (int id = from; id <= to; id++) {
                final int dex = id;
                pool.submit(() -> {
                    for (int attempt = 1; attempt <= 3; attempt++) {
                        try {
                            if (!service.exists(dex)) service.importFromApi(dex);
                            break;
                        } catch (Exception e) {
                            if (attempt == 3) log.warn("{}번 받기 실패: {}", dex, e.getMessage());
                        }
                    }
                    int n = done.incrementAndGet();
                    if (n % 25 == 0 || n == total) log.info("포켓몬 받기 {}/{}", n, total);
                });
            }
            pool.shutdown();
            pool.awaitTermination(30, TimeUnit.MINUTES);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            running = false;
        }
    }

    public SeedStatus status() {
        return new SeedStatus(running, done.get(), total, service.count());
    }

    public record SeedStatus(boolean running, int done, int total, long stored) {}
}
