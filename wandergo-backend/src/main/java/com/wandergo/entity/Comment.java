package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 评论表 t_comment（管理端内容审核对象） */
@Data
@TableName("t_comment")
public class Comment {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String spotId;     // 关联景点业务编码
    private String nick;       // 评论者
    private String content;    // 评论内容
    private Integer status;    // 0 待审核 / 1 通过 / 2 驳回
    private String createdAt;
}
