package com.wandergo;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** WANDERGO 后端启动类：Spring Boot 3.2.5 + MyBatis-Plus + 本机 MySQL */
@SpringBootApplication
@MapperScan("com.wandergo.mapper")
public class WandergoApplication {
    public static void main(String[] args) {
        SpringApplication.run(WandergoApplication.class, args);
    }
}
