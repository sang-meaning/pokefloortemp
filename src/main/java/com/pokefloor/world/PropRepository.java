package com.pokefloor.world;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropRepository extends JpaRepository<Prop, Long> {
    List<Prop> findByBoxId(Long boxId);
    long deleteByBoxId(Long boxId);
}
