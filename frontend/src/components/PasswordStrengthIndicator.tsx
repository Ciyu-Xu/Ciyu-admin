import { useState, useEffect } from 'react'

interface PasswordStrengthIndicatorProps {
  password: string
  onStrengthChange?: (strength: number) => void
}

type StrengthLevel = 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong'

const PasswordStrengthIndicator = ({ password, onStrengthChange }: PasswordStrengthIndicatorProps) => {
  const [strength, setStrength] = useState<StrengthLevel>('very-weak')
  const [checks, setChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    digit: false,
    special: false,
  })

  useEffect(() => {
    if (!password) {
      setStrength('very-weak')
      setChecks({ length: false, uppercase: false, lowercase: false, digit: false, special: false })
      onStrengthChange?.(0)
      return
    }

    const newChecks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      digit: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/\`~]/.test(password),
    }
    setChecks(newChecks)

    const passedCount = Object.values(newChecks).filter(Boolean).length
    
    let level: StrengthLevel
    if (passedCount <= 1) level = 'very-weak'
    else if (passedCount === 2) level = 'weak'
    else if (passedCount === 3) level = 'medium'
    else if (passedCount === 4) level = 'strong'
    else level = 'very-strong'

    setStrength(level)
    onStrengthChange?.(passedCount)
  }, [password, onStrengthChange])

  const strengthConfig = {
    'very-weak': { color: 'bg-red-500', width: '20%', label: '非常弱' },
    'weak': { color: 'bg-orange-500', width: '40%', label: '弱' },
    'medium': { color: 'bg-yellow-500', width: '60%', label: '中等' },
    'strong': { color: 'bg-lime-500', width: '80%', label: '强' },
    'very-strong': { color: 'bg-green-500', width: '100%', label: '非常强' },
  }

  const { color, width, label } = strengthConfig[strength]

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-300 ease-out rounded-full`}
            style={{ width }}
          />
        </div>
        <span className={`text-xs font-medium min-w-[50px] ${
          strength === 'very-weak' ? 'text-red-500' :
          strength === 'weak' ? 'text-orange-500' :
          strength === 'medium' ? 'text-yellow-600' :
          strength === 'strong' ? 'text-lime-600' :
          'text-green-600'
        }`}>
          {label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1">
          <span className={checks.length ? 'text-green-500' : 'text-gray-400'}>
            {checks.length ? '✓' : '○'}
          </span>
          <span className={checks.length ? 'text-green-600' : 'text-gray-500'}>
            至少8个字符
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={checks.uppercase ? 'text-green-500' : 'text-gray-400'}>
            {checks.uppercase ? '✓' : '○'}
          </span>
          <span className={checks.uppercase ? 'text-green-600' : 'text-gray-500'}>
            大写字母
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={checks.lowercase ? 'text-green-500' : 'text-gray-400'}>
            {checks.lowercase ? '✓' : '○'}
          </span>
          <span className={checks.lowercase ? 'text-green-600' : 'text-gray-500'}>
            小写字母
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={checks.digit ? 'text-green-500' : 'text-gray-400'}>
            {checks.digit ? '✓' : '○'}
          </span>
          <span className={checks.digit ? 'text-green-600' : 'text-gray-500'}>
            数字
          </span>
        </div>
        <div className="flex items-center gap-1 col-span-2">
          <span className={checks.special ? 'text-green-500' : 'text-gray-400'}>
            {checks.special ? '✓' : '○'}
          </span>
          <span className={checks.special ? 'text-green-600' : 'text-gray-500'}>
            特殊字符 (!@#$%^&*...)
          </span>
        </div>
      </div>
    </div>
  )
}

export default PasswordStrengthIndicator
