package com.pokefloor.pokemon;

import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PokemonService {

    private final PokeApiClient client;
    // 지금은 메모리 캐시. 나중에 "미리 받아두기" 단계에서 DB 저장으로 교체
    private final Map<Integer, PokemonDto> cache = new ConcurrentHashMap<>();
    private final Map<String, String> typeNameKoCache = new ConcurrentHashMap<>();

    public PokemonService(PokeApiClient client) {
        this.client = client;
    }

    public PokemonDto get(int id) {
        return cache.computeIfAbsent(id, this::fetch);
    }

    private PokemonDto fetch(int id) {
        JsonNode p = client.getPokemon(id);
        JsonNode s = client.getSpecies(id);

        List<String> types = new ArrayList<>();
        for (JsonNode t : p.path("types")) {
            String typeName = t.path("type").path("name").asString();
            types.add(typeNameKoCache.computeIfAbsent(typeName,
                    n -> koName(client.getType(n).path("names"), n)));
        }

        JsonNode sprites = p.path("sprites");
        JsonNode showdown = sprites.path("other").path("showdown");
        JsonNode bwAnimated = sprites.path("versions").path("generation-v")
                .path("black-white").path("animated");

        String front = firstText(showdown.path("front_default"), bwAnimated.path("front_default"),
                sprites.path("front_default"));
        String back = firstText(showdown.path("back_default"), bwAnimated.path("back_default"),
                sprites.path("back_default"));

        return new PokemonDto(
                id,
                koName(s.path("names"), p.path("name").asString()),
                p.path("name").asString(),
                koText(s.path("genera"), "genus"),
                koText(s.path("flavor_text_entries"), "flavor_text").replaceAll("\\s+", " ").trim(),
                types,
                p.path("height").asInt() / 10.0,
                p.path("weight").asInt() / 10.0,
                new PokemonDto.Sprites(front, back, sprites.path("front_default").asString(null))
        );
    }

    /** names 배열에서 language=ko 항목의 name, 없으면 fallback */
    private String koName(JsonNode names, String fallback) {
        String ko = koText(names, "name");
        return ko.isEmpty() ? fallback : ko;
    }

    private String koText(JsonNode entries, String field) {
        for (JsonNode e : entries) {
            if ("ko".equals(e.path("language").path("name").asString())) {
                return e.path(field).asString("");
            }
        }
        return "";
    }

    private String firstText(JsonNode... nodes) {
        for (JsonNode n : nodes) {
            if (n != null && n.isString() && !n.asString().isBlank()) return n.asString();
        }
        return null;
    }
}
