package com.pokefloor.item;

import com.pokefloor.pokemon.PokeApiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 아이템 카탈로그 채우기.
 *  - PokéAPI: 몬스터볼(일반·특수·약포볼), 진화 도구, 회복약, 나무열매, 지닌 물건 → 한국어 이름 + 도트 이미지
 *  - 배지: PokéAPI sprites 저장소의 badges/N.png (관동 8개, 이름은 직접 넣음)
 * 처음 실행할 때 비어 있으면 백그라운드로 받아 옴. 관리자 페이지에서 다시 받기 가능.
 */
@Component
public class ItemSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ItemSeeder.class);
    private static final String BADGE_SPRITE =
            "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/%d.png";
    private static final String[][] KANTO_BADGES = {
            {"boulder-badge", "그레이배지"}, {"cascade-badge", "블루배지"}, {"thunder-badge", "오렌지배지"},
            {"rainbow-badge", "레인보우배지"}, {"soul-badge", "핑크배지"}, {"marsh-badge", "골드배지"},
            {"volcano-badge", "크림슨배지"}, {"earth-badge", "그린배지"},
    };

    private final PokeApiClient client;
    private final ItemRepository repository;
    private final AtomicInteger done = new AtomicInteger();
    private volatile int total = 0;
    private volatile boolean running = false;

    public ItemSeeder(PokeApiClient client, ItemRepository repository) {
        this.client = client;
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments args) {
        seedBadges();
        if (repository.countByKindNot(ItemKind.BADGE) == 0) startImport();
        else Thread.ofVirtual().name("shop-items").start(this::ensureShopItems);
    }

    /** 상점에서 파는 아이템이 카탈로그에 없으면 받아 옴 (이상한사탕, X공격 등은 위 분류에 없음) */
    public void ensureShopItems() {
        for (ShopItems.Entry e : ShopItems.ALL) {
            if (repository.existsByCode(e.code())) continue;
            for (int attempt = 1; attempt <= 3; attempt++) {
                try { importOne(e.code(), e.kind()); break; } catch (Exception ex) {
                    if (attempt == 3) log.warn("상점 아이템 {} 받기 실패: {}", e.code(), ex.getMessage());
                }
            }
        }
    }

    private void seedBadges() {
        for (int i = 0; i < KANTO_BADGES.length; i++) {
            int id = Item.BADGE_BASE + i + 1;
            if (!repository.existsById(id)) {
                repository.save(new Item(id, KANTO_BADGES[i][0], KANTO_BADGES[i][1], ItemKind.BADGE,
                        BADGE_SPRITE.formatted(i + 1)));
            }
        }
    }

    /** 이미 진행 중이면 false */
    public synchronized boolean startImport() {
        if (running) return false;
        running = true;
        done.set(0);
        total = 0;
        Thread.ofVirtual().name("item-import").start(this::importAll);
        return true;
    }

    private void importAll() {
        try {
            // 1) 분류별 아이템 이름 모으기
            record Job(String name, ItemKind kind) {}
            List<Job> jobs = new ArrayList<>();
            for (ItemKind kind : ItemKind.values()) {
                for (String category : kind.categories()) {
                    try {
                        for (JsonNode it : client.getItemCategory(category).get("items")) {
                            jobs.add(new Job(it.get("name").asString(), kind));
                        }
                    } catch (Exception e) {
                        log.warn("아이템 분류 {} 받기 실패: {}", category, e.getMessage());
                    }
                }
            }
            total = jobs.size();
            log.info("아이템 {}개를 PokéAPI 에서 받아오는 중...", total);
            // 2) 아이템마다 한국어 이름·이미지
            try (ExecutorService pool = Executors.newFixedThreadPool(6)) {
                for (Job job : jobs) {
                    pool.submit(() -> {
                        for (int attempt = 1; attempt <= 3; attempt++) {
                            try {
                                importOne(job.name(), job.kind());
                                break;
                            } catch (Exception e) {
                                if (attempt == 3) log.warn("아이템 {} 받기 실패: {}", job.name(), e.getMessage());
                            }
                        }
                        done.incrementAndGet();
                    });
                }
                pool.shutdown();
                pool.awaitTermination(30, TimeUnit.MINUTES);
            }
            ensureShopItems();
            log.info("아이템 받기 끝: {}개 저장", repository.count());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            running = false;
        }
    }

    private void importOne(String name, ItemKind kind) {
        JsonNode n = client.getItem(name);
        int id = n.get("id").asInt();
        if (repository.existsById(id)) return;
        JsonNode spriteNode = n.path("sprites").path("default");
        if (spriteNode.isNull() || spriteNode.isMissingNode()) return;   // 그림 없는 아이템은 제외
        String nameKo = name;
        for (JsonNode nm : n.get("names")) {
            if ("ko".equals(nm.path("language").path("name").asString())) {
                nameKo = nm.get("name").asString();
                break;
            }
        }
        repository.save(new Item(id, name, nameKo, kind, spriteNode.asString()));
    }

    public ItemDtos.ImportStatus status() {
        return new ItemDtos.ImportStatus(running, done.get(), total, repository.count());
    }
}
