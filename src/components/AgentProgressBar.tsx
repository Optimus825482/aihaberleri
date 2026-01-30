/**
 * Real-Time Agent Progress Bar Component
 * 
 * Displays live progress updates during agent execution
 * via Socket.io connection.
 */

'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface ProgressData {
    step: string;
    message: string;
    progress: number;
    timestamp?: string;
}

interface AgentProgressBarProps {
    className?: string;
}

export function AgentProgressBar({ className }: AgentProgressBarProps) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [agentStatus, setAgentStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [articlesCreated, setArticlesCreated] = useState(0);

    useEffect(() => {
        // Initialize Socket.io connection
        const socketInstance = io({
            path: '/api/socket',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        // Connection events
        socketInstance.on('connect', () => {
            console.log('[AgentProgressBar] Socket connected');
            setIsConnected(true);
            socketInstance.emit('join-admin');
        });

        socketInstance.on('disconnect', () => {
            console.log('[AgentProgressBar] Socket disconnected');
            setIsConnected(false);
        });

        socketInstance.on('joined-admin', () => {
            console.log('[AgentProgressBar] Joined admin room');
        });

        // Agent events
        socketInstance.on('agent:started', (data: { timestamp: string; logId: string }) => {
            console.log('[AgentProgressBar] Agent started:', data);
            setAgentStatus('running');
            setProgress(0);
            setCurrentStep('Agent başlatıldı...');
            setArticlesCreated(0);
        });

        socketInstance.on('agent:progress', (data: ProgressData) => {
            console.log('[AgentProgressBar] Progress update:', data);
            setProgress(data.progress);
            setCurrentStep(data.message);
        });

        socketInstance.on('agent:completed', (data: { articlesCreated: number; duration: number }) => {
            console.log('[AgentProgressBar] Agent completed:', data);
            setAgentStatus('completed');
            setProgress(100);
            setCurrentStep('Tamamlandı!');
            setArticlesCreated(data.articlesCreated);
        });

        socketInstance.on('agent:failed', (data: { error: string }) => {
            console.log('[AgentProgressBar] Agent failed:', data);
            setAgentStatus('failed');
            setCurrentStep(`Hata: ${data.error}`);
        });

        socketInstance.on('article:published', (data: { id: string; title: string }) => {
            console.log('[AgentProgressBar] Article published:', data);
            setArticlesCreated((prev) => prev + 1);
        });

        setSocket(socketInstance);

        // Cleanup
        return () => {
            socketInstance.emit('leave-admin');
            socketInstance.disconnect();
        };
    }, []);

    // Don't render if idle
    if (agentStatus === 'idle') {
        return null;
    }

    return (
        <div className={`rounded-lg border bg-card p-4 shadow-sm ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Agent Durumu</h3>
                    {agentStatus === 'running' && (
                        <Badge variant="default" className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Çalışıyor
                        </Badge>
                    )}
                    {agentStatus === 'completed' && (
                        <Badge variant="default" className="flex items-center gap-1 bg-green-500">
                            <CheckCircle2 className="h-3 w-3" />
                            Tamamlandı
                        </Badge>
                    )}
                    {agentStatus === 'failed' && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Hata
                        </Badge>
                    )}
                    {!isConnected && (
                        <Badge variant="outline" className="text-xs">
                            Bağlantı yok
                        </Badge>
                    )}
                </div>
                {articlesCreated > 0 && (
                    <span className="text-sm text-muted-foreground">
                        {articlesCreated} makale oluşturuldu
                    </span>
                )}
            </div>

            <Progress value={progress} className="h-2 mb-2" />

            <p className="text-xs text-muted-foreground">{currentStep}</p>
        </div>
    );
}
