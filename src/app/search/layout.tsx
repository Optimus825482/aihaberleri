// Force dynamic rendering to prevent prerendering issues with root layout client providers
export const dynamic = "force-dynamic";

export default function SearchLayout({ children }: { children: React.ReactNode }) {
    return children;
}
