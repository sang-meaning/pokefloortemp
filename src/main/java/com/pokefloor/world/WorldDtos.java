package com.pokefloor.world;

import java.util.List;

public final class WorldDtos {
    private WorldDtos() {}

    public record BoxDto(Long id, int bx, int by, String biome, String biomeName, String emoji, boolean main) {
        static BoxDto from(Box b) {
            return new BoxDto(b.getId(), b.getBx(), b.getBy(), b.getBiome().name(),
                    b.getBiome().nameKo(), b.getBiome().emoji(), b.isMain());
        }
    }

    public record PropDto(Long id, Long boxId, String key, int x, int y) {
        static PropDto from(Prop p) {
            return new PropDto(p.getId(), p.getBoxId(), p.getPropKey(), p.getX(), p.getY());
        }
    }

    public record BiomeDto(String id, String name, String emoji, String description) {
        static BiomeDto from(Biome b) {
            return new BiomeDto(b.name(), b.nameKo(), b.emoji(), b.description());
        }
    }

    public record WorldDto(int boxSize, List<BoxDto> boxes, List<PropDto> props) {}

    public record AddBoxRequest(int bx, int by, String biome) {}

    public record PropRequest(Long boxId, String key, Integer x, Integer y) {}

    /** 박스 삭제 결과: 인벤토리로 돌아간 포켓몬/아이템 수, 지워진 소품 수 */
    public record DeleteBoxResult(int pokemonReturned, int itemsReturned, long propsDeleted) {}
}
