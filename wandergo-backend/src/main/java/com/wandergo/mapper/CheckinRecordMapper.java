package com.wandergo.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wandergo.entity.CheckinRecord;
import org.apache.ibatis.annotations.Mapper;

/** 打卡记录表 checkin */
@Mapper
public interface CheckinRecordMapper extends BaseMapper<CheckinRecord> {
}
