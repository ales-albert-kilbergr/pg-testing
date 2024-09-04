/* eslint-disable @typescript-eslint/no-magic-numbers */
import type { QueryRunner } from '@kilbergr/pg-datasource';
import { QueryConfig } from '@kilbergr/pg-sql';
import { stringRandom } from '@kilbergr/string';
import type { QueryResult, QueryResultRow } from 'pg';

export function QueryConfigStub(
  overrides: Partial<QueryConfig> = {},
): QueryConfig {
  const text = overrides.text ?? 'SELECT NOW()';
  const values = overrides.values ?? [];

  return new QueryConfig(text, values);
}

export function QueryRunnerStatsStub(
  override: Partial<QueryRunner.Stats> = {},
): QueryRunner.Stats {
  const stats: QueryRunner.Stats = {
    connectionDuration:
      override.connectionDuration ??
      Math.floor(Math.random() * Math.pow(10, 3)),
    executionDuration:
      override.executionDuration ?? Math.floor(Math.random() * Math.pow(10, 3)),
  };

  Object.assign(stats, override);

  return stats;
}

export function QueryResultStub<R extends QueryResultRow = QueryResultRow>(
  override: Partial<QueryResult<R>> = {},
): QueryResult<R> {
  return {
    rowCount: 0,
    rows: [],
    command: `command_${stringRandom()}`,
    oid: 0,
    fields: [],
    ...override,
  };
}

export function QueryRunnerResultStub<
  R extends QueryResultRow = QueryResultRow,
>(override: Partial<QueryRunner.Result<R>> = {}): QueryRunner.Result<R> {
  const result: QueryRunner.Result<R> = Object.assign(
    QueryResultStub<R>(),
    {
      stats: QueryRunnerStatsStub(),
      queryId: stringRandom(),
    },
    override,
  );

  return result;
}
