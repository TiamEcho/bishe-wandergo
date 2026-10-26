package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 点赞表 t_like（打卡攻略 / 笔记的互动行为，可反哺推荐权重） */
@Data
@TableName("t_like")
public class LikeRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String nick;
    private String spotId;
    private String createdAt;
}
