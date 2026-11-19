package com.pokefloor.furniture;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 배경 편집 모드: 가구 배치 저장 */
@RestController
@RequestMapping("/api/furniture")
public class FurnitureController implements ApplicationRunner {

    private final FurnitureService service;

    public FurnitureController(FurnitureService service) {
        this.service = service;
    }

    /** 처음 실행 시 기본 배치 넣기 */
    @Override
    public void run(ApplicationArguments args) {
        service.seedIfEmpty();
    }

    @GetMapping
    public List<FurnitureDto> list() {
        return service.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FurnitureDto create(@RequestBody FurnitureDto req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public FurnitureDto update(@PathVariable long id, @RequestBody FurnitureDto req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        service.delete(id);
    }

    @PostMapping("/reset")
    public List<FurnitureDto> reset() {
        return service.reset();
    }
}
