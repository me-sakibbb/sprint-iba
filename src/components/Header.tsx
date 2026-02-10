"use client";

import { usePathname } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
    BreadcrumbEllipsis
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useVelocityPoints } from "@/hooks/useVelocityPoints";
import { usePoints } from "@/hooks/usePoints";
import LevelBadge from "@/components/badges/LevelBadge";
import { formatVPFull } from "@/utils/pointCalculations";
import { Zap } from "lucide-react";

const Header = () => {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const router = useRouter();

    const pathSegments = pathname.split('/').filter(Boolean);

    const {
        totalVp,
        currentLevel,
        loading: loadingVP,
        loginStreak,
        practiceStreak,
    } = usePoints();

    const handleSignOut = async () => {
        await signOut();
        router.push("/auth");
    };

    // Use the max streak for display
    const displayStreak = Math.max(loginStreak, practiceStreak);

    const isStudySubPage = pathSegments[0] === 'my-study' && pathSegments.length > 1;

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-2 overflow-hidden flex-initial max-w-[40%]">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                {!isStudySubPage && (
                    <Breadcrumb className="overflow-hidden">
                        <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-hidden">
                            <BreadcrumbItem className="hidden lg:block shrink-0">
                                <BreadcrumbLink href="/dashboard" className="transition-all hover:opacity-70">
                                    Sprint IBA
                                </BreadcrumbLink>
                            </BreadcrumbItem>

                            {(() => {
                                const maxVisible = 3;
                                if (pathSegments.length <= maxVisible) {
                                    return pathSegments.map((segment, index) => {
                                        const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
                                        const isLast = index === pathSegments.length - 1;
                                        const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
                                        const truncatedTitle = title.length > 15 ? title.substring(0, 12) + '...' : title;

                                        return (
                                            <div key={href} className="flex items-center overflow-hidden shrink-0">
                                                <BreadcrumbSeparator className="hidden md:block" />
                                                <BreadcrumbItem className="overflow-hidden">
                                                    {isLast ? (
                                                        <BreadcrumbPage className="font-bold truncate max-w-[120px]" title={title}>{truncatedTitle}</BreadcrumbPage>
                                                    ) : (
                                                        <BreadcrumbLink href={href} className="truncate max-w-[100px]" title={title}>{truncatedTitle}</BreadcrumbLink>
                                                    )}
                                                </BreadcrumbItem>
                                            </div>
                                        );
                                    });
                                }

                                // Collapsed version
                                const first = pathSegments[0];
                                const lastTwo = pathSegments.slice(-2);

                                return (
                                    <>
                                        {/* First Segment */}
                                        <div className="flex items-center shrink-0">
                                            <BreadcrumbSeparator className="hidden md:block" />
                                            <BreadcrumbItem>
                                                <BreadcrumbLink href={`/${first}`}>{first.charAt(0).toUpperCase() + first.slice(1).replace(/-/g, ' ')}</BreadcrumbLink>
                                            </BreadcrumbItem>
                                        </div>

                                        {/* Ellipsis */}
                                        <div className="flex items-center shrink-0">
                                            <BreadcrumbSeparator className="hidden md:block" />
                                            <BreadcrumbItem>
                                                <BreadcrumbEllipsis />
                                            </BreadcrumbItem>
                                        </div>

                                        {/* Last Two */}
                                        {lastTwo.map((segment, index) => {
                                            const actualIndex = pathSegments.length - 2 + index;
                                            const href = `/${pathSegments.slice(0, actualIndex + 1).join('/')}`;
                                            const isLast = index === 1;
                                            const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
                                            const truncatedTitle = title.length > 12 ? title.substring(0, 10) + '...' : title;

                                            return (
                                                <div key={href} className="flex items-center overflow-hidden shrink-0">
                                                    <BreadcrumbSeparator className="hidden md:block" />
                                                    <BreadcrumbItem className="overflow-hidden">
                                                        {isLast ? (
                                                            <BreadcrumbPage className="font-bold truncate max-w-[100px]" title={title}>{truncatedTitle}</BreadcrumbPage>
                                                        ) : (
                                                            <BreadcrumbLink href={href} className="truncate max-w-[80px]" title={title}>{truncatedTitle}</BreadcrumbLink>
                                                        )}
                                                    </BreadcrumbItem>
                                                </div>
                                            );
                                        })}
                                    </>
                                );
                            })()}
                        </BreadcrumbList>
                    </Breadcrumb>
                )}
            </div>

            {/* Center Search - Refactored to not use absolute positioning */}
            <div className="flex-1 hidden md:flex justify-center px-4 overflow-hidden">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search..."
                        className="w-full rounded-full bg-background/50 border-border/50 focus:bg-background transition-all pl-9"
                    />
                </div>
            </div>

            <div className="ml-auto flex items-center gap-4">
                {/* User Stats - Clean & Consistent */}
                {!loadingVP && user && (
                    <div className="hidden md:flex items-center gap-6 mx-2">
                        {/* Level */}
                        <div className="flex items-center gap-3">
                            <LevelBadge level={currentLevel} size="sm" />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold leading-none">{currentLevel.name}</span>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{currentLevel.track.replace(/_/g, ' ')}</span>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-border/60" />

                        {/* VP */}
                        <div className="flex items-center gap-2" title="Velocity Points">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <img src="/assets/velocity-coin.png" alt="VP" className="w-4 h-4 object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold leading-none">{formatVPFull(totalVp)}</span>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">VP</span>
                            </div>
                        </div>

                        {/* Streak */}
                        <div className="flex items-center gap-2" title={`Login: ${loginStreak} | Practice: ${practiceStreak}`}>
                            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold leading-none">{displayStreak}</span>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Day Streak</span>
                            </div>
                        </div>
                    </div>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/10 hover:ring-primary/20 transition-all" suppressHydrationWarning>
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name} />
                                <AvatarFallback>{user?.user_metadata?.full_name?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.user_metadata?.full_name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/profile')}>
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/settings')}>
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
                </Button>
            </div>
        </header>
    );
};

export default Header;
