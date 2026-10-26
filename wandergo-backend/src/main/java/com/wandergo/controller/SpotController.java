package com.wandergo.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wandergo.entity.Spot;
import com.wandergo.mapper.SpotMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 景点接口（数据来自爬虫入库） */
@RestController
@RequestMapping("/api/spot")
public class SpotController {
    @Autowired private SpotMapper spotMapper;

    @GetMapping("/list")
    public Map<String, Object> list(@RequestParam(required = false) String region,
                                    @RequestParam(required = false) String kw) {
        LambdaQueryWrapper<Spot> qw = new LambdaQueryWrapper<>();
        if (region != null && !region.isBlank()) qw.eq(Spot::getRegion, region);
        if (kw != null && !kw.isBlank()) qw.like(Spot::getName, kw).or().like(Spot::getCity, kw);
        List<Spot> list = spotMapper.selectList(qw);
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true); resp.put("total", list.size()); resp.put("list", list);
        return resp;
    }
}
