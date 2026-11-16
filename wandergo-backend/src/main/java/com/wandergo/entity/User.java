package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 用户表 app_user（MySQL wandergo 库） */
@Data
@TableName("app_user")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String username;   // 登录名（唯一）
    private String password;   // 密码（演示环境 MD5，正式环境应 BCrypt）
    private String nick;       // 展示昵称
    private String city;       // 常住城市
    private String createdAt;  // 注册时间（库里是 varchar，故用 String）
    private String role;       // user / admin
}
