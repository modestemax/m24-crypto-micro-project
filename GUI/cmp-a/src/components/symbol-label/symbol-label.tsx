import { Component, Prop } from '@stencil/core';
// import 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css'
@Component({
  tag: 'symbol-label',
  styleUrl: 'symbol-label.css',
  shadow: true
})
export class SymbolLabel {
  @Prop() base: string;


  
  render() {
    return <span class="sec"> {this.base}</span>;
  }
}
