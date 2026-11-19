package com.pokefloor.item;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlacedItemRepository extends JpaRepository<PlacedItem, Long> {
    List<PlacedItem> findByBoxId(Long boxId);
}
