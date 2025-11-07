const knex = require("knex")({
  client: "mysql2",
  connection: {
    host: "localhost",
    user: "root",
    password: "Prabhuev@123",
    database: "notifications_db"
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
