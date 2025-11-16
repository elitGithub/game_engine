export type {
    IPlatformAdapter,
    PlatformType,
    PlatformCapabilities,
    IAnimationProvider,
    INetworkProvider,
    IImageLoader
} from '@game-engine/core/interfaces/IPlatformAdapter';
export { requiresCapability } from '@game-engine/core/interfaces/IPlatformAdapter';

export type {
    IRenderContainer,
    IDomRenderContainer,
    ICanvasRenderContainer,
    IWebGLRenderContainer,
    IHeadlessRenderContainer,
    INativeRenderContainer,
    RenderContainerType
} from '@game-engine/core/interfaces/IRenderContainer';
export {
    isDomRenderContainer,
    isCanvasRenderContainer,
    isWebGLRenderContainer,
    isHeadlessRenderContainer,
    isNativeRenderContainer
} from '@game-engine/core/interfaces/RenderContainer.utils';


export type {
    IAudioPlatform,
    IAudioContext,
    IAudioBuffer,
    IAudioSource,
    IAudioGain,
    IAudioDestination,
    AudioPlatformType,
    AudioContextState,
    AudioCapabilities,
    AudioFormat
} from '@game-engine/core/interfaces/IAudioPlatform';


export { supportsAudioFormat } from '@game-engine/core/interfaces/IAudioPlatform';

export type {
    IInputAdapter,
    InputAdapterType,
    InputEventHandler,
    InputAttachOptions,
    InputCapabilities
} from '@game-engine/core/interfaces/IInputAdapter';

export type { AudioManagerOptions } from '@game-engine/core/interfaces/AudioManagerOptions';

export type { ITimerProvider } from '@game-engine/core/interfaces/ITimerProvider';
export type { ILogger } from '@game-engine/core/interfaces/ILogger';