package com.pokefloor.world;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** static/assets/px/props.json 을 읽어 소품 목록과 바이옴별 어울리는 소품을 알려줌 */
@Component
public class PropCatalog {

    /** fw, fh = 바닥에서 차지하는 칸 수 (집·숲 같은 큰 소품은 2×2) */
    public record Entry(String key, String name, List<String> biomes, int fw, int fh) {}

    private final Map<String, Entry> entries = new LinkedHashMap<>();

    public PropCatalog() throws IOException {
        try (InputStream in = new ClassPathResource("static/assets/px/props.json").getInputStream()) {
            JsonNode root = new ObjectMapper().readTree(in);
            for (JsonNode n : root) {
                List<String> biomes = new ArrayList<>();
                n.get("biomes").forEach(b -> biomes.add(b.asString()));
                entries.put(n.get("key").asString(), new Entry(n.get("key").asString(), n.get("name").asString(), biomes,
                        n.path("fw").asInt(1), n.path("fh").asInt(1)));
            }
        }
    }

    public boolean exists(String key) {
        return entries.containsKey(key);
    }

    public Entry get(String key) {
        return entries.get(key);
    }

    /** 칸 수 [fw, fh]. 모르는 key 면 1×1 */
    public int[] footprint(String key) {
        Entry e = entries.get(key);
        return e == null ? new int[]{1, 1} : new int[]{e.fw(), e.fh()};
    }

    public List<String> keysFor(Biome biome) {
        return entries.values().stream().filter(e -> e.biomes().contains(biome.tag())).map(Entry::key).toList();
    }
}
