import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import type { RoutingService } from '../../domain/routing/interfaces/routing-service.js';
import { routeRequestSchema, routeResponseSchema } from './routing.schemas.js';

type RoutingControllerDeps = {
  routingService: RoutingService;
};

export async function registerRoutingController(
  app: FastifyInstance<any, any, any, any>,
  deps: RoutingControllerDeps
): Promise<void> {
  app.post('/route', async (request, reply) => {
    try {
      const input = routeRequestSchema.parse(request.body);
      const result = await deps.routingService.routePrompt(input);
      const output = routeResponseSchema.parse(result);
      return reply.status(200).send(output);
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.issues,
        });
      }
      request.log.error({ error }, 'Routing request failed');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  });
}
