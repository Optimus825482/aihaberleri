/**
 * Custom Error Page (Pages Router compatibility)
 * This file exists to prevent @sentry/nextjs from failing during build
 * by providing a minimal _error page that doesn't import from next/document.
 * 
 * App Router uses app/error.tsx and app/not-found.tsx for actual error handling.
 */
import { NextPageContext } from "next";

interface ErrorProps {
    statusCode: number;
}

function ErrorPage({ statusCode }: ErrorProps) {
    return (
        <div style={{ textAlign: "center", padding: "50px" }}>
            <h1>{statusCode}</h1>
            <p>
                {statusCode === 404
                    ? "Sayfa bulunamadı"
                    : "Bir hata oluştu"}
            </p>
        </div>
    );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
    return { statusCode };
};

export default ErrorPage;
