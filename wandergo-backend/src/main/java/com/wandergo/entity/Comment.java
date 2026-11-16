package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 景点评论表 comment（MySQL wandergo 库） */
@Data
@TableName("comment")
public class Comment {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("spot_key")
    private String spotId;     // 关联景点业务编码
    @TableField("user_id")
    private Long userId;       // 评论者 id
    private String content;    // 评论内容
    private String createdAt;
    /* 以下字段库里没有，仅供接口返回兼容，不落库 */
    @TableField(exist = false)
    private String nick;
    @TableField(exist = false)
    private Integer status;
}
