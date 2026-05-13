-- 给岗位表添加所属部门字段
-- 岗位属于部门（方案二）

-- 1. 添加 dept_id 字段
ALTER TABLE sys_post ADD COLUMN dept_id BIGINT NULL COMMENT '所属部门ID' AFTER post_code;

-- 2. 添加外键约束
ALTER TABLE sys_post ADD CONSTRAINT fk_post_dept FOREIGN KEY (dept_id) REFERENCES sys_dept(id) ON DELETE SET NULL;

-- 3. 创建索引
CREATE INDEX idx_post_dept_id ON sys_post(dept_id);
