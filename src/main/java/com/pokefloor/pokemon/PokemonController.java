package com.pokefloor.pokemon;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pokemon")
public class PokemonController {

    private final PokemonService service;
    private final PokemonSeeder seeder;

    public PokemonController(PokemonService service, PokemonSeeder seeder) {
        this.service = service;
        this.seeder = seeder;
    }

    /** 게임·도감에 등장하는 포켓몬 전체 (활성화된 것만) */
    @GetMapping
    public List<PokemonDto> list() {
        return service.listActive();
    }

    @GetMapping("/{id}")
    public PokemonDto get(@PathVariable int id) {
        return service.get(id);
    }

    /** 처음 실행 시 1세대 받아오기 진행 상황 */
    @GetMapping("/seed-status")
    public PokemonSeeder.SeedStatus seedStatus() {
        return seeder.status();
    }
}
