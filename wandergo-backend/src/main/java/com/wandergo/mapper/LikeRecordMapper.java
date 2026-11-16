package com.wandergo.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wandergo.entity.LikeRecord;
import org.apache.ibatis.annotations.Mapper;

/** 帖子点赞表 post_like */
@Mapper
public interface LikeRecordMapper extends BaseMapper<LikeRecord> {
}
