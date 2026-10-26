package com.wandergo.config;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** 密码摘要工具：与 D:\\Documents\\wandergo-db 生成的种子账号（MD5("123456")）保持一致 */
public final class Md5Util {
    private Md5Util() {}

    public static String md5(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] bs = md.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : bs) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return raw;
        }
    }
}
