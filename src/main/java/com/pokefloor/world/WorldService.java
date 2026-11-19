package com.pokefloor.world;

import com.pokefloor.collection.OwnedPokemon;
import com.pokefloor.collection.OwnedPokemonRepository;
import com.pokefloor.item.InventoryItem;
import com.pokefloor.item.InventoryItemRepository;
import com.pokefloor.item.PlacedItem;
import com.pokefloor.item.PlacedItemRepository;
import com.pokefloor.world.WorldDtos.BoxDto;
import com.pokefloor.world.WorldDtos.DeleteBoxResult;
import com.pokefloor.world.WorldDtos.PropDto;
import com.pokefloor.world.WorldDtos.PropRequest;
import com.pokefloor.world.WorldDtos.WorldDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

/** 박스(바이옴 땅)와 소품 관리 */
@Service
public class WorldService {

    /** 박스 한 변의 타일 수 (모든 박스 동일, 프론트 app.js 의 N 과 같아야 함) */
    public static final int BOX_SIZE = 12;
    /** 박스는 이 범위 안에서만 만들 수 있음 (메인 기준 ±) */
    public static final int MAX_RANGE = 6;

    /** 처음 만들어지는 메인 박스(들판)의 기본 소품 */
    private static final List<PropRequest> MAIN_DEFAULT = List.of(
            new PropRequest(null, "tree_round", 0, 0),
            new PropRequest(null, "pine", 1, 0),
            new PropRequest(null, "tree_round", 0, 2),
            new PropRequest(null, "bush", 10, 1),
            new PropRequest(null, "flower_red", 2, 9),
            new PropRequest(null, "flower_white", 8, 3),
            new PropRequest(null, "daisy", 7, 2),
            new PropRequest(null, "rock_brown_s", 9, 9),
            new PropRequest(null, "stump", 0, 11),
            new PropRequest(null, "bush_flower", 11, 6),
            new PropRequest(null, "sign", 11, 8));

    private final BoxRepository boxes;
    private final PropRepository props;
    private final PropCatalog catalog;
    private final OwnedPokemonRepository owned;
    private final PlacedItemRepository placedItems;
    private final InventoryItemRepository inventory;
    private final Random random = new Random();

    public WorldService(BoxRepository boxes, PropRepository props, PropCatalog catalog, OwnedPokemonRepository owned,
                        PlacedItemRepository placedItems, InventoryItemRepository inventory) {
        this.boxes = boxes;
        this.props = props;
        this.catalog = catalog;
        this.owned = owned;
        this.placedItems = placedItems;
        this.inventory = inventory;
    }

    /* ---------- 조회 ---------- */

    @Transactional(readOnly = true)
    public WorldDto world() {
        return new WorldDto(BOX_SIZE,
                boxes.findAllByOrderByIdAsc().stream().map(BoxDto::from).toList(),
                props.findAll().stream().map(PropDto::from).toList());
    }

    @Transactional
    public Box mainBox() {
        return boxes.findByMainTrue().orElseGet(() -> {
            Box main = boxes.save(new Box(0, 0, Biome.MEADOW, true));
            MAIN_DEFAULT.forEach(p -> props.save(new Prop(main.getId(), p.key(), p.x(), p.y())));
            return main;
        });
    }

    public Box box(Long id) {
        return boxes.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "없는 박스예요"));
    }

    /* ---------- 박스 추가/삭제 ---------- */

    /** 빈 자리이고, 기존 박스와 상하좌우로 붙어 있어야 함. 바이옴에 어울리는 소품 몇 개를 깔아 줌 */
    @Transactional
    public BoxDto addBox(int bx, int by, String biomeId) {
        Biome biome = parseBiome(biomeId);
        if (Math.abs(bx) > MAX_RANGE || Math.abs(by) > MAX_RANGE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "너무 멀리는 만들 수 없어요");
        }
        if (boxes.existsByBxAndBy(bx, by)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 박스가 있는 자리예요");
        }
        boolean adjacent = boxes.existsByBxAndBy(bx + 1, by) || boxes.existsByBxAndBy(bx - 1, by)
                || boxes.existsByBxAndBy(bx, by + 1) || boxes.existsByBxAndBy(bx, by - 1);
        if (!adjacent) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "기존 박스 옆에만 붙일 수 있어요");
        }
        Box box = boxes.save(new Box(bx, by, biome, false));
        scatterProps(box, 9);
        return BoxDto.from(box);
    }

    /**
     * 박스 삭제 (메인은 불가).
     * 소품은 자유롭게 놓는 것이라 함께 삭제, 포켓몬·아이템(몬스터볼, 배지 등)은 인벤토리로 돌려보냄.
     */
    @Transactional
    public DeleteBoxResult deleteBox(Long id) {
        Box box = box(id);
        if (box.isMain()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "메인 박스는 지울 수 없어요");
        }
        List<OwnedPokemon> mons = owned.findByBoxId(id);
        mons.forEach(OwnedPokemon::unplace);
        int items = returnItemsOf(id);
        long deleted = props.deleteByBoxId(id);
        boxes.delete(box);
        return new DeleteBoxResult(mons.size(), items, deleted);
    }

    /** 박스에 놓인 아이템을 인벤토리로 돌려보냄 (개수 +1 씩) */
    private int returnItemsOf(Long boxId) {
        List<PlacedItem> list = placedItems.findByBoxId(boxId);
        for (PlacedItem p : list) {
            inventory.findById(p.getItemId())
                    .orElseGet(() -> inventory.save(new InventoryItem(p.getItemId(), 0)))
                    .add(1);
        }
        placedItems.deleteAll(list);
        return list.size();
    }

    private Biome parseBiome(String id) {
        try {
            return Biome.valueOf(String.valueOf(id).toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "없는 바이옴이에요: " + id);
        }
    }

    private void scatterProps(Box box, int count) {
        List<String> keys = new ArrayList<>(catalog.keysFor(box.getBiome()));
        if (keys.isEmpty()) return;
        Set<Integer> used = new HashSet<>();
        int placed = 0;
        for (int tries = 0; placed < count && tries < 100; tries++) {
            int x = random.nextInt(BOX_SIZE), y = random.nextInt(BOX_SIZE);
            boolean nearCenter = x >= 3 && x <= BOX_SIZE - 4 && y >= 3 && y <= BOX_SIZE - 4;   // 가운데는 비워 둠
            if (nearCenter || !used.add(y * BOX_SIZE + x)) continue;
            props.save(new Prop(box.getId(), keys.get(random.nextInt(keys.size())), x, y));
            placed++;
        }
    }

    /* ---------- 소품 ---------- */

    @Transactional
    public PropDto addProp(PropRequest req) {
        if (req.key() == null || !catalog.exists(req.key())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "없는 소품이에요: " + req.key());
        }
        int[] xy = checkTile(req.boxId(), req.x(), req.y(), null);
        return PropDto.from(props.save(new Prop(req.boxId(), req.key(), xy[0], xy[1])));
    }

    /** 이동: 다른 박스로도 옮길 수 있음 */
    @Transactional
    public PropDto moveProp(Long id, PropRequest req) {
        Prop p = props.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "없는 소품이에요"));
        Long boxId = req.boxId() != null ? req.boxId() : p.getBoxId();
        int[] xy = checkTile(boxId, req.x(), req.y(), id);
        p.moveTo(boxId, xy[0], xy[1]);
        return PropDto.from(p);
    }

    @Transactional
    public void deleteProp(Long id) {
        if (!props.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "없는 소품이에요");
        props.deleteById(id);
    }

    /* ---------- 타일 점유 ---------- */

    /** 소품/아이템이 놓인 타일 (y*8+x). 포켓몬은 그 위에 설 수 없음. except* = 지금 옮기는 자기 자신 */
    @Transactional(readOnly = true)
    public Set<Integer> blockedTiles(Long boxId, Long exceptPropId, Long exceptItemId) {
        Set<Integer> set = new HashSet<>();
        props.findByBoxId(boxId).stream()
                .filter(p -> !p.getId().equals(exceptPropId))
                .forEach(p -> set.add(p.getY() * BOX_SIZE + p.getX()));
        placedItems.findByBoxId(boxId).stream()
                .filter(p -> !p.getId().equals(exceptItemId))
                .forEach(p -> set.add(p.getY() * BOX_SIZE + p.getX()));
        return set;
    }

    public int[] checkTile(Long boxId, Integer x, Integer y, Long exceptPropId) {
        return checkTile(boxId, x, y, exceptPropId, null);
    }

    /** 범위 안이고 비어 있는 타일인지 확인 → [x, y] */
    public int[] checkTile(Long boxId, Integer x, Integer y, Long exceptPropId, Long exceptItemId) {
        if (boxId == null || x == null || y == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "boxId, x, y 가 필요해요");
        }
        box(boxId);
        if (x < 0 || y < 0 || x >= BOX_SIZE || y >= BOX_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "박스 밖이에요");
        }
        if (blockedTiles(boxId, exceptPropId, exceptItemId).contains(y * BOX_SIZE + x)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 무언가 놓인 칸이에요");
        }
        return new int[]{x, y};
    }

    /**
     * 메인 박스 중앙에서 가장 가까운 빈 칸 (소품·아이템·다른 포켓몬이 없는 칸).
     * 새로 얻은 포켓몬, 인벤토리에서 꺼낸 포켓몬이 여기에 나타남.
     */
    @Transactional
    public int[] freeTileNearCenter(Long boxId, Integer exceptPokemonId) {
        Set<Integer> taken = new HashSet<>(blockedTiles(boxId, null, null));
        owned.findByBoxId(boxId).stream()
                .filter(o -> !o.getPokemonId().equals(exceptPokemonId) && o.getTileX() != null)
                .forEach(o -> taken.add(o.getTileY() * BOX_SIZE + o.getTileX()));
        double c = (BOX_SIZE - 1) / 2.0;
        List<int[]> tiles = new ArrayList<>();
        for (int y = 0; y < BOX_SIZE; y++) for (int x = 0; x < BOX_SIZE; x++) tiles.add(new int[]{x, y});
        tiles.sort(Comparator.comparingDouble(t -> Math.hypot(t[0] - c, t[1] - c) + random.nextDouble() * 0.01));
        for (int[] t : tiles) {
            if (!taken.contains(t[1] * BOX_SIZE + t[0])) return t;
        }
        // 꽉 찼으면 소품만 없는 가장 가까운 칸 (포켓몬끼리는 겹쳐도 돌아다니며 비켜감)
        Set<Integer> blocked = blockedTiles(boxId, null, null);
        for (int[] t : tiles) {
            if (!blocked.contains(t[1] * BOX_SIZE + t[0])) return t;
        }
        return new int[]{BOX_SIZE / 2, BOX_SIZE / 2};
    }

    /** 처음 실행: 메인 박스 만들고, 예전 버전에서 방에 나와 있던 포켓몬을 메인 박스로 옮김 */
    @Transactional
    public void migrate() {
        Box main = mainBox();
        for (OwnedPokemon o : owned.findAll()) {
            if (o.isPlaced() && o.getBoxId() == null) {
                int[] t = freeTileNearCenter(main.getId(), o.getPokemonId());
                o.placeAt(main.getId(), t[0], t[1]);
                owned.flush();
            }
        }
    }
}
