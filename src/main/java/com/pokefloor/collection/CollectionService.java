package com.pokefloor.collection;

import com.pokefloor.pokemon.PokemonDto;
import com.pokefloor.pokemon.PokemonService;
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

    public CollectionService(OwnedPokemonRepository repository, PokemonService pokemonService) {
        this.repository = repository;
        this.pokemonService = pokemonService;
    }

    @Transactional(readOnly = true)
    public List<OwnedDto> list() {
        return repository.findAllByOrderByObtainedAtAsc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public Set<Integer> ownedIds() {
        return repository.findAll().stream().map(OwnedPokemon::getPokemonId).collect(Collectors.toSet());
    }

    /** 획득. 이미 가진 포켓몬이면 409 (모든 포켓몬은 최대 1번) */
    @Transactional
    public OwnedDto acquire(int pokemonId) {
        if (repository.existsById(pokemonId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 획득한 포켓몬이에요");
        }
        pokemonService.get(pokemonId);   // 등록된 포켓몬인지 확인
        return toDto(repository.save(new OwnedPokemon(pokemonId)));
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
        o.setPlaced(placed);
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
        return new OwnedDto(p, o.getNickname(), o.isPlaced(), o.getObtainedAt());
    }
}
