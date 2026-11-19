package com.pokefloor.admin;

import com.pokefloor.pokemon.PokemonDto;
import com.pokefloor.pokemon.PokemonSeeder;
import com.pokefloor.pokemon.PokemonService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * 관리자용 포켓몬 관리 API (/admin.html 에서 사용).
 * 시연용이라 잠금은 없음 → 실제 서비스라면 로그인/권한 검사 필요
 */
@RestController
@RequestMapping("/api/admin/pokemon")
public class AdminPokemonController {

    private final PokemonService service;
    private final PokemonSeeder seeder;

    public AdminPokemonController(PokemonService service, PokemonSeeder seeder) {
        this.service = service;
        this.seeder = seeder;
    }

    /** 비활성화된 것까지 전부 */
    @GetMapping
    public List<PokemonDto> list() {
        return service.listAll();
    }

    /** 도감 번호 하나 추가 (이미 있으면 PokéAPI 최신 정보로 다시 받음) */
    @PostMapping("/{id}")
    public PokemonDto add(@PathVariable int id) {
        if (id < 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "도감 번호는 1 이상");
        try {
            return service.importFromApi(id);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, id + "번을 PokéAPI 에서 찾지 못했어요");
        }
    }

    /** 범위 추가 (백그라운드, 진행 상황은 /api/pokemon/seed-status) */
    @PostMapping("/import")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public PokemonSeeder.SeedStatus importRange(@RequestParam int from, @RequestParam int to) {
        if (to - from >= 300) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "한 번에 300마리까지만");
        if (!seeder.startImport(from, to)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 받아오는 중이에요");
        }
        return seeder.status();
    }

    /** 게임·도감 등장 여부 켜기/끄기 */
    @PatchMapping("/{id}")
    public PokemonDto setActive(@PathVariable int id, @RequestParam boolean active) {
        return service.setActive(id, active);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable int id) {
        service.delete(id);
    }
}
