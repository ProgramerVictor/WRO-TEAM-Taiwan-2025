/**
 * Font size test component
 * Used to verify if dynamic font size adjustment works properly
 */

import React from 'react';

export default function FontSizeDemo() {
    const [currentScale, setCurrentScale] = React.useState('1.0');

    React.useEffect(() => {
        const updateScale = () => {
            const root = document.documentElement;
            const scale = root.style.getPropertyValue('--typo-user-scale') || '1.0';
            setCurrentScale(scale);
        };

        // Initial update
        updateScale();

        // Monitor CSS variable changes
        const observer = new MutationObserver(updateScale);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style']
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/50">
            <div className="space-y-3">
                <h4 className="font-medium text-emerald-800 dark:text-emerald-200">
                    🎯 Font Size Test
                </h4>

                <div className="space-y-2 text-emerald-700 dark:text-emerald-300">
                    <p className="typo-content-tertiary">
                        Tiny text (tertiary): Testing senior reading experience
                    </p>
                    <p className="typo-content-secondary">
                        Secondary text (secondary): General information display
                    </p>
                    <p className="typo-content-primary">
                        Main content (primary): Core reading content
                    </p>
                    <p className="typo-ai-response">
                        AI Response (ai-response): Hello! Happy to serve you
                    </p>
                    <p className="typo-display-subtitle">
                        Subtitle (subtitle): Important information title
                    </p>
                    <p className="typo-display-title">
                        Main title (title): Card title
                    </p>
                </div>

                <div className="text-xs text-emerald-600 dark:text-emerald-400 border-t border-emerald-200 dark:border-emerald-700 pt-2">
                    Current scale: <span className="font-mono font-bold">{currentScale}x</span>
                </div>
            </div>
        </div>
    );
}
