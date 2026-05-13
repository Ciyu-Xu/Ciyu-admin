import re
from typing import Tuple, List
from enum import Enum


class PasswordStrength(Enum):
    VERY_WEAK = 0
    WEAK = 1
    MEDIUM = 2
    STRONG = 3
    VERY_STRONG = 4


class PasswordValidator:
    """密码强度验证器"""
    
    MIN_LENGTH = 8
    MAX_LENGTH = 32
    
    def __init__(self):
        self.rules = [
            (self._check_length, "长度至少8个字符"),
            (self._check_uppercase, "包含大写字母"),
            (self._check_lowercase, "包含小写字母"),
            (self._check_digit, "包含数字"),
            (self._check_special, "包含特殊字符"),
        ]
    
    def _check_length(self, password: str) -> bool:
        return len(password) >= self.MIN_LENGTH
    
    def _check_uppercase(self, password: str) -> bool:
        return bool(re.search(r'[A-Z]', password))
    
    def _check_lowercase(self, password: str) -> bool:
        return bool(re.search(r'[a-z]', password))
    
    def _check_digit(self, password: str) -> bool:
        return bool(re.search(r'\d', password))
    
    def _check_special(self, password: str) -> bool:
        return bool(re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;\'/\`~]', password))
    
    def get_strength(self, password: str) -> Tuple[PasswordStrength, List[str], List[str]]:
        """
        获取密码强度
        
        Returns:
            (strength_level, passed_rules, failed_rules)
        """
        passed_rules = []
        failed_rules = []
        
        for check_func, rule_desc in self.rules:
            if check_func(password):
                passed_rules.append(rule_desc)
            else:
                failed_rules.append(rule_desc)
        
        passed_count = len(passed_rules)

        if passed_count <= 1:
            strength = PasswordStrength.VERY_WEAK
        elif passed_count == 2:
            strength = PasswordStrength.WEAK
        elif passed_count == 3:
            strength = PasswordStrength.MEDIUM
        elif passed_count == 4:
            strength = PasswordStrength.STRONG
        else:
            strength = PasswordStrength.VERY_STRONG

        return strength, passed_rules, failed_rules
    
    def get_score(self, password: str) -> int:
        """
        获取密码强度分数 (0-100)
        """
        strength, passed_rules, _ = self.get_strength(password)
        
        base_score = len(passed_rules) * 20
        
        length = len(password)
        if length > self.MIN_LENGTH:
            length_bonus = min((length - self.MIN_LENGTH) * 2, 10)
            base_score += length_bonus
        
        if strength.value >= PasswordStrength.STRONG.value:
            char_variety = len(set(password))
            variety_bonus = min(char_variety * 2, 10)
            base_score += variety_bonus
        
        return min(base_score, 100)
    
    def validate(self, password: str) -> Tuple[bool, str]:
        """
        验证密码是否符合基本要求
        
        Returns:
            (is_valid, error_message)
        """
        if not password:
            return False, "密码不能为空"
        
        if len(password) < self.MIN_LENGTH:
            return False, f"密码长度至少{self.MIN_LENGTH}个字符"
        
        if len(password) > self.MAX_LENGTH:
            return False, f"密码长度不能超过{self.MAX_LENGTH}个字符"
        
        return True, ""
    
    def validate_with_strength(self, password: str, min_strength: PasswordStrength = PasswordStrength.MEDIUM) -> Tuple[bool, str, PasswordStrength]:
        """
        验证密码强度是否达标
        
        Args:
            password: 密码
            min_strength: 最低要求强度
            
        Returns:
            (is_valid, message, actual_strength)
        """
        is_valid, error_msg = self.validate(password)
        if not is_valid:
            return False, error_msg, PasswordStrength.VERY_WEAK
        
        strength, passed, failed = self.get_strength(password)
        
        if strength.value < min_strength.value:
            return False, f"密码强度不足，需要满足: {', '.join(failed)}", strength
        
        return True, "密码强度符合要求", strength


password_validator = PasswordValidator()
