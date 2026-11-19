package com.pokefloor.world;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BoxRepository extends JpaRepository<Box, Long> {
    List<Box> findAllByOrderByIdAsc();
    Optional<Box> findByMainTrue();
    boolean existsByBxAndBy(int bx, int by);
}
