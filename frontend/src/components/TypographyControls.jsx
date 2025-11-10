/**
 * SIMPLIFIED TYPOGRAPHY CONTROLS COMPONENT
 * Basic font size controls for immediate fix
 */

import React from 'react';
import { Type, Minus, Plus, Contrast } from 'lucide-react';
import FontSizeDemo from './FontSizeDemo';

export default function TypographyControls({ className, compact = false }) {
    const [fontSize, setFontSize] = React.useState(() => {
        const saved = localStorage.getItem('wro2025_font_size');
        // Handle old Chinese font sizes and default to standard
        const fontSizeMap = {
            '小': 'small',
            '標準': 'standard',
            '大': 'large',
            '長者適用': 'senior-friendly',
            '超大': 'extra-large'
        };
        return fontSizeMap[saved] || saved || 'standard';
    });
    const [highContrast, setHighContrast] = React.useState(() => {
        const saved = localStorage.getItem('wro2025_high_contrast');
        return saved === 'true';
    });

    const fontSizes = ['small', 'standard', 'large', 'senior-friendly', 'extra-large'];

    // Handle both old Chinese font sizes and new English font sizes, with fallback
    const scaleMultipliers = React.useMemo(() => ({
        // New English font sizes
        'small': 0.875,
        'standard': 1.0,
        'large': 1.25,
        'senior-friendly': 1.5,
        'extra-large': 1.75,
        // Old Chinese font sizes for backward compatibility
        '小': 0.875,
        '標準': 1.0,
        '大': 1.25,
        '長者適用': 1.5,
        '超大': 1.75
    }), []);

    // Update CSS variables
    const updateFontSize = React.useCallback((newSize) => {
        const multiplier = scaleMultipliers[newSize] || 1.0; // Default fallback
        const root = document.documentElement;

        // 更新基礎字體大小
        const baseSize = 20 * multiplier;
        root.style.setProperty('--typo-base-size', `${baseSize}px`);
        root.style.setProperty('--typo-user-scale', multiplier.toString());

        // 更新所有語義化大小
        const scale = 1.333; // Perfect fourth ratio
        root.style.setProperty('--typo-xs', `${baseSize / scale / scale}px`);
        root.style.setProperty('--typo-sm', `${baseSize / scale}px`);
        root.style.setProperty('--typo-md', `${baseSize}px`);
        root.style.setProperty('--typo-lg', `${baseSize * scale}px`);
        root.style.setProperty('--typo-xl', `${baseSize * scale * scale}px`);
        root.style.setProperty('--typo-2xl', `${baseSize * scale * scale * scale}px`);
        root.style.setProperty('--typo-3xl', `${baseSize * scale * scale * scale * scale}px`);

        // Save settings
        localStorage.setItem('wro2025_font_size', newSize);
        setFontSize(newSize);

        // Accessibility announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.textContent = `Font size adjusted to ${newSize}`;
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }, [scaleMultipliers]);

    // Update high contrast mode
    const updateHighContrast = React.useCallback((enabled) => {
        const root = document.documentElement;
        root.classList.toggle('high-contrast', enabled);
        localStorage.setItem('wro2025_high_contrast', enabled.toString());
        setHighContrast(enabled);

        // Accessibility announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.textContent = `High contrast mode ${enabled ? 'enabled' : 'disabled'}`;
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }, []);

    // Initialize settings
    React.useEffect(() => {
        updateFontSize(fontSize);
        updateHighContrast(highContrast);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const adjustFontSize = (direction) => {
        const currentIndex = fontSizes.indexOf(fontSize);
        let newIndex;

        if (direction === 'up' && currentIndex < fontSizes.length - 1) {
            newIndex = currentIndex + 1;
        } else if (direction === 'down' && currentIndex > 0) {
            newIndex = currentIndex - 1;
        } else {
            return; // 無法調整
        }

        updateFontSize(fontSizes[newIndex]);
    };

    if (compact) {
        return (
            <div className={`flex items-center justify-between p-6 rounded-2xl border-2 border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 ${className || ''}`}>
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900">
                        <Type className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <span className="typo-content-primary font-semibold">Current Font Size</span>
                        <p className="typo-content-secondary font-bold text-blue-600 dark:text-blue-400">
                            {fontSize}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => adjustFontSize('down')}
                        disabled={fontSize === 'small'}
                        className="elderly-button-secondary h-12 w-12 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Decrease font size"
                    >
                        <Minus className="h-5 w-5" />
                    </button>

                    <button
                        onClick={() => adjustFontSize('up')}
                        disabled={fontSize === 'extra-large'}
                        className="elderly-button-secondary h-12 w-12 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Increase font size"
                    >
                        <Plus className="h-5 w-5" />
                    </button>

                    <button
                        onClick={() => updateHighContrast(!highContrast)}
                        className={`elderly-button h-12 w-12 p-0 ${highContrast
                            ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
                            : 'elderly-button-secondary'
                            }`}
                        title={highContrast ? 'Disable high contrast' : 'Enable high contrast'}
                    >
                        <Contrast className="h-5 w-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm shadow-sm dark:border-gray-700 dark:bg-gray-900/80 ${className || ''}`}>
            <div className="flex flex-col space-y-1.5 p-6">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                        <Type className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-medium leading-none tracking-tight text-gray-900 dark:text-gray-100">
                        Fonts and Readability
                    </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Adjust font size and display options for the best reading experience
                </p>
            </div>

            <div className="p-6 pt-0 space-y-6">
                {/* Font Size Selection */}
                <div className="space-y-3">
                    <h4 className="font-medium">Font Size</h4>
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => adjustFontSize('down')}
                            disabled={fontSize === 'small'}
                            className="h-12 w-12 rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                        >
                            <Minus className="h-5 w-5 mx-auto" />
                        </button>

                        <div className="min-w-[120px] rounded-xl bg-blue-50 px-4 py-2 text-center font-medium dark:bg-blue-950/50">
                            {fontSize}
                        </div>

                        <button
                            onClick={() => adjustFontSize('up')}
                            disabled={fontSize === 'extra-large'}
                            className="h-12 w-12 rounded-lg border border-gray-200 bg-white shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                        >
                            <Plus className="h-5 w-5 mx-auto" />
                        </button>
                    </div>
                </div>

                {/* Preview Text */}
                <div className="space-y-3">
                    <h4 className="font-medium">Preview</h4>
                    <div className="rounded-xl border bg-white/50 p-4 dark:bg-gray-800/50">
                        <div className="space-y-2">
                            <p className="typo-display-title font-semibold">
                                Xiao Ka Coffee Assistant
                            </p>
                            <p className="typo-ai-response">
                                Hello! I'm happy to serve you. Can I prepare a coffee for you today?
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Current setting: {fontSize} (Scale: {scaleMultipliers[fontSize]}x)
                            </p>
                        </div>
                    </div>
                </div>

                {/* High Contrast Toggle */}
                <div className="space-y-3">
                    <h4 className="font-medium">Accessibility</h4>
                    <button
                        onClick={() => updateHighContrast(!highContrast)}
                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:hover:bg-gray-800 ${highContrast
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                            : 'border-gray-200 dark:border-gray-700'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Contrast className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <div>
                                <div className="font-medium">High Contrast Mode</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Enhance text and background contrast
                                </div>
                            </div>
                        </div>
                        <div className={`h-6 w-11 rounded-full border-2 transition-colors duration-200 ${highContrast ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-200 dark:bg-gray-700 dark:border-gray-700'
                            }`}>
                            <div
                                className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                                style={{ transform: `translateX(${highContrast ? '20px' : '0'})` }}
                            />
                        </div>
                    </button>
                </div>

                {/* Font Size Demo */}
                <FontSizeDemo />
            </div>
        </div>
    );
}