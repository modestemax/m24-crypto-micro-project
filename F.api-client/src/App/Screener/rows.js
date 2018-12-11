import React, {Component} from 'react';
import {Col, Row} from "reactstrap";
import * as PropTypes from "prop-types";


export function SignalHeaderRow({ columns, changeSortColumn, resetSorting }) {
    return <Row>
        <Col onClick={resetSorting}>Reset</Col>
        {/*<Col id={'pos'} onClick={changeSortColumn}>Position</Col>*/}
        {/*<Col key={col} id={col} onClick={changeSortColumn}>{col}</Col>*/}
        {columns.map(col =>
            <Col key={col} id={col} onClick={changeSortColumn}>{col.toUpperCase()}</Col>
        )}
        {/* <Col>
                    <Dropdown group isOpen={this.state.dropdownOpen} size="sm" toggle={this.toggle}>
                        <DropdownToggle caret>
                            Dropdown
                        </DropdownToggle>
                        <DropdownMenu>
                            <DropdownItem>Another Action</DropdownItem>
                            <DropdownItem>Another Action</DropdownItem>
                            <DropdownItem>Another Action</DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </Col>*/}
    </Row>
}

export   class SignalRow extends Component {
    constructor(props) {
        super(props);
        this.state = { selected: false }
    }

    render() {
        let { symbol, columns, showHigh, performances } = this.props;
        return <Row key={symbol} className={`symbol-row ${this.state.selected ? 'selected' : ''}`}
                    onClick={() => this.setState({ ...this.state, selected: !this.state.selected })}
        >
            <Col style={{ color: '#a0a0c3' }}>
                <a style={{ color: '#a0a0c3' }} target="_blank"
                   href={`https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}`}>{symbol}</a> </Col>
            {/*<Col>{pos} [{meanPosition}][{meanPercentage}]</Col>*/}
            {columns.map(col => {

                    // let high0 = signal0(col) && signal0(col)["change_to_high"];
                    // let high = value(col, 'change_to_high')
                    // let close = value(col, 'change_from_open')
                    // let absClose = Math.abs(value(col, 'change_from_open') || 0);
                    // let multiProgres = <Progress multi>
                    //     <Progress bar value={absClose} max={high + absClose}
                    //               color={close > 0 ? "success" : "danger"}
                    //     >{percent(close)}</Progress>
                    //     <Progress bar value={high} max={high + absClose}
                    //               color={"blue"}
                    //     >{percent(high)}</Progress>
                    // </Progress>;
                    //
                    // let progress = <Progress value={absClose} max={high0}
                    //                          color={close > 0 ? "success" : "danger"}
                    // >{percent(close)} [{value(col, 'position_good_spread')}]</Progress>
                    let change = performances[col].change;
                    return <Col key={col} style={{ color: change ? (change < 0 ? 'red' : 'green') : '#a1acb7' }}>
                        {/*{showHigh ? multiProgres : progress}*/}
                        {change.toFixed(2)}%
                    </Col>
                }
            )}
        </Row>
    }
}

SignalRow.propTypes = {
    symbol: PropTypes.any,
    columns: PropTypes.any,
    showHigh: PropTypes.any,
    performances: PropTypes.any
}
