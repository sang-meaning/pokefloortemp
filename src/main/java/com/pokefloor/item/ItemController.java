package com.pokefloor.item;

import com.pokefloor.item.ItemDtos.InventoryDto;
import com.pokefloor.item.ItemDtos.ItemDto;
import com.pokefloor.item.ItemDtos.PlaceRequest;
import com.pokefloor.item.ItemDtos.PlacedDto;
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

import java.util.List;

/** 아이템 카탈로그, 내 인벤토리, 박스에 놓기/옮기기/회수 */
@RestController
@RequestMapping("/api")
public class ItemController {

    private final ItemService service;

    public ItemController(ItemService service) {
        this.service = service;
    }

    @GetMapping("/items")
    public List<ItemDto> catalog() {
        return service.catalog();
    }

    @GetMapping("/inventory")
    public InventoryDto inventory() {
        return service.inventory();
    }

    @PostMapping("/placed-items")
    @ResponseStatus(HttpStatus.CREATED)
    public PlacedDto place(@RequestBody PlaceRequest req) {
        return service.place(req);
    }

    @PatchMapping("/placed-items/{id}")
    public PlacedDto move(@PathVariable Long id, @RequestBody PlaceRequest req) {
        return service.move(id, req);
    }

    /** 회수: 인벤토리로 돌아감 */
    @DeleteMapping("/placed-items/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void pickUp(@PathVariable Long id) {
        service.pickUp(id);
    }
}
