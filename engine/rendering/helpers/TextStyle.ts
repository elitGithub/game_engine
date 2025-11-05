/**
 * TextStyle - Configuration for text appearance
 */
import type { TextStyleConfig } from '@engine/types';

export class TextStyle {
    public fontFamily: string;
    public fontSize: string;
    public fontWeight: string;
    public fontStyle: string;
    public lineHeight: string;
    public letterSpacing: string;
    public color: string;
    public backgroundColor: string;
    public textAlign: string;
    public textTransform: string;
    public textDecoration: string;
    public textShadow: string;
    public margin: string;
    public padding: string;
    public border: string;
    public borderRadius: string;
    public position: string;
    public top: string;
    public right: string;
    public bottom: string;
    public left: string;
    public width: string;
    public maxWidth: string;
    public transition: string;
    public animation: string;
    public boxShadow: string;
    public opacity: string;
    public customCSS: Record<string, string>;

    constructor(config: TextStyleConfig = {}) {
        this.fontFamily = config.fontFamily || 'inherit';
        this.fontSize = config.fontSize || '1rem';
        this.fontWeight = config.fontWeight || 'normal';
        this.fontStyle = config.fontStyle || 'normal';
        this.lineHeight = config.lineHeight || '1.6';
        this.letterSpacing = config.letterSpacing || 'normal';
        this.color = config.color || 'inherit';
        this.backgroundColor = config.backgroundColor || 'transparent';
        this.textAlign = config.textAlign || 'left';
        this.textTransform = config.textTransform || 'none';
        this.textDecoration = config.textDecoration || 'none';
        this.textShadow = config.textShadow || 'none';
        this.margin = config.margin || '0';
        this.padding = config.padding || '0.5rem 0';
        this.border = config.border || 'none';
        this.borderRadius = config.borderRadius || '0';
        this.position = config.position || 'relative';
        this.top = config.top || 'auto';
        this.right = config.right || 'auto';
        this.bottom = config.bottom || 'auto';
        this.left = config.left || 'auto';
        this.width = config.width || 'auto';
        this.maxWidth = config.maxWidth || 'none';
        this.transition = config.transition || 'none';
        this.animation = config.animation || 'none';
        this.boxShadow = config.boxShadow || 'none';
        this.opacity = config.opacity || '1';
        this.customCSS = config.customCSS || {};
    }

    /**
     * Apply this style to a DOM element
     *
     * !!! DELETED !!!
     * This logic is renderer-specific and DOM-coupled.
     * The new TextRenderer helper converts this class to TextStyleData.
     * The DomRenderer itself implements its own 'applyTextStyle'.
     */
    // apply(element: HTMLElement): void { ... }

    /**
     * Clone this style
     */
    clone(): TextStyle {
        return new TextStyle({
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle,
            lineHeight: this.lineHeight,
            letterSpacing: this.letterSpacing,
            color: this.color,
            backgroundColor: this.backgroundColor,
            textAlign: this.textAlign,
            textTransform: this.textTransform,
            textDecoration: this.textDecoration,
            textShadow: this.textShadow,
            margin: this.margin,
            padding: this.padding,
            border: this.border,
            borderRadius: this.borderRadius,
            position: this.position,
            top: this.top,
            right: this.right,
            bottom: this.bottom,
            left: this.left,
            width: this.width,
            maxWidth: this.maxWidth,
            transition: this.transition,
            animation: this.animation,
            boxShadow: this.boxShadow,
            opacity: this.opacity,
            customCSS: { ...this.customCSS }
        });
    }
}

/**
 * StylePresets - Common text style presets
 */
export const StylePresets = {
    narrative: new TextStyle({
        fontSize: '1.1rem',
        lineHeight: '1.8',
        color: '#e5e7eb',
        padding: '1rem 0',
        textAlign: 'left'
    }),

    dialogue: new TextStyle({
        fontSize: '1rem',
        lineHeight: '1.6',
        color: '#fbbf24',
        padding: '0.5rem 1rem',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '3px solid #fbbf24',
        borderRadius: '0 0.25rem 0.25rem 0'
    }),

    system: new TextStyle({
        fontSize: '0.9rem',
        lineHeight: '1.4',
        color: '#9ca3af',
        fontStyle: 'italic',
        padding: '0.25rem 0'
    }),

    emphasis: new TextStyle({
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: '#60a5fa',
        textShadow: '0 0 10px rgba(96, 165, 250, 0.5)'
    }),

    choice: new TextStyle({
        fontSize: '1rem',
        color: '#34d399',
        padding: '0.5rem',
        transition: 'all 0.2s ease',
        customCSS: {
            cursor: 'pointer',
            userSelect: 'none'
        }
    }),

    bottomBubble: new TextStyle({
        fontSize: '1rem',
        lineHeight: '1.6',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        width: '90%',
        maxWidth: '800px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.5)',
        customCSS: {
            transform: 'translateX(-50%)',
            zIndex: '1000'
        }
    })
};