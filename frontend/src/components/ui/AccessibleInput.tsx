import React from 'react';

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    error?: string;
    className?: string;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({ id, label, error, className = '', ...props }) => {
    return (
        <div className={`form-group flex flex-col space-y-1.5 ${className}`}>
            <label htmlFor={id} className="text-sm font-medium text-gray-300">
                {label}
            </label>
            <input
                id={id}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                className={`
          flex h-10 w-full rounded-md border bg-[#0a0a0f]/80 px-3 py-2 text-sm text-gray-200 
          file:border-0 file:bg-transparent file:text-sm file:font-medium 
          placeholder:text-gray-500 
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-primary focus-visible:ring-offset-2 
          disabled:cursor-not-allowed disabled:opacity-50 
          transition-colors duration-200
          ${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-cyber-border/40 focus-visible:ring-cyber-primary/50'}
        `}
                {...props}
            />
            {error && (
                <span id={`${id}-error`} className="text-red-500 text-xs mt-1" role="alert">
                    {error}
                </span>
            )}
        </div>
    );
};
