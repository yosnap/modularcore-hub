import {
  maxWidthClass,
  safeHref,
  safeImageSrc,
  safeMessage,
  safeOverlayStyle,
} from './safe-render.js';

import type { ModalConfig } from '../../../core/types.js';

export interface OverlayBodyProps {
  config: ModalConfig;
  onPrimary: () => void;
  onSecondary: () => void;
  onClose: () => void;
  className?: string;
}

/** Shared presentational rendering (title/message/image/buttons/close) for every overlay type except Toast. */
export function OverlayBody({
  config,
  onPrimary,
  onSecondary,
  onClose,
  className,
}: OverlayBodyProps) {
  const message = safeMessage(config);
  const imageSrc = safeImageSrc(config.imageUrl);
  const primaryHref = safeHref(config.primaryButton?.url);
  const secondaryHref = safeHref(config.secondaryButton?.url);
  const showClose = config.showCloseButton ?? true;

  return (
    <div
      className={`modals-body ${maxWidthClass(config.maxWidth)} ${className ?? ''}`}
      style={safeOverlayStyle(config)}
    >
      {showClose && (
        <button type="button" className="modals-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      )}
      {imageSrc && (
        <img className="modals-image" src={imageSrc} alt="" referrerPolicy="no-referrer" />
      )}
      {config.title && <h2 className="modals-title">{config.title}</h2>}
      {message.html ? (
        <div className="modals-message" dangerouslySetInnerHTML={{ __html: message.html }} />
      ) : (
        <p className="modals-message">{message.text}</p>
      )}
      {(config.primaryButton || config.secondaryButton) && (
        <div className="modals-actions">
          {config.primaryButton &&
            (primaryHref ? (
              <a
                className="modals-button modals-button--primary"
                href={primaryHref}
                rel="noopener noreferrer"
                target="_blank"
                onClick={onPrimary}
              >
                {config.primaryButton.text}
              </a>
            ) : (
              <button
                type="button"
                className="modals-button modals-button--primary"
                onClick={onPrimary}
              >
                {config.primaryButton.text}
              </button>
            ))}
          {config.secondaryButton &&
            (secondaryHref ? (
              <a
                className="modals-button modals-button--secondary"
                href={secondaryHref}
                rel="noopener noreferrer"
                target="_blank"
                onClick={onSecondary}
              >
                {config.secondaryButton.text}
              </a>
            ) : (
              <button
                type="button"
                className="modals-button modals-button--secondary"
                onClick={onSecondary}
              >
                {config.secondaryButton.text}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
