package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 景点表 scenic_spot（MySQL wandergo 库，1405 条，由 Node 爬虫入库）
 * 原有 t_spot / spot_id 命名已废弃：spot_key 才是业务编码。
 */
@Data
@TableName("scenic_spot")
public class Spot {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("spot_key")
    private String spotId;     // 业务编码，与前端 data.js 的 SPOTS.id 对应（如 sx_dfgt）
    private String name;       // 景点名称
    private String city;
    private String province;
    private Double lng;        // 经度
    private Double lat;        // 纬度
    private Double rating;     // 平台评分
    private Integer heat;      // 热度
    private String price;      // 门票参考
    private String tags;
    private String cover;      // 封面图 URL，无图为空
    private String intro;      // 简介
    @TableField("poi_type")
    private String poiType;    // 景区 / 美食 / 酒店 …
    private String source;     // 数据来源
}
