import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from "react-router-dom";

import { ApolloProvider } from "react-apollo";
import { ApolloClient } from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { setContext } from 'apollo-link-context';
import { split } from 'apollo-link';
import { WebSocketLink } from "apollo-link-ws";
import { getMainDefinition } from 'apollo-utilities';

import { AUTH_TOKEN } from "./constants";
import './styles/index.css';
import App from './components/App';
import * as serviceWorker from './serviceWorker';

//The standard link to send requests to
const httpLink = createHttpLink({
	uri: 'http://localhost:4000'
});

const authLink = setContext( (_, { headers } ) => {
	const token = localStorage.getItem( AUTH_TOKEN );
	return {
		headers: {
			...headers,
			authorization: token ? `Bearer ${ token }` : '' //Manually add auth token to headers before sending any request
		}
	}
} );

//Create the websocket link for GraphQL subscriptions
const wsLink = new WebSocketLink({
	uri: `ws://localhost:4000`, //Websocket endpoint for subscription
	options: {
		reconnect: true,
		connectionParams: {
			authToken: localStorage.getItem( AUTH_TOKEN ) //Authorise user with web token
		}
	}
});

const link = split(
	({ query }) => {
		const { kind, operation } = getMainDefinition( query );
		return kind === 'OperationDefinition' && operation === 'subscription'
	}, //This is a test function and is used to determine the type of request
	wsLink, //If test function === true, request is subscription and is forwarded to websocket link
	authLink.concat( httpLink ) //If test function is false, request is query/mutation and request is forwarded to http link
)

const client = new ApolloClient({
	link,
	cache: new InMemoryCache()
});

ReactDOM.render(
	//BrowserRouter makes use of HTML5 history API to give UI benefit (back, forward etc)
	<BrowserRouter>
		<ApolloProvider client={client}>
			<App />
		</ApolloProvider>
	</BrowserRouter>,
	document.getElementById( 'root' )
);

serviceWorker.unregister();
