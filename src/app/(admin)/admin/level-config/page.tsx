"use client";

import { useState } from "react";
import { useLevels } from "@/hooks/useLevels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Level = Tables<"levels">;

export default function LevelConfigPage() {
    const { levels, loading, addLevel, updateLevel, deleteLevel } = useLevels();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingLevel, setEditingLevel] = useState<Level | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [minPoints, setMinPoints] = useState("");
    const [description, setDescription] = useState("");
    const [iconUrl, setIconUrl] = useState("");
    const [color, setColor] = useState("#3b82f6");
    const [rank, setRank] = useState("");
    const [uploading, setUploading] = useState(false);

    // Reset form
    const resetForm = () => {
        setName("");
        setMinPoints("");
        setDescription("");
        setIconUrl("");
        setColor("#3b82f6");
        setRank("");
        setEditingLevel(null);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
    };

    const handleEdit = (level: Level) => {
        setEditingLevel(level);
        setName(level.name);
        setMinPoints(level.min_points.toString());
        setDescription(level.description || "");
        setIconUrl(level.icon_url || "");
        setColor(level.color || "#3b82f6");
        setRank(level.rank?.toString() || "0");
        setIsDialogOpen(true);
    };

    const { uploadFile, getPublicUrl, uploading: uploadingStorage } = useStorage();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const uploadedPath = await uploadFile('level-icons', file, fileName);

        if (uploadedPath) {
            const publicUrl = getPublicUrl('level-icons', uploadedPath);
            setIconUrl(publicUrl);
            toast.success("Icon uploaded successfully");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || minPoints === "" || rank === "") {
            toast.error("Please fill in all required fields (Name, Min Points, Rank)");
            return;
        }

        setIsSubmitting(true);

        const levelData = {
            name,
            min_points: parseInt(minPoints),
            description,
            icon_url: iconUrl,
            color,
            rank: parseInt(rank)
        };

        try {
            if (editingLevel) {
                const { error } = await updateLevel(editingLevel.id, levelData);
                if (error) throw error;
                toast.success("Level updated successfully");
            } else {
                const { error } = await addLevel(levelData);
                if (error) throw error;
                toast.success("Level added successfully");
            }
            setIsDialogOpen(false);
        } catch (error: any) {
            console.error("Save error:", error);
            if (error.code === '23505') {
                if (error.message.includes('levels_min_points_key')) {
                    toast.error("A level with this minimum points already exists.");
                } else if (error.message.includes('levels_name_key')) {
                    toast.error("A level with this name already exists.");
                } else if (error.message.includes('levels_rank_key')) {
                    toast.error("A level with this rank already exists.");
                } else {
                    toast.error("A level with these details already exists.");
                }
            } else {
                toast.error("Error saving level: " + (error.message || "Unknown error"));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await deleteLevel(id);
            if (error) throw error;
            toast.success("Level deleted");
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error("Error deleting level: " + (error.message || "Unknown error"));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 container mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Level Configuration</h1>
                    <p className="text-muted-foreground">Manage user levels, point requirements, and ranks.</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Level
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Levels</CardTitle>
                    <CardDescription>
                        Define levels based on minimum points. Rank determines the progression order.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">Rank</TableHead>
                                <TableHead className="w-[80px]">Icon</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Min Points</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {levels.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        No levels defined yet. Create your first level to get started!
                                    </TableCell>
                                </TableRow>
                            ) : (
                                levels.sort((a, b) => (a.rank || 0) - (b.rank || 0)).map((level) => (
                                    <TableRow key={level.id}>
                                        <TableCell className="font-medium text-center">{level.rank}</TableCell>
                                        <TableCell>
                                            {level.icon_url ? (
                                                <div className="w-10 h-10 relative">
                                                    <img
                                                        src={level.icon_url}
                                                        alt={level.name}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center font-bold text-xs text-muted-foreground border">
                                                    {level.name.charAt(0)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium text-base">{level.name}</TableCell>
                                        <TableCell>
                                            <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
                                                {level.min_points.toLocaleString()} pts
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded-full border shadow-sm"
                                                    style={{ backgroundColor: level.color || '#3b82f6' }}
                                                />
                                                <span className="text-xs text-muted-foreground uppercase">{level.color}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm max-w-[250px] truncate">
                                            {level.description || "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(level)}>
                                                    <Pencil className="w-4 h-4 text-muted-foreground" />
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                                                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Level?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete <strong>{level.name}</strong>?
                                                                Users at this level might fall back to lower levels.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(level.id)} className="bg-destructive hover:bg-destructive/90">
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingLevel ? "Edit Level" : "Add New Level"}</DialogTitle>
                        <DialogDescription>
                            Configure level details, rank, and aesthetics.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Rookie"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="points">Min Points <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="points"
                                        type="number"
                                        value={minPoints}
                                        onChange={(e) => setMinPoints(e.target.value)}
                                        placeholder="0"
                                        required
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rank">Rank Order <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="rank"
                                        type="number"
                                        value={rank}
                                        onChange={(e) => setRank(e.target.value)}
                                        placeholder="1"
                                        required
                                        min="1"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Higher rank = higher level.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="color">Theme Color</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="color"
                                            type="color"
                                            value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                            className="w-12 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                            placeholder="#3b82f6"
                                            className="font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Optional description"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Level Icon</Label>
                                <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/20">
                                    {iconUrl ? (
                                        <div className="relative w-16 h-16 border rounded bg-background flex items-center justify-center overflow-hidden shrink-0">
                                            <img src={iconUrl} alt="Preview" className="w-full h-full object-contain" />
                                            <button
                                                type="button"
                                                onClick={() => setIconUrl("")}
                                                className="absolute top-0 right-0 p-1 bg-destructive text-white rounded-bl-md opacity-0 hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 border rounded bg-muted flex items-center justify-center shrink-0">
                                            <Upload className="w-6 h-6 text-muted-foreground opacity-50" />
                                        </div>
                                    )}

                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Label
                                                htmlFor="icon-upload"
                                                className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors text-sm font-medium ${uploadingStorage ? 'opacity-50 pointer-events-none' : ''}`}
                                            >
                                                <Upload className="w-4 h-4" />
                                                {uploadingStorage ? "Uploading..." : "Upload Image"}
                                            </Label>
                                            <Input
                                                id="icon-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                disabled={uploadingStorage}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Recommended: SVG or PNG, max 1MB.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || uploadingStorage} className="min-w-[100px]">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingLevel ? "Save Changes" : "Create Level")}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
