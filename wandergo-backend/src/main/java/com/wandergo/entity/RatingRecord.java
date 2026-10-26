package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 评分行为表 t_rating_record（协同过滤算法输入） */
@Data
@TableName("t_rating_record")
public class RatingRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String nick;       // 用户昵称
    private String spotId;     // 景点业务编码（对应 t_spot.spot_id）
    private Integer score;     // 1-5 星
    private String createdAt;
}
