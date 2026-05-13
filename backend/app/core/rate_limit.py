import time
from typing import Dict, Tuple
from datetime import datetime, timedelta
from collections import defaultdict


class IPRateLimiter:
    """IP限流器"""
    
    def __init__(self):
        self._attempts: Dict[str, list] = defaultdict(list)
        self._blocked: Dict[str, datetime] = {}
        self._max_attempts = 5
        self._block_duration = 15 * 60
        self._window = 10 * 60
    
    def _cleanup(self):
        now = datetime.now()
        for ip in list(self._attempts.keys()):
            self._attempts[ip] = [
                t for t in self._attempts[ip] 
                if now - t < timedelta(seconds=self._window)
            ]
            if not self._attempts[ip]:
                del self._attempts[ip]
        
        for ip in list(self._blocked.keys()):
            if now > self._blocked[ip]:
                del self._blocked[ip]
    
    def _is_blocked(self, ip: str) -> Tuple[bool, int]:
        if ip in self._blocked:
            remaining = int((self._blocked[ip] - datetime.now()).total_seconds())
            if remaining > 0:
                return True, remaining
            else:
                del self._blocked[ip]
        return False, 0
    
    def record_attempt(self, ip: str, success: bool = False) -> Tuple[bool, str]:
        self._cleanup()
        
        is_blocked, remaining = self._is_blocked(ip)
        if is_blocked:
            return False, f"IP已被限制，请在 {remaining} 秒后重试"
        
        if success:
            if ip in self._attempts:
                del self._attempts[ip]
            return True, "登录成功"
        
        now = datetime.now()
        self._attempts[ip].append(now)
        
        attempt_count = len(self._attempts[ip])
        
        if attempt_count >= self._max_attempts:
            self._blocked[ip] = now + timedelta(seconds=self._block_duration)
            remaining = self._block_duration
            return False, f"登录失败次数过多，IP已被限制 {remaining // 60} 分钟"
        
        remaining_attempts = self._max_attempts - attempt_count
        return False, f"登录失败，剩余尝试次数: {remaining_attempts}"
    
    def get_status(self, ip: str) -> Dict:
        is_blocked, remaining = self._is_blocked(ip)
        attempt_count = len(self._attempts.get(ip, []))
        
        return {
            "blocked": is_blocked,
            "remaining_seconds": remaining,
            "attempt_count": attempt_count,
            "remaining_attempts": max(0, self._max_attempts - attempt_count)
        }
    
    def unblock(self, ip: str):
        if ip in self._blocked:
            del self._blocked[ip]
        if ip in self._attempts:
            del self._attempts[ip]


rate_limiter = IPRateLimiter()
