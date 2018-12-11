import {Container,} from "reactstrap";
import {SignalHeaderRow, SignalRow} from "./rows";

import React, {Component} from 'react';

import _ from 'lodash';


export default class Screener extends Component {
    constructor(props) {
        super(props);

        this.state = { sortColumn: 'h1' };
    }

    changeSortColumn = (e) => {
//        debugger
        this.setState({ ...this.state, sortColumn: e.target.id })
    };
    changeDisplay = (e) => {
//        debugger
        this.setState({ ...this.state, showHigh: !this.state.showHigh })
    };

    extractColums = (data) => {
        return _.initial(Object.keys(data[0]))
    };

    sort = (data) => {
        return this.state.sortColumn ?
            _.orderBy(data, p => p[this.state.sortColumn].change, ['desc'])
            : data
    };

    render() {
        const columns = this.extractColums(this.props.symbolPerformance);
        const performances = this.sort(this.props.symbolPerformance);

        return (<Container className="App" fluid>
            <SignalHeaderRow columns={columns} changeSortColumn={this.changeSortColumn}
                             resetSorting={()=> this.setState({ ...this.state, sortColumn:null })}/>
            {performances.map(perf =>
                <SignalRow key={perf[columns[0]].symbol}
                           showHigh={this.state.showHigh}
                           symbol={perf[columns[0]].symbol}
                           columns={columns} performances={perf}
                />
            )}
        </Container>)
    }
}