package com.pokefloor.admin;

import com.pokefloor.item.ItemDtos.ImportStatus;
import com.pokefloor.item.ItemDtos.ItemDto;
import com.pokefloor.item.ItemDtos.StackDto;
import com.pokefloor.item.ItemSeeder;
import com.pokefloor.item.ItemService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * 관리자용 아이템 API. 아직 아이템 획득 조건이 없어서 여기서 인벤토리에 지급.
 * 시연용이라 잠금 없음
 */
@RestController
@RequestMapping("/api/admin/items")
public class AdminItemController {

    private final ItemService service;
    private final ItemSeeder seeder;
    private final com.pokefloor.player.WalletService wallet;

    public AdminItemController(ItemService service, ItemSeeder seeder, com.pokefloor.player.WalletService wallet) {
        this.service = service;
        this.seeder = seeder;
        this.wallet = wallet;
    }

    /** 개발용 골드 지급 (음수면 차감) */
    @PostMapping("/gold")
    public java.util.Map<String, Long> gold(@RequestParam long amount) {
        return java.util.Map.of("gold", wallet.add(amount));
    }

    @GetMapping
    public List<ItemDto> catalog() {
        return service.catalog();
    }

    /** 지급 (qty 가 음수면 회수) */
    @PostMapping("/{id}/grant")
    public StackDto grant(@PathVariable int id, @RequestParam(defaultValue = "1") int qty) {
        if (qty == 0 || Math.abs(qty) > 99) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "1~99 개");
        return service.grant(id, qty);
    }

    /** PokéAPI 에서 아이템 목록 다시 받기 (없는 것만 추가) */
    @PostMapping("/import")
    public ImportStatus reimport() {
        if (!seeder.startImport()) throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 받는 중이에요");
        return seeder.status();
    }

    @GetMapping("/import-status")
    public ImportStatus status() {
        return seeder.status();
    }
}
