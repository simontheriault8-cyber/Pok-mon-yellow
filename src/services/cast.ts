// Google Cast Sender & Multi-Device Real-Time TV Cast Engine
// Conforms to Google Cast Web Sender Guide: https://developers.google.com/cast/docs/web_sender/integrate

export type CastMode = 'google-cast' | 'presentation' | 'remote-window' | 'qr-sync';

export interface CastStatus {
  isSdkLoaded: boolean;
  castState: string; // 'NO_DEVICES_AVAILABLE' | 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED'
  isCasting: boolean;
  castMode: CastMode | null;
  deviceName?: string;
  isHostReady: boolean;
}

export type CastListener = (status: CastStatus) => void;

class GoogleCastServiceManager {
  private isSdkLoaded: boolean = false;
  private isCasting: boolean = false;
  private castState: string = 'NO_DEVICES_AVAILABLE';
  private castMode: CastMode | null = null;
  private deviceName: string = '';
  private listeners: Set<CastListener> = new Set();
  
  // Real-time communication channel for inputs
  private inputChannel: BroadcastChannel | null = null;
  private remoteWindow: Window | null = null;
  private presentationConnection: any = null;

  constructor() {
    this.setupBroadcastChannel();
    this.setupGoogleCastSdk();
  }

  private setupBroadcastChannel() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.inputChannel = new BroadcastChannel('gbc_gamepad_sync');
      }
    } catch {
      // Ignored if unsupported
    }
  }

  private setupGoogleCastSdk() {
    if (typeof window === 'undefined') return;

    const initCast = () => {
      if ((window as any).cast?.framework) {
        try {
          const castContext = (window as any).cast.framework.CastContext.getInstance();
          castContext.setOptions({
            receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
            autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
          });

          this.isSdkLoaded = true;

          // Listen for Cast state changes (NO_DEVICES_AVAILABLE, NOT_CONNECTED, CONNECTING, CONNECTED)
          castContext.addEventListener(
            (window as any).cast.framework.CastContextEventType.CAST_STATE_CHANGED,
            (event: any) => {
              this.castState = event.castState || 'UNKNOWN';
              this.isCasting = event.castState === (window as any).cast.framework.CastState.CONNECTED;
              if (this.isCasting) {
                this.castMode = 'google-cast';
                const session = castContext.getCurrentSession();
                this.deviceName = session?.getCastDevice()?.friendlyName || 'Chromecast';
              } else if (this.castMode === 'google-cast') {
                this.castMode = null;
                this.deviceName = '';
              }
              this.notify();
            }
          );

          // Listen for Session state changes
          castContext.addEventListener(
            (window as any).cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
            (event: any) => {
              const sessionState = event.sessionState;
              if (sessionState === (window as any).cast.framework.SessionState.SESSION_STARTED) {
                this.isCasting = true;
                this.castMode = 'google-cast';
                const session = castContext.getCurrentSession();
                this.deviceName = session?.getCastDevice()?.friendlyName || 'Chromecast';
              } else if (sessionState === (window as any).cast.framework.SessionState.SESSION_ENDED) {
                if (this.castMode === 'google-cast') {
                  this.isCasting = false;
                  this.castMode = null;
                }
              }
              this.notify();
            }
          );

          this.notify();
        } catch (e) {
          console.warn('CastContext init error:', e);
        }
      }
    };

    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) {
        initCast();
      }
    };

    // If script is already loaded
    if ((window as any).cast?.framework) {
      initCast();
    }
  }

  public subscribe(listener: CastListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }

  public getStatus(): CastStatus {
    return {
      isSdkLoaded: this.isSdkLoaded,
      castState: this.castState,
      isCasting: this.isCasting,
      castMode: this.castMode,
      deviceName: this.deviceName,
      isHostReady: true
    };
  }

  // Trigger Google Cast Picker dialog or Native Presentation API
  public async requestGoogleCast(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // 1. Try Google Cast Framework Request
    if ((window as any).cast?.framework) {
      try {
        const castContext = (window as any).cast.framework.CastContext.getInstance();
        await castContext.requestSession();
        this.isCasting = true;
        this.castMode = 'google-cast';
        this.notify();
        return true;
      } catch (err: any) {
        console.log('Google Cast requestSession cancelled or error:', err);
      }
    }

    // 2. Try Web Presentation API (works with Smart TVs & Miracast & Chrome Cast)
    if ('PresentationRequest' in window) {
      try {
        const presentationUrl = `${window.location.origin}${window.location.pathname}?mode=tv-receiver`;
        const request = new (window as any).PresentationRequest([presentationUrl]);
        const connection = await request.start();
        this.presentationConnection = connection;
        this.isCasting = true;
        this.castMode = 'presentation';
        this.notify();

        connection.onterminate = () => this.stopCast();
        connection.onclose = () => this.stopCast();
        return true;
      } catch (e) {
        console.log('Presentation API prompt dismissed:', e);
      }
    }

    return false;
  }

  // Open Direct Ultra-HD TV Screen Receiver (for Multi-Screen / HDMI / Smart TV Browser / AirPlay)
  public openTvScreen(canvas: HTMLCanvasElement, gameTitle: string = 'Game Boy Color'): boolean {
    if (!canvas) return false;

    try {
      let stream: MediaStream | null = null;
      if ('captureStream' in canvas) {
        stream = (canvas as any).captureStream(60);
      }

      const tvWin = window.open(
        '',
        'GBC_CHROMECAST_SCREEN',
        'width=1280,height=960,menubar=no,toolbar=no,location=no,status=no'
      );

      if (tvWin) {
        this.remoteWindow = tvWin;
        this.isCasting = true;
        this.castMode = 'remote-window';
        this.deviceName = 'Écran TV / HDMI';

        tvWin.document.title = `📺 ${gameTitle} - Écran TV`;
        tvWin.document.body.style.margin = '0';
        tvWin.document.body.style.padding = '0';
        tvWin.document.body.style.backgroundColor = '#000';
        tvWin.document.body.style.display = 'flex';
        tvWin.document.body.style.alignItems = 'center';
        tvWin.document.body.style.justifyContent = 'center';
        tvWin.document.body.style.height = '100vh';
        tvWin.document.body.style.width = '100vw';
        tvWin.document.body.style.overflow = 'hidden';
        tvWin.document.body.style.userSelect = 'none';

        tvWin.document.body.innerHTML = `
          <div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
            <video id="tv-video" autoplay playsinline style="width:100vw;height:100vh;max-height:100vh;max-width:100vw;object-fit:contain;image-rendering:pixelated;"></video>
            
            <div id="tv-header" style="position:absolute;top:16px;left:16px;background:rgba(16,185,129,0.9);color:#022c22;padding:6px 16px;border-radius:999px;font-weight:800;font-size:13px;display:flex;align-items:center;gap:8px;backdrop-filter:blur(10px);box-shadow:0 4px 20px rgba(0,0,0,0.5);letter-spacing:0.5px;transition:opacity 0.8s ease;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#022c22;"></span>
              TV CONNECTÉE : ${gameTitle.toUpperCase()}
            </div>

            <div style="position:absolute;bottom:16px;right:16px;display:flex;gap:10px;">
              <button id="fs-btn" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:8px 16px;border-radius:12px;font-weight:700;font-size:12px;cursor:pointer;backdrop-filter:blur(10px);">Plein Écran TV ⛶</button>
            </div>
          </div>
        `;

        const tvVideo = tvWin.document.getElementById('tv-video') as HTMLVideoElement;
        if (tvVideo && stream) {
          tvVideo.srcObject = stream;
          tvVideo.play().catch(() => {});
        }

        const fsBtn = tvWin.document.getElementById('fs-btn');
        if (fsBtn) {
          fsBtn.onclick = () => {
            if (tvWin.document.documentElement.requestFullscreen) {
              tvWin.document.documentElement.requestFullscreen().catch(() => {});
            }
          };
        }

        setTimeout(() => {
          const header = tvWin.document.getElementById('tv-header');
          if (header) header.style.opacity = '0.25';
        }, 4000);

        tvWin.onbeforeunload = () => {
          this.stopCast();
        };

        this.notify();
        return true;
      }
    } catch (e) {
      console.warn('TV Window error:', e);
    }
    return false;
  }

  // Send Joypad Input Event from Phone to Host
  public sendGamepadInput(button: string, isDown: boolean) {
    if (this.inputChannel) {
      this.inputChannel.postMessage({
        type: 'GAMEPAD_INPUT',
        button,
        isDown,
        timestamp: Date.now()
      });
    }

    if (this.presentationConnection && this.presentationConnection.state === 'connected') {
      try {
        this.presentationConnection.send(JSON.stringify({
          type: 'GAMEPAD_INPUT',
          button,
          isDown,
          timestamp: Date.now()
        }));
      } catch {}
    }
  }

  // Listen to remote gamepad inputs (if running as receiver screen)
  public onGamepadInput(handler: (button: string, isDown: boolean) => void): () => void {
    const messageHandler = (event: MessageEvent) => {
      if (event.data?.type === 'GAMEPAD_INPUT') {
        handler(event.data.button, event.data.isDown);
      }
    };

    if (this.inputChannel) {
      this.inputChannel.addEventListener('message', messageHandler);
    }

    return () => {
      if (this.inputChannel) {
        this.inputChannel.removeEventListener('message', messageHandler);
      }
    };
  }

  public stopCast() {
    if (this.remoteWindow && !this.remoteWindow.closed) {
      try {
        this.remoteWindow.close();
      } catch {}
    }
    this.remoteWindow = null;

    if (this.presentationConnection) {
      try {
        this.presentationConnection.terminate();
      } catch {}
      this.presentationConnection = null;
    }

    if ((window as any).cast?.framework) {
      try {
        const castContext = (window as any).cast.framework.CastContext.getInstance();
        castContext.endCurrentSession(true);
      } catch {}
    }

    this.isCasting = false;
    this.castMode = null;
    this.deviceName = '';
    this.notify();
  }
}

export const CastService = new GoogleCastServiceManager();
