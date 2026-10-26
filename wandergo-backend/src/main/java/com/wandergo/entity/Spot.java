package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 景点表 t_spot（数据来自 D:\\Documents\\wandergo-crawler 爬虫 + 手工校准坐标） */
@Data
@TableName("t_spot")
public class Spot {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String spotId;     // 业务编码，与前端 data.js 的 SPOTS.id 对应（如 erhai）
    private String name;       // 景点名称
    private String city;
    private String province;
    private String region;     // cn / ab（国内 / 国外）
    private String address;
    private Double lng;        // 经度（坐标拾取器校准）
    private Double lat;        // 纬度
    private String hours;      // 建议游玩时长
    private String traffic;    // 交通衔接
    private String price;      // 门票参考
    private Double rating;     // 平台评分
    private String tags;
    private String description;
    private Double heat;       // 热度（爬虫抓取）
    private String source;     // 数据来源（爬虫站点）
}
