package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 评分行为表 rating_record（MySQL wandergo 库，协同过滤算法输入） */
@Data
@TableName("rating_record")
public class RatingRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("user_id")
    private Long userId;       // 用户 id（对应 app_user.id）
    @TableField("spot_key")
    private String spotId;     // 景点业务编码（对应 scenic_spot.spot_key）
    private Double score;      // 1-5 星
    private String createdAt;
}
