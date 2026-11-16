package com.wandergo.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wandergo.entity.Comment;
import com.wandergo.entity.LikeRecord;
import com.wandergo.entity.User;
import com.wandergo.mapper.CommentMapper;
import com.wandergo.mapper.LikeRecordMapper;
import com.wandergo.mapper.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 社区互动接口：评论 + 点赞（MySQL wandergo 库：comment / post_like） */
@RestController
@RequestMapping("/api")
public class CommentController {
    @Autowired private CommentMapper commentMapper;
    @Autowired private LikeRecordMapper likeMapper;
    @Autowired private UserMapper userMapper;

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    /** 昵称 → app_user.id；app_user 只有 username，没有独立昵称列 */
    private Long uid(String nick) {
        if (nick == null || nick.isBlank() || "null".equals(nick)) return null;
        User u = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, nick).last("limit 1"));
        return u == null ? null : u.getId();
    }

    private String nickOf(Long uid) {
        if (uid == null) return "游客";
        User u = userMapper.selectById(uid);
        return u == null ? "游客" : u.getUsername();
    }

    /** 景点评论列表（comment 表没有审核列，按最新排序全量返回） */
    @GetMapping("/comment/list")
    public Map<String, Object> list(@RequestParam String spotId) {
        List<Comment> list = commentMapper.selectList(new LambdaQueryWrapper<Comment>()
                .eq(Comment::getSpotId, spotId)
                .orderByDesc(Comment::getId));
        list.forEach(c -> { c.setNick(nickOf(c.getUserId())); c.setStatus(1); });
        return Map.of("ok", true, "list", list, "total", list.size());
    }

    /** 发表评论 */
    @PostMapping("/comment/add")
    public Map<String, Object> add(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        Object nick = body.get("nick");
        String who = nick != null ? nick.toString() : String.valueOf(req.getAttribute("username"));
        Comment c = new Comment();
        c.setSpotId(String.valueOf(body.getOrDefault("spotId", "")));
        c.setUserId(uid(who));
        c.setContent(String.valueOf(body.getOrDefault("content", "")));
        c.setCreatedAt(now());
        commentMapper.insert(c);
        c.setNick(who);
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true);
        resp.put("id", c.getId());
        resp.put("data", c);
        return resp;
    }

    /** 点赞 / 取消点赞（post_like 按 post_key 计数，同一昵称只保留一条） */
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
