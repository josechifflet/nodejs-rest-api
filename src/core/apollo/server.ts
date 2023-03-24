import 'reflect-metadata';

import { ApolloServer, BaseContext } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import express from 'express';
import { ExecutionArgs } from 'graphql';
import { Context, SubscribeMessage } from 'graphql-ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import http from 'http';
import path from 'path';
import { buildSchema } from 'type-graphql';
import { WebSocketServer } from 'ws';

import { resolvers } from '../../resolvers';
import log from '../../util/tslog';

/**
 * Initializes the Apollo Server to a given express application
 */
export async function intializeApolloServer(
  app: express.Application
): Promise<ApolloServer<BaseContext>> {
  const schema = await buildSchema({
    resolvers: resolvers as any,
    emitSchemaFile: path.resolve(__dirname, '../../../schema.gql'),
  });

  const httpServer = http.createServer(app);

  // Creating the WebSocket subscription server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
  const getDynamicContext = async (
    ctx: Context,
    msg: SubscribeMessage,
    args: ExecutionArgs
  ) => {
    return { gs: { ctx, msg, args } };
  };
  const serverCleanup = useServer(
    {
      schema,
      context: (ctx, msg, args) => {
        return getDynamicContext(ctx, msg, args);
      },
    },
    wsServer
  );

  // Set up Apollo Server
  const server = new ApolloServer({
    schema,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
      ApolloServerPluginDrainHttpServer({ httpServer }),
      process.env.NODE_ENV === 'production'
        ? ApolloServerPluginLandingPageProductionDefault({
            embed: true,
            graphRef: 'user@example.com',
          })
        : ApolloServerPluginLandingPageLocalDefault({ embed: true }),
    ],
    csrfPrevention: true,
    cache: 'bounded',
  });
  await server.start();
  log.info('Apollo Server is ready!');

  return server;
}
