package com.pokefloor.pokemon;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/** 게임에 등장할 수 있는 포켓몬 (PokéAPI 에서 받아 저장). id = 전국도감 번호 */
@Entity
@Table(name = "pokemon")
public class Pokemon {

    @Id
    private Integer id;

    private String nameKo;
    private String nameEn;
    private String genusKo;

    @Column(length = 1000)
    private String flavorTextKo;

    /** "풀,독" 처럼 쉼표로 이어 저장 */
    private String typesKo;

    private double heightM;
    private double weightKg;

    @Column(length = 500) private String frontAnimated;
    @Column(length = 500) private String backAnimated;
    @Column(length = 500) private String frontStatic;
    @Column(length = 500) private String home;
    @Column(length = 500) private String officialArtwork;

    /** false 면 게임·도감에서 제외 (관리자가 끌 수 있음) */
    private boolean active = true;

    private LocalDateTime createdAt;

    protected Pokemon() {}

    public Pokemon(Integer id) {
        this.id = id;
        this.createdAt = LocalDateTime.now();
    }

    public List<String> typeList() {
        return typesKo == null || typesKo.isBlank() ? List.of() : Arrays.asList(typesKo.split(","));
    }

    public Integer getId() { return id; }
    public String getNameKo() { return nameKo; }
    public void setNameKo(String nameKo) { this.nameKo = nameKo; }
    public String getNameEn() { return nameEn; }
    public void setNameEn(String nameEn) { this.nameEn = nameEn; }
    public String getGenusKo() { return genusKo; }
    public void setGenusKo(String genusKo) { this.genusKo = genusKo; }
    public String getFlavorTextKo() { return flavorTextKo; }
    public void setFlavorTextKo(String flavorTextKo) { this.flavorTextKo = flavorTextKo; }
    public String getTypesKo() { return typesKo; }
    public void setTypesKo(String typesKo) { this.typesKo = typesKo; }
    public double getHeightM() { return heightM; }
    public void setHeightM(double heightM) { this.heightM = heightM; }
    public double getWeightKg() { return weightKg; }
    public void setWeightKg(double weightKg) { this.weightKg = weightKg; }
    public String getFrontAnimated() { return frontAnimated; }
    public void setFrontAnimated(String frontAnimated) { this.frontAnimated = frontAnimated; }
    public String getBackAnimated() { return backAnimated; }
    public void setBackAnimated(String backAnimated) { this.backAnimated = backAnimated; }
    public String getFrontStatic() { return frontStatic; }
    public void setFrontStatic(String frontStatic) { this.frontStatic = frontStatic; }
    public String getHome() { return home; }
    public void setHome(String home) { this.home = home; }
    public String getOfficialArtwork() { return officialArtwork; }
    public void setOfficialArtwork(String officialArtwork) { this.officialArtwork = officialArtwork; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
