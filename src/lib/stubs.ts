/* eslint-disable @typescript-eslint/no-magic-numbers */
import { QueryResult, QueryStats } from '@kilbergr/pg-datasource';
import { QueryConfig } from '@kilbergr/pg-sql';
import { stringRandom } from '@kilbergr/string';
import type { QueryResult as PgQueryResult, QueryResultRow } from 'pg';

export function QueryConfigStub(
  overrides: Partial<QueryConfig> = {},
): QueryConfig {
  const text = overrides.text ?? 'SELECT NOW()';
  const values = overrides.values ?? [];

  return new QueryConfig(text, values);
}

export function QueryStatsStub(override: Partial<QueryStats> = {}): QueryStats {
  const stats = new QueryStats();

  stats.connectionDuration =
    override.connectionDuration ?? Math.floor(Math.random() * Math.pow(10, 3));
  stats.executionDuration =
    override.executionDuration ?? Math.floor(Math.random() * Math.pow(10, 3));
  stats.processingDuration =
    override.processingDuration ?? Math.floor(Math.random() * Math.pow(10, 3));
  stats.rowCount = override.rowCount ?? Math.floor(Math.random() * 10);

  Object.assign(stats, override);

  return stats;
}

export function PgQueryResultStub<R extends QueryResultRow = QueryResultRow>(
  override: Partial<PgQueryResult<R>> = {},
): PgQueryResult<R> {
  return {
    rowCount: 0,
    rows: [],
    command: `command_${stringRandom()}`,
    oid: 0,
    fields: [],
    ...override,
  };
}

export function QueryResultStub<R extends QueryResultRow = QueryResultRow>(
  override: Partial<QueryResult<R>> = {},
): QueryResult<R> {
  const result = new QueryResult<R>(override.config ?? QueryConfigStub());

  result.stats = override.stats ?? QueryStatsStub();
  result.result = override.result ?? PgQueryResultStub<R>();

  return result;
}
