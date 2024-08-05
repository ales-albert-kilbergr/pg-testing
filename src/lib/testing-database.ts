import { Client, Pool, type ClientConfig, type PoolConfig } from 'pg';
import { mock } from 'jest-mock-extended';
import {
  Datasource,
  type QueryRunner,
  type QueryLogger,
} from '@kilbergr/pg-datasource';
import { stringRandom } from '@kilbergr/string';
import { Identifier, sql } from '@kilbergr/pg-sql';
import * as stubs from './stubs';

export interface TestingDatabaseMigration {
  // We always run the migration up only
  up: (runner: QueryRunner) => Promise<void>;
}

/**
 * The `TestingDatabase` class is a helper class to create a temporary database
 * for testing purposes. The database will be dropped after the tests are
 * finished.
 */
export class TestingDatabase {
  public static readonly DEFAULT_CLIENT_CONFIG: ClientConfig = {
    host: process.env.POSTGRES_TESTING_HOST,
    port: Number(process.env.POSTGRES_TESTING_PORT),
    user: process.env.POSTGRES_TESTING_USERNAME,
    password: process.env.POSTGRES_TESTING_PASSWORD,
    database: process.env.POSTGRES_TESTING_NAME,
  };

  public static readonly stubs = stubs;

  /**
   * The name of the temporary database.
   */
  public readonly databaseName: string;

  public readonly config: ClientConfig;

  private datasource?: Datasource;

  private readonly loggerMock = mock<QueryLogger>();

  /**
   * @param name is a name for the testing database. The name will be extended
   *   by a random string.
   * @param options to configure the database connection.
   */
  public constructor(
    name: string,
    config: ClientConfig = TestingDatabase.DEFAULT_CLIENT_CONFIG,
  ) {
    // Convert the db name to lower case as the postgres database is case
    // insensitive. Also add a random string to the database name to ensure
    // that the database name is unique and only serves for testing purposes.
    this.databaseName = `${name}_${stringRandom()}`.toLocaleLowerCase();

    this.config = config;
  }

  public getTestingDatabaseConfig(): PoolConfig {
    return {
      ...this.config,
      database: this.databaseName,
    };
  }

  /**
   * Creates the temporary database.
   */
  public async init(): Promise<void> {
    // We need a client to create testing database.
    const client = new Client(this.config);
    const queryConfig = sql`
      CREATE DATABASE ${Identifier(this.databaseName)}
        WITH OWNER = :${this.config.user}
    `;

    await client.connect();

    await client.query(queryConfig);

    await client.end();
    // Connect to newly created database.
    const pool = new Pool(this.getTestingDatabaseConfig());

    this.datasource = new Datasource(
      'testingDatasource',
      pool,
      this.loggerMock,
    );
  }
  /**
   * Access low level PG pool for testing database.
   */
  public getPool(): Pool {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.getDataSource().getPool();
  }

  public createPool(): Pool {
    return new Pool(this.getTestingDatabaseConfig());
  }

  public getDataSource(): Datasource {
    if (!this.datasource) {
      throw new Error('Datasource is not initialized yet. Call init() first.');
    }

    return this.datasource;
  }

  public createQueryRunner(): QueryRunner {
    return this.getDataSource().createQueryRunner();
  }
  /**
   * Prepare database for testing by creating all necessary tables and schemas.
   *
   * The migration always run the `up` method of the migration only and does not
   * keep track of the migration history. The migration also does not care about
   * concurrent instances running the migration at the same time. We assume that
   * the migration runs on an adhoc created database which will be dropped after
   * the tests. The database is supposed to be created for one test suite only.
   *
   * @param config
   */
  public async runMigration(
    migrations: TestingDatabaseMigration[],
  ): Promise<void> {
    // We suppose that the migration runs on an adhoc created database which will
    // be dropped after the tests. Therefore we do not need to keep track of a
    // migration history or to make sure that concurrent instances are not
    // attempting to run the migrations at the same time.
    // For those reasons we will not use any migration runner library but will
    // go with a simple implementation here.

    const queryRunner = this.createQueryRunner();

    await queryRunner.startTransaction();

    for (const migration of migrations) {
      await migration.up(queryRunner);
    }

    await queryRunner.commitTransaction();
  }
  /**
   * Drops the temporary database.
   */
  public async close(): Promise<void> {
    if (!this.datasource) return;
    // Disconnect the pool before shutting dropping the testing database.
    // The database drop will forcefully end all connection to it which could
    // trigger an error.
    await this.datasource.destroy();

    // We need a client which is not connected to test database to be able
    // to delete it.
    const client = new Client(this.config);
    await client.connect();

    try {
      const queryConfig = sql`
        DROP DATABASE IF EXISTS ${Identifier(this.databaseName)} WITH (FORCE)

      `;
      // We do not need to care about any other potential connections to the
      // database as we are the only one who is using it. We also want to speed
      // up the database dropping.
      await client.query(queryConfig);
    } finally {
      await client.end();
    }
  }
}
