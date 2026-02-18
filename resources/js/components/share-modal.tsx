import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';

interface Props {
    storyId: string;
    storyTitle: string;
    onClose: () => void;
}

export function ShareModal({ storyId, storyTitle, onClose }: Props) {
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [expiresInDays, setExpiresInDays] = useState(3);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const jsonHeaders = { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' };

    const generateLink = async () => {
        setIsGenerating(true);
        try {
            const r = await fetch('/api/share-links', {
                method: 'POST',
                headers: jsonHeaders,
                body: JSON.stringify({ story_id: storyId, expires_in_days: expiresInDays }),
            });
            const data = await r.json() as { url?: string };
            if (r.ok && data.url) {
                setShareLink(data.url);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    // Render QR code whenever shareLink changes
    useEffect(() => {
        if (!shareLink || !canvasRef.current) return;
        void QRCode.toCanvas(canvasRef.current, shareLink, {
            width: 200,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
        });
    }, [shareLink]);

    const handleCopy = async () => {
        if (!shareLink) return;
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadQR = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `share-qr-${storyId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const encodedUrl = shareLink ? encodeURIComponent(shareLink) : '';
    const encodedTitle = encodeURIComponent(`Check out "${storyTitle}" on Media Stories`);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border bg-card shadow-2xl shadow-violet-500/10">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold">Share Publicly</h2>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{storyTitle}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Create a public link that anyone can open — no account required.
                    </p>

                    {/* Expiry selector */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">Link expires after</label>
                        <select
                            value={expiresInDays}
                            onChange={(e) => setExpiresInDays(Number(e.target.value))}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value={1}>1 day</option>
                            <option value={3}>3 days</option>
                            <option value={7}>7 days</option>
                            <option value={30}>30 days</option>
                        </select>
                    </div>

                    {!shareLink ? (
                        <button
                            onClick={() => void generateLink()}
                            disabled={isGenerating}
                            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 py-3 text-sm font-medium text-white shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isGenerating ? 'Generating...' : '🔗 Generate Share Link'}
                        </button>
                    ) : (
                        <div className="space-y-4">
                            {/* Link input + copy */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={shareLink}
                                    readOnly
                                    className="min-w-0 flex-1 rounded-lg border bg-muted px-3 py-2 font-mono text-xs"
                                />
                                <button
                                    onClick={() => void handleCopy()}
                                    className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
                                >
                                    {copied ? '✓ Copied!' : 'Copy'}
                                </button>
                            </div>

                            {/* QR code */}
                            <div className="flex flex-col items-center gap-3 rounded-lg border bg-background p-4">
                                <canvas ref={canvasRef} className="rounded" />
                                <button
                                    onClick={handleDownloadQR}
                                    className="rounded-lg border px-4 py-1.5 text-sm hover:bg-accent transition-colors"
                                >
                                    ⬇ Download QR Code
                                </button>
                            </div>

                            {/* Social share buttons */}
                            <div>
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Share on</p>
                                <div className="flex gap-2">
                                    <a
                                        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 rounded-lg border px-3 py-2 text-center text-sm hover:bg-accent transition-colors"
                                    >
                                        𝕏 Twitter
                                    </a>
                                    <a
                                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 rounded-lg border px-3 py-2 text-center text-sm hover:bg-accent transition-colors"
                                    >
                                        Facebook
                                    </a>
                                    <a
                                        href={`mailto:?subject=${encodedTitle}&body=${encodedUrl}`}
                                        className="flex-1 rounded-lg border px-3 py-2 text-center text-sm hover:bg-accent transition-colors"
                                    >
                                        ✉ Email
                                    </a>
                                </div>
                            </div>

                            {/* Regenerate */}
                            <button
                                onClick={() => void generateLink()}
                                disabled={isGenerating}
                                className="w-full rounded-lg border py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                            >
                                Generate new link
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
