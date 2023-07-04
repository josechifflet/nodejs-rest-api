import path from 'path';
import { BaseMigrationInterface } from '../../utils/migration-base';

export class initialsetup1688479199271 extends BaseMigrationInterface {
  constructor() {
    super(
      path.resolve(__dirname, '../1688479199271-initialsetup/up.sql'), 
      path.resolve(__dirname, '../1688479199271-initialsetup/down.sql')
    );
  }
}