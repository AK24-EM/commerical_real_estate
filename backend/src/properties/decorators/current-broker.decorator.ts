import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Broker } from '../broker.entity';

/**
 * Decorator to extract the current broker from the request.
 * 
 * The broker is injected into the request by ListingLimitGuard after validation.
 * 
 * Usage:
 * @Post()
 * @UseGuards(ListingLimitGuard)
 * create(@CurrentBroker() broker: Broker, @Body() dto: CreatePropertyDto) {
 *   // broker is already validated and has available listing capacity
 * }
 */
export const CurrentBroker = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Broker => {
    const request = ctx.switchToHttp().getRequest();
    return request.broker;
  },
);
