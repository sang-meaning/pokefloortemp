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
import com.pokefloor.pokemon.Legendary;
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
    public static final double MIN_SECONDS = 30;
    public static final double RUN_SECONDS = 180;    // 3분이 되면 처치 수와 상관없이 보스   // 아무리 강해도 보스까지 30초는 걸림

    private final PokemonService pokemonService;
    private final CollectionService collection;
    private final ItemService items;
    private final ItemRepository itemRepository;
    private final WalletService wallet;
    private final BiomeProgressRepository progress;
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    public RunService(PokemonService pokemonService, CollectionService collection, ItemService items,
                      ItemRepository itemRepository, WalletService wallet, BiomeProgressRepository progress) {
        this.pokemonService = pokemonService;
        this.collection = collection;
        this.items = items;
        this.itemRepository = itemRepository;
        this.wallet = wallet;
        this.progress = progress;
    }

    private static final class Session {
        final String id = UUID.randomUUID().toString();
        final Instant startedAt = Instant.now();
        Biome biome;
        List<Integer> party;
        int bossId;
        boolean bossShiny;
        Pokemon boss;
        int bossLevel;
        int leaderLevel;
        Tier tier = Tier.NORMAL;
        int killTarget;
        Map<String, Integer> brought = new HashMap<>();
        boolean finished;
        boolean won;
        boolean captured;
        int throwsUsed;
    }

    /* ---------- 오늘의 던전 ---------- */

    public Today today() {
        // 바이옴은 모두 고를 수 있고, 난이도 진행은 바이옴마다 따로
        Map<String, Integer> prog = new LinkedHashMap<>();
        for (Biome b : Biome.values()) prog.put(b.name(), cleared(b));
        return new Today(LocalDate.now().toString(), Arrays.stream(Biome.values()).map(RunService::option).toList(), wallet.gold(),
                prog, Arrays.stream(Tier.values()).map(t -> t.info(0)).toList());
    }

    private int cleared(Biome b) {
        return progress.findById(b.name()).map(BiomeProgress::getCleared).orElse(0);
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
        Tier tier;
        try {
            tier = req.tier() == null ? Tier.EASY : Tier.valueOf(req.tier().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "없는 난이도예요");
        }
        if (tier.no() > cleared(biome) + 1) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "앞 단계를 먼저 클리어해야 열려요");
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
                int n = Math.max(0, Math.min(e.getValue(), entry.use() == ShopItems.Use.HEAL ? 5 : 1));   // 회복약 5개, 나머지 1개
                if (n == 0) continue;
                Item item = items.byCode(entry.code());
                items.consume(item.getId(), n);
                s.brought.merge(entry.code(), n, Integer::sum);
                brought.add(new Brought(entry.code(), item.getId(), item.getNameKo(), item.getSprite(), n,
                        entry.use().name(), entry.value()));
            }
        }

        List<Pokemon> all = pokemonService.activeEntities();
        Pokemon boss = pickBoss(all, biome, party, tier);
        // 일반 몬스터로는 전설이 나오지 않음
        List<PokemonDto> mobs = pickMobs(all.stream().filter(p -> !Legendary.is(p.getId())).toList(), biome);

        double avgLv = members.stream().mapToInt(m -> m.combat().level()).average().orElse(1);
        s.biome = biome;
        s.party = party;
        s.boss = boss;
        s.bossId = boss.getId();
        s.bossShiny = CollectionService.rollShiny();
        s.leaderLevel = members.getFirst().combat().level();
        s.tier = tier;
        // 보스까지 쓰러뜨릴 수: 평범하면 2분 45초쯤, 다 쓸어버리면 1분쯤 (파티가 많을수록 조금 더)
        s.killTarget = 390 + 50 * (members.size() - 1);
        s.bossLevel = Math.max(1, (int) Math.round(avgLv) + 3 + tier.bossLv + (Legendary.is(boss.getId()) ? 5 : 0));
        sessions.put(s.id, s);

        // 난이도: 파티 평균 레벨이 오를수록 조금씩 (레벨당 능력치 +2% 보다 완만한 +1.2%) → 키운 만큼 편해짐
        double difficulty = (1 + 0.012 * (avgLv - 1)) * (1 + 0.05 * (members.size() - 1))
                * (Legendary.is(boss.getId()) ? 1.15 : 1);
        return new Start(s.id, option(biome), members, PokemonDto.from(boss), s.bossShiny,
                collection.canAcquire(boss.getId(), s.bossShiny), s.bossLevel, mobs, brought, difficulty, wallet.gold(),
                tier.info(cleared(biome)), s.killTarget);
    }

    /**
     * 던전 능력치 = 종족값 × 레벨 배율(레벨당 +2%).
     * 전설·환상은 종족값 합을 600(일반 최종 진화의 약 1.2배)으로 눌러서 너무 세지 않게.
     */
    static Combat combat(OwnedDto o) {
        PokemonDto.Stats st = o.pokemon().stats();
        double hp = st == null ? 50 : st.hp(), atk = st == null ? 55 : Math.max(st.attack(), st.spAttack());
        double def = st == null ? 50 : (st.defense() + st.spDefense()) / 2.0, spd = st == null ? 50 : st.speed();
        boolean legend = o.pokemon().legendary();
        if (legend && st != null && st.bst() > Legendary.STAT_CAP) {
            double k = (double) Legendary.STAT_CAP / st.bst();
            hp *= k; atk *= k; def *= k; spd *= k;
        }
        double m = Growth.multiplier(o.level());
        return new Combat(hp * m, atk * m, def * m, spd * m, o.level(), m, legend);
    }

    private static boolean hasType(Pokemon p, List<String> types) {
        return p.typeList().stream().anyMatch(types::contains);
    }

    /** 보스: 바이옴 보스 타입, 종족값 높은 쪽, 아직 없는 포켓몬이 더 잘 나옴 */
    private Pokemon pickBoss(List<Pokemon> pool, Biome biome, List<Integer> party, Tier tier) {
        List<Pokemon> all = pool.stream().filter(p -> hasType(p, biome.bossTypes()) && !party.contains(p.getId())).toList();
        // 전설·환상은 단계별 고정 확률(이지 0.5% ~ 나이트메어 5%)로만 등장
        List<Pokemon> legends = all.stream().filter(p -> Legendary.is(p.getId())).toList();
        boolean legendRoll = !legends.isEmpty() && ThreadLocalRandom.current().nextDouble() < tier.legend;
        List<Pokemon> cands = legendRoll ? legends : all.stream().filter(p -> !Legendary.is(p.getId())).toList();
        if (cands.isEmpty()) cands = pool.stream().filter(p -> !Legendary.is(p.getId())).toList();
        List<Pokemon> strong = cands.stream().filter(p -> p.baseTotal() >= 400).toList();
        if (strong.size() >= 2) cands = strong;
        double total = 0;
        double[] w = new double[cands.size()];
        for (int i = 0; i < w.length; i++) {
            Pokemon c = cands.get(i);
            w[i] = (collection.isOwned(c.getId()) ? 1 : 3) * 1;
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
        // 목표 마릿수를 쓰러뜨리고 보스를 이겨야 승리 (너무 빠르면 인정 안 함)
        int kills = Math.max(0, Math.min(req.kills(), (int) (elapsed * 12)));
        // 승리 인정: 목표 마릿수를 채워 먼저 보스에 도전했거나, 3분을 버텨 자동으로 보스가 나왔을 때
        boolean won = req.won() && elapsed >= MIN_SECONDS && (kills >= s.killTarget || elapsed >= RUN_SECONDS * 0.8);
        org.slf4j.LoggerFactory.getLogger(RunService.class).info("던전 결과: 보고 승리={} 경과 {}초 처치 {}/{} → 승리 인정={}", req.won(), (int) elapsed, kills, s.killTarget, won);
        s.won = won;
        int elites = Math.max(0, Math.min(req.elites(), 12));

        // 골드: 주운 만큼, 상한 검사. 쓰러지면 절반만. 부적금화면 상한도 1.5배
        double goldMul = s.brought.containsKey("amulet-coin") ? 1.5 : 1;
        int cap = (int) ((kills * 3 + elites * 25 + (won ? 400 : 0) + 80) * goldMul * 1.6 * s.tier.gold);
        int gold = Math.max(0, Math.min(req.gold(), cap));
        if (!won) gold /= 2;
        long walletGold = wallet.add(gold);

        // 안 쓴 상처약 돌려주기 (X아이템은 출격할 때 이미 효과 적용)
        Map<String, Integer> used = req.used() == null ? Map.of() : req.used();
        for (var e : s.brought.entrySet()) {
            ShopItems.Entry entry = ShopItems.byCode(e.getKey()).orElseThrow();
            if (entry.use() != ShopItems.Use.HEAL && entry.use() != ShopItems.Use.REVIVE) continue;
            int back = e.getValue() - Math.max(0, Math.min(e.getValue(), used.getOrDefault(e.getKey(), 0)));
            if (back > 0) items.give(items.byCode(e.getKey()).getId(), back);
        }

        // 경험치: 기본 + 처치 수 + 승리 보너스(보스 레벨이 높을수록). 쓰러지면 60%, 행복의알 1.5배
        double expMul = (won ? 1 : 0.6) * (s.brought.containsKey("lucky-egg") ? 1.5 : 1) * s.tier.exp;
        int exp = (int) Math.round((40 + Math.min(kills, 600) * 0.3 + (won ? 80 + s.bossLevel * 4 : 0)) * expMul);
        List<ExpGain> gains = new ArrayList<>();
        for (int id : s.party) {
            OwnedDto before = collection.toDto(collection.entity(id));
            int[] r = collection.addExp(id, exp);
            gains.add(new ExpGain(collection.toDto(collection.entity(id)), r[1] - r[0], before.exp(), before.level()));
        }

        boolean capturable = won && collection.canAcquire(s.bossId, s.bossShiny);
        String note = !won ? "쓰러져서 보스를 잡을 수 없어요"
                : capturable ? (s.bossShiny ? "✨ 이로치 보스! 몬스터볼을 던져 보세요"
                        : Legendary.is(s.bossId) ? "★ 전설의 포켓몬! 잡기 어려워요 (최대 3번)" : "몬스터볼을 던져 보세요 (최대 3번)")
                : "이미 가진 포켓몬이라 놓아줬어요";
        if (won && !capturable) walletGold = wallet.add(100);   // 이미 가진 보스 → 보답 골드
        String unlocked = null;
        if (won) {   // 이 바이옴의 진행도 기록 → 다음 단계 해금
            BiomeProgress bp = progress.findById(s.biome.name()).orElseGet(() -> new BiomeProgress(s.biome.name()));
            boolean up = bp.clear(s.tier.no());
            progress.save(bp);
            if (up && s.tier.ordinal() + 1 < Tier.values().length) unlocked = Tier.values()[s.tier.ordinal() + 1].label;
        }
        return new Finish(won, gold, walletGold, gains, capturable, note, balls(s), unlocked);
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

        int rate = (int) ShopItems.ballRate(ball.getCode(), ctx(s))[0];
        s.throwsUsed++;
        boolean success = ThreadLocalRandom.current().nextInt(100) < rate;
        // 흔들림 연출: 성공 3번, 실패는 0~2번 (아슬아슬할수록 많이)
        int shakes = success ? 3 : ThreadLocalRandom.current().nextInt(3);
        OwnedDto caught = null;
        if (success) {
            s.captured = true;
            caught = collection.acquire(s.bossId, s.bossShiny);
            if (ball.getCode().equals("luxury-ball") && caught.level() < 5) {   // 럭셔리볼: Lv.5 부터
                collection.addExp(s.bossId, com.pokefloor.collection.Growth.expAt(5) - caught.exp());
                caught = collection.toDto(collection.entity(s.bossId));
            }
        }
        boolean fled = !success && s.throwsUsed >= MAX_THROWS;
        return new Capture(success, shakes, MAX_THROWS - s.throwsUsed, fled, caught, balls(s));
    }

    private ShopItems.Ctx ctx(Session s) {
        Pokemon b = s.boss;
        return new ShopItems.Ctx(s.biome.name(), b.typeList(), b.getWeightKg(),
                b.getStatSpeed() == null ? 0 : b.getStatSpeed(), s.bossLevel, s.leaderLevel, s.throwsUsed, Legendary.is(b.getId()));
    }

    /** 가진 몬스터볼 목록 (상황이 없으면 기본 포획률) */
    public List<Ball> balls() {
        return balls(null);
    }

    /** 가진 몬스터볼 목록 + 이번 보스에게 던졌을 때 포획률 */
    public List<Ball> balls(Session s) {
        return itemRepository.findAllByOrderByKindAscIdAsc().stream()
                .filter(i -> i.getKind() == ItemKind.BALL)
                .map(i -> {
                    int qty = items.qty(i.getId());
                    if (qty <= 0) return null;
                    Object[] r = s == null ? new Object[]{ShopItems.byCode(i.getCode()).map(ShopItems.Entry::value).orElse(60), null}
                            : ShopItems.ballRate(i.getCode(), ctx(s));
                    return new Ball(i.getCode(), i.getId(), i.getNameKo(), i.getSprite(), qty, (int) r[0], (String) r[1]);
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingInt(Ball::rate).reversed())
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
