package com.pokefloor.game;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/game")
public class GameController {

    private final GameService service;

    public GameController(GameService service) {
        this.service = service;
    }

    /** 난이도 목록, 등장 가능한 포켓몬 수, 획득 수 */
    @GetMapping
    public GameDtos.Overview overview() {
        return service.overview();
    }

    @PostMapping("/start")
    public GameDtos.StartResponse start(@RequestBody GameDtos.StartRequest req) {
        return service.start(req.level() == null ? GameLevel.NORMAL : req.level());
    }

    @PostMapping("/{gameId}/finish")
    public GameDtos.FinishResponse finish(@PathVariable String gameId,
                                          @RequestBody(required = false) GameDtos.FinishRequest req) {
        return service.finish(gameId, req);
    }
}
