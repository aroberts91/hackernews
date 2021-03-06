import React, { Component, Fragment } from 'react';
import { Query } from 'react-apollo';
import gql from 'graphql-tag';
import Link from './Link';
import _ from 'lodash';
import { LINKS_PER_PAGE } from "../constants";

//Realtime vote updates
const NEW_VOTES_SUBSCRIPTION = gql`
	subscription {
		newVote {
			id
			link {
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
			user {
				id
			}
		}
	}
`

//Realtime links updates
const NEW_LINKS_SUBSCRIPTION = gql`
	subscription {
		newLink {
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
`

//Main query to pull a list of all links
export const FEED_QUERY = gql`	
		query FeedQuery($first: Int, $skip: Int, $orderBy: LinkOrderByInput) {
			feed(first: $first, skip: $skip, orderBy: $orderBy) {
				links {
					id
					createdAt
					url
					description
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
				count
			}
		}
`;

class LinkList extends Component {
	_updateCacheAfterVote = ( store, createVote, linkId ) => {
		//Create a clone of the current cache data (based on feed query)
		const isNewPage = this.props.location.pathname.includes('new')
		const page = parseInt(this.props.match.params.page, 10)

		const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0
		const first = isNewPage ? LINKS_PER_PAGE : 100
		const orderBy = isNewPage ? 'createdAt_DESC' : null
		const data = _.cloneDeep(store.readQuery({ query: FEED_QUERY, variables: { first, skip, orderBy } }));

		//Get the link the user just voted for and update vote count to DB value
		const votedLink = data.feed.links.find( link => link.id === linkId );
		votedLink.votes = createVote.link.votes;

		//Update the cache with new vote count, this causes an auto re-render within react
		store.writeQuery({ query: FEED_QUERY, data });
	};

	_subscribeToNewLinks = subscribeToMore => {
		subscribeToMore({
			document: NEW_LINKS_SUBSCRIPTION, //The subscription query
			updateQuery: ( prev, { subscriptionData } ) => {
				//Return previous data if nothing returned
				if( !subscriptionData.data )
					return prev

				//If ID of new link already exists, return previous data
				const newLink = subscriptionData.data.newLink
				const exists = prev.feed.links.find(( { id } ) => id === newLink.id );
				if( exists )
					return prev;


				return Object.assign( {}, prev, {
					feed: {
						links: [newLink, ...prev.feed.links], //Create a new links array by merging new link and all previous (...)
						count: prev.feed.links.length + 1, //Increase count
						__typename: prev.feed.__typename
					}
				});
			}
		});
	};

	_subscribeToNewVotes = subscribeToMore => {
		subscribeToMore({
			document: NEW_VOTES_SUBSCRIPTION
		})
	}

	_getQueryVariables = () => {
		const isNewPage = this.props.location.pathname.includes('new');
		const page = parseInt( this.props.match.params.page, 10 );

		const skip = isNewPage 		? ( page - 1 ) * LINKS_PER_PAGE : 0;
		const first = isNewPage 	? LINKS_PER_PAGE : 100;
		const orderBy = isNewPage 	? 'createdAt_DESC' : null;

		return{ first, skip, orderBy };
	};

	_getLinksToRender = data => {
		const isNewPage = this.props.location.pathname.includes( 'new' );

		if( isNewPage )
			return data.feed.links;

		//Sort links by votes if visiting top page
		const rankedLinks = data.feed.links.slice();
		rankedLinks.sort( ( l1, l2 ) => l2.votes.length - l1.votes.length );
		return rankedLinks;
	};

	_nextPage = data => {
		const page = parseInt( this.props.match.params.page, 10 );
		if( page <= data.feed.count / LINKS_PER_PAGE ) {
			const nextPage = page + 1;
			this.props.history.push( `/new/${ nextPage }` );
		}
	};

	_previousPage = () => {
		const page = parseInt( this.props.match.params.page, 10 )

		if( page > 1 ) {
			const previousPage = page - 1;
			this.props.history.push( `/new/${ previousPage }` )
		}
	}

	render() {
		return (
			<Query query={ FEED_QUERY } variables={ this._getQueryVariables() }>
				{ ({ loading, error, data, subscribeToMore }) => {
					if( loading ) return <div>Fetching</div>;
					if( error ) return <div>Error</div>;

					this._subscribeToNewLinks( subscribeToMore );
					this._subscribeToNewVotes( subscribeToMore );

					const linksToRender = this._getLinksToRender( data );
					const isNewPage = this.props.match.params.page
						? ( this.props.match.params.page = 1 ) * LINKS_PER_PAGE
						: 0

					return (
						<Fragment>
							{linksToRender.map( ( link, index ) => (
									<Link
										key={ link.id }
										link={ link }
										index={ index }
										updateStoreAfterVote={ this._updateCacheAfterVote }
									/>
								)
							)}
							{ isNewPage && (
								<div className='flex ml4 mv3 gray'>
									<div className='pointer mr2' onClick={ this._previousPage }>
										Previous
									</div>
									<div className='pointer' onClick={ this._nextPage }>
										Next
									</div>
								</div>
							) }
						</Fragment>
					);
				} }
			</Query>
		)
	}
}

export default LinkList;