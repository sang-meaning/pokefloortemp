package com.pokefloor.run;

import com.pokefloor.run.RunDtos.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 오늘의 던전 API */
@RestController
public class RunController {

    private final RunService service;

    public RunController(RunService service) {
        this.service = service;
    }

    @GetMapping("/api/dungeon/today")
    public Today today() {
        return service.today();
    }

    @GetMapping("/api/dungeon/balls")
    public List<Ball> balls() {
        return service.balls();
    }

    @PostMapping("/api/runs")
    public Start start(@RequestBody StartRequest req) {
        return service.start(req);
    }

    @PostMapping("/api/runs/{id}/finish")
    public Finish finish(@PathVariable String id, @RequestBody FinishRequest req) {
        return service.finish(id, req);
    }

    @PostMapping("/api/runs/{id}/capture")
    public Capture capture(@PathVariable String id, @RequestBody CaptureRequest req) {
        return service.capture(id, req);
    }
}
