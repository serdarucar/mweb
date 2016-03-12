module.exports = {
  rethinkdb: {
    host: process.env.RDB_HOST || 'mdbs1-priv',
    port: parseInt(process.env.RDB_PORT) || 28015,
    authKey: '',
    db: process.env.RDB_DB || 'mailsender'
  }
};
