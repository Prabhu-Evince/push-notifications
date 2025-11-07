const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  }
});

// ✅ Test DB Connection (prints message)
knex.raw("SELECT 1")
  .then(() => {
    console.log("✅ Database Connected Successfully");
  })
  .catch((err) => {
    console.log("❌ Database Connection Failed:", err.message);
  });

module.exports = knex;
