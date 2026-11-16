package com.wandergo.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wandergo.entity.RatingRecord;
import org.apache.ibatis.annotations.Mapper;

/** 评分行为表 rating_record（协同过滤输入） */
@Mapper
public interface RatingRecordMapper extends BaseMapper<RatingRecord> {
}
