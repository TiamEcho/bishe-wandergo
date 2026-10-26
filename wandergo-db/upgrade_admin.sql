-- ============================================================
-- WANDERGO 增量升级脚本（管理端 + 社区互动）
-- 对应开题报告：用户权限校验 / 内容审核 / 点赞评论
-- 可重复执行，已存在的列/表会自动跳过
-- ============================================================
USE wandergo;

-- 1. 用户表增加角色与状态（管理端用户管理）
SET @c1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='wandergo' AND TABLE_NAME='t_user' AND COLUMN_NAME='role');
SET @s1 = IF(@c1=0, 'ALTER TABLE t_user ADD COLUMN role VARCHAR(16) DEFAULT ''user''', 'SELECT 1');
PREPARE p1 FROM @s1; EXECUTE p1; DEALLOCATE PREPARE p1;

SET @c2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='wandergo' AND TABLE_NAME='t_user' AND COLUMN_NAME='status');
SET @s2 = IF(@c2=0, 'ALTER TABLE t_user ADD COLUMN status TINYINT DEFAULT 1', 'SELECT 1');
PREPARE p2 FROM @s2; EXECUTE p2; DEALLOCATE PREPARE p2;

-- 2. 评论表（管理端内容审核对象，status: 0 待审 / 1 通过 / 2 驳回）
CREATE TABLE IF NOT EXISTS t_comment (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  spot_id    VARCHAR(64)  NOT NULL COMMENT '景点业务编码',
  nick       VARCHAR(64)  NOT NULL COMMENT '评论者昵称',
  content    VARCHAR(500) NOT NULL COMMENT '评论内容',
  status     TINYINT DEFAULT 0 COMMENT '0 待审 / 1 通过 / 2 驳回',
  created_at VARCHAR(32),
  KEY idx_spot (spot_id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';

-- 3. 点赞表
CREATE TABLE IF NOT EXISTS t_like (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  nick       VARCHAR(64) NOT NULL,
  spot_id    VARCHAR(64) NOT NULL,
  created_at VARCHAR(32),
  UNIQUE KEY uk_nick_spot (nick, spot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点赞表';

-- 4. 管理员账号 admin / admin123（MD5）
INSERT INTO t_user (username, password, avatar, role, status, created_at)
SELECT 'admin', MD5('admin123'), 'A', 'admin', 1, DATE_FORMAT(NOW(),'%Y-%m-%d %H:%i:%s')
WHERE NOT EXISTS (SELECT 1 FROM (SELECT username FROM t_user WHERE username='admin') t);

-- 5. 演示评论（2 条待审核 + 2 条已通过，便于管理端审核演示）
INSERT INTO t_comment (spot_id, nick, content, status, created_at)
SELECT * FROM (
  SELECT 'erhai' AS spot_id, '旅行者小林' AS nick, '才村码头日出真的绝，六点半到刚好。' AS content, 0 AS status, DATE_FORMAT(NOW(),'%Y-%m-%d %H:%i:%s') AS created_at
  UNION ALL SELECT 'gugong', '橘子汽水', '建议从午门进，人少一半，别问我怎么知道的。', 0, DATE_FORMAT(NOW(),'%Y-%m-%d %H:%i:%s')
  UNION ALL SELECT 'erhai', '阿柚', '环海西路骑行 12km，风大到怀疑人生，但值得。', 1, DATE_FORMAT(NOW(),'%Y-%m-%d %H:%i:%s')
  UNION ALL SELECT 'gugong', '一只胖橘', '红墙黄瓦，随手一拍就是壁纸。', 1, DATE_FORMAT(NOW(),'%Y-%m-%d %H:%i:%s')
) t
WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM t_comment LIMIT 1) x);

SELECT 'upgrade done' AS result,
       (SELECT COUNT(*) FROM t_user) AS users,
       (SELECT COUNT(*) FROM t_comment) AS comments;
