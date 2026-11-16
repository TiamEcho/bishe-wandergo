package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 帖子点赞表 post_like（MySQL wandergo 库，按帖子 post_key 计数） */
@Data
@TableName("post_like")
public class LikeRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("post_key")
    private String spotId;     // 复用字段名：这里存的是帖子 post_key
    private String nick;
    private String createdAt;
}
