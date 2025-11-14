// engine/core/PluginManager.ts
import type { IEngineHost, IEnginePlugin, TypedGameContext } from '@engine/types';
import type {ILogger} from "@engine/interfaces";

export class PluginManager<TGame = Record<string, unknown>> {
    private plugins: Map<string, IEnginePlugin<TGame>>;
    private installed: Set<string>;

    constructor(private readonly logger: ILogger) {
        this.plugins = new Map();
        this.installed = new Set();
    }

    register(plugin: IEnginePlugin<TGame>): void {
        if (this.plugins.has(plugin.name)) {
            this.logger.warn(`[PluginManager] Plugin '${plugin.name}' already registered. Skipping.`);
            return;
        }
        this.plugins.set(plugin.name, plugin);
    }

    install(pluginName: string, engine: IEngineHost<TGame>): boolean {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            this.logger.error(`[PluginManager] Plugin '${pluginName}' not found.`);
            return false;
        }

        if (this.installed.has(pluginName)) {
            this.logger.warn(`[PluginManager] Plugin '${pluginName}' already installed.`);
            return false;
        }

        try {
            plugin.install(engine);
            this.installed.add(pluginName);
            this.logger.log(`[PluginManager] Installed plugin: ${pluginName}`);
            return true;
        } catch (error) {
            this.logger.error(`[PluginManager] Failed to install '${pluginName}':`, error);
            return false;
        }
    }

    uninstall(pluginName: string, engine: IEngineHost<TGame>): boolean {
        const plugin = this.plugins.get(pluginName);
        if (!plugin || !this.installed.has(pluginName)) {
            return false;
        }

        if (plugin.uninstall) {
            try {
                plugin.uninstall(engine);
                this.installed.delete(pluginName);
                this.logger.log(`[PluginManager] Uninstalled plugin: ${pluginName}`);
                return true;
            } catch (error) {
                this.logger.error(`[PluginManager] Failed to uninstall '${pluginName}':`, error);
                return false;
            }
        }

        this.installed.delete(pluginName);
        return true;
    }

    update(deltaTime: number, context: TypedGameContext<TGame>): void {
        this.installed.forEach(pluginName => {
            const plugin = this.plugins.get(pluginName);
            if (plugin?.update) {
                try {
                    plugin.update(deltaTime, context);
                } catch (error) {
                    this.logger.error(`[PluginManager] Error updating plugin '${pluginName}':`, error);
                }
            }
        });
    }

    isInstalled(pluginName: string): boolean {
        return this.installed.has(pluginName);
    }

    getInstalled(): string[] {
        return Array.from(this.installed);
    }

    getAvailable(): string[] {
        return Array.from(this.plugins.keys());
    }
}
