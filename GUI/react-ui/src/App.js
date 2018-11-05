import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
  render() {
    return (
        <ion-app>
        <ion-header>
          <ion-toolbar>
            <ion-title>Header</ion-title>
          </ion-toolbar>
        </ion-header>

        <ion-content padding>
          <h1>Main Content</h1>
        </ion-content>
      </ion-app>
      // <div className="App">
      //   <header className="App-header">
      //     <img src={logo} className="App-logo" alt="logo" />
      //     <p>
      //       Edit <code>src/App.js</code> and save to reload.
      //     </p>
      //     <a
      //       className="App-link"
      //       href="https://reactjs.org"
      //       target="_blank"
      //       rel="noopener noreferrer"
      //     >
      //       Learn React            
      //     </a>
      //     <key-a first="NANA" last="MAX" ></key-a>
      //     <symbol-label base="NANA"   ></symbol-label>
      //   </header>
      // </div>
    );
  }
}

export default App;
