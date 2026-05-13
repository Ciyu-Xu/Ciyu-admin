import { forwardRef, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface FieldWrapperProps {
  label: string
  required?: boolean
  error?: string
  children: ReactNode
}

const FieldWrapper = ({ label, required, error, children }: FieldWrapperProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
)

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const InputField = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, id, className, ...props }, ref) => (
    <FieldWrapper label={label} required={required} error={error}>
      <input
        ref={ref}
        id={id}
        {...props}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        } ${className || ''}`}
      />
    </FieldWrapper>
  )
)
InputField.displayName = 'InputField'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string | number; label: string }[]
  placeholder?: string
}

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, required, options, placeholder, className, ...props }, ref) => (
    <FieldWrapper label={label} required={required} error={error}>
      <select
        ref={ref}
        {...props}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        } ${className || ''}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FieldWrapper>
  )
)
SelectField.displayName = 'SelectField'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, className, ...props }, ref) => (
    <FieldWrapper label={label} required={required} error={error}>
      <textarea
        ref={ref}
        {...props}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        } ${className || ''}`}
      />
    </FieldWrapper>
  )
)
TextareaField.displayName = 'TextareaField'

interface CheckboxProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export const CheckboxField = ({ label, checked, onChange }: CheckboxProps) => (
  <label className="flex items-center cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
    />
    <span className="ml-2 text-sm text-gray-700">{label}</span>
  </label>
)
