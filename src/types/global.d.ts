interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}

/**
 * WICG HTML-in-Canvas experimental API declarations
 * (https://github.com/WICG/html-in-canvas)
 */
interface HTMLCanvasElement {
  onpaint?: ((event: Event) => void) | null;
  requestPaint?: () => void;
}

interface WebGL2RenderingContext {
  texElementImage2D?: (
    target: GLenum,
    level: GLint,
    internalformat: GLint,
    format: GLenum,
    type: GLenum,
    element: Element
  ) => void;
  texElementSubImage2D?: (
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    element: Element
  ) => void;
}

interface WebGLRenderingContext {
  texElementImage2D?: (
    target: GLenum,
    level: GLint,
    internalformat: GLint,
    format: GLenum,
    type: GLenum,
    element: Element
  ) => void;
  texElementSubImage2D?: (
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    element: Element
  ) => void;
}

