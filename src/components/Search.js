import React, { Component } from 'react';
import { withApollo } from 'react-apollo';
import gql from 'graphql-tag';

import Link from './Link';

//Query to search for a link using $filter ( /server/src/resolvers/Query.js)
const FEED_SEARCH_QUERY = gql`
	query FeedSearchQuery($filter: String!) {
		feed(filter: $filter) {
			links {
				id
				url
				description
				createdAt
				postedBy {
					id
					name
				}
				votes {
					id
					user {
						id
					}
				}
			}
		}
	}
`;

class Search extends Component {
	state = {
		links: [],
		filter: ''
	};

	_executeSearch = async() => {
		const { filter } = this.state;
		//Manual query to GraphQL
		const result = await this.props.client.query({
			query: 		FEED_SEARCH_QUERY,
			variables: 	{ filter },
		});
		const links = result.data.feed.links;
		this.setState({ links });
	};

	render() {
		return (
			<div>
				<div>
					Search
					<input
						style={{ marginLeft: 10, marginRight: 5 }}
						type='text'
						onChange={ e => this.setState({ filter: e.target.value }) }
					/>
					<button onClick={ () => this._executeSearch() }>OK</button>
				</div>
				{ this.state.links.map( ( link, index ) => (
					<Link key={ link.id } link={ link } index={ index } />
				)) }
			</div>
		);
	}
}

// withApollo injects the ApolloClient (from index.js) as props.client
// This allows us to send a query manually
export default withApollo( Search )