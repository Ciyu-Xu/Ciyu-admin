-- 创建数据库
CREATE DATABASE IF NOT EXISTS `admin_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `admin_system`;

-- 创建用户表
CREATE TABLE IF NOT EXISTS `sys_user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) UNIQUE,
    `phone` VARCHAR(20),
    `hashed_password` VARCHAR(255) NOT NULL,
    `avatar` VARCHAR(255),
    `nickname` VARCHAR(50),
    `status` TINYINT NOT NULL DEFAULT 1,
    `is_superuser` TINYINT NOT NULL DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 创建角色表
CREATE TABLE IF NOT EXISTS `sys_role` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `role_key` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255),
    `sort_order` INT NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 创建菜单表
CREATE TABLE IF NOT EXISTS `sys_menu` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `parent_id` BIGINT DEFAULT 0,
    `menu_name` VARCHAR(50) NOT NULL,
    `path` VARCHAR(200),
    `component` VARCHAR(200),
    `icon` VARCHAR(50),
    `sort_order` INT NOT NULL DEFAULT 0,
    `menu_type` VARCHAR(20) NOT NULL DEFAULT 'menu',
    `permission` VARCHAR(100),
    `status` TINYINT NOT NULL DEFAULT 1,
    `visible` TINYINT NOT NULL DEFAULT 1,
    `is_frame` TINYINT NOT NULL DEFAULT 0,
    `is_cache` TINYINT NOT NULL DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='菜单表';

-- 创建用户角色关联表
CREATE TABLE IF NOT EXISTS `sys_user_role` (
    `user_id` BIGINT NOT NULL,
    `role_id` BIGINT NOT NULL,
    PRIMARY KEY (`user_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- 创建角色菜单关联表
CREATE TABLE IF NOT EXISTS `sys_role_menu` (
    `role_id` BIGINT NOT NULL,
    `menu_id` BIGINT NOT NULL,
    PRIMARY KEY (`role_id`, `menu_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色菜单关联表';

-- 创建操作日志表
CREATE TABLE IF NOT EXISTS `sys_operation_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT,
    `username` VARCHAR(50),
    `ip_address` VARCHAR(50),
    `method` VARCHAR(10),
    `url` VARCHAR(255),
    `query_params` TEXT,
    `body_params` TEXT,
    `response` TEXT,
    `status` TINYINT,
    `error_message` TEXT,
    `duration` INT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- 创建登录日志表
CREATE TABLE IF NOT EXISTS `sys_login_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT,
    `username` VARCHAR(50),
    `ip_address` VARCHAR(50),
    `user_agent` VARCHAR(500),
    `status` TINYINT NOT NULL,
    `message` VARCHAR(255),
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录日志表';

-- 创建定时任务表
CREATE TABLE IF NOT EXISTS `sys_task` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `task_group` VARCHAR(50),
    `function_name` VARCHAR(100),
    `function_args` TEXT,
    `cron_expression` VARCHAR(100),
    `status` TINYINT NOT NULL DEFAULT 1,
    `last_run_at` DATETIME,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='定时任务表';

-- 创建任务执行日志表
CREATE TABLE IF NOT EXISTS `sys_task_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `task_id` BIGINT NOT NULL,
    `task_name` VARCHAR(100),
    `task_group` VARCHAR(50),
    `status` TINYINT NOT NULL DEFAULT 0,
    `result` TEXT,
    `error_message` TEXT,
    `start_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `end_time` DATETIME,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务执行日志表';

-- 创建字典表
CREATE TABLE IF NOT EXISTS `sys_dict` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255),
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典表';

-- 创建字典项表
CREATE TABLE IF NOT EXISTS `sys_dict_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `dict_id` BIGINT NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `value` VARCHAR(100) NOT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `status` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典项表';

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS `sys_config` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    `value` TEXT,
    `description` VARCHAR(255),
    `type` VARCHAR(20) DEFAULT 'string',
    `is_public` TINYINT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 创建密码历史表
CREATE TABLE IF NOT EXISTS `sys_password_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `hashed_password` VARCHAR(255) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='密码历史表';

-- 创建密码策略表
CREATE TABLE IF NOT EXISTS `sys_password_policy` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `min_length` INT NOT NULL DEFAULT 6,
    `max_length` INT NOT NULL DEFAULT 20,
    `require_uppercase` TINYINT NOT NULL DEFAULT 1,
    `require_lowercase` TINYINT NOT NULL DEFAULT 1,
    `require_digit` TINYINT NOT NULL DEFAULT 1,
    `require_special` TINYINT NOT NULL DEFAULT 0,
    `history_count` INT NOT NULL DEFAULT 0,
    `expiration_days` INT NOT NULL DEFAULT 0,
    `same_as_username` TINYINT NOT NULL DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='密码策略表';

-- 初始化密码策略
INSERT INTO `sys_password_policy` (`min_length`, `max_length`, `require_uppercase`, `require_lowercase`, `require_digit`, `require_special`, `history_count`, `expiration_days`, `same_as_username`)
VALUES (6, 20, 1, 1, 1, 0, 0, 0, 0);

-- 初始化管理员用户（密码为 admin123，请在生产环境中立即修改！）
INSERT INTO `sys_user` (`username`, `email`, `phone`, `hashed_password`, `nickname`, `is_superuser`, `status`)
VALUES ('admin', 'admin@example.com', '13800138000', '$2b$12$N9q87Q5u3XKxV9LJ9JQq9u9VJ9JQq9u9VJ9JQq9u9VJ9JQq9u9VJ', '超级管理员', 1, 1);

-- 初始化角色
INSERT INTO `sys_role` (`name`, `role_key`, `description`, `sort_order`, `status`)
VALUES 
    ('超级管理员', 'admin', '系统超级管理员，拥有所有权限', 1, 1),
    ('普通用户', 'user', '普通用户角色', 2, 1);

-- 给管理员用户分配角色
INSERT INTO `sys_user_role` (`user_id`, `role_id`)
SELECT 1, 1 FROM DUAL WHERE EXISTS (SELECT 1 FROM `sys_user` WHERE `id` = 1);

-- 初始化系统配置
INSERT INTO `sys_config` (`key`, `value`, `description`, `type`, `is_public`)
VALUES
    ('site_name', 'Admin System', '站点名称', 'string', 1),
    ('site_description', '后台管理系统', '站点描述', 'string', 1),
    ('copyright', '© 2024 Admin System', '版权信息', 'string', 1);