interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'success' | 'outline';
}

export const Button:React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', disabled = false, className = '', ...props }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants : Record<string, string> = {
    primary: "bg-rose-900 text-white hover:bg-rose-800 shadow-md hover:shadow-lg focus:ring-rose-500", // Maroon
    accent: "bg-amber-600 text-white hover:bg-amber-500 shadow-md hover:shadow-lg focus:ring-amber-500", // Gold
    secondary: "bg-neutral-200 text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700",
    outline: "border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800",
    danger: "bg-red-800 text-white hover:bg-red-700", 
    success: "bg-emerald-800 text-white hover:bg-emerald-700",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};