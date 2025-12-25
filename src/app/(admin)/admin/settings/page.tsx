"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, Shield, Database, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
    const handleSave = () => {
        toast.success("Settings saved successfully");
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="bg-slate-600 p-2 rounded-lg">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                    Settings
                </h1>
                <p className="text-slate-500 mt-1">Manage admin panel preferences</p>
            </div>

            {/* General Settings */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5 text-slate-500" />
                        General
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Site Name</Label>
                        <Input defaultValue="SprintIBA" />
                    </div>
                    <div className="space-y-2">
                        <Label>Support Email</Label>
                        <Input type="email" placeholder="support@sprintiba.com" />
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Bell className="w-5 h-5 text-slate-500" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-900">Email Notifications</p>
                            <p className="text-sm text-slate-500">Receive email alerts for important events</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-900">New User Alerts</p>
                            <p className="text-sm text-slate-500">Get notified when new users register</p>
                        </div>
                        <Switch />
                    </div>
                </CardContent>
            </Card>

            {/* Security */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-slate-500" />
                        Security
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                            <p className="text-sm text-slate-500">Require 2FA for admin access</p>
                        </div>
                        <Switch />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-900">Session Timeout</p>
                            <p className="text-sm text-slate-500">Auto-logout after inactivity</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                </Button>
            </div>
        </div>
    );
}
