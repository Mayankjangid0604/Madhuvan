const swaggerJSDoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hostel Admin System API",
      version: "1.0.0",
      description: "Backend APIs for Hostel Admin System"
    },
    servers: [
      {
        url: process.env.API_BASE_URL || "http://localhost:5001",
        description: "Backend API"
      }
    ],
    tags: [
      { name: "Auth", description: "Authentication" },
      { name: "Students", description: "Student management" },
      { name: "Fees", description: "Fee & payments" },
      { name: "Rooms", description: "Room & bed management" },
      { name: "Dashboard", description: "Dashboard statistics" },
      { name: "Allocations", description: "Room allocations" },
      { name: "Ledger", description: "Financial ledger" },
      { name: "Settings", description: "System settings" },
      { name: "Export", description: "Data export" },
      { name: "Audit", description: "Audit logs" },
      { name: "Notifications", description: "Notifications & reminders" },
      { name: "Backup", description: "Backup management" },
      { name: "Members", description: "Staff members" },
      { name: "Fines", description: "Fine management" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    path.join(__dirname, "../routes/*.js")
  ]
};

module.exports = swaggerJSDoc(options);   