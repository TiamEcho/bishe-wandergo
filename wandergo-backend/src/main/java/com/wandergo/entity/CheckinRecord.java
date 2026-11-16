package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 打卡记录表 checkin（MySQL wandergo 库） */
@Data
@TableName("checkin")
public class CheckinRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("user_id")
    private Long userId;
    @TableField("spot_id")
    private String spotId;
    @TableField("city_name")
    private String city;
    private String text;       // 旅程故事
    private String mood;       // 心情标签
    private String cost;       // 花费（库里以字符串存，如 "580 元"）
    private String cover;
    private String source;
    private String createdAt;
    /* 以下字段库里没有，接口层做兼容展示用 */
    @TableField(exist = false)
    private String nick;
    @TableField(exist = false)
    private String spotName;
    @TableField(exist = false)
    private String checkinDate;
    @TableField(exist = false)
    private Double totalCost;
}
