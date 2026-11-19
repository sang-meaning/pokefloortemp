package com.pokefloor.world;

import com.pokefloor.world.WorldDtos.AddBoxRequest;
import com.pokefloor.world.WorldDtos.BiomeDto;
import com.pokefloor.world.WorldDtos.BoxDto;
import com.pokefloor.world.WorldDtos.DeleteBoxResult;
import com.pokefloor.world.WorldDtos.PropDto;
import com.pokefloor.world.WorldDtos.PropRequest;
import com.pokefloor.world.WorldDtos.WorldDto;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

/** 박스(바이옴 땅), 소품 API */
@RestController
@RequestMapping("/api")
public class WorldController implements ApplicationRunner {

    private final WorldService service;

    public WorldController(WorldService service) {
        this.service = service;
    }

    @Override
    public void run(ApplicationArguments args) {
        service.migrate();
    }

    /** 모든 박스 + 소품 */
    @GetMapping("/world")
    public WorldDto world() {
        return service.world();
    }

    @GetMapping("/biomes")
    public List<BiomeDto> biomes() {
        return Arrays.stream(Biome.values()).map(BiomeDto::from).toList();
    }

    @PostMapping("/boxes")
    @ResponseStatus(HttpStatus.CREATED)
    public BoxDto addBox(@RequestBody AddBoxRequest req) {
        return service.addBox(req.bx(), req.by(), req.biome());
    }

    @DeleteMapping("/boxes/{id}")
    public DeleteBoxResult deleteBox(@PathVariable Long id) {
        return service.deleteBox(id);
    }

    @PostMapping("/props")
    @ResponseStatus(HttpStatus.CREATED)
    public PropDto addProp(@RequestBody PropRequest req) {
        return service.addProp(req);
    }

    @PatchMapping("/props/{id}")
    public PropDto moveProp(@PathVariable Long id, @RequestBody PropRequest req) {
        return service.moveProp(id, req);
    }

    @DeleteMapping("/props/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProp(@PathVariable Long id) {
        service.deleteProp(id);
    }
}
