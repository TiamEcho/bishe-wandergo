package com.wandergo;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * WANDERGO 旅游打卡平台后端启动类
 * 技术栈：Spring Boot 3 + MyBatis-Plus + MySQL 8 + JWT + 协同过滤推荐
 */
@SpringBootApplication
@MapperScan("com.wandergo.mapper")
public class WandergoApplication {
    public static void main(String[] args) {
        SpringApplication.run(WandergoApplication.class, args);
        System.out.println("""
            ========================================================
              WANDERGO 后端已启动  http://localhost:8080
              接口: /api/user/*  /api/spot/*  /api/recommend  /api/checkin/*
            ========================================================""");
    }
}
