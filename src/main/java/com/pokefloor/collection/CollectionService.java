package com.pokefloor.collection;

import com.pokefloor.pokemon.PokemonDto;
import com.pokefloor.pokemon.PokemonService;
import com.pokefloor.world.WorldService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CollectionService {

    public static final int NICKNAME_MAX = 12;

    private final OwnedPokemonRepository repository;
    private final PokemonService pokemonService;
    private final WorldService worldService;

    public CollectionService(OwnedPokemonRepository repository, PokemonService pokemonService,
                             WorldService worldService) {
        this.repository = repository;
        this.pokemonService = pokemonService;
        this.worldService = worldService;
    }

    @Transactional(readOnly = true)
    public List<OwnedDto> list() {
        return repository.findAllByOrderByObtainedAtAsc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Set<Integer> ownedIds() {
        return repository.findAll().stream().map(OwnedPokemon::getPokemonId).collect(Collectors.toSet());
    }

    /** 이로치 확률 4% (카드 게임 보상, 던전 몬스터·보스) */
    public static final double SHINY_RATE = 0.04;

    public static boolean rollShiny() {
        return java.util.concurrent.ThreadLocalRandom.current().nextDouble() < SHINY_RATE;
    }

    public OwnedDto acquire(int pokemonId) {
        return acquire(pokemonId, false);
    }

    /**
     * 획득. 메인 박스 중앙(가까운 빈칸)에 나타남.
     * 모든 포켓몬은 최대 1번. 단, 이미 가진 포켓몬의 이로치를 처음 얻으면 이로치 수집으로 기록.
     */
    @Transactional
    public OwnedDto acquire(int pokemonId, boolean shiny) {
        OwnedPokemon existing = repository.findById(pokemonId).orElse(null);
        if (existing != null) {
            if (shiny && !existing.isShiny()) {
                existing.setShiny(true);
                existing.setShowShiny(true);
                return toDto(existing);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 획득한 포켓몬이에요");
        }
        pokemonService.get(pokemonId);   // 등록된 포켓몬인지 확인
        OwnedPokemon o = new OwnedPokemon(pokemonId);
        if (shiny) { o.setShiny(true); o.setShowShiny(true); }
        o = repository.save(o);
        placeInMain(o);
        return toDto(o);
    }

    /** 잡을 수 있는지: 처음 보는 포켓몬이거나, 아직 없는 이로치 */
    @Transactional(readOnly = true)
    public boolean canAcquire(int pokemonId, boolean shiny) {
        return repository.findById(pokemonId).map(o -> shiny && !o.isShiny()).orElse(true);
    }

    @Transactional(readOnly = true)
    public boolean isOwned(int pokemonId) {
        return repository.existsById(pokemonId);
    }

    /** 스타터: 포켓몬이 하나도 없을 때 이상해씨·파이리·꼬부기 중 하나 */
    @Transactional
    public OwnedDto starter(int pokemonId) {
        if (repository.count() > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 포켓몬이 있어요");
        if (pokemonId != 1 && pokemonId != 4 && pokemonId != 7) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이상해씨·파이리·꼬부기 중에서 골라요");
        }
        return acquire(pokemonId, false);
    }

    /** 다음 레벨까지 경험치를 채움 (이상한사탕) → [이전, 이후] */
    @Transactional
    public int[] levelUp(int pokemonId) {
        OwnedPokemon o = find(pokemonId);
        Integer next = Growth.nextLevelExp(o.getExp());
        if (next == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 Lv.100 이에요");
        return addExp(pokemonId, next - o.getExp());
    }

    /** 경험치 더하기 → [이전 경험치, 이후 경험치] */
    @Transactional
    public int[] addExp(int pokemonId, int n) {
        OwnedPokemon o = find(pokemonId);
        int before = o.getExp();
        o.addExp(n);
        return new int[]{before, o.getExp()};
    }

    @Transactional
    public OwnedDto setShowShiny(int pokemonId, boolean show) {
        OwnedPokemon o = find(pokemonId);
        if (!o.isShiny()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이로치를 아직 얻지 못했어요");
        o.setShowShiny(show);
        return toDto(o);
    }

    @Transactional(readOnly = true)
    public OwnedPokemon entity(int pokemonId) {
        return find(pokemonId);
    }

    private void placeInMain(OwnedPokemon o) {
        Long mainId = worldService.mainBox().getId();
        int[] t = worldService.freeTileNearCenter(mainId, o.getPokemonId());
        o.placeAt(mainId, t[0], t[1]);
    }

    @Transactional
    public OwnedDto setNickname(int pokemonId, String nickname) {
        OwnedPokemon o = find(pokemonId);
        String n = nickname == null ? null : nickname.strip();
        if (n != null && n.length() > NICKNAME_MAX) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "별명은 " + NICKNAME_MAX + "자까지");
        }
        o.setNickname(n == null || n.isEmpty() ? null : n);
        return toDto(o);
    }

    @Transactional
    public OwnedDto setPlaced(int pokemonId, boolean placed) {
        OwnedPokemon o = find(pokemonId);
        if (!placed) o.unplace();
        else if (!o.isPlaced()) placeInMain(o);
        return toDto(o);
    }

    /** 끌어다 놓기: 박스의 (x, y) 칸으로 옮김. 인벤토리에 있던 포켓몬이면 꺼내면서 옮김 */
    @Transactional
    public OwnedDto moveTo(int pokemonId, Long boxId, Integer x, Integer y) {
        OwnedPokemon o = find(pokemonId);
        int[] t = worldService.checkTile(boxId, x, y, null);   // 박스 안, 소품·아이템 없는 칸
        o.placeAt(boxId, t[0], t[1]);
        return toDto(o);
    }

    /** 관리자가 포켓몬을 삭제할 때 획득 기록도 같이 삭제 */
    @Transactional
    public void removeIfOwned(int pokemonId) {
        if (repository.existsById(pokemonId)) repository.deleteById(pokemonId);
    }

    OwnedPokemon find(int pokemonId) {
        return repository.findById(pokemonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "획득하지 않은 포켓몬이에요"));
    }

    public OwnedDto toDto(OwnedPokemon o) {
        PokemonDto p = pokemonService.get(o.getPokemonId());
        int exp = o.getExp();
        int level = Growth.level(exp);
        return new OwnedDto(p, o.getNickname(), o.isPlaced(), o.getBoxId(), o.getTileX(), o.getTileY(),
                exp, level, Growth.expAt(level), Growth.nextLevelExp(exp), o.isShiny(), o.isShowShiny(),
                o.getObtainedAt());
    }
}
