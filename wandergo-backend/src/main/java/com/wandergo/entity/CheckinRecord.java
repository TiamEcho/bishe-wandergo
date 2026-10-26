package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 打卡记录表 t_checkin_record */
@Data
@TableName("t_checkin_record")
public class CheckinRecord {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String nick;       // 用户昵称
    private String spotName;   // 目的地名称
    private String city;
    private String checkinDate;
    private String text;       // 旅程故事
    private String mood;       // 心情标签
    private Double totalCost;  // 合计花费
    private String createdAt;
}
