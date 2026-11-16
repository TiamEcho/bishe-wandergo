package com.wandergo.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wandergo.entity.User;
import org.apache.ibatis.annotations.Mapper;

/** 用户表 app_user */
@Mapper
public interface UserMapper extends BaseMapper<User> {
}
