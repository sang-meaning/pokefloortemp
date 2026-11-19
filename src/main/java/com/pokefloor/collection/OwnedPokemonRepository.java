package com.pokefloor.collection;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OwnedPokemonRepository extends JpaRepository<OwnedPokemon, Integer> {
    List<OwnedPokemon> findAllByOrderByObtainedAtAsc();
}
