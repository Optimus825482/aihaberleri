"use client";

import dynamic from "next/dynamic";
import { ComponentType } from "react";

// Lazy-loaded Recharts components
export const LazyAreaChart = dynamic(
    () => import("recharts").then((mod) => mod.AreaChart as ComponentType<any>),
    {
        ssr: false,
        loading: () => (
            <div className="h-[300px] w-full animate-pulse bg-muted/50 rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Grafik yükleniyor...</span>
            </div>
        ),
    }
);

export const LazyPieChart = dynamic(
    () => import("recharts").then((mod) => mod.PieChart as ComponentType<any>),
    {
        ssr: false,
        loading: () => (
            <div className="h-[300px] w-full animate-pulse bg-muted/50 rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Grafik yükleniyor...</span>
            </div>
        ),
    }
);

export const LazyBarChart = dynamic(
    () => import("recharts").then((mod) => mod.BarChart as ComponentType<any>),
    {
        ssr: false,
        loading: () => (
            <div className="h-[300px] w-full animate-pulse bg-muted/50 rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Grafik yükleniyor...</span>
            </div>
        ),
    }
);

export const LazyLineChart = dynamic(
    () => import("recharts").then((mod) => mod.LineChart as ComponentType<any>),
    {
        ssr: false,
        loading: () => (
            <div className="h-[300px] w-full animate-pulse bg-muted/50 rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground text-sm">Grafik yükleniyor...</span>
            </div>
        ),
    }
);

// Export recharts components that need to be used with lazy charts
export {
    Area,
    Bar,
    Line,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
