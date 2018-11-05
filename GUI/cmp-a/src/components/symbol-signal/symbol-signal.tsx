import { Component, Prop } from '@stencil/core';

@Component({
  tag: 'symbol-signal',
  styleUrl: 'symbol-signal.css',
  shadow: true
})
export class SymbolSignal {
  @Prop() first: string;
  @Prop() middle: string;
  @Prop() last: string;

  format(): string {
    return (
      (this.first || '') +
      (this.middle ? ` ${this.middle}` : '') +
      (this.last ? ` ${this.last}` : '')
    );
  }

  render() {
    return <div>Hello, World! I'm {this.format()}</div>;
  }
}
