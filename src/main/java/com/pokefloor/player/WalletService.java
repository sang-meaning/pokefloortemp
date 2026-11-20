package com.pokefloor.player;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 골드: 던전에서 벌고 상점에서 씀. 처음 시작할 때 몬스터볼 살 만큼 지급 */
@Service
public class WalletService {

    public static final long STARTING_GOLD = 600;

    private final WalletRepository repository;

    public WalletService(WalletRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public long gold() {
        return wallet().getGold();
    }

    @Transactional
    public long add(long n) {
        Wallet w = wallet();
        w.add(n);
        return w.getGold();
    }

    /** 모자라면 409 */
    @Transactional
    public long spend(long n) {
        Wallet w = wallet();
        if (w.getGold() < n) throw new ResponseStatusException(HttpStatus.CONFLICT, "골드가 부족해요");
        w.add(-n);
        return w.getGold();
    }

    @Transactional
    public int clearedTier() {
        return wallet().getClearedTier();
    }

    /** 단계 클리어 기록. 새로 올라갔으면 true */
    @Transactional
    public boolean clearTier(int no) {
        Wallet w = wallet();
        int before = w.getClearedTier();
        w.clearTier(no);
        return w.getClearedTier() > before;
    }

    private Wallet wallet() {
        return repository.findById(Wallet.ID).orElseGet(() -> repository.save(new Wallet(STARTING_GOLD)));
    }
}
