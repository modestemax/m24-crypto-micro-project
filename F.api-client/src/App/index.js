import React, {Component} from 'react';
 import {Subscription} from "react-apollo";
import gql from "graphql-tag";

import './style.css'
import Screener from "./Screener"


const SUBS_SIGNALS = gql`
    subscription {
        symbolPerformance {
            m5 {
                symbol
                change
            }

            m15 {
                symbol
                change
            }
            m30 {
                symbol
                change
            }
            h1 {
                symbol
                change
            }
            h2 {
                symbol
                change
            }
            h4 {
                symbol
                change
            }
            h6 {
                symbol
                change
            }
            h8 {
                symbol
                change
            }
            h12 {
                symbol
                change
            }
            h24 {
                symbol
                change
            }
        }
    }
`;

class App extends Component {

    render() {
        return (
            // {/*<Subscription subscription={SUBS_SIGNALS} variables={{timeframes: this.columns}}>*/}
            <Subscription subscription={SUBS_SIGNALS}>
                {({ data: { symbolPerformance } = {}, loading }) => {

                    if (loading) return <span>Loading....</span>;
                    if (symbolPerformance) {
                        return <Screener symbolPerformance={symbolPerformance}/>
                    }
                    setTimeout(() => this.setState({ ...this.state, reconnect: Date.now() }), 1e3)
                    return <span>Reconnecting....</span>;
                }}
            </Subscription>
        )
    }
}

export default App;