package com.pokefloor.collection;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 내가 획득한 포켓몬 (도감, 방 배치, 별명) */
@RestController
@RequestMapping("/api/collection")
public class CollectionController {

    private final CollectionService service;

    public CollectionController(CollectionService service) {
        this.service = service;
    }

    @GetMapping
    public List<OwnedDto> list() {
        return service.list();
    }

    /**
     * 보낸 값만 바뀜.
     *  - {"nickname": "..."}            별명
     *  - {"placed": true|false}         꺼내기(메인 박스 중앙 근처) / 인벤토리에 넣기
     *  - {"boxId": 3, "x": 2, "y": 5}   그 박스의 칸으로 옮기기 (끌어다 놓기, 다른 박스로도)
     */
    @PatchMapping("/{pokemonId}")
    public OwnedDto update(@PathVariable int pokemonId, @RequestBody UpdateRequest req) {
        OwnedDto result = null;
        if (req.nickname() != null) result = service.setNickname(pokemonId, req.nickname());
        if (req.placed() != null) result = service.setPlaced(pokemonId, req.placed());
        if (req.boxId() != null) result = service.moveTo(pokemonId, req.boxId(), req.x(), req.y());
        if (result == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "nickname, placed, boxId 중 하나는 보내야 해요");
        }
        return result;
    }

    public record UpdateRequest(String nickname, Boolean placed, Long boxId, Integer x, Integer y) {}
}
