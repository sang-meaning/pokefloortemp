package com.pokefloor.player;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class WalletController {

    private final WalletService service;

    public WalletController(WalletService service) {
        this.service = service;
    }

    @GetMapping("/api/wallet")
    public Map<String, Long> wallet() {
        return Map.of("gold", service.gold());
    }
}
