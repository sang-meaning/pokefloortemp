package com.pokefloor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 예전 버전 DB 보정: enum 컬럼이 H2 의 ENUM 타입으로 만들어져 있으면
 * 새 값(예: 아이템 분류 TOOL)을 넣을 수 없어서 VARCHAR 로 바꿈. 다른 시작 작업보다 먼저 실행.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SchemaFix implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaFix.class);
    private final JdbcTemplate jdbc;

    public SchemaFix(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        toVarchar("ITEM", "KIND");
        toVarchar("BOX", "BIOME");
    }

    private void toVarchar(String table, String column) {
        try {
            String type = jdbc.queryForObject(
                    "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?",
                    String.class, table, column);
            if ("ENUM".equalsIgnoreCase(type)) {
                jdbc.execute("ALTER TABLE " + table + " ALTER COLUMN " + column + " SET DATA TYPE VARCHAR(20)");
                log.info("{}.{} 컬럼을 VARCHAR 로 바꿨어요", table, column);
            }
        } catch (Exception e) {
            log.debug("스키마 보정 건너뜀 {}.{}: {}", table, column, e.getMessage());
        }
    }
}
