"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface SystemGaugeProps {
    ramPercent: number;
    diskPercent: number;
    ramInfo?: {
        usedFormatted: string;
        totalFormatted: string;
    };
    diskInfo?: {
        usedFormatted: string;
        totalFormatted: string;
    };
}

declare global {
    interface Window {
        google: {
            charts: {
                load: (version: string, options: { packages: string[] }) => void;
                setOnLoadCallback: (callback: () => void) => void;
            };
            visualization: {
                DataTable: new () => {
                    addColumn: (type: string, label: string) => void;
                    addRows: (rows: (string | number)[][]) => void;
                };
                Gauge: new (element: HTMLElement) => {
                    draw: (data: unknown, options: unknown) => void;
                };
            };
        };
    }
}

export function SystemGauge({
    ramPercent,
    diskPercent,
    ramInfo,
    diskInfo,
}: SystemGaugeProps) {
    const ramChartRef = useRef<HTMLDivElement>(null);
    const diskChartRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const chartsInitialized = useRef(false);

    // Draw gauges when data changes
    useEffect(() => {
        if (!isLoaded || !window.google?.visualization) return;

        const drawGauges = () => {
            // RAM Gauge
            if (ramChartRef.current) {
                const ramData = new window.google.visualization.DataTable();
                ramData.addColumn("string", "Label");
                ramData.addColumn("number", "Value");
                ramData.addRows([["RAM", ramPercent]]);

                const ramOptions = {
                    width: 160,
                    height: 160,
                    redFrom: 90,
                    redTo: 100,
                    yellowFrom: 70,
                    yellowTo: 90,
                    greenFrom: 0,
                    greenTo: 70,
                    minorTicks: 5,
                    majorTicks: ["0", "25", "50", "75", "100"],
                    animation: {
                        duration: 400,
                        easing: "out",
                    },
                };

                const ramChart = new window.google.visualization.Gauge(
                    ramChartRef.current
                );
                ramChart.draw(ramData, ramOptions);
            }

            // Disk Gauge
            if (diskChartRef.current) {
                const diskData = new window.google.visualization.DataTable();
                diskData.addColumn("string", "Label");
                diskData.addColumn("number", "Value");
                diskData.addRows([["Disk", diskPercent]]);

                const diskOptions = {
                    width: 160,
                    height: 160,
                    redFrom: 90,
                    redTo: 100,
                    yellowFrom: 75,
                    yellowTo: 90,
                    greenFrom: 0,
                    greenTo: 75,
                    minorTicks: 5,
                    majorTicks: ["0", "25", "50", "75", "100"],
                    animation: {
                        duration: 400,
                        easing: "out",
                    },
                };

                const diskChart = new window.google.visualization.Gauge(
                    diskChartRef.current
                );
                diskChart.draw(diskData, diskOptions);
            }
        };

        drawGauges();
    }, [isLoaded, ramPercent, diskPercent]);

    // Initialize Google Charts
    const handleScriptLoad = () => {
        if (chartsInitialized.current) return;
        chartsInitialized.current = true;

        window.google.charts.load("current", { packages: ["gauge"] });
        window.google.charts.setOnLoadCallback(() => {
            setIsLoaded(true);
        });
    };

    return (
        <>
            <Script
                src="https://www.gstatic.com/charts/loader.js"
                onLoad={handleScriptLoad}
                strategy="lazyOnload"
            />

            <div className="flex items-center justify-center gap-8">
                {/* RAM Gauge */}
                <div className="flex flex-col items-center">
                    <div
                        ref={ramChartRef}
                        className="w-[160px] h-[160px] flex items-center justify-center"
                    >
                        {!isLoaded && (
                            <div className="animate-pulse bg-muted rounded-full w-32 h-32" />
                        )}
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            RAM Kullanımı
                        </p>
                        {ramInfo && (
                            <p className="text-xs text-muted-foreground">
                                {ramInfo.usedFormatted} / {ramInfo.totalFormatted}
                            </p>
                        )}
                    </div>
                </div>

                {/* Disk Gauge */}
                <div className="flex flex-col items-center">
                    <div
                        ref={diskChartRef}
                        className="w-[160px] h-[160px] flex items-center justify-center"
                    >
                        {!isLoaded && (
                            <div className="animate-pulse bg-muted rounded-full w-32 h-32" />
                        )}
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Disk Kullanımı
                        </p>
                        {diskInfo && (
                            <p className="text-xs text-muted-foreground">
                                {diskInfo.usedFormatted} / {diskInfo.totalFormatted}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
