package com.wandergo.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wandergo.entity.Spot;
import org.apache.ibatis.annotations.Mapper;

/** 景点表 scenic_spot */
@Mapper
public interface SpotMapper extends BaseMapper<Spot> {
}
