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

    /** 획득. 이미 가진 포켓몬이면 409 (모든 포켓몬은 최대 1번). 메인 박스 중앙(가까운 빈칸)에 나타남 */
    @Transactional
    public OwnedDto acquire(int pokemonId) {
        if (repository.existsById(pokemonId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 획득한 포켓몬이에요");
        }
        pokemonService.get(pokemonId);   // 등록된 포켓몬인지 확인
        OwnedPokemon o = repository.save(new OwnedPokemon(pokemonId));
        placeInMain(o);
        return toDto(o);
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

    private OwnedPokemon find(int pokemonId) {
        return repository.findById(pokemonId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "획득하지 않은 포켓몬이에요"));
    }

    private OwnedDto toDto(OwnedPokemon o) {
        PokemonDto p = pokemonService.get(o.getPokemonId());
        return new OwnedDto(p, o.getNickname(), o.isPlaced(), o.getBoxId(), o.getTileX(), o.getTileY(), o.getObtainedAt());
    }
}
