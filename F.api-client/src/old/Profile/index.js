import React, {Component} from 'react';
import gql from 'graphql-tag';
import {Query} from 'react-apollo';
import RepositoryList from '../Repository';
import Loading from '../Loading';
import ErrorMessage from '../Error';

const GET_REPOSITORIES_OF_CURRENT_USER = gql`
  {
    viewer {
      repositories(
        first: 5
        orderBy: { direction: DESC, field: STARGAZERS }
      ) {
        edges {
          node {
            id
            name
            url
            descriptionHTML
            primaryLanguage {
              name
            }
            owner {
              login
              url
            }
            stargazers {
              totalCount
            }
            viewerHasStarred
            watchers {
              totalCount
            }
            viewerSubscription
          }
        }
      }
    }
  }
`;
//
// const Profile = () =>
//     <Query query={GET_REPOSITORIES_OF_CURRENT_USER}>
//         {({ data, loading, error }) => {
//             if (error) {
//                 return <ErrorMessage error={error} />;
//             }
//
//             const { viewer } = data;
//
//             if (loading || !viewer) {
//                 return <Loading />;
//             }
//
//             return <RepositoryList repositories={viewer.repositories} />;
//         }}
//     </Query>

class Profile extends Component {
    reload = () => {
        this.setState({id: new Date()})
    }

    render() {
        alert('render');
        return (<Query query={GET_REPOSITORIES_OF_CURRENT_USER} notifyOnNetworkStatusChange>
            {({data, loading, error,refetch,networkStatus}) => {  alert('fetch');
                if (networkStatus === 4) return "Refetching!";

                if (error) {
                    return <ErrorMessage error={error}/>;
                }

                const {viewer} = data;

                if (loading || !viewer) {
                    return <Loading/>;
                }

                return [  <button onClick={() => refetch()}>Refetch!</button>,
                    <RepositoryList repositories={viewer.repositories}/>];
            }}
        </Query>);
    }
}

export default Profile;