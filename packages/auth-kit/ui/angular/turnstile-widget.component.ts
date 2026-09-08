import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

import { mountTurnstileWidget, TurnstileController } from '../../core/turnstile.js';

/**
 * Ships as source (no compiled Angular library / ng-packagr in this repo) — copied straight
 * into a consumer's own Angular CLI project, which already has `experimentalDecorators` on by
 * default, so classic decorator syntax is used here for broad compatibility.
 */
@Component({
  selector: 'auth-kit-turnstile-widget',
  standalone: true,
  template: `<div #container></div>`,
})
export class TurnstileWidgetComponent implements OnInit, OnDestroy {
  @Input() siteKey?: string;
  @Input() theme?: 'light' | 'dark' | 'auto';
  @Input() mode?: 'managed' | 'non-interactive' | 'invisible';
  @Output() token = new EventEmitter<string | null>();

  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private controller?: TurnstileController;
  private unsubscribe?: () => void;
  private unmountWidget?: () => void;

  ngOnInit(): void {
    this.controller = new TurnstileController({ siteKey: this.siteKey, theme: this.theme, mode: this.mode });
    this.unsubscribe = this.controller.subscribe((state) => this.token.emit(state.token));
    this.unmountWidget = mountTurnstileWidget(this.containerRef.nativeElement, this.controller);
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
    this.unmountWidget?.();
  }
}
