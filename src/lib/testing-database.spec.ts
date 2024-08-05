/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/promise-function-async */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { stringRandom } from '@kilbergr/string';
import {
  TestingDatabase,
  TestingDatabaseConfig,
  type TestingDatabaseMigration,
} from './testing-database';
import { mock } from 'jest-mock-extended';
import type { Client } from 'pg';
import type { QueryRunner } from '@kilbergr/pg-datasource';

describe('(Unit) TestingDatabase', () => {
  describe('TestingDatabaseConfig', () => {
    it('should create a new instance of TestingDatabaseConfig', () => {
      // Arrange
      const origEnv = process.env;
      process.env = {
        POSTGRES_TESTING_HOST: 'localhost',
        POSTGRES_TESTING_PORT: '5432',
        POSTGRES_TESTING_USERNAME: 'test',
        POSTGRES_TESTING_PASSWORD: 'test',
      };
      // Act
      const config = TestingDatabaseConfig.createFromEnv();
      // Assert
      expect(config).toBeInstanceOf(TestingDatabaseConfig);
      expect(config.host).toBe(process.env.POSTGRES_TESTING_HOST);
      expect(config.port).toBe(Number(process.env.POSTGRES_TESTING_PORT));
      expect(config.user).toBe(process.env.POSTGRES_TESTING_USERNAME);
      expect(config.password).toBe(process.env.POSTGRES_TESTING_PASSWORD);
      // Cleanup
      process.env = origEnv;
    });

    it('should fail to validate if POSTGRES_TESTING_USERNAME is not set', () => {
      // Arrange
      const origEnv = process.env;
      process.env = {
        POSTGRES_TESTING_HOST: 'localhost',
        POSTGRES_TESTING_PORT: '5432',
        POSTGRES_TESTING_PASSWORD: 'test',
      };
      // Act
      const config = TestingDatabaseConfig.createFromEnv();
      const act = (): void => {
        config.assert();
      };
      // Assert
      expect(act).toThrow(AggregateError);
      expect(act).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'Cannot initialize testing database without a username.',
          ),
        }),
      );
      // Cleanup
      process.env = origEnv;
    });

    it('should fail to validate if POSTGRES_TESTING_PASSWORD is not set', () => {
      // Arrange
      const origEnv = process.env;
      process.env = {
        POSTGRES_TESTING_HOST: 'localhost',
        POSTGRES_TESTING_PORT: '5432',
        POSTGRES_TESTING_USERNAME: 'test',
      };
      // Act
      const config = TestingDatabaseConfig.createFromEnv();
      const act = (): void => {
        config.assert();
      };
      // Assert
      expect(act).toThrow(AggregateError);
      expect(act).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            'Cannot initialize testing database without a password.',
          ),
        }),
      );
      // Cleanup
      process.env = origEnv;
    });

    it('should set the hostname to the default value', () => {
      // Arrange
      const origEnv = process.env;
      process.env = {
        POSTGRES_TESTING_PORT: '5432',
        POSTGRES_TESTING_USERNAME: 'test',
        POSTGRES_TESTING_PASSWORD: 'test',
      };
      // Act
      const config = TestingDatabaseConfig.createFromEnv();
      // Assert
      expect(config.host).toBe('localhost');
      // Cleanup
      process.env = origEnv;
    });

    it('should set the port to the default value', () => {
      // Arrange
      const origEnv = process.env;
      process.env = {
        POSTGRES_TESTING_HOST: 'localhost',
        POSTGRES_TESTING_USERNAME: 'test',
        POSTGRES_TESTING_PASSWORD: 'test',
      };
      // Act
      const config = TestingDatabaseConfig.createFromEnv();
      // Assert
      expect(config.port).toBe(5432);
      // Cleanup
      process.env = origEnv;
    });
  });

  describe('TestingDatabase', () => {
    describe('getTestingDatabaseConfig', () => {
      it('should return a config with different database name then the original one', () => {
        // Arrange
        const origEnv = process.env;
        process.env = {
          POSTGRES_TESTING_HOST: 'localhost',
          POSTGRES_TESTING_PORT: '5432',
          POSTGRES_TESTING_USERNAME: stringRandom(),
          POSTGRES_TESTING_PASSWORD: stringRandom(),
        };
        // Act
        const database = new TestingDatabase('test');

        const testingConfig = database.getTestingDatabaseConfig();
        // Assert
        expect(testingConfig.database).not.toBe(
          process.env.POSTGRES_TESTING_DATABASE,
        );
        // Cleanup
        process.env = origEnv;
      });
    });

    describe('init', () => {
      it('should validate the config and fail when it is not valid', async () => {
        // Arrange
        const origEnv = process.env;
        process.env = {
          // Missing required field USERNAME
          POSTGRES_TESTING_PASSWORD: 'test',
        };
        // Act
        const database = new TestingDatabase('test');
        const act = (): Promise<void> => database.init();
        // Assert
        await expect(act).rejects.toThrow(AggregateError);
        // Cleanup
        process.env = origEnv;
      });

      it('should create new database for a given client', async () => {
        // Arrange
        const config = TestingDatabaseConfig.create({
          user: stringRandom(),
          password: stringRandom(),
        });

        const mockClient = mock<Client>();
        const database = new TestingDatabase('test', config);
        jest.spyOn(database, 'createAdminClient').mockReturnValue(mockClient);
        // Act
        await database.init();
        // Assert
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.objectContaining({
            text: `CREATE DATABASE "${database.databaseName}" WITH OWNER = "${config.user}"`,
          }),
        );
      });
    });

    describe('runMigration', () => {
      it('should run the migration', async () => {
        // Arrange
        const config = TestingDatabaseConfig.create({
          user: stringRandom(),
          password: stringRandom(),
        });

        const mockClient = mock<Client>();
        const mockMigration: TestingDatabaseMigration = {
          up: jest.fn(),
        };
        const database = new TestingDatabase('test', config);
        jest.spyOn(database, 'createAdminClient').mockReturnValue(mockClient);
        const queryRunnerMock = mock<QueryRunner>();

        const createQueryRunnerSpy = jest.spyOn(database, 'createQueryRunner');
        createQueryRunnerSpy.mockReturnValue(queryRunnerMock);

        // Act
        await database.init();
        await database.runMigration([mockMigration]);
        // Assert
        expect(mockMigration.up).toHaveBeenCalledWith(queryRunnerMock);
        // Cleanup
        createQueryRunnerSpy.mockRestore();
      });

      it('should run the migration in a transaction', async () => {
        // Arrange
        const config = TestingDatabaseConfig.create({
          user: stringRandom(),
          password: stringRandom(),
        });

        const mockClient = mock<Client>();
        const mockMigration: TestingDatabaseMigration = {
          up: jest.fn(),
        };
        const database = new TestingDatabase('test', config);
        jest.spyOn(database, 'createAdminClient').mockReturnValue(mockClient);
        const queryRunnerMock = mock<QueryRunner>();

        const createQueryRunnerSpy = jest.spyOn(database, 'createQueryRunner');
        createQueryRunnerSpy.mockReturnValue(queryRunnerMock);

        // Act
        await database.init();
        await database.runMigration([mockMigration]);
        // Assert
        expect(queryRunnerMock.startTransaction).toHaveBeenCalled();
        expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
        // Cleanup
        createQueryRunnerSpy.mockRestore();
      });
    });

    describe('close', () => {
      it('should close the client', async () => {
        // Arrange
        const config = TestingDatabaseConfig.create({
          user: stringRandom(),
          password: stringRandom(),
        });

        const mockClient = mock<Client>();
        // Act
        const database = new TestingDatabase('test', config);
        jest.spyOn(database, 'createAdminClient').mockReturnValue(mockClient);
        await database.init();
        await database.close();
        // Assert
        expect(mockClient.end).toHaveBeenCalled();
      });

      it('should delete the testing database', async () => {
        // Arrange
        const config = TestingDatabaseConfig.create({
          user: stringRandom(),
          password: stringRandom(),
        });

        const mockClient = mock<Client>();
        const database = new TestingDatabase('test', config);
        jest.spyOn(database, 'createAdminClient').mockReturnValue(mockClient);
        // Act
        await database.init();
        await database.close();
        // Assert
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.objectContaining({
            text: `DROP DATABASE IF EXISTS "${database.databaseName}" WITH (FORCE)`,
          }),
        );
      });
    });
  });
});
