import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'ev_charge_dz',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
  // mysql2 returns DECIMAL columns as strings by default — cast them to JS numbers
  typeCast(field, next) {
    if (field.type === 'DECIMAL' || field.type === 'NEWDECIMAL') {
      const v = field.string();
      return v === null ? null : parseFloat(v);
    }
    return next();
  },
});

export default pool;
