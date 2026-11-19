package com.pokefloor.world;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * 박스에 놓인 도트 소품(나무, 바위 등). 획득하는 게 아니라 자유롭게 놓고 지움.
 * (x, y) 는 박스 안 타일 좌표 0~7. 한 타일에 소품/아이템은 하나만.
 */
@Entity
@Table(name = "prop", indexes = @Index(columnList = "boxId"))
public class Prop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long boxId;

    /** assets/px/props.json 의 key = 이미지 파일 이름 */
    @Column(nullable = false, length = 40)
    private String propKey;

    private int x;
    private int y;

    protected Prop() {}

    public Prop(Long boxId, String propKey, int x, int y) {
        this.boxId = boxId;
        this.propKey = propKey;
        this.x = x;
        this.y = y;
    }

    public Long getId() { return id; }
    public Long getBoxId() { return boxId; }
    public String getPropKey() { return propKey; }
    public int getX() { return x; }
    public int getY() { return y; }

    public void moveTo(Long boxId, int x, int y) {
        this.boxId = boxId;
        this.x = x;
        this.y = y;
    }
}
