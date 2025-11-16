// engine/systems/MigrationManager.ts
import type { MigrationFunction } from '@game-engine/core/types';
import type { SaveData } from './SaveManager';
import semver from 'semver';
import type {ILogger} from "@game-engine/core/interfaces";

/**
 * Handles all logic for migrating save data between versions.
 * This is a pure, stateless class.
 */
export class MigrationManager {
    constructor(private readonly migrationFunctions: ReadonlyMap<string, MigrationFunction>, private readonly logger: ILogger) {}

    /**
     * Migrates save data from its version to the current game version.
     */
    public migrate(saveData: SaveData, currentVersion: string): SaveData {
        const saveVersion = saveData.version || '1.0.0';

        if (saveVersion === currentVersion) {
            return saveData;
        }

        this.logger.log(`[MigrationManager] Migrating save from ${saveVersion} to ${currentVersion}`);

        let migratedData: SaveData = saveData;
        const versions = this.getVersionPath(saveVersion, currentVersion);

        for (let i = 0; i < versions.length - 1; i++) {
            const from = versions[i];
            const to = versions[i + 1];
            const key = `${from}_to_${to}`;

            const migration = this.migrationFunctions.get(key);
            if (migration) {
                this.logger.log(`[MigrationManager] Applying migration ${key}`);
                const result = migration(migratedData);
                migratedData = result as SaveData;
                migratedData.version = to; // Stamp the new version
            } else {
                this.logger.warn(`[MigrationManager] No migration found for ${key}. Stopping migration process.`);
                break;
            }
        }

        // Final stamp to the current version in case it was a partial migration
        migratedData.version = currentVersion;

        return migratedData;
    }

    /**
     * Calculates the correct sequence of migration versions to run.
     */
    private getVersionPath(from: string, to: string): string[] {
        const allVersions = new Set<string>([from, to]);

        this.migrationFunctions.forEach((_, key) => {
            const [fromV, toV] = key.split('_to_');
            allVersions.add(fromV);
            allVersions.add(toV);
        });

        const sorted = Array.from(allVersions)
            .filter(v => semver.valid(v))
            .sort(semver.compare);

        const fromIndex = sorted.indexOf(from);
        const toIndex = sorted.indexOf(to);

        if (fromIndex === -1 || toIndex === -1) {
            this.logger.warn(`[MigrationManager] Invalid version in migration path: from=${from}, to=${to}`);
            return [from, to];
        }

        // We want all versions from 'from' up to and including 'to'
        return sorted.slice(fromIndex, toIndex + 1);
    }
}