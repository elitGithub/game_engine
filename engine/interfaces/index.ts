export type {
    IPlatformAdapter,
    PlatformType,
    PlatformCapabilities,
    IAnimationProvider,
    INetworkProvider,
    IImageLoader
} from '@engine/interfaces/IPlatformAdapter';
export { requiresCapability } from '@engine/interfaces/IPlatformAdapter';

export type {
    IRenderContainer,
    IDomRenderContainer,
    ICanvasRenderContainer,
    IWebGLRenderContainer,
    IHeadlessRenderContainer,
    INativeRenderContainer,
    RenderContainerType
} from '@engine/interfaces/IRenderContainer';
export {
    isDomRenderContainer,
    isCanvasRenderContainer,
    isWebGLRenderContainer,
    isHeadlessRenderContainer,
    isNativeRenderContainer
} from '@engine/interfaces/RenderContainer.utils';


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
} from '@engine/interfaces/IAudioPlatform';


export { supportsAudioFormat } from '@engine/interfaces/IAudioPlatform';
export { WebAudioPlatform } from '@engine/platform/webaudio/WebAudioPlatform';
export { MockAudioPlatform } from '@engine/platform/mock/MockAudioPlatform';

export type {
    IInputAdapter,
    InputAdapterType,
    InputEventHandler,
    InputAttachOptions,
    InputCapabilities
} from '@engine/interfaces/IInputAdapter';
export {
    BaseInputAdapter,
    MockInputAdapter,
    CompositeInputAdapter
} from '@engine/interfaces/IInputAdapter';

export interface AudioManagerOptions {
    sfxPoolSize: number;
    volumes?: {
        master?: number;
        music?: number;
        sfx?: number;
        voice?: number;
    };
}


export type { ITimerProvider } from '@engine/interfaces/ITimerProvider';
export type { ILogger } from '@engine/interfaces/ILogger';