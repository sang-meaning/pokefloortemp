package com.pokefloor.item;

import com.pokefloor.item.ItemDtos.InventoryDto;
import com.pokefloor.item.ItemDtos.ItemDto;
import com.pokefloor.item.ItemDtos.PlaceRequest;
import com.pokefloor.item.ItemDtos.PlacedDto;
import com.pokefloor.item.ItemDtos.StackDto;
import com.pokefloor.world.WorldService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 아이템(몬스터볼, 배지 등) 인벤토리.
 * 아직 얻는 방법은 없고 관리자 페이지에서 지급. 인벤토리 → 박스에 놓기 / 회수.
 */
@Service
public class ItemService {

    public static final int MAX_QTY = 99;

    private final ItemRepository items;
    private final InventoryItemRepository inventory;
    private final PlacedItemRepository placed;
    private final WorldService world;

    public ItemService(ItemRepository items, InventoryItemRepository inventory, PlacedItemRepository placed,
                       WorldService world) {
        this.items = items;
        this.inventory = inventory;
        this.placed = placed;
        this.world = world;
    }

    @Transactional(readOnly = true)
    public List<ItemDto> catalog() {
        return items.findAllByOrderByKindAscIdAsc().stream().map(ItemDto::from).toList();
    }

    /** 가진 아이템(개수 > 0 이거나 박스에 놓인 것) + 박스에 놓인 아이템 목록 */
    @Transactional(readOnly = true)
    public InventoryDto inventory() {
        Map<Integer, Item> byId = items.findAll().stream().collect(Collectors.toMap(Item::getId, Function.identity()));
        List<PlacedItem> placedList = placed.findAll();
        Map<Integer, Long> placedCount = placedList.stream()
                .collect(Collectors.groupingBy(PlacedItem::getItemId, Collectors.counting()));
        Map<Integer, Integer> qty = inventory.findAll().stream()
                .collect(Collectors.toMap(InventoryItem::getItemId, InventoryItem::getQty));
        List<StackDto> stacks = byId.values().stream()
                .filter(i -> qty.getOrDefault(i.getId(), 0) > 0 || placedCount.containsKey(i.getId()))
                .sorted((a, b) -> a.getKind() != b.getKind() ? a.getKind().compareTo(b.getKind()) : a.getId() - b.getId())
                .map(i -> new StackDto(ItemDto.from(i), qty.getOrDefault(i.getId(), 0),
                        placedCount.getOrDefault(i.getId(), 0L).intValue()))
                .toList();
        return new InventoryDto(stacks, placedList.stream().map(PlacedDto::from).toList());
    }

    /** 관리자 지급 (음수면 회수). 0~99 개로 제한 */
    @Transactional
    public StackDto grant(int itemId, int n) {
        Item item = item(itemId);
        InventoryItem inv = inventory.findById(itemId).orElseGet(() -> inventory.save(new InventoryItem(itemId, 0)));
        inv.add(n);
        if (inv.getQty() > MAX_QTY) inv.add(MAX_QTY - inv.getQty());
        return new StackDto(ItemDto.from(item), inv.getQty(), placed.findAll().stream()
                .filter(p -> p.getItemId() == itemId).mapToInt(p -> 1).sum());
    }

    /** 인벤토리에서 하나 꺼내 박스 칸에 놓기 */
    @Transactional
    public PlacedDto place(PlaceRequest req) {
        item(req.itemId());
        InventoryItem inv = inventory.findById(req.itemId())
                .filter(i -> i.getQty() > 0)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "인벤토리에 남은 개수가 없어요"));
        int[] t = world.checkTile(req.boxId(), req.x(), req.y(), null, null);
        inv.add(-1);
        return PlacedDto.from(placed.save(new PlacedItem(req.itemId(), req.boxId(), t[0], t[1])));
    }

    @Transactional
    public PlacedDto move(Long id, PlaceRequest req) {
        PlacedItem p = placedItem(id);
        Long boxId = req.boxId() != null ? req.boxId() : p.getBoxId();
        int[] t = world.checkTile(boxId, req.x(), req.y(), null, id);
        p.moveTo(boxId, t[0], t[1]);
        return PlacedDto.from(p);
    }

    /** 박스에서 회수 → 인벤토리 +1 */
    @Transactional
    public void pickUp(Long id) {
        PlacedItem p = placedItem(id);
        inventory.findById(p.getItemId())
                .orElseGet(() -> inventory.save(new InventoryItem(p.getItemId(), 0)))
                .add(1);
        placed.delete(p);
    }

    private Item item(Integer id) {
        if (id == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "itemId 가 필요해요");
        return items.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "없는 아이템이에요"));
    }

    private PlacedItem placedItem(Long id) {
        return placed.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "박스에 없는 아이템이에요"));
    }
}
