package com.pokefloor.pokemon;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;

/** PokéAPI(https://pokeapi.co) 호출 전용 클라이언트 */
@Component
public class PokeApiClient {

    private final RestClient restClient;

    public PokeApiClient(@Value("${pokeapi.base-url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public JsonNode getPokemon(int id) {
        return get("/pokemon/{id}", id);
    }

    public JsonNode getSpecies(int id) {
        return get("/pokemon-species/{id}", id);
    }

    public JsonNode getType(String name) {
        return get("/type/{name}", name);
    }

    private JsonNode get(String uri, Object var) {
        return restClient.get().uri(uri, var).retrieve().body(JsonNode.class);
    }
}
