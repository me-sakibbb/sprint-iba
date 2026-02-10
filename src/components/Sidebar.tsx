"use client"

import * as React from "react"
import {
    BookOpen,
    Bot,
    Command,
    Frame,
    LifeBuoy,
    Map,
    PieChart,
    Send,
    Settings2,
    SquareTerminal,
    Trophy,
    Users,
    Zap,
    LayoutDashboard,
    Calendar,
    Gamepad2,
    Dumbbell,
    Calculator,
    Languages,
    Brain,
    LogOut,
    User,
    ClipboardList,
    FileText,
    AlertCircle,
    GraduationCap
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
} from "@/components/ui/sidebar"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const router = useRouter()
    const { signOut, user } = useAuth()

    const handleSignOut = async () => {
        await signOut()
        toast.success("Signed out successfully")
        router.push("/auth")
    }

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/")

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Zap className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Sprint IBA</span>
                                    <span className="truncate text-xs">Student Portal</span>
                                </div>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Platform</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={isActive("/dashboard")}
                                    tooltip="Dashboard"
                                    onClick={() => router.push("/dashboard")}
                                >
                                    <LayoutDashboard />
                                    <span>Dashboard</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={isActive("/study-plan")}
                                    tooltip="Study Plan"
                                    onClick={() => router.push("/study-plan")}
                                >
                                    <Calendar />
                                    <span>Study Plan</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Study</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={isActive("/my-study")}
                                    tooltip="My Study"
                                    onClick={() => router.push("/my-study")}
                                >
                                    <GraduationCap />
                                    <span>My Study</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={isActive("/practice")}
                                    tooltip="Practice"
                                    onClick={() => router.push("/practice")}
                                >
                                    <ClipboardList />
                                    <span>Practice</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={isActive("/exams")}
                                    tooltip="Exams"
                                    onClick={() => router.push("/exams")}
                                >
                                    <FileText />
                                    <span>Exams</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={isActive("/oops-list")}
                                    tooltip="Oops List"
                                    onClick={() => router.push("/oops-list")}
                                >
                                    <AlertCircle />
                                    <span>Oops List</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Learning</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton tooltip="Resources">
                                    <BookOpen />
                                    <span>Resources</span>
                                </SidebarMenuButton>
                                <SidebarMenuSub>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton
                                            isActive={isActive("/resources/math")}
                                            onClick={() => router.push("/resources/math")}
                                        >
                                            <Calculator />
                                            <span>Math</span>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton
                                            isActive={isActive("/resources/english")}
                                            onClick={() => router.push("/resources/english")}
                                        >
                                            <Languages />
                                            <span>English</span>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton
                                            isActive={isActive("/resources/analytical")}
                                            onClick={() => router.push("/resources/analytical")}
                                        >
                                            <Brain />
                                            <span>Analytical</span>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                </SidebarMenuSub>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Gamification</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={isActive("/vocabpoly")}
                                    tooltip="VocabPoly"
                                    onClick={() => router.push("/vocabpoly")}
                                >
                                    <Gamepad2 />
                                    <span>VocabPoly</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={isActive("/game")}
                                    tooltip="Leaderboard"
                                    onClick={() => router.push("/game")}
                                >
                                    <Trophy />
                                    <span>Leaderboard</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Community</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    isActive={isActive("/friends")}
                                    tooltip="Friends"
                                    onClick={() => router.push("/friends")}
                                >
                                    <Users />
                                    <span>Friends</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => router.push("/profile")}
                            isActive={isActive("/profile")}
                            tooltip="Profile"
                        >
                            <User />
                            <span>Profile</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleSignOut}
                            className="text-destructive hover:text-destructive"
                            tooltip="Sign Out"
                        >
                            <LogOut />
                            <span>Sign Out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
