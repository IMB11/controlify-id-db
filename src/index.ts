import * as bodyParser from "body-parser";
import * as express from "express";
import rateLimit from "express-rate-limit";
import { Database } from 'sqlite-async';
import getConfig from "./config.js";
import { APIResponse, Controller, ControllerSubmission } from "./types.js";
import { controllerAlreadyExists, checkExistance, isSubmissionValid, getControllersFromDatabase, updateControlifyVersionForController } from "./utils.js";

(async () => {
  const config = getConfig();
  const app = express();
  const db = await Database.open(config.databaseFileLocation);

  db.exec(`
  CREATE TABLE IF NOT EXISTS Controllers (
    ControllerID INTEGER PRIMARY KEY AUTOINCREMENT,
    VendorID INTEGER,
    ProductID INTEGER,
    GUID TEXT,
    ControlifyVersion TEXT
);

  CREATE TABLE IF NOT EXISTS ReportedNames (
    ReportedNameID INTEGER PRIMARY KEY AUTOINCREMENT,
    ControllerID INTEGER,
    ReportedName TEXT,
    FOREIGN KEY (controllerID) REFERENCES Controllers (controllerID)
  );
`);

  app.use(bodyParser.json());
  app.use("/api/v1/submit",
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 mins per window.
      max: 15, // max 15 requests per window.
      standardHeaders: true,
    })
  );

  app.delete("/api/v1/delete", async (req, res) => {
    if (req.query.key != config.deleteBuzzWord) {
      res.status(400).send({
        error: true,
        message: "Unauthorized."
      });
      return;
    }

    const id = req.body.id;
    console.log("Deleting everything about " + id);

    try {
      const deleteControllerQuery = `
        DELETE FROM Controllers
        WHERE controllerID = ?
      `;
      await db.run(deleteControllerQuery, id);

      const deleteReportedNamesQuery = `
        DELETE FROM ReportedNames
        WHERE controllerID = ?
      `;
      await db.run(deleteReportedNamesQuery, id);
      res.status(200).send({
        message: "Deleted."
      });
    } catch (error) {
      res.status(500).send({
        error: true,
        message: error
      });
      return;
    }
  })

  app.post("/api/v1/submit", async (req, res) => {
    const submission: ControllerSubmission = req.body;

    if (!isSubmissionValid(submission)) {
      console.log("Discarding request, invalid submission.")
      const response: APIResponse = {
        error: true,
        message: "Invalid request body. Invalid submission.",
      };
      res.status(500).send(response);
      return;
    }

    console.log(`New submission recieved: @{reportedName: ${submission.reportedName}, guid: ${submission.GUID}, vendorId: ${submission.vendorID}, productId: ${submission.productID}}`);

    const reportedNameExistance = await checkExistance(submission, db);

    if (reportedNameExistance.isDuplicate) {
      updateControlifyVersionForController(submission, reportedNameExistance.controllerID, db);

      console.log("Submission is duplicate - ignoring!")
      const response: APIResponse = {
        message: "Submission has already been recorded into the database.",
      };
      res.status(208).send(response);
    } else {
      try {
        // If the controller doesn't exist already.
        if (reportedNameExistance.controllerID == undefined) {
          let stmt = await db.prepare(`
            INSERT INTO Controllers(VendorID, ProductID, GUID) VALUES (?, ?, ?)
          `);

          await stmt.run(submission.vendorID, submission.productID, submission.GUID);

          stmt.finalize();

          stmt = await db.prepare(`SELECT last_insert_rowid() AS controllerID`);

          try {
            const row: any = await stmt.get();

            reportedNameExistance.controllerID = row.controllerID;
          } catch (err) {
            const response: APIResponse = {
              error: true,
              message: err.message,
            };
            res.status(500).send(response);
            return;
          }

          stmt.finalize();
        }

        let stmt = await db.prepare(`
          INSERT INTO ReportedNames(ControllerID, ReportedName) VALUES (?, ?)
        `);

        await stmt.run(reportedNameExistance.controllerID, submission.reportedName);
        stmt.finalize();

        updateControlifyVersionForController(submission, reportedNameExistance.controllerID, db);

        const response: APIResponse = {
          message: "Submitted data. Thank you!"
        };

        res.status(200).send(response);
        return;
      } catch (e) {
        const response: APIResponse = {
          error: true,
          message: e,
        };
        res.status(500).send(response);
      }

    }
  });

  app.get("/", (req, res) => res.status(200).send({
    message: "Hi!"
  }))

  app.get("/api/v1/submissions", async (req, res) => {
    try {
      const controllers: Controller[] = await getControllersFromDatabase(db);
      const response: APIResponse = {
        message: "Successfully queried database for submissions.",
        data: controllers
      }
      res.status(200).send(response);
    } catch (e: any) {
      const response: APIResponse = {
        message: e,
        error: true
      }
      res.status(500).send(response);
    }
  })

  app.listen(config.port, () => {
    console.log("Listening on port " + config.port);
  });
})();