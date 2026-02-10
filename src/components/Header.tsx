"use client";

import { usePathname } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
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

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem className="hidden md:block">
                            <BreadcrumbLink href="/dashboard">Sprint IBA</BreadcrumbLink>
                        </BreadcrumbItem>
                        {pathSegments.map((segment, index) => {
                            const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
                            const isLast = index === pathSegments.length - 1;
                            const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

                            return (
                                <div key={href} className="flex items-center">
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem>
                                        {isLast ? (
                                            <BreadcrumbPage>{title}</BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                </div>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* Center Search */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block w-full max-w-md px-4">
                <div className="relative">
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
