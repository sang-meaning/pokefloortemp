package com.pokefloor.game;

import com.pokefloor.collection.CollectionService;
import com.pokefloor.collection.OwnedDto;
import com.pokefloor.pokemon.PokemonDto;
import com.pokefloor.pokemon.PokemonService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 카드 짝맞추기 게임.
 *  - 판의 포켓몬은 활성화된 포켓몬 중 완전 랜덤, 서로 모두 다름 (한 쌍씩)
 *  - 제한시간은 서버 시계로 확인 (네트워크 지연 감안해 2초 여유)
 *  - 클리어하면 이번 판 포켓몬 중 "아직 없는 것" 하나를 랜덤으로 지급
 */
@Service
public class GameService {

    private static final Duration GRACE = Duration.ofSeconds(2);
    private static final Duration SESSION_TTL = Duration.ofMinutes(15);

    private final PokemonService pokemonService;
    private final CollectionService collectionService;
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    public GameService(PokemonService pokemonService, CollectionService collectionService) {
        this.pokemonService = pokemonService;
        this.collectionService = collectionService;
    }

    public GameDtos.Overview overview() {
        List<GameDtos.LevelInfo> levels = Arrays.stream(GameLevel.values())
                .map(l -> new GameDtos.LevelInfo(l, l.label, l.rows, l.cols, l.pairs(), l.limitSeconds))
                .toList();
        return new GameDtos.Overview(levels, pokemonService.listActive().size(), collectionService.ownedIds().size());
    }

    public GameDtos.StartResponse start(GameLevel level) {
        cleanup();
        List<PokemonDto> pool = new ArrayList<>(pokemonService.listActive());
        if (pool.size() < level.pairs()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "포켓몬이 부족해요 (" + pool.size() + "마리, 필요 " + level.pairs() + "마리). 잠시 후 다시 시도하거나 관리자 페이지에서 추가하세요");
        }
        // 가중치 뽑기: 전설·환상은 일반 포켓몬보다 훨씬 드물게
        List<PokemonDto> picked = new ArrayList<>();
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        while (picked.size() < level.pairs()) {
            double total = pool.stream().mapToDouble(p -> p.legendary() ? com.pokefloor.pokemon.Legendary.APPEAR_WEIGHT : 1).sum();
            double r = rnd.nextDouble(total);
            for (PokemonDto p : pool) {
                r -= p.legendary() ? com.pokefloor.pokemon.Legendary.APPEAR_WEIGHT : 1;
                if (r <= 0) { picked.add(p); pool.remove(p); break; }
            }
        }

        // 한 마리당 카드 2장 → 섞기
        List<PokemonDto> deck = new ArrayList<>(picked);
        deck.addAll(picked);
        Collections.shuffle(deck, ThreadLocalRandom.current());

        List<GameDtos.Card> cards = new ArrayList<>();
        for (int i = 0; i < deck.size(); i++) {
            PokemonDto p = deck.get(i);
            String img = p.sprites().frontStatic() != null ? p.sprites().frontStatic() : p.sprites().frontAnimated();
            cards.add(new GameDtos.Card(i, p.id(), p.nameKo(), img));
        }

        Set<Integer> owned = collectionService.ownedIds();
        int newCandidates = (int) picked.stream().filter(p -> !owned.contains(p.id())).count();

        String id = UUID.randomUUID().toString();
        sessions.put(id, new Session(level, cards.stream().map(GameDtos.Card::pokemonId).toList(), Instant.now()));
        return new GameDtos.StartResponse(id, level, level.rows, level.cols, level.limitSeconds, cards, newCandidates);
    }

    public GameDtos.FinishResponse finish(String gameId, GameDtos.FinishRequest req) {
        Session s = sessions.remove(gameId);   // 한 판은 한 번만 정산
        if (s == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "끝났거나 없는 게임이에요");

        double elapsed = Duration.between(s.startedAt, Instant.now()).toMillis() / 1000.0;
        if (elapsed > s.level.limitSeconds + GRACE.toSeconds()) {
            return new GameDtos.FinishResponse(GameDtos.Result.TIME_OVER, elapsed, null, "시간 초과! 다시 도전해 보세요");
        }
        if (!allMatched(s.deck, req == null ? null : req.matchedPairs())) {
            return new GameDtos.FinishResponse(GameDtos.Result.INVALID, elapsed, null, "모든 카드를 맞추지 못했어요");
        }

        Set<Integer> owned = collectionService.ownedIds();
        List<Integer> candidates = new ArrayList<>(new HashSet<>(s.deck));
        candidates.removeIf(owned::contains);
        if (candidates.isEmpty()) {
            return new GameDtos.FinishResponse(GameDtos.Result.WIN, elapsed, null,
                    "클리어! 하지만 이번 판 포켓몬은 이미 모두 가지고 있어요");
        }
        int rewardId = candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
        OwnedDto reward = collectionService.acquire(rewardId, CollectionService.rollShiny());   // 4% 이로치
        return new GameDtos.FinishResponse(GameDtos.Result.WIN, elapsed, reward,
                reward.pokemon().nameKo() + "을(를) 얻었어요!");
    }

    /** 보낸 쌍들이 같은 포켓몬끼리이고, 모든 카드를 정확히 한 번씩 덮는지 확인 */
    private boolean allMatched(List<Integer> deck, List<List<Integer>> pairs) {
        if (pairs == null || pairs.size() != deck.size() / 2) return false;
        Set<Integer> used = new HashSet<>();
        for (List<Integer> pair : pairs) {
            if (pair == null || pair.size() != 2) return false;
            int a = pair.get(0), b = pair.get(1);
            if (a == b || a < 0 || b < 0 || a >= deck.size() || b >= deck.size()) return false;
            if (!deck.get(a).equals(deck.get(b))) return false;
            if (!used.add(a) || !used.add(b)) return false;
        }
        return used.size() == deck.size();
    }

    private void cleanup() {
        Instant cut = Instant.now().minus(SESSION_TTL);
        sessions.values().removeIf(s -> s.startedAt.isBefore(cut));
    }

    private record Session(GameLevel level, List<Integer> deck, Instant startedAt) {}
}
