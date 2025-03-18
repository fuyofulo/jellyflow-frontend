export const Button2 = ({children}: {children: React.ReactNode}) => {
    return (
        <button className="no-underline group cursor-pointer relative shadow-2xl bg-yellow-600 rounded p-px text-sm font-mono font-bold leading-6 text-white inline-block">
          <span className="absolute inset-0 overflow-hidden rounded">
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#FFFFE0_0%,#d5931a_50%,#FFFFE0_100%)]" />
          </span>
          <div className="relative flex space-x-2 items-center z-10 rounded bg-zinc-950 py-1.5 px-6 ring-1 ring-white/10 group-hover:bg-yellow-500 group-hover:text-black">
            <span>
              {children}
            </span>
          </div>
          <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-yellow-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40" />
        </button>
    )
}