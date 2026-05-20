import type { Logger } from 'pino';
import type {
  RoutingDecisionLogger,
  RoutingDecisionRecord,
} from '../../domain/routing/interfaces/routing-decision-logger.js';

export class PinoRoutingDecisionLogger implements RoutingDecisionLogger {
  constructor(private readonly logger: Logger) {}

  logDecision(record: RoutingDecisionRecord): void {
    this.logger.info(
      {
        event: 'routing.decision',
        ...record,
      },
      'Routing decision'
    );
  }
}
