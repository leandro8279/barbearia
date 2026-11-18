import { z } from 'zod';

const pt = z.locales.pt();

z.config({
  localeError: pt.localeError,
  customError: (issue) => {
    if (issue.code === 'invalid_type') {
      return issue.input === undefined ? 'Campo obrigatório' : 'Tipo inválido';
    }
    return undefined;
  },
});
