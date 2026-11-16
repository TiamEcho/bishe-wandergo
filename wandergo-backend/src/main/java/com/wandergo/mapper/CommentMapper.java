package com.wandergo.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.wandergo.entity.Comment;
import org.apache.ibatis.annotations.Mapper;

/** 景点评论表 comment */
@Mapper
public interface CommentMapper extends BaseMapper<Comment> {
}
