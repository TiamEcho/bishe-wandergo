package com.wandergo.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wandergo.entity.Comment;
import com.wandergo.entity.LikeRecord;
import com.wandergo.mapper.CommentMapper;
import com.wandergo.mapper.LikeRecordMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 社区互动接口：评论（含审核状态）+ 点赞 */
@RestController
@RequestMapping("/api")
public class CommentController {
    @Autowired private CommentMapper commentMapper;
    @Autowired private LikeRecordMapper likeMapper;

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    /** 景点评论列表：仅返回审核通过(status=1)的内容 */
    @GetMapping("/comment/list")
    public Map<String, Object> list(@RequestParam String spotId) {
        List<Comment> list = commentMapper.selectList(new LambdaQueryWrapper<Comment>()
                .eq(Comment::getSpotId, spotId)
                .eq(Comment::getStatus, 1)
                .orderByDesc(Comment::getId));
        return Map.of("ok", true, "list", list, "total", list.size());
    }

    /** 发表评论：默认待审核，进入管理端内容审核队列 */
    @PostMapping("/comment/add")
    public Map<String, Object> add(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        Comment c = new Comment();
        c.setSpotId(String.valueOf(body.getOrDefault("spotId", "")));
        Object nick = body.get("nick");
        c.setNick(nick != null ? nick.toString() : String.valueOf(req.getAttribute("username")));
        c.setContent(String.valueOf(body.getOrDefault("content", "")));
        c.setStatus(0);
        c.setCreatedAt(now());
        commentMapper.insert(c);
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true);
        resp.put("id", c.getId());
        resp.put("msg", "评论已提交，审核通过后展示");
        return resp;
    }

    /** 点赞 / 取消点赞（同一用户对同一景点只保留一条） */
    @PostMapping("/like/toggle")
    public Map<String, Object> toggle(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        String nick = String.valueOf(body.getOrDefault("nick", req.getAttribute("username")));
        String spotId = String.valueOf(body.getOrDefault("spotId", ""));
        LikeRecord old = likeMapper.selectOne(new LambdaQueryWrapper<LikeRecord>()
                .eq(LikeRecord::getNick, nick).eq(LikeRecord::getSpotId, spotId));
        boolean liked;
        if (old != null) {
            likeMapper.deleteById(old.getId());
            liked = false;
        } else {
            LikeRecord r = new LikeRecord();
            r.setNick(nick); r.setSpotId(spotId); r.setCreatedAt(now());
            likeMapper.insert(r);
            liked = true;
        }
        long count = likeMapper.selectCount(new LambdaQueryWrapper<LikeRecord>().eq(LikeRecord::getSpotId, spotId));
        return Map.of("ok", true, "liked", liked, "count", count);
    }

    @GetMapping("/like/count")
    public Map<String, Object> count(@RequestParam String spotId) {
        long c = likeMapper.selectCount(new LambdaQueryWrapper<LikeRecord>().eq(LikeRecord::getSpotId, spotId));
        return Map.of("ok", true, "count", c);
    }
}
