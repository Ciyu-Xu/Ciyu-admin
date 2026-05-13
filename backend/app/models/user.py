from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, BigInteger, ForeignKey, Table, Column, DateTime, func, SmallInteger, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


user_role_table = Table(
    "sys_user_role",
    Base.metadata,
    Column("user_id", BigInteger, ForeignKey("sys_user.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", BigInteger, ForeignKey("sys_role.id", ondelete="CASCADE"), primary_key=True),
)

user_post_table = Table(
    "sys_user_post",
    Base.metadata,
    Column("user_id", BigInteger, ForeignKey("sys_user.id", ondelete="CASCADE"), primary_key=True),
    Column("post_id", BigInteger, ForeignKey("sys_post.id", ondelete="CASCADE"), primary_key=True),
)

role_menu_table = Table(
    "sys_role_menu",
    Base.metadata,
    Column("role_id", BigInteger, ForeignKey("sys_role.id", ondelete="CASCADE"), primary_key=True),
    Column("menu_id", BigInteger, ForeignKey("sys_menu.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    """用户模型"""
    __tablename__ = "sys_user"
    __table_args__ = {"comment": "用户表"}

    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="用户名")
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True, comment="邮箱")
    phone: Mapped[Optional[str]] = mapped_column(String(20), comment="手机号")
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False, comment="密码")
    avatar: Mapped[Optional[str]] = mapped_column(Text, comment="头像")
    nickname: Mapped[Optional[str]] = mapped_column(String(50), comment="昵称")
    status: Mapped[int] = mapped_column(SmallInteger, default=1, comment="状态 0-禁用 1-启用")
    is_superuser: Mapped[int] = mapped_column(SmallInteger, default=0, comment="是否超级管理员")
    dept_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("sys_dept.id"), comment="部门ID")
    sso_id: Mapped[Optional[str]] = mapped_column(String(100), comment="SSO 用户ID")
    sso_provider: Mapped[Optional[str]] = mapped_column(String(50), comment="SSO 提供商")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="更新时间"
    )

    roles: Mapped[List["Role"]] = relationship("Role", secondary=user_role_table, back_populates="users")
    dept: Mapped[Optional["Dept"]] = relationship("Dept", back_populates="users")
    posts: Mapped[List["Post"]] = relationship("Post", secondary=user_post_table, back_populates="users")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username})>"


class Role(Base):
    """角色模型"""
    __tablename__ = "sys_role"
    __table_args__ = {"comment": "角色表"}

    name: Mapped[str] = mapped_column(String(50), nullable=False, comment="角色名称")
    role_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="角色标识")
    description: Mapped[Optional[str]] = mapped_column(String(255), comment="描述")
    sort_order: Mapped[int] = mapped_column(default=0, comment="排序")
    status: Mapped[int] = mapped_column(SmallInteger, default=1, comment="状态 0-禁用 1-启用")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="更新时间"
    )

    users: Mapped[List["User"]] = relationship("User", secondary=user_role_table, back_populates="roles")
    menus: Mapped[List["Menu"]] = relationship("Menu", secondary=role_menu_table, back_populates="roles")

    def __repr__(self) -> str:
        return f"<Role(id={self.id}, name={self.name})>"


class Menu(Base):
    """菜单模型"""
    __tablename__ = "sys_menu"
    __table_args__ = {"comment": "菜单表"}

    parent_id: Mapped[int] = mapped_column(BigInteger, default=0, comment="父菜单ID")
    menu_name: Mapped[str] = mapped_column(String(50), nullable=False, comment="菜单名称")
    path: Mapped[Optional[str]] = mapped_column(String(200), comment="路由路径")
    component: Mapped[Optional[str]] = mapped_column(String(200), comment="组件路径")
    icon: Mapped[Optional[str]] = mapped_column(String(50), comment="图标")
    sort_order: Mapped[int] = mapped_column(default=0, comment="排序")
    menu_type: Mapped[Optional[str]] = mapped_column(String(20), comment="菜单类型 M-目录 C-菜单 F-按钮")
    permission: Mapped[Optional[str]] = mapped_column(String(100), comment="权限标识")
    status: Mapped[int] = mapped_column(SmallInteger, default=1, comment="状态 0-禁用 1-启用")
    visible: Mapped[int] = mapped_column(SmallInteger, default=1, comment="是否可见 0-否 1-是")
    is_frame: Mapped[int] = mapped_column(SmallInteger, default=0, comment="是否外链")
    is_cache: Mapped[int] = mapped_column(SmallInteger, default=0, comment="是否缓存")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="更新时间"
    )

    roles: Mapped[List["Role"]] = relationship("Role", secondary=role_menu_table, back_populates="menus")

    def __repr__(self) -> str:
        return f"<Menu(id={self.id}, name={self.menu_name})>"


class Dept(Base):
    """部门模型"""
    __tablename__ = "sys_dept"
    __table_args__ = {"comment": "部门表"}

    dept_name: Mapped[str] = mapped_column(String(50), nullable=False, comment="部门名称")
    parent_id: Mapped[int] = mapped_column(BigInteger, default=0, comment="父部门ID")
    sort_order: Mapped[int] = mapped_column(default=0, comment="排序")
    leader: Mapped[Optional[str]] = mapped_column(String(50), comment="负责人")
    phone: Mapped[Optional[str]] = mapped_column(String(20), comment="联系电话")
    email: Mapped[Optional[str]] = mapped_column(String(100), comment="邮箱")
    status: Mapped[int] = mapped_column(SmallInteger, default=1, comment="状态 0-禁用 1-启用")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="更新时间"
    )

    users: Mapped[List["User"]] = relationship("User", back_populates="dept")
    posts: Mapped[List["Post"]] = relationship("Post", back_populates="dept")

    def __repr__(self) -> str:
        return f"<Dept(id={self.id}, name={self.dept_name})>"


class Post(Base):
    """岗位模型"""
    __tablename__ = "sys_post"
    __table_args__ = {"comment": "岗位表"}

    post_name: Mapped[str] = mapped_column(String(50), nullable=False, comment="岗位名称")
    post_code: Mapped[str] = mapped_column(String(50), nullable=False, comment="岗位编码")
    dept_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("sys_dept.id"), comment="部门ID")
    sort_order: Mapped[int] = mapped_column(default=0, comment="排序")
    status: Mapped[int] = mapped_column(SmallInteger, default=1, comment="状态 0-禁用 1-启用")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="更新时间"
    )

    users: Mapped[List["User"]] = relationship("User", secondary=user_post_table, back_populates="posts")
    dept: Mapped[Optional["Dept"]] = relationship("Dept", back_populates="posts")

    def __repr__(self) -> str:
        return f"<Post(id={self.id}, name={self.post_name})>"


class DictType(Base):
    """字典类型模型"""
    __tablename__ = "sys_dict_type"
    __table_args__ = {"comment": "字典类型表"}

    dict_name: Mapped[str] = mapped_column(String(50), nullable=False, comment="字典名称")
    dict_type: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, comment="字典类型")
    status: Mapped[int] = mapped_column(SmallInteger, default=1, comment="状态 0-禁用 1-启用")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="更新时间"
    )

    datas: Mapped[List["DictData"]] = relationship("DictData", back_populates="dict_type")

    def __repr__(self) -> str:
        return f"<DictType(id={self.id}, type={self.dict_type})>"


class DictData(Base):
    """字典数据模型"""
    __tablename__ = "sys_dict_data"
    __table_args__ = {"comment": "字典数据表"}

    dict_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("sys_dict_type.id"), nullable=False, comment="字典类型ID")
    dict_label: Mapped[str] = mapped_column(String(50), nullable=False, comment="字典标签")
    dict_value: Mapped[str] = mapped_column(String(100), nullable=False, comment="字典键值")
    sort_order: Mapped[int] = mapped_column(default=0, comment="排序")
    remark: Mapped[Optional[str]] = mapped_column(String(255), comment="备注")
    status: Mapped[int] = mapped_column(SmallInteger, default=1, comment="状态 0-禁用 1-启用")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, comment="创建时间")
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="更新时间"
    )

    dict_type: Mapped["DictType"] = relationship("DictType", back_populates="datas")

    def __repr__(self) -> str:
        return f"<DictData(id={self.id}, label={self.dict_label})>"


