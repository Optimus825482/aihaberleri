"use client";

import { useSession } from "next-auth/react";
import { hasPermission, Permission } from "@/lib/permissions";
import { ReactNode } from "react";

interface PermissionGuardProps {
    permission: Permission;
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Permission Guard Component
 * Only renders children if user has required permission
 * 
 * Usage:
 * ```tsx
 * <PermissionGuard permission={Permission.DELETE_ARTICLE}>
 *   <Button>Delete</Button>
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
    permission,
    children,
    fallback = null,
}: PermissionGuardProps) {
    const { data: session } = useSession();

    if (!session?.user?.role) {
        return <>{fallback}</>;
    }

    const allowed = hasPermission(session.user.role, permission);

    return <>{allowed ? children : fallback}</>;
}

/**
 * HOC for permission-based rendering
 */
export function withPermission<P extends object>(
    Component: React.ComponentType<P>,
    permission: Permission,
    fallback?: ReactNode
) {
    return function PermissionWrappedComponent(props: P) {
        return (
            <PermissionGuard permission={permission} fallback={fallback}>
                <Component {...props} />
            </PermissionGuard>
        );
    };
}

/**
 * Hook to check permissions
 */
export function usePermission(permission: Permission): boolean {
    const { data: session } = useSession();

    if (!session?.user?.role) {
        return false;
    }

    return hasPermission(session.user.role, permission);
}

/**
 * Hook to check multiple permissions (ANY)
 */
export function useAnyPermission(permissions: Permission[]): boolean {
    const { data: session } = useSession();

    if (!session?.user?.role) {
        return false;
    }

    return permissions.some((permission) =>
        hasPermission(session.user.role, permission)
    );
}

/**
 * Hook to check multiple permissions (ALL)
 */
export function useAllPermissions(permissions: Permission[]): boolean {
    const { data: session } = useSession();

    if (!session?.user?.role) {
        return false;
    }

    return permissions.every((permission) =>
        hasPermission(session.user.role, permission)
    );
}

/**
 * Hook to get user role
 */
export function useUserRole(): string | null {
    const { data: session } = useSession();
    return session?.user?.role || null;
}
