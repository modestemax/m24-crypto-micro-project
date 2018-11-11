/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */


import '@stencil/core';




export namespace Components {

  interface SymbolLabel {
    'base': string;
  }
  interface SymbolLabelAttributes extends StencilHTMLAttributes {
    'base'?: string;
  }

  interface SymbolSignal {
    'first': string;
    'last': string;
    'middle': string;
  }
  interface SymbolSignalAttributes extends StencilHTMLAttributes {
    'first'?: string;
    'last'?: string;
    'middle'?: string;
  }
}

declare global {
  interface StencilElementInterfaces {
    'SymbolLabel': Components.SymbolLabel;
    'SymbolSignal': Components.SymbolSignal;
  }

  interface StencilIntrinsicElements {
    'symbol-label': Components.SymbolLabelAttributes;
    'symbol-signal': Components.SymbolSignalAttributes;
  }


  interface HTMLSymbolLabelElement extends Components.SymbolLabel, HTMLStencilElement {}
  var HTMLSymbolLabelElement: {
    prototype: HTMLSymbolLabelElement;
    new (): HTMLSymbolLabelElement;
  };

  interface HTMLSymbolSignalElement extends Components.SymbolSignal, HTMLStencilElement {}
  var HTMLSymbolSignalElement: {
    prototype: HTMLSymbolSignalElement;
    new (): HTMLSymbolSignalElement;
  };

  interface HTMLElementTagNameMap {
    'symbol-label': HTMLSymbolLabelElement
    'symbol-signal': HTMLSymbolSignalElement
  }

  interface ElementTagNameMap {
    'symbol-label': HTMLSymbolLabelElement;
    'symbol-signal': HTMLSymbolSignalElement;
  }


  export namespace JSX {
    export interface Element {}
    export interface IntrinsicElements extends StencilIntrinsicElements {
      [tagName: string]: any;
    }
  }
  export interface HTMLAttributes extends StencilHTMLAttributes {}

}