package com.pokefloor.furniture;

/** 가구 요청·응답 (id 는 응답에만) */
public record FurnitureDto(Long id, String sprite, int x, int y, int lift) {
    static FurnitureDto from(Furniture f) {
        return new FurnitureDto(f.getId(), f.getSprite(), f.getX(), f.getY(), f.getLift());
    }
}
