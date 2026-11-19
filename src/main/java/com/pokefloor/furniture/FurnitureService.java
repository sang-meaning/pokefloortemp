package com.pokefloor.furniture;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.regex.Pattern;

@Service
public class FurnitureService {

    /** 방 크기 (app.js 의 ROOMS 와 맞춤: 14 × 12 타일) */
    static final int GRID_W = 14;
    static final int GRID_H = 12;
    private static final Pattern SPRITE = Pattern.compile("[A-Za-z0-9]+_(SE|SW|NE|NW)");

    /** 처음 방에 놓이는 기본 배치 (배경 편집에서 "기본 배치로" 를 누르면 이 상태로 돌아감) */
    static final List<FurnitureDto> DEFAULT_LAYOUT = List.of(
            // 연구실
            f("bookcaseOpen_SW", 1, 0), f("bookcaseClosedWide_SW", 2, 0), f("pottedPlant_SW", 6, 0),
            f("desk_SE", 0, 2), new FurnitureDto(null, "computerScreen_SE", 0, 2, 46),
            f("chairDesk_NW", 2, 2), f("lampRoundFloor_SE", 0, 5),
            // 거실
            f("rugRectangle_SW", 9, 2), f("loungeSofa_SW", 9, 0), f("tableCoffee_SW", 9, 2),
            f("cabinetTelevision_NE", 9, 4), new FurnitureDto(null, "televisionModern_NE", 9, 4, 30),
            f("loungeChair_SE", 7, 1), f("lampRoundFloor_SW", 12, 0), f("pottedPlant_SW", 13, 0),
            // 침실
            f("rugRound_SE", 3, 9), f("bedDouble_SE", 0, 7), f("cabinetBedDrawerTable_SE", 0, 6),
            f("bookcaseOpenLow_SE", 0, 10), f("bear_SE", 4, 10), f("pottedPlant_SE", 6, 11),
            // 부엌
            f("kitchenFridge_SW", 7, 6), f("kitchenStove_SW", 8, 6), f("kitchenSink_SW", 9, 6),
            f("kitchenCabinet_SW", 10, 6), f("tableRound_SE", 9, 9), f("chair_SW", 9, 8), f("chair_NE", 9, 10),
            f("cardboardBoxClosed_SE", 13, 11), f("cardboardBoxOpen_SE", 12, 11), f("trashcan_SE", 13, 8)
    );

    private static FurnitureDto f(String sprite, int x, int y) {
        return new FurnitureDto(null, sprite, x, y, 0);
    }

    private final FurnitureRepository repository;

    public FurnitureService(FurnitureRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<FurnitureDto> list() {
        return repository.findAll().stream().map(FurnitureDto::from).toList();
    }

    @Transactional
    public FurnitureDto create(FurnitureDto req) {
        validate(req);
        return FurnitureDto.from(repository.save(new Furniture(req.sprite(), req.x(), req.y(), req.lift())));
    }

    @Transactional
    public FurnitureDto update(long id, FurnitureDto req) {
        validate(req);
        Furniture f = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "없는 가구예요"));
        f.update(req.sprite(), req.x(), req.y(), req.lift());
        return FurnitureDto.from(f);
    }

    @Transactional
    public void delete(long id) {
        repository.deleteById(id);
    }

    /** 전부 지우고 기본 배치로 */
    @Transactional
    public List<FurnitureDto> reset() {
        repository.deleteAllInBatch();
        DEFAULT_LAYOUT.forEach(d -> repository.save(new Furniture(d.sprite(), d.x(), d.y(), d.lift())));
        return list();
    }

    @Transactional
    public void seedIfEmpty() {
        if (repository.count() == 0) reset();
    }

    /** 겹침 검사는 화면에서 하고, 서버는 형식과 방 범위만 확인 */
    private void validate(FurnitureDto req) {
        if (req.sprite() == null || !SPRITE.matcher(req.sprite()).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잘못된 가구 이름: " + req.sprite());
        }
        if (req.x() < 0 || req.y() < 0 || req.x() >= GRID_W || req.y() >= GRID_H) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "방 밖에는 놓을 수 없어요");
        }
        if (req.lift() < 0 || req.lift() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잘못된 높이");
        }
    }
}
