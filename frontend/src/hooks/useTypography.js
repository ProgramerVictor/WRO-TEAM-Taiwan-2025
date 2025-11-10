/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TYPOGRAPHY HOOK - Simplified Typography Management
 * Provides dynamic typography scaling and accessibility features
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Typography scale options for user preference
 */
export const TYPOGRAPHY_SCALES = {
    SMALL: 'small',
    STANDARD: 'standard',
    LARGE: 'large',
    ELDERLY: 'senior-friendly',
    EXTRA_LARGE: 'extra-large'
};

/**
 * Typography scale multipliers
 */
const SCALE_MULTIPLIERS = {
    [TYPOGRAPHY_SCALES.SMALL]: 0.875,      // 87.5% - For users who prefer smaller text
    [TYPOGRAPHY_SCALES.STANDARD]: 1.0,     // 100% - Default scale
    [TYPOGRAPHY_SCALES.LARGE]: 1.25,       // 125% - Comfortable reading
    [TYPOGRAPHY_SCALES.ELDERLY]: 1.5,      // 150% - Elderly-optimized
    [TYPOGRAPHY_SCALES.EXTRA_LARGE]: 1.75  // 175% - Maximum accessibility
};

/**
 * Storage keys for user preferences
 */
const STORAGE_KEYS = {
    TYPOGRAPHY_SCALE: 'wro2025_font_size',
    HIGH_CONTRAST: 'wro2025_high_contrast',
    REDUCED_MOTION: 'wro2025_reduced_motion'
};

/**
 * Hook for managing typography preferences and accessibility features
 * 
 * @returns {Object} Typography management functions and state
 */
export function useTypography() {
    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    const [typographyScale, setTypographyScale] = useState(() => {
        if (typeof window === 'undefined') return TYPOGRAPHY_SCALES.STANDARD;

        const saved = localStorage.getItem(STORAGE_KEYS.TYPOGRAPHY_SCALE);
        if (saved && Object.values(TYPOGRAPHY_SCALES).includes(saved)) {
            return saved;
        }

        // Auto-detect if user has increased browser font size
        const userFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        if (userFontSize > 16) {
            return TYPOGRAPHY_SCALES.LARGE;
        }

        return TYPOGRAPHY_SCALES.STANDARD;
    });

    const [highContrast, setHighContrast] = useState(() => {
        if (typeof window === 'undefined') return false;

        const saved = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST);
        if (saved !== null) return JSON.parse(saved);

        // Auto-detect high contrast preference
        return window.matchMedia('(prefers-contrast: high)').matches;
    });

    const [reducedMotion, setReducedMotion] = useState(() => {
        if (typeof window === 'undefined') return false;

        const saved = localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION);
        if (saved !== null) return JSON.parse(saved);

        // Auto-detect motion preference
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    // ============================================================================
    // COMPUTED VALUES
    // ============================================================================

    const scaleMultiplier = useMemo(() => {
        return SCALE_MULTIPLIERS[typographyScale] || 1.0;
    }, [typographyScale]);

    const isElderlyOptimized = useMemo(() => {
        return typographyScale === TYPOGRAPHY_SCALES.ELDERLY ||
            typographyScale === TYPOGRAPHY_SCALES.EXTRA_LARGE;
    }, [typographyScale]);

    // ============================================================================
    // CSS CUSTOM PROPERTY MANAGEMENT
    // ============================================================================

    const updateCSSCustomProperties = useCallback(() => {
        if (typeof window === 'undefined') return;

        const root = document.documentElement;

        // Update scale multiplier
        root.style.setProperty('--typo-user-scale', scaleMultiplier.toString());

        // Update base font size with scale
        const baseSize = 20 * scaleMultiplier;
        root.style.setProperty('--typo-base-size', `${baseSize}px`);

        // Apply high contrast class
        root.classList.toggle('high-contrast', highContrast);

        // Apply reduced motion preference
        if (reducedMotion) {
            root.style.setProperty('--typo-transition-duration', '0ms');
        } else {
            root.style.setProperty('--typo-transition-duration', '150ms');
        }

        // Apply elderly-specific optimizations
        if (isElderlyOptimized) {
            root.style.setProperty('--typo-base-line-height', '1.75');
            root.style.setProperty('--typo-ls-wide', '0.02em');
            root.style.setProperty('--typo-ls-wider', '0.03em');
        } else {
            root.style.setProperty('--typo-base-line-height', '1.6');
            root.style.setProperty('--typo-ls-wide', '0.01em');
            root.style.setProperty('--typo-ls-wider', '0.02em');
        }
    }, [scaleMultiplier, highContrast, reducedMotion, isElderlyOptimized]);

    // ============================================================================
    // PREFERENCE SETTERS WITH PERSISTENCE
    // ============================================================================

    const setScale = useCallback((scale) => {
        if (!Object.values(TYPOGRAPHY_SCALES).includes(scale)) {
            console.warn(`Invalid typography scale: ${scale}`);
            return;
        }

        setTypographyScale(scale);
        localStorage.setItem(STORAGE_KEYS.TYPOGRAPHY_SCALE, scale);

        // Announce change to screen readers
        if (typeof window !== 'undefined') {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.textContent = `字體大小已調整為 ${getScaleDisplayName(scale)}`;
            document.body.appendChild(announcement);

            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        }
    }, []);

    const toggleHighContrast = useCallback(() => {
        const newValue = !highContrast;
        setHighContrast(newValue);
        localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, JSON.stringify(newValue));

        // Announce change to screen readers
        if (typeof window !== 'undefined') {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.textContent = `高對比模式已${newValue ? '開啟' : '關閉'}`;
            document.body.appendChild(announcement);

            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        }
    }, [highContrast]);

    const toggleReducedMotion = useCallback(() => {
        const newValue = !reducedMotion;
        setReducedMotion(newValue);
        localStorage.setItem(STORAGE_KEYS.REDUCED_MOTION, JSON.stringify(newValue));
    }, [reducedMotion]);

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    const getScaleDisplayName = useCallback((scale) => {
        const names = {
            [TYPOGRAPHY_SCALES.SMALL]: 'Small',
            [TYPOGRAPHY_SCALES.STANDARD]: 'Standard',
            [TYPOGRAPHY_SCALES.LARGE]: 'Large',
            [TYPOGRAPHY_SCALES.ELDERLY]: 'Senior Friendly',
            [TYPOGRAPHY_SCALES.EXTRA_LARGE]: 'Extra Large'
        };
        return names[scale] || names[TYPOGRAPHY_SCALES.STANDARD];
    }, []);

    const getFontSizeForElement = useCallback((semanticSize) => {
        const baseSizes = {
            xs: 15,
            sm: 20,
            md: 20,
            lg: 27,
            xl: 36,
            '2xl': 47,
            '3xl': 63
        };

        const baseSize = baseSizes[semanticSize] || baseSizes.md;
        return Math.round(baseSize * scaleMultiplier);
    }, [scaleMultiplier]);

    const getOptimalTouchTarget = useCallback(() => {
        // Return minimum touch target size based on current scale
        const baseTarget = 44; // WCAG AA minimum
        const elderlyTarget = 60; // Recommended for elderly users

        if (isElderlyOptimized) {
            return Math.round(elderlyTarget * scaleMultiplier);
        }

        return Math.round(baseTarget * scaleMultiplier);
    }, [scaleMultiplier, isElderlyOptimized]);

    // ============================================================================
    // EFFECTS
    // ============================================================================

    // Apply CSS custom properties when preferences change
    useEffect(() => {
        updateCSSCustomProperties();
    }, [updateCSSCustomProperties]);

    // Listen for system preference changes
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const contrastQuery = window.matchMedia('(prefers-contrast: high)');
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleContrastChange = (e) => {
            if (localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === null) {
                setHighContrast(e.matches);
            }
        };

        const handleMotionChange = (e) => {
            if (localStorage.getItem(STORAGE_KEYS.REDUCED_MOTION) === null) {
                setReducedMotion(e.matches);
            }
        };

        contrastQuery.addListener(handleContrastChange);
        motionQuery.addListener(handleMotionChange);

        return () => {
            contrastQuery.removeListener(handleContrastChange);
            motionQuery.removeListener(handleMotionChange);
        };
    }, []);

    // ============================================================================
    // RETURN API
    // ============================================================================

    return {
        // Current state
        typographyScale,
        highContrast,
        reducedMotion,
        scaleMultiplier,
        isElderlyOptimized,

        // Actions
        setScale,
        toggleHighContrast,
        toggleReducedMotion,

        // Utilities
        getScaleDisplayName,
        getFontSizeForElement,
        getOptimalTouchTarget,

        // Constants
        SCALES: TYPOGRAPHY_SCALES,

        // Advanced utilities for custom components
        cssVars: {
            '--typo-user-scale': scaleMultiplier,
            '--typo-base-size': `${20 * scaleMultiplier}px`
        }
    };
}

/**
 * Higher-order component for typography-aware components
 */
export function withTypography(Component) {
    return function TypographyEnhancedComponent(props) {
        const typography = useTypography();
        return <Component {...props} typography={typography} />;
    };
}

/**
 * Context provider for typography preferences (optional)
 */
import { createContext, useContext } from 'react';

const TypographyContext = createContext(null);

export function TypographyProvider({ children }) {
    const typography = useTypography();

    return (
        <TypographyContext.Provider value={typography}>
            {children}
        </TypographyContext.Provider>
    );
}

export function useTypographyContext() {
    const context = useContext(TypographyContext);
    if (!context) {
        throw new Error('useTypographyContext must be used within a TypographyProvider');
    }
    return context;
}
