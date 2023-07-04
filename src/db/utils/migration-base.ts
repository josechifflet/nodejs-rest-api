import * as fs from 'fs';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class BaseMigrationInterface implements MigrationInterface {
  upSQL: string;
  downSQL: string;
  constructor(upSQL: string, downSQL: string) {
    this.upSQL = upSQL;
    this.downSQL = downSQL;
  }
  async up(queryRunner: QueryRunner) {
    const query = await new Promise<string>((resolve, reject) =>
      fs.readFile(this.upSQL, (err, data) => {
        if (err) reject(err);
        else resolve(data.toString());
      })
    );
    const queries: string[] = [];
    query.split(';').forEach((q) => {
      const cleanQuery = q.trim();
      if (cleanQuery !== '') queries.push(cleanQuery);
    });
    queries.forEach(async (q) => await queryRunner.query(q));
  }
  async down(queryRunner: QueryRunner) {
    const query = await new Promise<string>((resolve, reject) =>
      fs.readFile(this.downSQL, (err, data) => {
        if (err) reject(err);
        else resolve(data.toString());
      })
    );
    const queries: string[] = [];
    query.split(';').forEach((q) => {
      const cleanQuery = q.trim();
      if (cleanQuery !== '') queries.push(cleanQuery);
    });
    queries.forEach(async (q) => await queryRunner.query(q));
  }
}
