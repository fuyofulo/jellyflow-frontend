export const Button7 = ({children}: {children: React.ReactNode}) => {
    return (
        <button className="px-5 py-1 font-mono font-semibold group text-medium cursor-pointer bg-black text-white rounded-lg transform hover:text-yellow-500 hover:-translate-y-1 transition duration-400">
            {children}
        </button>
    )
}
