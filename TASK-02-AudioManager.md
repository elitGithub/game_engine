`TASK-02-AudioManager.md`
```markdown
# Task: Implement Centralized Audio Manager

* **Task:** Create an `AudioManager` class.
* **Objective:** To centralize all audio loading, playback, and control (BGM, SFX) using the Web Audio API for performance and reliability.

---

### Key Components

* **`engine/core/AudioManager.ts`**: A new class to manage all audio assets and playback.

### Suggested API

```typescript
class AudioManager {
    constructor();

    /** Preloads a map of audio files and stores them as decoded AudioBuffers */
    async preload(assetMap: Record<string, string>): Promise<void>;

    /** Plays a preloaded sound as looping background music */
    playMusic(trackId: string, loop: boolean = true, fadeDuration: number = 0): void;

    /** Fades out and stops the current background music */
    stopMusic(fadeDuration: number = 0): void;

    /** Plays a preloaded sound effect one-shot */
    playSound(soundId: string, volume: number = 1.0): void;

    /** Sets the main volume for all audio */
    setMasterVolume(level: number): void;
}
```
Engine Integration
Instantiation: The AudioManager should be instantiated in the Engine constructor and stored as a public property (e.g., this.audioManager = new AudioManager()).

Context Access: The manager should be added to the GameContext (e.g., this.context.audio = this.audioManager) so all game systems can access it.

Usage:

The game's main entry point (e.g., createGame in README.md) will be responsible for calling engine.audioManager.preload(...).

Scene.onEnter can be updated to check scene.data for a musicTrack property and call context.audio.playMusic(scene.data.musicTrack).

Game-specific Action classes can now use their execute method to call context.audio.playSound('spell_cast') or context.audio.playSound('weapon_hit').