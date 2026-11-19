package com.pokefloor.pokemon;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 처음 실행할 때 DB 가 비어 있으면 1세대(1~151번) 포켓몬을 PokéAPI 에서 받아 저장.
 * 관리자 페이지의 "범위로 추가" 도 같은 방식으로 동작.
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
        if (service.count() == 0) startImport(from, to);
        else Thread.ofVirtual().name("stats-backfill").start(this::backfillStats);
    }

    /** 예전 버전으로 받은 포켓몬에 종족값 채우기 */
    private void backfillStats() {
        List<Integer> ids = service.idsWithoutStats();
        if (ids.isEmpty()) return;
        log.info("종족값 없는 포켓몬 {}마리 보충 중...", ids.size());
        try (ExecutorService pool = Executors.newFixedThreadPool(6)) {
            for (int id : ids) {
                pool.submit(() -> {
                    for (int attempt = 1; attempt <= 3; attempt++) {
                        try { service.fillStats(id); break; } catch (Exception e) {
                            if (attempt == 3) log.warn("{}번 종족값 실패: {}", id, e.getMessage());
                        }
                    }
                });
            }
        }
        log.info("종족값 보충 끝");
    }

    /**
     * from~to 번을 백그라운드로 받아 저장 (이미 있는 번호는 건너뜀).
     * 이미 진행 중이면 false. 처음 실행 시 시드와 관리자 "범위 추가" 가 같이 사용
     */
    public synchronized boolean startImport(int from, int to) {
        if (running) return false;
        if (from < 1 || to < from) throw new IllegalArgumentException("잘못된 범위: " + from + "~" + to);
        done.set(0);
        total = to - from + 1;
        running = true;
        Thread.ofVirtual().name("pokemon-import").start(() -> importRange(from, to));
        return true;
    }

    private void importRange(int from, int to) {
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
