import asyncio
import httpx
import json
from datetime import datetime
from typing import Dict, Optional, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.jobstores.memory import MemoryJobStore
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, update

from app.models.task import TaskJob, TaskLog
from app.core.config import settings


class TaskScheduler:
    _instance = None
    _scheduler: Optional[AsyncIOScheduler] = None
    _running_jobs: Dict[str, asyncio.Task] = {}
    _engine = None
    _async_session = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _get_engine(self):
        if self._engine is None:
            database_url = settings.DATABASE_URL
            self._engine = create_async_engine(database_url, echo=False)
        return self._engine
    
    def _get_session_factory(self):
        if self._async_session is None:
            engine = self._get_engine()
            self._async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        return self._async_session
    
    @property
    def scheduler(self) -> AsyncIOScheduler:
        if self._scheduler is None:
            jobstores = {
                'default': MemoryJobStore()
            }
            job_defaults = {
                'coalesce': False,
                'max_instances': 3,
                'misfire_grace_time': 60
            }
            self._scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                job_defaults=job_defaults,
                timezone='Asia/Shanghai'
            )
        return self._scheduler
    
    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()
            print("✅ 任务调度器已启动")
    
    def stop(self):
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            print("⏹️  任务调度器已停止")
    
    async def add_job(self, db: AsyncSession, job: TaskJob):
        job_id = f"task_{job.id}"
        
        if job_id in [j.id for j in self.scheduler.get_jobs()]:
            await self.remove_job(job.id)
        
        if job.status != "1":
            return
        
        if job.cron_expression:
            expr = job.cron_expression.strip()
            parts = expr.split()
            if len(parts) == 6:
                expr = " ".join(parts[1:])
            trigger = CronTrigger.from_crontab(expr)
        elif job.interval_seconds:
            trigger = IntervalTrigger(seconds=job.interval_seconds)
        else:
            return
        
        self.scheduler.add_job(
            self._execute_task,
            trigger=trigger,
            id=job_id,
            args=[job.id],
            replace_existing=True,
            misfire_grace_time=60
        )
        
        print(f"✅ 已添加任务: {job.name} ({job_id})")
    
    async def remove_job(self, job_id: int):
        job_key = f"task_{job_id}"
        if job_key in [j.id for j in self.scheduler.get_jobs()]:
            self.scheduler.remove_job(job_key)
            print(f"🗑️  已移除任务: {job_id}")
    
    async def run_job_now(self, db: AsyncSession, job_id: int, user_id: int = None):
        asyncio.create_task(self._execute_task(job_id, trigger_type="manual", user_id=user_id))
        return True
    
    async def _get_job(self, db: AsyncSession, job_id: int) -> Optional[TaskJob]:
        result = await db.execute(select(TaskJob).where(TaskJob.id == job_id))
        return result.scalar_one_or_none()
    
    async def _execute_task(
        self,
        job_id: int,
        trigger_type: str = "cron",
        user_id: int = None
    ):
        session_factory = self._get_session_factory()
        
        async with session_factory() as db:
            start_time = datetime.now()
            log_entry = TaskLog(
                job_id=job_id,
                job_name="",
                job_code="",
                status=2,
                start_time=start_time,
                trigger_type=trigger_type
            )
            
            try:
                job = await self._get_job(db, job_id)
                if not job:
                    print(f"❌ 任务不存在: {job_id}")
                    return
                
                log_entry.job_name = job.name
                log_entry.job_code = job.code
                
                print(f"▶️  开始执行任务: {job.name}")
                
                if job.task_type == "http":
                    result = await self._execute_http(job)
                else:
                    result = {"success": False, "message": "不支持的任务类型"}
                
                end_time = datetime.now()
                execution_time = int((end_time - start_time).total_seconds() * 1000)
                
                log_entry.status = 1 if result.get("success") else 0
                log_entry.end_time = end_time
                log_entry.execution_time = execution_time
                log_entry.response_data = json.dumps(result, ensure_ascii=False)
                
                if not result.get("success"):
                    log_entry.error_msg = result.get("message", "未知错误")
                
                await db.execute(
                    update(TaskJob)
                    .where(TaskJob.id == job_id)
                    .values(
                        last_run_time=start_time,
                        total_runs=job.total_runs + 1,
                        success_runs=job.success_runs + 1 if result.get("success") else job.success_runs,
                        fail_runs=job.fail_runs if result.get("success") else job.fail_runs + 1
                    )
                )
                
                db.add(log_entry)
                await db.commit()
                
                status_str = "✅ 成功" if result.get("success") else "❌ 失败"
                print(f"{status_str} - {job.name} (耗时: {execution_time}ms)")
                
            except Exception as e:
                end_time = datetime.now()
                execution_time = int((end_time - start_time).total_seconds() * 1000)
                log_entry.status = 0
                log_entry.end_time = end_time
                log_entry.execution_time = execution_time
                log_entry.error_msg = str(e)
                
                try:
                    job = await self._get_job(db, job_id)
                    if job:
                        await db.execute(
                            update(TaskJob)
                            .where(TaskJob.id == job_id)
                            .values(
                                last_run_time=start_time,
                                total_runs=job.total_runs + 1,
                                fail_runs=job.fail_runs + 1
                            )
                        )
                    
                    db.add(log_entry)
                    await db.commit()
                except Exception as commit_error:
                    print(f"❌ 记录日志失败: {commit_error}")
                
                print(f"❌ 任务执行异常: {job_id} - {str(e)}")
    
    async def _execute_http(self, job: TaskJob) -> Dict[str, Any]:
        try:
            headers = job.headers or {}
            headers["User-Agent"] = "AdminSystem-TaskScheduler/1.0"
            
            params = job.params
            data = job.body
            
            timeout = httpx.Timeout(job.timeout) if job.timeout else 30
            
            async with httpx.AsyncClient(timeout=timeout) as client:
                if job.method.upper() == "GET":
                    response = await client.get(job.target, headers=headers, params=params)
                elif job.method.upper() == "POST":
                    response = await client.post(job.target, headers=headers, params=params, content=data)
                elif job.method.upper() == "PUT":
                    response = await client.put(job.target, headers=headers, params=params, content=data)
                elif job.method.upper() == "DELETE":
                    response = await client.delete(job.target, headers=headers, params=params)
                else:
                    return {"success": False, "message": f"不支持的HTTP方法: {job.method}"}
                
                return {
                    "success": 200 <= response.status_code < 300,
                    "status_code": response.status_code,
                    "message": "执行成功" if 200 <= response.status_code < 300 else f"HTTP错误: {response.status_code}",
                    "response": response.text[:2000] if response.text else ""
                }
        except httpx.TimeoutException:
            return {"success": False, "message": f"请求超时 ({job.timeout}秒)"}
        except httpx.ConnectError:
            return {"success": False, "message": "无法连接到目标服务器"}
        except Exception as e:
            return {"success": False, "message": f"执行异常: {str(e)}"}
    
    async def reload_all_jobs(self, db: AsyncSession):
        result = await db.execute(select(TaskJob).where(TaskJob.status == "1"))
        jobs = result.scalars().all()
        
        loaded = 0
        for job in jobs:
            try:
                await self.add_job(db, job)
                loaded += 1
            except Exception as e:
                print(f"⚠️ 加载任务 {job.name}(id={job.id}) 失败: {e}")
        
        print(f"🔄 已重新加载 {loaded}/{len(jobs)} 个定时任务")


task_scheduler = TaskScheduler()
