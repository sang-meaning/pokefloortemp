package com.pokefloor.pokemon;

import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** PokéAPI 응답 → Pokemon 엔티티 변환 (한국어 이름·분류·설명·타입, 스프라이트 URL) */
@Component
public class PokemonFetcher {

    private final PokeApiClient client;
    private final Map<String, String> typeNameKoCache = new ConcurrentHashMap<>();

    public PokemonFetcher(PokeApiClient client) {
        this.client = client;
    }

    public Pokemon fetch(int id) {
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

        Pokemon pk = new Pokemon(id);
        pk.setNameEn(p.path("name").asString());
        pk.setNameKo(koName(s.path("names"), pk.getNameEn()));
        pk.setGenusKo(koText(s.path("genera"), "genus"));
        pk.setFlavorTextKo(koText(s.path("flavor_text_entries"), "flavor_text").replaceAll("\\s+", " ").trim());
        pk.setTypesKo(String.join(",", types));
        pk.setHeightM(p.path("height").asInt() / 10.0);
        pk.setWeightKg(p.path("weight").asInt() / 10.0);
        pk.setFrontAnimated(firstText(showdown.path("front_default"), bwAnimated.path("front_default"),
                sprites.path("front_default")));
        pk.setBackAnimated(firstText(showdown.path("back_default"), bwAnimated.path("back_default"),
                sprites.path("back_default")));
        pk.setFrontStatic(sprites.path("front_default").asString(null));
        pk.setHome(sprites.path("other").path("home").path("front_default").asString(null));
        pk.setOfficialArtwork(sprites.path("other").path("official-artwork").path("front_default").asString(null));
        applyStats(pk, p);
        return pk;
    }

    /** /pokemon/{id} 응답의 stats 배열 → 종족값 */
    public void applyStats(Pokemon pk, JsonNode p) {
        int[] v = new int[6];
        String[] names = {"hp", "attack", "defense", "special-attack", "special-defense", "speed"};
        for (JsonNode st : p.path("stats")) {
            String n = st.path("stat").path("name").asString();
            for (int i = 0; i < names.length; i++) if (names[i].equals(n)) v[i] = st.path("base_stat").asInt();
        }
        pk.setStats(v[0], v[1], v[2], v[3], v[4], v[5]);
    }

    /** 종족값만 다시 받기 (예전 버전 DB 보충용) */
    public void fillStats(Pokemon pk) {
        applyStats(pk, client.getPokemon(pk.getId()));
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
