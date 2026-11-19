package com.pokefloor.item;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Integer> {
    List<Item> findAllByOrderByKindAscIdAsc();
    long countByKindNot(ItemKind kind);
    java.util.Optional<Item> findByCode(String code);
    boolean existsByCode(String code);
}
