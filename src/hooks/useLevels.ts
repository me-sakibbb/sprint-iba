import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

type Level = Tables<"levels">;
type LevelInsert = TablesInsert<"levels">;

export const useLevels = () => {
    const [levels, setLevels] = useState<Level[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLevels = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("levels")
            .select("*")
            .order("min_points", { ascending: true });

        if (data) {
            setLevels(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchLevels();
    }, []);

    // Create
    const addLevel = async (level: LevelInsert) => {
        const { data, error } = await supabase
            .from("levels")
            .insert(level)
            .select()
            .single();

        if (data) {
            setLevels((prev) => [...prev, data].sort((a, b) => a.min_points - b.min_points));
        }
        return { data, error };
    };

    // Update
    const updateLevel = async (id: string, updates: Partial<Level>) => {
        const { data, error } = await supabase
            .from("levels")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (data) {
            setLevels((prev) => prev.map((l) => (l.id === id ? data : l)).sort((a, b) => a.min_points - b.min_points));
        }
        return { data, error };
    };

    // Delete
    const deleteLevel = async (id: string) => {
        const { error } = await supabase
            .from("levels")
            .delete()
            .eq("id", id);

        if (!error) {
            setLevels((prev) => prev.filter((l) => l.id !== id));
        }
        return { error };
    };

    return {
        levels,
        loading,
        addLevel,
        updateLevel,
        deleteLevel,
        refresh: fetchLevels
    };
};
