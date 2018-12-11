import {Container,} from "reactstrap";
import {SignalHeaderRow, SignalRow} from "./rows";

import React, {Component} from 'react';

import _ from 'lodash';


export default class Screener extends Component {
    constructor(props) {
        super(props);

        this.state = { sortColumns: { h1: 'desc' } };
    }

    changeSortColumn = (e) => {
        debugger;
        let col = e.target.id;
        let sortColumns = this.state.sortColumns;
        let dir = sortColumns[col];

        switch (dir) {
            case 'asc':
                delete sortColumns [col];
                break;
            case 'desc':
                sortColumns[col] = 'asc';
                break;
            default:
                sortColumns[col] = 'desc';
                break;
        }
        this.setState({ ...this.state, sortColumns })
    };
    changeDisplay = (e) => {
//        debugger
        this.setState({ ...this.state, showHigh: !this.state.showHigh })
    };

    extractColums = (data) => {
        return _.initial(Object.keys(data[0]))
    };

    sort = (data) => {
        return _.orderBy(data,
            _.keys(this.state.sortColumns).map((col) => `${col}.change`),
            // p => this.state.sortColumns.map(col => p[col].change),
            _.values(this.state.sortColumns).map((dir) => dir)
        )
    };

    render() {
        const columns = this.extractColums(this.props.symbolPerformance);
        const performances = this.sort(this.props.symbolPerformance);

        return (<Container className="App" fluid>
            <SignalHeaderRow columns={columns} changeSortColumn={this.changeSortColumn}
                             sortColumns={this.state.sortColumns}
                             resetSorting={() => this.setState({ ...this.state, sortColumns: {} })}/>
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