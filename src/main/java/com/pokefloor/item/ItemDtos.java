package com.pokefloor.item;

import java.util.List;

public final class ItemDtos {
    private ItemDtos() {}

    public record ItemDto(Integer id, String code, String nameKo, String kind, String kindName, String sprite) {
        public static ItemDto from(Item i) {
            return new ItemDto(i.getId(), i.getCode(), i.getNameKo(), i.getKind().name(), i.getKind().nameKo(), i.getSprite());
        }
    }

    /** 인벤토리 한 줄: 아이템, 남은 개수, 박스에 놓인 개수 */
    public record StackDto(ItemDto item, int qty, int placed) {}

    public record PlacedDto(Long id, Integer itemId, Long boxId, int x, int y) {
        static PlacedDto from(PlacedItem p) {
            return new PlacedDto(p.getId(), p.getItemId(), p.getBoxId(), p.getX(), p.getY());
        }
    }

    public record InventoryDto(List<StackDto> items, List<PlacedDto> placed) {}

    public record PlaceRequest(Integer itemId, Long boxId, Integer x, Integer y) {}

    public record KindDto(String id, String name) {}

    public record ImportStatus(boolean running, int done, int total, long stored) {}
}
