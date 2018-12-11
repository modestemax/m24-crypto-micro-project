import {Query, Subscription} from "react-apollo";
import {Container, Row} from "reactstrap";

const GET_OHLC = ``

const S=<Subscription></Subscription>;

export const Content = ({timeframes}) => (

    <Query query={GET_OHLC} variables={timeframes}>
        {({data: {}}) => {
            return (
                <Container>
                    <Row/>
                    <Query query={GET_PRICES} pollInterval={1000}>
                        {({}) => {
                            return (
                                <Row/>
                            )
                        }}
                    </Query>
                </Container>
            )
        }}
    </Query>
)