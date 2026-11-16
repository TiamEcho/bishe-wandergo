package com.wandergo.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/** 密码摘要工具：与库里种子账号一致，用 MD5 存储（演示环境，正式环境应换 BCrypt） */
public final class Md5Util {
    private Md5Util() {
    }

    public static String md5(String text) {
        if (text == null) return null;
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] bs = md.digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(32);
            for (byte b : bs) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("当前 JDK 不支持 MD5", e);
        }
    }
}
