import { ApolloServer, BaseContext } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';

// Define the GraphQL schema
const typeDefs = `type Query { hello: String! }`;

// Define the resolvers for the schema
const resolvers = {
  Query: {
    hello: () => 'Hello World!',
  },
};
/**
 * Initializes the Apollo Server to a given express application
 */
export async function intializeApolloServer(
  app: express.Application
): Promise<ApolloServer<BaseContext>> {
  const httpServer = http.createServer(app);

  // Set up Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });
  await server.start();

  return server;
}
