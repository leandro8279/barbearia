import { FinanceSummaryResponseDTO, GetFinanceSummaryDTO } from '@/modules/finance/application/dtos/GetFinanceSummaryDTO';
import { financeSummaryQuerySchema } from '@/modules/finance/presentation/validators/financeSummary.schema';

import { HttpStatus } from '@/shared/constants/HttpStatus';
import { IController, IRequest, IResponse } from '@/shared/interfaces/HttpInterface';
import { IUseCase } from '@/shared/interfaces/UseCaseInterface';

export class GetFinanceSummaryController implements IController {
  constructor(private readonly getFinanceSummaryUseCase: IUseCase<GetFinanceSummaryDTO, FinanceSummaryResponseDTO>) {}

  async handle(request: IRequest): Promise<IResponse> {
    const { from, to, basis } = financeSummaryQuerySchema.parse(request.query ?? {});

    const body = await this.getFinanceSummaryUseCase.execute({ from, to, basis });

    return { statusCode: HttpStatus.OK, body };
  }
}
