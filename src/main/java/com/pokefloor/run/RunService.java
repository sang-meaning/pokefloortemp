package com.pokefloor.run;

import com.pokefloor.collection.CollectionService;
import com.pokefloor.collection.Growth;
import com.pokefloor.collection.OwnedDto;
import com.pokefloor.item.Item;
import com.pokefloor.item.ItemKind;
import com.pokefloor.item.ItemRepository;
import com.pokefloor.item.ItemService;
import com.pokefloor.item.ShopItems;
import com.pokefloor.player.WalletService;
import com.pokefloor.pokemon.Pokemon;
import com.pokefloor.pokemon.PokemonDto;
import com.pokefloor.pokemon.PokemonService;
import com.pokefloor.run.RunDtos.*;
import com.pokefloor.world.Biome;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 오늘의 던전 (뱀파이어 서바이벌식 3분 로그라이크).
 *  - 날짜마다 바이옴 3개 → 하나 골라 출격. (개발 중이라 하루 횟수 제한 없음)
 *  - 서버: 보스·몬스터 구성, 파티 능력치 계산, 결과 검증(골드 상한), 경험치·골드 지급, 몬스터볼 포획 판정
 *  - 전투 자체는 브라우저(dungeon.js)에서 진행
 */
@Service
public class RunService {

    public static final int MAX_PARTY = 3;
    public static final int MAX_THROWS = 3;
    public static final double RUN_SECONDS = 180;
    /** 전설은 보스·몬스터로 안 나옴 */
    private static final Set<Integer> LEGENDARY = Set.of(144, 145, 146, 150, 151);

    private final PokemonService pokemonService;
    private final CollectionService collection;
    private final ItemService items;
    private final ItemRepository itemRepository;
    private final WalletService wallet;
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    public RunService(PokemonService pokemonService, CollectionService collection, ItemService items,
                      ItemRepository itemRepository, WalletService wallet) {
        this.pokemonService = pokemonService;
        this.collection = collection;
        this.items = items;
        this.itemRepository = itemRepository;
        this.wallet = wallet;
    }

    private static final class Session {
        final String id = UUID.randomUUID().toString();
        final Instant startedAt = Instant.now();
        Biome biome;
        List<Integer> party;
        int bossId;
        boolean bossShiny;
        Map<String, Integer> brought = new HashMap<>();
        boolean finished;
        boolean won;
        boolean captured;
        int throwsUsed;
    }

    /* ---------- 오늘의 던전 ---------- */

    public Today today() {
        LocalDate date = LocalDate.now();
        List<Biome> all = new ArrayList<>(List.of(Biome.values()));
        Collections.shuffle(all, new Random(date.toEpochDay() * 7919L));
        return new Today(date.toString(), all.subList(0, 3).stream().map(RunService::option).toList(), wallet.gold());
    }

    static BiomeOption option(Biome b) {
        return new BiomeOption(b.name(), b.nameKo(), b.emoji(), b.description(), b.bossTypes(), b.mobTypes());
    }

    /* ---------- 출격 ---------- */

    @Transactional
    public Start start(StartRequest req) {
        cleanup();
        Biome biome;
        try {
            biome = Biome.valueOf(String.valueOf(req.biome()).toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "없는 바이옴이에요");
        }
        List<Integer> party = req.party() == null ? List.of() : req.party().stream().distinct().toList();
        if (party.isEmpty() || party.size() > MAX_PARTY) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "포켓몬 1~3마리를 데려가요");
        }
        List<Member> members = new ArrayList<>();
        for (int id : party) {
            if (!collection.isOwned(id)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "가지지 않은 포켓몬이에요");
            OwnedDto o = collection.toDto(collection.entity(id));
            members.add(new Member(o, combat(o)));
        }

        // 가져갈 상처약·X아이템: 출격할 때 인벤토리에서 빠지고, 안 쓴 상처약은 끝나면 돌려받음
        Session s = new Session();
        List<Brought> brought = new ArrayList<>();
        if (req.bring() != null) {
            for (var e : req.bring().entrySet()) {
                ShopItems.Entry entry = ShopItems.byCode(e.getKey())
                        .filter(x -> x.use() != ShopItems.Use.BALL && x.use() != ShopItems.Use.CANDY)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "가지고 갈 수 없는 아이템: " + e.getKey()));
                int n = Math.max(0, Math.min(e.getValue(), entry.use() == ShopItems.Use.HEAL ? 5 : 1));
                if (n == 0) continue;
                Item item = items.byCode(entry.code());
                items.consume(item.getId(), n);
                s.brought.merge(entry.code(), n, Integer::sum);
                brought.add(new Brought(entry.code(), item.getId(), item.getNameKo(), item.getSprite(), n,
                        entry.use().name(), entry.value()));
            }
        }

        List<Pokemon> pool = pokemonService.activeEntities().stream()
                .filter(p -> !LEGENDARY.contains(p.getId())).toList();
        Pokemon boss = pickBoss(pool, biome, party);
        List<PokemonDto> mobs = pickMobs(pool, biome);

        s.biome = biome;
        s.party = party;
        s.bossId = boss.getId();
        s.bossShiny = CollectionService.rollShiny();
        sessions.put(s.id, s);

        double avgStars = members.stream().mapToInt(m -> m.combat().stars()).average().orElse(0);
        return new Start(s.id, option(biome), members, PokemonDto.from(boss), s.bossShiny,
                collection.canAcquire(boss.getId(), s.bossShiny), mobs, brought,
                1 + 0.15 * avgStars + 0.05 * (members.size() - 1), wallet.gold());
    }

    /** 종족값 × 별 성장 배율 */
    static Combat combat(OwnedDto o) {
        PokemonDto.Stats st = o.pokemon().stats();
        int hp = st == null ? 50 : st.hp(), atk = st == null ? 55 : Math.max(st.attack(), st.spAttack());
        int def = st == null ? 50 : (st.defense() + st.spDefense()) / 2, spd = st == null ? 50 : st.speed();
        int bst = st == null ? 300 : st.bst();
        double m = Growth.multiplier(bst, o.stars());
        return new Combat(hp * m, atk * m, def * m, spd * m, o.stars(), m);
    }

    private static boolean hasType(Pokemon p, List<String> types) {
        return p.typeList().stream().anyMatch(types::contains);
    }

    /** 보스: 바이옴 보스 타입, 종족값 높은 쪽, 아직 없는 포켓몬이 더 잘 나옴 */
    private Pokemon pickBoss(List<Pokemon> pool, Biome biome, List<Integer> party) {
        List<Pokemon> cands = pool.stream().filter(p -> hasType(p, biome.bossTypes()) && !party.contains(p.getId())).toList();
        if (cands.isEmpty()) cands = pool;
        List<Pokemon> strong = cands.stream().filter(p -> p.baseTotal() >= 400).toList();
        if (strong.size() >= 2) cands = strong;
        double total = 0;
        double[] w = new double[cands.size()];
        for (int i = 0; i < w.length; i++) {
            w[i] = collection.isOwned(cands.get(i).getId()) ? 1 : 3;
            total += w[i];
        }
        double r = ThreadLocalRandom.current().nextDouble(total);
        for (int i = 0; i < w.length; i++) {
            r -= w[i];
            if (r <= 0) return cands.get(i);
        }
        return cands.getLast();
    }

    /** 일반 몬스터: 첫 번째 타입이 바이옴 몬스터 타입인 약한(진화 전) 포켓몬 위주로 최대 10종 */
    private List<PokemonDto> pickMobs(List<Pokemon> pool, Biome biome) {
        List<Pokemon> cands = new ArrayList<>(pool.stream()
                .filter(p -> !p.typeList().isEmpty() && biome.mobTypes().contains(p.typeList().getFirst())).toList());
        List<Pokemon> weak = cands.stream().filter(p -> p.baseTotal() <= 420).toList();
        if (weak.size() >= 4) cands = new ArrayList<>(weak);
        if (cands.isEmpty()) cands = new ArrayList<>(pool);
        Collections.shuffle(cands);
        return cands.stream().limit(10).map(PokemonDto::from).toList();
    }

    /* ---------- 결과 ---------- */

    @Transactional
    public Finish finish(String runId, FinishRequest req) {
        Session s = session(runId);
        if (s.finished) throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 끝난 판이에요");
        s.finished = true;
        double elapsed = Duration.between(s.startedAt, Instant.now()).toMillis() / 1000.0;
        // 보스까지 3분은 버텨야 승리 인정 (여유 두고 검사)
        boolean won = req.won() && elapsed >= RUN_SECONDS * 0.8;
        org.slf4j.LoggerFactory.getLogger(RunService.class).info("던전 결과: 보고 승리={} 경과 {}초 → 승리 인정={}", req.won(), (int) elapsed, won);
        s.won = won;
        int kills = Math.max(0, Math.min(req.kills(), (int) (elapsed * 6)));
        int elites = Math.max(0, Math.min(req.elites(), 12));

        // 골드: 주운 만큼, 상한 검사. 쓰러지면 절반만
        int cap = kills * 3 + elites * 20 + (won ? 300 : 0) + 50;
        int gold = Math.max(0, Math.min(req.gold(), cap));
        if (!won) gold /= 2;
        long walletGold = wallet.add(gold);

        // 안 쓴 상처약 돌려주기 (X아이템은 출격할 때 이미 효과 적용)
        Map<String, Integer> used = req.used() == null ? Map.of() : req.used();
        for (var e : s.brought.entrySet()) {
            ShopItems.Entry entry = ShopItems.byCode(e.getKey()).orElseThrow();
            if (entry.use() != ShopItems.Use.HEAL) continue;
            int back = e.getValue() - Math.max(0, Math.min(e.getValue(), used.getOrDefault(e.getKey(), 0)));
            if (back > 0) items.give(items.byCode(e.getKey()).getId(), back);
        }

        // 경험치: 처치 수 + 승리 보너스. 쓰러지면 60%
        int exp = (int) Math.round((10 + Math.min(kills, 400) * 0.15 + (won ? 60 : 0)) * (won ? 1 : 0.6));
        List<ExpGain> gains = new ArrayList<>();
        for (int id : s.party) {
            OwnedDto before = collection.toDto(collection.entity(id));
            int[] r = collection.addExp(id, exp);
            gains.add(new ExpGain(collection.toDto(collection.entity(id)), r[1] - r[0], before.exp(), before.stars()));
        }

        boolean capturable = won && collection.canAcquire(s.bossId, s.bossShiny);
        String note = !won ? "쓰러져서 보스를 잡을 수 없어요"
                : capturable ? (s.bossShiny ? "✨ 이로치 보스! 몬스터볼을 던져 보세요" : "몬스터볼을 던져 보세요 (최대 3번)")
                : "이미 가진 포켓몬이라 놓아줬어요";
        if (won && !capturable) walletGold = wallet.add(100);   // 이미 가진 보스 → 보답 골드
        return new Finish(won, gold, walletGold, gains, capturable, note, balls());
    }

    /* ---------- 포획 ---------- */

    @Transactional
    public Capture capture(String runId, CaptureRequest req) {
        Session s = session(runId);
        if (!s.finished || !s.won) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "보스를 쓰러뜨려야 던질 수 있어요");
        if (s.captured) throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 잡았어요");
        if (s.throwsUsed >= MAX_THROWS) throw new ResponseStatusException(HttpStatus.CONFLICT, "보스가 도망쳤어요");
        if (!collection.canAcquire(s.bossId, s.bossShiny)) throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 가진 포켓몬이에요");
        Item ball = items.byCode(String.valueOf(req.ball()));
        if (ball.getKind() != ItemKind.BALL) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "몬스터볼이 아니에요");
        items.consume(ball.getId(), 1);
        s.throwsUsed++;

        int rate = ShopItems.ballRate(ball.getCode());
        boolean success = ThreadLocalRandom.current().nextInt(100) < rate;
        // 흔들림 연출: 성공 3번, 실패는 0~2번 (아슬아슬할수록 많이)
        int shakes = success ? 3 : ThreadLocalRandom.current().nextInt(3);
        OwnedDto caught = null;
        if (success) {
            s.captured = true;
            caught = collection.acquire(s.bossId, s.bossShiny);
        }
        boolean fled = !success && s.throwsUsed >= MAX_THROWS;
        return new Capture(success, shakes, MAX_THROWS - s.throwsUsed, fled, caught, balls());
    }

    /** 가진 몬스터볼 목록 + 포획률 */
    public List<Ball> balls() {
        return itemRepository.findAllByOrderByKindAscIdAsc().stream()
                .filter(i -> i.getKind() == ItemKind.BALL)
                .map(i -> new Ball(i.getCode(), i.getId(), i.getNameKo(), i.getSprite(), items.qty(i.getId()),
                        ShopItems.ballRate(i.getCode())))
                .filter(b -> b.qty() > 0)
                .sorted(Comparator.comparingInt(Ball::rate))
                .toList();
    }

    private Session session(String id) {
        Session s = sessions.get(id);
        if (s == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "없거나 만료된 판이에요");
        return s;
    }

    private void cleanup() {
        Instant limit = Instant.now().minus(Duration.ofMinutes(40));
        sessions.values().removeIf(s -> s.startedAt.isBefore(limit));
    }
}
