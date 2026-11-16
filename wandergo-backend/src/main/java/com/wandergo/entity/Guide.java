package com.wandergo.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/** 攻略表 guide（MySQL wandergo 库，爬虫入库的图文 / 视频攻略，AI 内容分析的语料来源） */
@Data
@TableName("guide")
public class Guide {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String extId;       // 外站原始 id
    private String title;
    private String content;     // 攻略正文（mediumtext）
    private String city;
    private String cover;
    private String source;      // bilibili / douyin / xhs …
    private String sourceUrl;
    private String type;        // video / note
    private Integer likeCount;
    private Integer commentCount;
    private String createdAt;
}
