/**
 * SpriteRenderer - Handles static images, portraits, and clickable areas
 * 
 * For point-and-click games:
 * - Background scenes
 * - Character portraits
 * - Clickable objects/hotspots
 * - Simple visual effects
 */
import { BaseRenderer } from './BaseRenderer';

export interface SpriteConfig {
    src: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    zIndex?: number;
    className?: string;
    onClick?: () => void;
    onHover?: () => void;
}

export interface BackgroundConfig {
    src: string;
    fit?: 'cover' | 'contain' | 'fill';
}

export class SpriteRenderer extends BaseRenderer {
    private sprites: Map<string, HTMLImageElement>;
    private background: HTMLElement | null;

    constructor(containerElement: HTMLElement) {
        super(containerElement);
        this.sprites = new Map();
        this.background = null;
    }

    async initialize(): Promise<void> {
        // Set container to relative positioning for absolute sprites
        this.container.style.position = 'relative';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        await super.initialize();
    }

    /**
     * Set background image
     */
    setBackground(config: BackgroundConfig): void {
        if (!this.background) {
            this.background = document.createElement('div');
            this.background.className = 'scene-background';
            this.background.style.position = 'absolute';
            this.background.style.top = '0';
            this.background.style.left = '0';
            this.background.style.width = '100%';
            this.background.style.height = '100%';
            this.background.style.zIndex = '0';
            this.container.appendChild(this.background);
        }

        this.background.style.backgroundImage = `url(${config.src})`;
        this.background.style.backgroundSize = config.fit || 'cover';
        this.background.style.backgroundPosition = 'center';
        this.background.style.backgroundRepeat = 'no-repeat';
    }

    /**
     * Add a sprite (portrait, object, etc.)
     */
    addSprite(id: string, config: SpriteConfig): HTMLImageElement {
        // Remove existing sprite with this ID
        this.removeSprite(id);

        const img = document.createElement('img');
        img.src = config.src;
        img.className = `sprite ${config.className || ''}`;
        img.style.position = 'absolute';
        
        if (config.x !== undefined) img.style.left = `${config.x}px`;
        if (config.y !== undefined) img.style.top = `${config.y}px`;
        if (config.width !== undefined) img.style.width = `${config.width}px`;
        if (config.height !== undefined) img.style.height = `${config.height}px`;
        if (config.zIndex !== undefined) img.style.zIndex = String(config.zIndex);

        // Add click handler
        if (config.onClick) {
            img.style.cursor = 'pointer';
            img.addEventListener('click', config.onClick);
        }

        // Add hover handler
        if (config.onHover) {
            img.addEventListener('mouseenter', config.onHover);
        }

        this.container.appendChild(img);
        this.sprites.set(id, img);

        return img;
    }

    /**
     * Remove a sprite
     */
    removeSprite(id: string): void {
        const sprite = this.sprites.get(id);
        if (sprite && sprite.parentNode) {
            sprite.parentNode.removeChild(sprite);
            this.sprites.delete(id);
        }
    }

    /**
     * Get a sprite by ID
     */
    getSprite(id: string): HTMLImageElement | undefined {
        return this.sprites.get(id);
    }

    /**
     * Update sprite position
     */
    updateSpritePosition(id: string, x: number, y: number): void {
        const sprite = this.sprites.get(id);
        if (sprite) {
            sprite.style.left = `${x}px`;
            sprite.style.top = `${y}px`;
        }
    }

    /**
     * Add a clickable hotspot (invisible clickable area)
     */
    addHotspot(
        id: string, 
        x: number, 
        y: number, 
        width: number, 
        height: number, 
        onClick: () => void
    ): HTMLElement {
        const hotspot = document.createElement('div');
        hotspot.className = 'hotspot';
        hotspot.style.position = 'absolute';
        hotspot.style.left = `${x}px`;
        hotspot.style.top = `${y}px`;
        hotspot.style.width = `${width}px`;
        hotspot.style.height = `${height}px`;
        hotspot.style.cursor = 'pointer';
        hotspot.style.zIndex = '10';
        
        // Debug: uncomment to see hotspots
        // hotspot.style.border = '2px solid red';
        // hotspot.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';

        hotspot.addEventListener('click', onClick);
        
        this.container.appendChild(hotspot);
        return hotspot;
    }

    /**
     * Clear all sprites and background
     */
    clear(): void {
        // Remove all sprites
        this.sprites.forEach(sprite => {
            if (sprite.parentNode) {
                sprite.parentNode.removeChild(sprite);
            }
        });
        this.sprites.clear();

        // Remove background
        if (this.background && this.background.parentNode) {
            this.background.parentNode.removeChild(this.background);
            this.background = null;
        }

        // Remove all child nodes
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }
    }

    /**
     * Generic render (not typically used directly)
     */
    render(content: any, options?: any): void {
        // For compatibility with BaseRenderer
        if (content.type === 'background') {
            this.setBackground(content);
        } else if (content.type === 'sprite') {
            this.addSprite(content.id, content);
        }
    }

    /**
     * Preload images
     */
    async preloadImages(urls: string[]): Promise<void> {
        const promises = urls.map(url => {
            return new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => reject(new Error(`Failed to load: ${url}`));
                img.src = url;
            });
        });

        await Promise.all(promises);
    }
}
