package com.pokefloor.pokemon;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PokemonRepository extends JpaRepository<Pokemon, Integer> {
    List<Pokemon> findByActiveTrueOrderByIdAsc();
    List<Pokemon> findAllByOrderByIdAsc();
}
