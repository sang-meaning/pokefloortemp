package com.pokefloor.pokemon;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class PokemonService {

    private final PokemonRepository repository;
    private final PokemonFetcher fetcher;

    public PokemonService(PokemonRepository repository, PokemonFetcher fetcher) {
        this.repository = repository;
        this.fetcher = fetcher;
    }

    /** 게임·도감에 쓰이는 포켓몬 (활성화된 것만, 도감 번호 순) */
    @Transactional(readOnly = true)
    public List<PokemonDto> listActive() {
        return repository.findByActiveTrueOrderByIdAsc().stream().map(PokemonDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PokemonDto> listAll() {
        return repository.findAllByOrderByIdAsc().stream().map(PokemonDto::from).toList();
    }

    @Transactional(readOnly = true)
    public PokemonDto get(int id) {
        return repository.findById(id).map(PokemonDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "등록되지 않은 포켓몬: " + id));
    }

    public boolean exists(int id) {
        return repository.existsById(id);
    }

    /** PokéAPI 에서 받아 저장 (이미 있으면 최신 정보로 덮어씀) */
    @Transactional
    public PokemonDto importFromApi(int id) {
        Pokemon fetched = fetcher.fetch(id);
        repository.findById(id).ifPresent(old -> fetched.setActive(old.isActive()));
        return PokemonDto.from(repository.save(fetched));
    }

    @Transactional
    public PokemonDto setActive(int id, boolean active) {
        Pokemon p = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "등록되지 않은 포켓몬: " + id));
        p.setActive(active);
        return PokemonDto.from(p);
    }

    @Transactional
    public void delete(int id) {
        repository.deleteById(id);
    }

    public long count() {
        return repository.count();
    }
}
