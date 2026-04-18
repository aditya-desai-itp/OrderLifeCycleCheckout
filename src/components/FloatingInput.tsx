
export const FloatingInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, className, value, ...props }) => {
  const hasValue = value !== undefined && value !== null && String(value).trim().length > 0;
  
  return (
    <div className="relative z-0 w-full mb-2 group">
      <input 
        id={id} 
        value={value}
        className={`block px-3 pb-2.5 pt-5 w-full text-sm text-neutral-900 bg-transparent rounded-md border border-neutral-300 appearance-none dark:text-white dark:border-neutral-700 dark:focus:border-amber-500 focus:outline-none focus:ring-0 focus:border-amber-600 peer ${className || ''}`} 
        placeholder=" " 
        {...props} 
      />
      <label 
        htmlFor={id} 
        className={`absolute text-sm text-neutral-500 dark:text-neutral-400 duration-300 transform origin-[0] bg-white dark:bg-neutral-900 px-2 peer-focus:px-2 peer-focus:text-amber-600 peer-focus:dark:text-amber-500 left-1
        ${hasValue ? 'scale-75 -translate-y-4 top-2' : 'scale-100 -translate-y-1/2 top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4'}`}
      >
        {label}
      </label>
    </div>
  );
};