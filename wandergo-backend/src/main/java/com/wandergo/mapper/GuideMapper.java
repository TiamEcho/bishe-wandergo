package com.wandergo.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wandergo.entity.Guide;
import org.apache.ibatis.annotations.Mapper;

/** 攻略表 guide（AI 内容分析的语料来源） */
@Mapper
public interface GuideMapper extends BaseMapper<Guide> {
}
