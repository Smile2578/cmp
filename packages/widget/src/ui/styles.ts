export function getStyles(colors: { primary: string; background: string; text: string }): string {
  return `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: ${colors.text};
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .cmp-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      pointer-events: none;
    }

    .cmp-banner {
      pointer-events: auto;
      background: ${colors.background};
      border-top: 1px solid rgba(0,0,0,0.1);
      box-shadow: 0 -2px 16px rgba(0,0,0,0.08);
      padding: 20px 24px;
      width: 100%;
      max-width: 720px;
      margin: 0 auto 16px;
      border-radius: 12px;
    }

    .cmp-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: ${colors.text};
    }

    .cmp-description {
      font-size: 14px;
      color: ${colors.text};
      opacity: 0.8;
      margin-bottom: 16px;
    }

    .cmp-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .cmp-btn-primary {
      padding: 10px 20px;
      border-radius: 8px;
      border: 2px solid ${colors.primary};
      background: ${colors.primary};
      color: ${colors.background};
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s;
      flex: 1;
      min-width: 120px;
      text-align: center;
    }

    .cmp-btn-primary:hover { opacity: 0.85; }

    .cmp-btn-secondary {
      padding: 10px 20px;
      border-radius: 8px;
      border: 2px solid ${colors.primary};
      background: transparent;
      color: ${colors.primary};
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.15s;
    }

    .cmp-btn-secondary:hover { opacity: 0.7; }

    .cmp-preferences {
      margin-top: 16px;
      border-top: 1px solid rgba(0,0,0,0.1);
      padding-top: 16px;
    }

    .cmp-category {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .cmp-category-info { flex: 1; margin-right: 16px; }

    .cmp-category-label {
      font-weight: 500;
      font-size: 14px;
    }

    .cmp-category-desc {
      font-size: 13px;
      opacity: 0.7;
      margin-top: 2px;
    }

    .cmp-toggle {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .cmp-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .cmp-toggle-track {
      position: absolute;
      inset: 0;
      background: #ccc;
      border-radius: 24px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .cmp-toggle-track::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s;
    }

    .cmp-toggle input:checked + .cmp-toggle-track {
      background: ${colors.primary};
    }

    .cmp-toggle input:checked + .cmp-toggle-track::after {
      transform: translateX(20px);
    }

    .cmp-toggle input:disabled + .cmp-toggle-track {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .cmp-save-row {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    }
  `
}
