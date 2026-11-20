package com.pokefloor.shop;

import com.pokefloor.collection.CollectionService;
import com.pokefloor.collection.OwnedDto;
import com.pokefloor.item.Item;
import com.pokefloor.item.ItemDtos.ItemDto;
import com.pokefloor.item.ItemRepository;
import com.pokefloor.item.ItemService;
import com.pokefloor.item.ShopItems;
import com.pokefloor.player.WalletService;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** 상점: 골드로 몬스터볼·상처약·X아이템·이상한사탕 구입, 이상한사탕 사용 */
@RestController
public class ShopController {

    private final ItemService items;
    private final ItemRepository itemRepository;
    private final WalletService wallet;
    private final CollectionService collection;

    public ShopController(ItemService items, ItemRepository itemRepository, WalletService wallet,
                          CollectionService collection) {
        this.items = items;
        this.itemRepository = itemRepository;
        this.wallet = wallet;
        this.collection = collection;
    }

    /** deal: 오늘의 특가(30% 할인), basePrice: 원래 가격 */
    public record ShopEntry(String code, ItemDto item, int price, int basePrice, boolean deal, String use, int value, String desc, int qty) {}

    public record Shop(long gold, List<ShopEntry> entries) {}

    public record BuyRequest(String code, Integer qty) {}

    public record UseRequest(String code) {}

    @GetMapping("/api/shop")
    public Shop shop() {
        List<ShopEntry> list = ShopItems.ALL.stream().map(e -> {
            Item item = itemRepository.findByCode(e.code()).orElse(null);
            java.time.LocalDate today = java.time.LocalDate.now();
            return new ShopEntry(e.code(), item == null ? null : ItemDto.from(item), ShopItems.priceOf(e, today), e.price(),
                    e.code().equals(ShopItems.dealOf(today)), e.use().name(), e.value(), e.desc(),
                    item == null ? 0 : items.qty(item.getId()));
        }).toList();
        return new Shop(wallet.gold(), list);
    }

    @PostMapping("/api/shop/buy")
    @Transactional
    public Shop buy(@RequestBody BuyRequest req) {
        ShopItems.Entry e = ShopItems.byCode(req.code())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "상점에 없는 물건이에요"));
        int qty = req.qty() == null ? 1 : req.qty();
        if (qty < 1 || qty > 20) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "1~20개");
        Item item = items.byCode(e.code());
        wallet.spend((long) ShopItems.priceOf(e, java.time.LocalDate.now()) * qty);
        items.give(item.getId(), qty);
        return shop();
    }

    /** 이상한사탕: 레벨 +1 */
    @PostMapping("/api/collection/{pokemonId}/use-item")
    @Transactional
    public OwnedDto use(@PathVariable int pokemonId, @RequestBody UseRequest req) {
        ShopItems.Entry e = ShopItems.byCode(req.code()).filter(x -> x.use() == ShopItems.Use.CANDY)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "포켓몬에게 쓸 수 없는 아이템이에요"));
        OwnedDto before = collection.toDto(collection.entity(pokemonId));
        if (before.nextLevelExp() == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 Lv.100 이에요");
        items.consume(items.byCode(e.code()).getId(), 1);
        collection.levelUp(pokemonId);
        return collection.toDto(collection.entity(pokemonId));
    }
}
