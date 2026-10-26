package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 用户表 t_user */
@Data
@TableName("t_user")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String username;   // 昵称（登录名）
    private String password;   // 密码（演示环境明文，正式环境应 BCrypt）
    private String avatar;     // 头像首字
    private String createdAt;  // 注册时间
    private String role;       // user / admin（管理端权限）
    private Integer status;    // 1 正常 / 0 封禁（管理端用户管理）
}
