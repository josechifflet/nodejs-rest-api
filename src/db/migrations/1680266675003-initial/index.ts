
  import * as fs from 'fs';
  import * as path from 'path';
  import { MigrationInterface, QueryRunner } from 'typeorm';

  export class initial1680266675003 implements MigrationInterface {
    private readonly upSQL = path.resolve(
      __dirname,
      '../1680266675003-initial/up.sql'
    )
    private readonly downSQL = path.resolve(
      __dirname,
      '../1680266675003-initial/down.sql'
    )

    async up(queryRunner: QueryRunner): Promise<any> {
      const query = await new Promise<string>((resolve, reject) =>
        fs.readFile(this.upSQL, (err, data) => {
          if (err) reject(err);
          else resolve(data.toString());
        }),
      );
      const queries: string[] = [];
      query.split(';').forEach((q) => {
        const cleanQuery = q.trim();
        if (cleanQuery !== '') queries.push(cleanQuery);
      });
      queries.forEach(async (q) => await queryRunner.query(q));
    }

    async down(queryRunner: QueryRunner): Promise<any> {
      const query = await new Promise<string>((resolve, reject) =>
        fs.readFile(this.downSQL, (err, data) => {
          if (err) reject(err);
          else resolve(data.toString());
        }),
      );
      const queries: string[] = [];
      query.split(';').forEach((q) => {
        const cleanQuery = q.trim();
        if (cleanQuery !== '') queries.push(cleanQuery);
      });
      queries.forEach(async (q) => await queryRunner.query(q));
    }
  }