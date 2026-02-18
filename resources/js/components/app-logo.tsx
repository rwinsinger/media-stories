export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-pink-500 text-white text-base">
                🎞
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate font-semibold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                    Media Stories
                </span>
            </div>
        </>
    );
}
