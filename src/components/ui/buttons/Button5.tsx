export const Button5 = ({children}: {children: React.ReactNode}) => {
    return (
        <button className="px-12 py-4 rounded-full bg-[#a61ed7] font-bold text-white tracking-widest uppercase transform hover:scale-105 hover:bg-[#a321e0] transition-colors duration-200">
            {children}
        </button>
    )
}
