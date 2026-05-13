import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(50),
  password: z.string().min(6, '密码至少6个字符').max(100),
  captcha: z.string().optional(),
  uuid: z.string().optional(),
})

export const profileSchema = z.object({
  nickname: z.string().min(1, '昵称不能为空').max(30, '昵称不能超过30个字符'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional().or(z.literal('')),
  avatar: z.string().optional(),
})

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少6个字符').max(100),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

export const noticeSchema = z.object({
  notice_title: z.string().min(1, '公告标题不能为空').max(100, '标题不能超过100个字符'),
  notice_content: z.string().min(1, '公告内容不能为空'),
  notice_type: z.string(),
  is_popup: z.number(),
  status: z.number(),
})

export const userSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(50),
  nickname: z.string().min(1, '昵称不能为空').max(30),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional().or(z.literal('')),
  status: z.number(),
  dept_id: z.number().optional(),
  role_ids: z.array(z.number()).optional(),
  post_ids: z.array(z.number()).optional(),
})

export const roleSchema = z.object({
  role_name: z.string().min(1, '角色名称不能为空').max(50),
  role_key: z.string().min(1, '角色标识不能为空').max(100),
  sort_order: z.number().int('排序号必须为整数'),
  status: z.number(),
  data_scope: z.string().optional(),
  menu_ids: z.array(z.number()).optional(),
})

export const deptSchema = z.object({
  dept_name: z.string().min(1, '部门名称不能为空').max(50),
  parent_id: z.number(),
  sort_order: z.number().int('排序号必须为整数'),
  leader: z.string().optional().or(z.literal('')),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional().or(z.literal('')),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  status: z.number(),
})

export const postSchema = z.object({
  post_name: z.string().min(1, '岗位名称不能为空').max(50),
  post_code: z.string().min(1, '岗位编码不能为空').max(50),
  sort_order: z.number().int('排序号必须为整数'),
  status: z.number(),
})

export const dictTypeSchema = z.object({
  dict_name: z.string().min(1, '字典名称不能为空').max(50),
  dict_type: z.string().min(1, '字典类型不能为空').max(100),
  status: z.number(),
})

export const dictDataSchema = z.object({
  dict_id: z.number({ invalid_type_error: '请选择字典类型' }),
  dict_label: z.string().min(1, '字典标签不能为空').max(50),
  dict_value: z.string().min(1, '字典键值不能为空').max(100),
  sort_order: z.number().int(),
  remark: z.string().optional().or(z.literal('')),
  status: z.number(),
})

export const taskSchema = z.object({
  name: z.string().min(1, '任务名称不能为空').max(100),
  code: z.string().min(1, '任务编码不能为空').max(100),
  task_type: z.string(),
  method: z.string(),
  target: z.string().min(1, '请求地址不能为空'),
  cron_expression: z.string().optional().or(z.literal('')),
  interval_seconds: z.number().optional(),
  timeout: z.number().min(1, '超时时间必须大于0'),
  retry_count: z.number().min(0),
  status: z.string(),
  is_async: z.boolean(),
  remark: z.string().optional().or(z.literal('')),
})

export const messageSchema = z.object({
  title: z.string().min(1, '消息标题不能为空').max(100),
  msg_type: z.number(),
  content: z.string().min(1, '消息内容不能为空'),
  receiver_ids: z.array(z.number()).min(1, '请选择接收用户'),
})

export type ProfileForm = z.infer<typeof profileSchema>
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>
export type NoticeForm = z.infer<typeof noticeSchema>
export type UserForm = z.infer<typeof userSchema>
export type RoleForm = z.infer<typeof roleSchema>
export type DeptForm = z.infer<typeof deptSchema>
export type PostForm = z.infer<typeof postSchema>
export type DictTypeForm = z.infer<typeof dictTypeSchema>
export type DictDataForm = z.infer<typeof dictDataSchema>
export type TaskForm = z.infer<typeof taskSchema>
export type MessageForm = z.infer<typeof messageSchema>
export type LoginForm = z.infer<typeof loginSchema>
